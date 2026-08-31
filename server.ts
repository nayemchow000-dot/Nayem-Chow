import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/db';
import { contacts, followUps, observations, salahRecords, activityRecords, generalActivities, customCategories } from './src/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Seed db if empty
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
        },
        {
          name: 'Karim',
          phone: '01911223344',
          area: 'Mirpur',
          firstContactDate: new Date('2026-08-01').toISOString(),
          currentStage: 1,
          growthScore: 21,
          weeklyChange: -5,
          monthlyChange: -5,
          priorityLevel: 'high_priority',
        },
        {
          name: 'Omar',
          phone: '01611223344',
          area: 'Uttara',
          firstContactDate: new Date('2025-11-20').toISOString(),
          currentStage: 16,
          growthScore: 91,
          weeklyChange: 7,
          monthlyChange: 15,
          priorityLevel: 'stable',
        }
      ]);
      console.log('Seeded database with dummy contacts');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }

  app.get('/api/contacts', async (req, res) => {
    try {
      const allContacts = await db.select().from(contacts).orderBy(desc(contacts.updatedAt));
      res.json(allContacts);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/contacts', async (req, res) => {
    try {
      const newContact = await db.insert(contacts).values(req.body).returning();
      res.json(newContact[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const contact = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
      if (!contact.length) return res.status(404).json({ error: 'Not found' });
      res.json(contact[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/contacts/:id', async (req, res) => {
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

  app.delete('/api/contacts/:id', async (req, res) => {
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

  app.get('/api/contacts/:id/salah', async (req, res) => {
    try {
      const records = await db.select().from(salahRecords).where(eq(salahRecords.contactId, req.params.id));
      res.json(records);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/contacts/:id/salah', async (req, res) => {
    try {
      const { date, fajr, dhuhr, asr, maghrib, isha } = req.body;
      const contactId = req.params.id;
      
      // Upsert logic - since sqlite upsert is tricky without unique constraints,
      // we'll delete the existing date and insert new.
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

  app.get('/api/activities', async (req, res) => {
    try {
      const activities = await db.select().from(generalActivities).orderBy(desc(generalActivities.date), desc(generalActivities.createdAt));
      res.json(activities);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/activities', async (req, res) => {
    try {
      const newActivity = await db.insert(generalActivities).values(req.body).returning();
      res.json(newActivity[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/custom-categories', async (req, res) => {
    try {
      const categories = await db.select().from(customCategories).orderBy(desc(customCategories.createdAt));
      res.json(categories);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/custom-categories', async (req, res) => {
    try {
      const newCategory = await db.insert(customCategories).values(req.body).returning();
      res.json(newCategory[0]);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
