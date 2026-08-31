import { Router } from 'express';
import { db } from './db/db';
import { contacts, followUps, observations, salahRecords, activityRecords, generalActivities, customCategories } from './db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Seed db if empty
apiRouter.post('/seed', async (req, res) => {
  try {
    const existing = await db.select().from(contacts).limit(1);
    if (existing.length === 0) {
      await db.insert(contacts).values([
        {
          name: 'Abdullah',
          phone: '01711223344',
          area: 'Dhanmondi',
          firstContactDate: new Date('2026-01-15').toISOString(),
          currentStage: 12,
          growthScore: 78,
          weeklyChange: 12,
          monthlyChange: 25,
          priorityLevel: 'growing',
        },
        {
          name: 'Hasan',
          phone: '01811223344',
          area: 'Gulshan',
          firstContactDate: new Date('2026-03-10').toISOString(),
          currentStage: 6,
          growthScore: 52,
          weeklyChange: 3,
          monthlyChange: 8,
          priorityLevel: 'needs_attention',
        }
      ]);
      res.json({ message: 'Seeded database with dummy contacts' });
    } else {
      res.json({ message: 'Already seeded' });
    }
  } catch (err: any) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/contacts', async (req, res) => {
  try {
    const allContacts = await db.select().from(contacts).orderBy(desc(contacts.updatedAt));
    res.json(allContacts);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/contacts', async (req, res) => {
  try {
    const newContact = await db.insert(contacts).values(req.body).returning();
    res.json(newContact[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
    if (!contact.length) return res.status(404).json({ error: 'Not found' });
    res.json(contact[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/contacts/:id', async (req, res) => {
  try {
    const dataToUpdate = { ...req.body };
    delete dataToUpdate.id;
    delete dataToUpdate.createdAt;
    delete dataToUpdate.updatedAt;

    const updatedContact = await db.update(contacts)
      .set({ ...dataToUpdate, updatedAt: new Date() })
      .where(eq(contacts.id, req.params.id))
      .returning();
    res.json(updatedContact[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/contacts/:id', async (req, res) => {
  try {
    const contactId = req.params.id;
    // Delete related records first to avoid foreign key constraints errors
    await db.delete(salahRecords).where(eq(salahRecords.contactId, contactId));
    await db.delete(activityRecords).where(eq(activityRecords.contactId, contactId));
    await db.delete(followUps).where(eq(followUps.contactId, contactId));
    await db.delete(observations).where(eq(observations.contactId, contactId));

    // Delete the contact
    await db.delete(contacts).where(eq(contacts.id, contactId));
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/contacts/:id/salah', async (req, res) => {
  try {
    const records = await db.select().from(salahRecords).where(eq(salahRecords.contactId, req.params.id));
    res.json(records);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/contacts/:id/salah', async (req, res) => {
  try {
    const { date, fajr, dhuhr, asr, maghrib, isha } = req.body;
    const contactId = req.params.id;
    
    // Upsert logic
    await db.delete(salahRecords)
      .where(and(eq(salahRecords.contactId, contactId), eq(salahRecords.date, date)));
      
    const newRecord = await db.insert(salahRecords).values({
      contactId, date, fajr, dhuhr, asr, maghrib, isha
    }).returning();
    
    res.json(newRecord[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/activities', async (req, res) => {
  try {
    const activities = await db.select().from(generalActivities).orderBy(desc(generalActivities.date), desc(generalActivities.createdAt));
    res.json(activities);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/activities', async (req, res) => {
  try {
    const newActivity = await db.insert(generalActivities).values(req.body).returning();
    res.json(newActivity[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/custom-categories', async (req, res) => {
  try {
    const categories = await db.select().from(customCategories).orderBy(desc(customCategories.createdAt));
    res.json(categories);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/custom-categories', async (req, res) => {
  try {
    const newCategory = await db.insert(customCategories).values(req.body).returning();
    res.json(newCategory[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
