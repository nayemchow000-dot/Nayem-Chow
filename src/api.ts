import { Router } from 'express';
import { db, ensureAiTables } from './db/db';
import { contacts, followUps, observations, salahRecords, activityRecords, generalActivities, customCategories, brandingSettings, memberAccounts, aiVoiceEntries, memberAiInsights } from './db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken, parseToken, TokenPayload } from './lib/auth';
import { STAGES } from './types';
import { syncMemberAccounts } from './lib/syncAccounts';
import { transcribeBengaliAudio, analyzeVoiceNoteForMember, generateGapAnalysisAndGuidance, chatWithDawahAssistant } from './lib/ai';

export const apiRouter = Router();

// Run non-destructive AI table initialization and self-healing sync once in background
ensureAiTables()
  .then(() => syncMemberAccounts())
  .catch(e => console.error('[Init Sync]', e));

function getAuthUser(req: any): TokenPayload | null {
  const authHeader = req.headers.authorization;
  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/kotbari_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }
  if (!token) return null;
  return parseToken(token);
}

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Branding Endpoints
apiRouter.get('/branding', async (req, res) => {
  try {
    const settings = await db.select().from(brandingSettings).where(eq(brandingSettings.id, 1));
    if (settings.length > 0) {
      res.json(settings[0]);
    } else {
      res.json({});
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/branding', async (req, res) => {
  try {
    const { primaryLogo, mobileLogo, favicon, heroBackground, cornerImage } = req.body;
    const existing = await db.select().from(brandingSettings).where(eq(brandingSettings.id, 1));
    
    if (existing.length > 0) {
      const updated = await db.update(brandingSettings)
        .set({ primaryLogo, mobileLogo, favicon, heroBackground, cornerImage, updatedAt: new Date() })
        .where(eq(brandingSettings.id, 1))
        .returning();
      res.json(updated[0]);
    } else {
      const inserted = await db.insert(brandingSettings)
        .values({ id: 1, primaryLogo, mobileLogo, favicon, heroBackground, cornerImage })
        .returning();
      res.json(inserted[0]);
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
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
    const authUser = getAuthUser(req);
    // If a regular member is logged in, only return their own contact to protect other members' privacy
    if (authUser && authUser.role === 'member' && authUser.contactId) {
      const myContact = await db.select().from(contacts).where(eq(contacts.id, authUser.contactId));
      return res.json(myContact);
    }
    const allContacts = await db.select().from(contacts).orderBy(desc(contacts.updatedAt));
    res.json(allContacts);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/contacts', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    // Regular members cannot create other contacts directly
    if (authUser && authUser.role === 'member') {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন নতুন মেম্বার যোগ করতে পারবেন।' });
    }
    const newContact = await db.insert(contacts).values(req.body).returning();
    res.json(newContact[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/contacts/:id', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    // If a regular member is logged in, prevent them from accessing other members' private profiles
    if (authUser && authUser.role === 'member' && authUser.contactId && authUser.contactId !== req.params.id) {
      return res.status(403).json({ error: 'অন্য কোনো মেম্বারের প্রাইভেট প্রোফাইল দেখার অনুমতি নেই।' });
    }
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
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন।' });
    }
    // Regular member can only update their own profile
    if (authUser.role === 'member' && authUser.contactId && authUser.contactId !== req.params.id) {
      return res.status(403).json({ error: 'অন্য কোনো মেম্বারের তথ্য পরিবর্তনের অনুমতি নেই।' });
    }

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
    const authUser = getAuthUser(req);
    // Only admin can delete contacts
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন মেম্বার ডিলিট করতে পারবেন।' });
    }

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
    const authUser = getAuthUser(req);
    if (authUser && authUser.role === 'member' && authUser.contactId && authUser.contactId !== req.params.id) {
      return res.status(403).json({ error: 'অন্য কোনো মেম্বারের সালাহ রেকর্ড দেখার অনুমতি নেই।' });
    }
    const records = await db.select().from(salahRecords).where(eq(salahRecords.contactId, req.params.id));
    res.json(records);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/contacts/:id/salah', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন।' });
    }
    if (authUser.role === 'member' && authUser.contactId && authUser.contactId !== req.params.id) {
      return res.status(403).json({ error: 'অন্য কোনো মেম্বারের সালাহ রেকর্ড পরিবর্তনের অনুমতি নেই।' });
    }

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
    const categories = await db.select().from(customCategories).orderBy(desc(customCategories.displayOrder), desc(customCategories.createdAt));
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

apiRouter.put('/custom-categories/:id', async (req, res) => {
  try {
    const oldCat = await db.select().from(customCategories).where(eq(customCategories.id, req.params.id));
    if (!oldCat.length) return res.status(404).json({error: 'Not found'});
    
    const oldName = oldCat[0].name;
    const newName = req.body.name;
    
    const dataToUpdate = { ...req.body };
    delete dataToUpdate.id;
    delete dataToUpdate.createdAt;

    const updated = await db.update(customCategories)
      .set(dataToUpdate)
      .where(eq(customCategories.id, req.params.id))
      .returning();
      
    // If the category name changed, update all contacts holding this category
    if (newName && newName !== oldName) {
      const allContacts = await db.select().from(contacts);
      for (const c of allContacts) {
        const tags = c.categoryTags || [];
        if (tags.includes(oldName)) {
          const newTags = tags.map(t => t === oldName ? newName : t);
          await db.update(contacts).set({ categoryTags: newTags }).where(eq(contacts.id, c.id));
        }
      }
    }
    
    res.json(updated[0]);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/custom-categories/:id', async (req, res) => {
  try {
    const oldCat = await db.select().from(customCategories).where(eq(customCategories.id, req.params.id));
    if (oldCat.length > 0) {
       const oldName = oldCat[0].name;
       const allContacts = await db.select().from(contacts);
       for (const c of allContacts) {
         const tags = c.categoryTags || [];
         if (tags.includes(oldName)) {
           const newTags = tags.filter(t => t !== oldName);
           await db.update(contacts).set({ categoryTags: newTags }).where(eq(contacts.id, c.id));
         }
       }
       await db.delete(customCategories).where(eq(customCategories.id, req.params.id));
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/contacts/bulk-assign-category', async (req, res) => {
  try {
    const { categoryName, addedContactIds, removedContactIds } = req.body;
    
    if (addedContactIds && addedContactIds.length > 0) {
      const allAdded = await db.select().from(contacts);
      for (const c of allAdded) {
        if (addedContactIds.includes(c.id)) {
           const tags = c.categoryTags || [];
           if (!tags.includes(categoryName)) {
             await db.update(contacts).set({ categoryTags: [...tags, categoryName] }).where(eq(contacts.id, c.id));
           }
        }
      }
    }
    
    if (removedContactIds && removedContactIds.length > 0) {
      const allRemoved = await db.select().from(contacts);
      for (const c of allRemoved) {
        if (removedContactIds.includes(c.id)) {
           const tags = c.categoryTags || [];
           if (tags.includes(categoryName)) {
             await db.update(contacts).set({ categoryTags: tags.filter(t => t !== categoryName) }).where(eq(contacts.id, c.id));
           }
        }
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// AUTHENTICATION & MULTI-USER SYSTEM ROUTES
// ==========================================

// Login with Username or Phone + Password
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'ইউজারনেম বা ফোন নম্বর এবং পাসওয়ার্ড আবশ্যক।' });
    }

    const cleanInput = String(username).trim();
    const cleanPhone = cleanInput.replace(/[^0-9]/g, '');

    const accounts = await db.select().from(memberAccounts);
    let matched = accounts.find(a => a.username.toLowerCase() === cleanInput.toLowerCase());

    if (!matched && cleanPhone.length >= 6) {
      matched = accounts.find(a => a.username.replace(/[^0-9]/g, '') === cleanPhone);
      if (!matched) {
        const allContacts = await db.select().from(contacts);
        const contactMatch = allContacts.find(c => (c.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
        if (contactMatch) {
          matched = accounts.find(a => a.contactId === contactMatch.id);
        }
      }
    }

    if (!matched || !matched.isActive) {
      return res.status(401).json({ error: 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয় অথবা একাউন্টটি নিষ্ক্রিয়।' });
    }

    const isMatch = verifyPassword(password, matched.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'পাসওয়ার্ড সঠিক নয়।' });
    }

    let contactData: any = null;
    if (matched.contactId) {
      const c = await db.select().from(contacts).where(eq(contacts.id, matched.contactId));
      if (c.length > 0) contactData = c[0];
    }

    const token = generateToken({
      userId: matched.id,
      role: matched.role as 'admin' | 'member',
      contactId: matched.contactId,
      username: matched.username,
    });

    const { passwordHash, ...safeUser } = matched;
    res.setHeader('Set-Cookie', `kotbari_token=${token}; Path=/; SameSite=Lax; Max-Age=2592000`);
    res.json({
      token,
      user: {
        ...safeUser,
        contact: contactData,
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Member Self-Registration
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { name, phone, area, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'নাম, মোবাইল নম্বর এবং পাসওয়ার্ড আবশ্যক।' });
    }
    if (String(password).trim().length < 4) {
      return res.status(400).json({ error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const cleanUsername = cleanPhone.length >= 6 ? cleanPhone : String(phone).trim();

    // Check if account with that username already exists
    const existing = await db.select().from(memberAccounts).where(eq(memberAccounts.username, cleanUsername));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'এই মোবাইল নম্বর বা ইউজারনেম দিয়ে ইতোমধ্যে একাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।' });
    }

    // Check if an existing contact with this phone already exists in contacts
    const allContacts = await db.select().from(contacts);
    let contactId: string;
    let contactData: any;

    const matchedContact = allContacts.find(c => (c.phone || '').replace(/[^0-9]/g, '') === cleanPhone);
    if (matchedContact) {
      contactId = matchedContact.id;
      contactData = matchedContact;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const newContact = await db.insert(contacts).values({
        name: String(name).trim(),
        phone: String(phone).trim(),
        area: area ? String(area).trim() : 'কোটবাড়ি',
        currentStage: 1,
        growthScore: 0,
        weeklyChange: 0,
        monthlyChange: 0,
        priorityLevel: 'stable',
        fajrTarget: false,
        jummahTarget: false,
        deeniyatTarget: false,
        tafseerTarget: false,
        categoryTags: [],
        firstContactDate: today,
      }).returning();
      contactId = newContact[0].id;
      contactData = newContact[0];
    }

    const passwordHash = hashPassword(password);
    const slug = `brother-${contactId.substring(0, 8)}`;

    const newAccount = await db.insert(memberAccounts).values({
      contactId,
      username: cleanUsername,
      passwordHash,
      role: 'member',
      isActive: true,
      isPublic: false,
      shareSlug: slug,
      customBio: `কোটবাড়ি দাওয়াহ মুভমেন্টের সদস্য: ${String(name).trim()}`,
      privacyProfileInfo: true,
      privacyGrowthStage: true,
      privacyGrowthJourney: true,
      privacySalahTracking: true,
      privacyActivities: true,
      privacyPhone: false,
      privacyArea: true,
    }).returning();

    const token = generateToken({
      userId: newAccount[0].id,
      role: 'member',
      contactId,
      username: cleanUsername,
    });

    const { passwordHash: _, ...safeUser } = newAccount[0];
    res.setHeader('Set-Cookie', `kotbari_token=${token}; Path=/; SameSite=Lax; Max-Age=2592000`);
    res.json({
      token,
      user: {
        ...safeUser,
        contact: contactData,
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Current User Details
apiRouter.get('/auth/me', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন।' });
    }

    const accountRes = await db.select().from(memberAccounts).where(eq(memberAccounts.id, authUser.userId));
    if (accountRes.length === 0 || !accountRes[0].isActive) {
      return res.status(401).json({ error: 'একাউন্ট পাওয়া যায়নি।' });
    }

    const account = accountRes[0];
    let contactData: any = null;
    if (account.contactId) {
      const c = await db.select().from(contacts).where(eq(contacts.id, account.contactId));
      if (c.length > 0) contactData = c[0];
    }

    const { passwordHash, ...safeUser } = account;
    res.json({
      user: {
        ...safeUser,
        contact: contactData,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Member Privacy Settings
apiRouter.put('/auth/privacy', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    // Admins can update any member's privacy, regular members only their own
    const targetUserId = (authUser.role === 'admin' && req.body.userId) ? req.body.userId : authUser.userId;
    const {
      isPublic,
      shareSlug,
      customBio,
      privacyProfileInfo,
      privacyGrowthStage,
      privacyGrowthJourney,
      privacySalahTracking,
      privacyActivities,
      privacyPhone,
      privacyArea
    } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (isPublic !== undefined) updateData.isPublic = !!isPublic;
    if (shareSlug !== undefined && String(shareSlug).trim()) {
      updateData.shareSlug = String(shareSlug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    }
    if (customBio !== undefined) updateData.customBio = customBio;
    if (privacyProfileInfo !== undefined) updateData.privacyProfileInfo = !!privacyProfileInfo;
    if (privacyGrowthStage !== undefined) updateData.privacyGrowthStage = !!privacyGrowthStage;
    if (privacyGrowthJourney !== undefined) updateData.privacyGrowthJourney = !!privacyGrowthJourney;
    if (privacySalahTracking !== undefined) updateData.privacySalahTracking = !!privacySalahTracking;
    if (privacyActivities !== undefined) updateData.privacyActivities = !!privacyActivities;
    if (privacyPhone !== undefined) updateData.privacyPhone = !!privacyPhone;
    if (privacyArea !== undefined) updateData.privacyArea = !!privacyArea;

    const updated = await db.update(memberAccounts)
      .set(updateData)
      .where(eq(memberAccounts.id, targetUserId))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, ...safe } = updated[0];
    res.json(safe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Password
apiRouter.put('/auth/password', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
    }

    const accountRes = await db.select().from(memberAccounts).where(eq(memberAccounts.id, authUser.userId));
    if (accountRes.length === 0) return res.status(404).json({ error: 'একাউন্ট পাওয়া যায়নি।' });

    if (currentPassword) {
      const match = verifyPassword(currentPassword, accountRes[0].passwordHash);
      if (!match) return res.status(400).json({ error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' });
    }

    const newHash = hashPassword(newPassword);
    await db.update(memberAccounts)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(memberAccounts.id, authUser.userId));

    res.json({ message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUBLIC PROFILE VIEW (STRICT PRIVACY FILTERING)
// ==========================================
apiRouter.get('/public/profile/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const accounts = await db.select().from(memberAccounts);
    const account = accounts.find(a => 
      a.shareSlug === slug || 
      a.id === slug || 
      a.username === slug || 
      (a.contactId && a.contactId === slug)
    );

    if (!account || !account.isActive) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    // If member has set entire profile to private
    if (!account.isPublic) {
      return res.json({
        isPublic: false,
        message: 'এই প্রোফাইলটি বর্তমানে প্রাইভেট রয়েছে। শুধুমাত্র অথরাইজড মেম্বাররা দেখতে পারবেন।',
        name: 'কোটবাড়ি দাওয়াহ মুভমেন্ট সদস্য',
      });
    }

    let contactData: any = null;
    if (account.contactId) {
      const c = await db.select().from(contacts).where(eq(contacts.id, account.contactId));
      if (c.length > 0) contactData = c[0];
    }

    const result: any = {
      isPublic: true,
      id: account.id,
      username: account.username,
      slug: account.shareSlug,
      customBio: account.customBio,
      settings: {
        showProfileInfo: account.privacyProfileInfo,
        showGrowthStage: account.privacyGrowthStage,
        showGrowthJourney: account.privacyGrowthJourney,
        showSalahTracking: account.privacySalahTracking,
        showActivities: account.privacyActivities,
        showPhone: account.privacyPhone,
        showArea: account.privacyArea,
      }
    };

    if (contactData) {
      result.name = contactData.name;
      result.photoUrl = contactData.photoUrl;

      // Section 1: Profile basic info
      if (account.privacyProfileInfo) {
        if (account.privacyArea) result.area = contactData.area;
        if (account.privacyPhone) result.phone = contactData.phone;
      }

      // Section 2: Growth Stage
      if (account.privacyGrowthStage) {
        result.currentStage = contactData.currentStage;
        result.stageName = STAGES[contactData.currentStage - 1] || `Stage ${contactData.currentStage}`;
        result.growthScore = contactData.growthScore;
        result.priorityLevel = contactData.priorityLevel;
        result.weeklyChange = contactData.weeklyChange;
        result.monthlyChange = contactData.monthlyChange;
      }

      // Section 3: Growth Journey
      if (account.privacyGrowthJourney) {
        result.categoryTags = contactData.categoryTags;
        result.firstContactDate = contactData.firstContactDate;
      }

      // Section 4: Salah Tracking
      if (account.privacySalahTracking) {
        const records = await db.select().from(salahRecords)
          .where(eq(salahRecords.contactId, contactData.id))
          .orderBy(desc(salahRecords.date))
          .limit(7);
        result.salahRecords = records;
      }

      // Section 5: Activities
      if (account.privacyActivities) {
        const memberActivities = await db.select().from(activityRecords)
          .where(eq(activityRecords.contactId, contactData.id))
          .orderBy(desc(activityRecords.date))
          .limit(10);
        result.activities = memberActivities;
      }
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN PANEL: MEMBER ACCOUNTS MANAGEMENT
// ==========================================

apiRouter.get('/admin/accounts', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const accounts = await db.select().from(memberAccounts).orderBy(desc(memberAccounts.createdAt));
    const allContacts = await db.select().from(contacts);
    const contactMap = new Map(allContacts.map(c => [c.id, c]));

    const result = accounts.map(a => {
      const { passwordHash, ...safe } = a;
      return {
        ...safe,
        contact: a.contactId ? contactMap.get(a.contactId) || null : null,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/admin/accounts', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { username, password, role, contactId, isPublic, customBio } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = await db.select().from(memberAccounts).where(eq(memberAccounts.username, String(username).trim()));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = hashPassword(password);
    const shareSlug = `brother-${Math.random().toString(36).substring(2, 9)}`;

    const newAcc = await db.insert(memberAccounts).values({
      username: String(username).trim(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'member',
      contactId: contactId || null,
      isPublic: !!isPublic,
      shareSlug,
      customBio: customBio || null,
    }).returning();

    const { passwordHash: _, ...safe } = newAcc[0];
    res.json(safe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/admin/accounts/:id', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { role, isActive, password, isPublic, contactId, customBio, shareSlug } = req.body;
    const updateData: any = { updatedAt: new Date() };

    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = !!isActive;
    if (isPublic !== undefined) updateData.isPublic = !!isPublic;
    if (contactId !== undefined) updateData.contactId = contactId || null;
    if (customBio !== undefined) updateData.customBio = customBio;
    if (shareSlug !== undefined && String(shareSlug).trim()) {
      updateData.shareSlug = String(shareSlug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    }
    if (password && String(password).trim()) {
      updateData.passwordHash = hashPassword(password);
    }

    const updated = await db.update(memberAccounts)
      .set(updateData)
      .where(eq(memberAccounts.id, req.params.id))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: 'Account not found' });
    const { passwordHash: _, ...safe } = updated[0];
    res.json(safe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/admin/accounts/:id', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.delete(memberAccounts).where(eq(memberAccounts.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GLOBAL SEARCH (NAME OR CATEGORY)
// ==========================================
apiRouter.get('/search', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন।' });
    }

    const q = String(req.query.q || '').trim().toLowerCase();
    const [allContacts, allCategories] = await Promise.all([
      authUser.role === 'member' && authUser.contactId
        ? db.select().from(contacts).where(eq(contacts.id, authUser.contactId))
        : db.select().from(contacts).orderBy(desc(contacts.updatedAt)),
      db.select().from(customCategories),
    ]);

    const catMap = new Map(allCategories.map(c => [c.name.toLowerCase(), c]));
    const matchingCategoryNames = new Set(
      allCategories
        .filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.banglaName && c.banglaName.toLowerCase().includes(q))
        )
        .map(c => c.name.toLowerCase())
    );

    const results = allContacts
      .filter(c => {
        if (!q) return true;
        const nameMatch = c.name.toLowerCase().includes(q);
        const areaMatch = (c.area || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').toLowerCase().includes(q);
        const stageName = (STAGES[(c.currentStage || 1) - 1] || '').toLowerCase();
        const stageMatch = stageName.includes(q);
        const tags = Array.isArray(c.categoryTags) ? c.categoryTags : [];
        const tagMatch = tags.some(tag => {
          const lower = tag.toLowerCase();
          return lower.includes(q) || matchingCategoryNames.has(lower);
        });
        return nameMatch || areaMatch || phoneMatch || stageMatch || tagMatch;
      })
      .slice(0, 15)
      .map(c => {
        const tags = Array.isArray(c.categoryTags) ? c.categoryTags : [];
        const resolvedCategories = tags.map(t => {
          const cat = catMap.get(t.toLowerCase());
          return cat ? (cat.banglaName || cat.name) : t;
        });
        return {
          id: c.id,
          name: c.name,
          area: c.area,
          phone: c.phone,
          currentStage: c.currentStage,
          stageName: STAGES[(c.currentStage || 1) - 1] || `Stage ${c.currentStage}`,
          priorityLevel: c.priorityLevel,
          categories: resolvedCategories,
        };
      });

    res.json(results);
  } catch (err: any) {
    console.error('[Search Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// FOLLOW-UPS & REMINDERS SYSTEM
// ==========================================
apiRouter.get('/contacts/:id/follow-ups', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.role === 'member' && authUser.contactId && authUser.contactId !== req.params.id) {
      return res.status(403).json({ error: 'অনুমতি নেই।' });
    }

    const items = await db.select().from(followUps)
      .where(eq(followUps.contactId, req.params.id))
      .orderBy(desc(followUps.date), desc(followUps.createdAt));

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/contacts/:id/follow-ups', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন ফলো-আপ ও রিমাইন্ডার যোগ করতে পারবেন।' });
    }

    const { date, durationMinutes, topic, response, nextAction, nextActionDate, assignedTo, reminderNote } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];

    const created = await db.insert(followUps).values({
      contactId: req.params.id,
      date: date || todayStr,
      durationMinutes: durationMinutes ? Number(durationMinutes) : 0,
      topic: topic || null,
      response: response || null,
      nextAction: nextAction || reminderNote || null,
      nextActionDate: nextActionDate || null,
      assignedTo: assignedTo || null,
      reminderNote: reminderNote || nextAction || null,
      isCompleted: false,
    }).returning();

    res.json(created[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/follow-ups/:followUpId', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { isCompleted, nextActionDate, assignedTo, reminderNote, nextAction, topic, response } = req.body;
    const updateData: any = {};
    if (isCompleted !== undefined) {
      updateData.isCompleted = !!isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }
    if (nextActionDate !== undefined) updateData.nextActionDate = nextActionDate || null;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (reminderNote !== undefined) updateData.reminderNote = reminderNote || null;
    if (nextAction !== undefined) updateData.nextAction = nextAction || null;
    if (topic !== undefined) updateData.topic = topic || null;
    if (response !== undefined) updateData.response = response || null;

    const updated = await db.update(followUps)
      .set(updateData)
      .where(eq(followUps.id, req.params.followUpId))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: 'Follow-up not found' });
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/follow-ups/:followUpId', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.delete(followUps).where(eq(followUps.id, req.params.followUpId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AI VOICE INPUT, MATCHING, APPROVAL & AUDIT
// ==========================================

// 1. Transcribe Bengali voice note audio
apiRouter.post('/ai/transcribe', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন ভয়েস ইনপুট ব্যবহার করতে পারবেন।' });
    }

    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'অডিও ডাটা পাওয়া যায়নি।' });
    }

    const transcription = await transcribeBengaliAudio(audioBase64, mimeType || 'audio/webm');
    res.json({ transcription });
  } catch (err: any) {
    console.error('[AI Transcribe Error]', err);
    res.status(500).json({ error: err.message || 'ভয়েস ট্রান্সক্রিপশনে সমস্যা হয়েছে।' });
  }
});

// 2. Analyze Bengali text against real DB categories & create PENDING review record (does NOT modify member!)
apiRouter.post('/ai/analyze-voice', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন AI বিশ্লেষণ চালাতে পারবেন।' });
    }

    const { contactId, transcription, originalTranscription } = req.body;
    if (!contactId || !transcription || !String(transcription).trim()) {
      return res.status(400).json({ error: 'মেম্বার আইডি এবং বাংলা নোট আবশ্যক।' });
    }

    const [contactRows, allCategories, existingObs] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.id, contactId)),
      db.select().from(customCategories).orderBy(desc(customCategories.displayOrder)),
      db.select().from(observations).where(eq(observations.contactId, contactId)).orderBy(desc(observations.date)).limit(15),
    ]);

    if (contactRows.length === 0) {
      return res.status(404).json({ error: 'মেম্বার খুঁজে পাওয়া যায়নি।' });
    }

    const contact = contactRows[0];
    const analysis = await analyzeVoiceNoteForMember({
      contact,
      categories: allCategories,
      existingObservations: existingObs,
      transcription: String(transcription).trim(),
    });

    const currentTags = new Set((contact.categoryTags || []).map(t => t.toLowerCase()));
    const existingIndicators = allCategories
      .filter(c => currentTags.has(c.name.toLowerCase()))
      .map(c => ({ id: c.id, name: c.name, banglaName: c.banglaName }));

    const pendingEntry = await db.insert(aiVoiceEntries).values({
      contactId: contact.id,
      adminUserId: authUser.userId,
      adminUsername: authUser.username,
      originalTranscription: String(originalTranscription || transcription).trim(),
      editedTranscription: String(transcription).trim(),
      aiObservations: analysis.observations,
      existingIndicators,
      suggestedIndicators: analysis.suggestedCategories,
      uncertainObservations: analysis.uncertainObservations,
      indicatorUpdates: analysis.indicatorUpdates,
      status: 'pending',
    }).returning();

    res.json({
      entry: pendingEntry[0],
      member: {
        id: contact.id,
        name: contact.name,
        area: contact.area,
        currentStage: contact.currentStage,
        priorityLevel: contact.priorityLevel,
        categoryTags: contact.categoryTags || [],
      },
      allCategories: allCategories.filter(c => c.isActive !== false),
    });
  } catch (err: any) {
    console.error('[AI Analyze Voice Error]', err);
    res.status(500).json({ error: err.message || 'AI বিশ্লেষণে সমস্যা হয়েছে।' });
  }
});

// 3. Explicit Admin Approval — only NOW write validated updates + audit log + Gap Analysis & Guidance
apiRouter.post('/ai/voice-entries/:entryId/approve', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন অনুমোদন (Approve) করতে পারবেন।' });
    }

    const entryRows = await db.select().from(aiVoiceEntries).where(eq(aiVoiceEntries.id, req.params.entryId));
    if (entryRows.length === 0) {
      return res.status(404).json({ error: 'AI রিভিউ রেকর্ড পাওয়া যায়নি।' });
    }
    const entry = entryRows[0];
    if (entry.status === 'approved') {
      return res.status(400).json({ error: 'এই রেকর্ডটি ইতোমধ্যে অনুমোদিত হয়েছে।' });
    }

    const {
      editedTranscription,
      approvedCategoryIds = [],
      approvedObservations = [],
      applyStage,
      applyPriority,
      fajrTarget,
      jummahTarget,
      deeniyatTarget,
      tafseerTarget,
    } = req.body;

    const [contactRows, allCategories] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.id, entry.contactId)),
      db.select().from(customCategories),
    ]);

    if (contactRows.length === 0) {
      return res.status(404).json({ error: 'মেম্বার খুঁজে পাওয়া যায়নি।' });
    }
    const contact = contactRows[0];

    // Validate approved category IDs strictly against real DB categories
    const catById = new Map(allCategories.map(c => [c.id, c]));
    const validatedCategoryIds: string[] = [];
    const existingTags: string[] = Array.isArray(contact.categoryTags) ? [...contact.categoryTags] : [];
    const existingLower = new Set(existingTags.map(t => t.toLowerCase()));

    for (const catId of Array.isArray(approvedCategoryIds) ? approvedCategoryIds : []) {
      const cat = catById.get(String(catId));
      if (cat) {
        validatedCategoryIds.push(cat.id);
        if (!existingLower.has(cat.name.toLowerCase())) {
          existingTags.push(cat.name);
          existingLower.add(cat.name.toLowerCase());
        }
      }
    }

    const contactUpdate: any = {
      categoryTags: existingTags,
      updatedAt: new Date(),
    };
    if (typeof applyStage === 'number' && applyStage >= 1 && applyStage <= 16) {
      contactUpdate.currentStage = applyStage;
    }
    if (applyPriority && ['growing', 'stable', 'needs_attention', 'high_priority'].includes(applyPriority)) {
      contactUpdate.priorityLevel = applyPriority;
    }
    if (typeof fajrTarget === 'boolean') contactUpdate.fajrTarget = fajrTarget;
    if (typeof jummahTarget === 'boolean') contactUpdate.jummahTarget = jummahTarget;
    if (typeof deeniyatTarget === 'boolean') contactUpdate.deeniyatTarget = deeniyatTarget;
    if (typeof tafseerTarget === 'boolean') contactUpdate.tafseerTarget = tafseerTarget;

    const updatedContacts = await db.update(contacts)
      .set(contactUpdate)
      .where(eq(contacts.id, contact.id))
      .returning();
    const updatedContact = updatedContacts[0];

    // Save approved observations into observations table for auditability
    const todayStr = new Date().toISOString().split('T')[0];
    const obsList: string[] = Array.isArray(approvedObservations) && approvedObservations.length > 0
      ? approvedObservations.map(String).filter(Boolean)
      : (entry.aiObservations || []);

    if (obsList.length > 0) {
      await db.insert(observations).values(
        obsList.map(text => ({
          contactId: contact.id,
          category: 'AI Voice Note',
          observation: text,
          level: 'observed',
          date: todayStr,
        }))
      );
    }

    const approvedChanges = {
      addedCategories: validatedCategoryIds.map(id => catById.get(id)?.banglaName || catById.get(id)?.name || id),
      currentStage: contactUpdate.currentStage || contact.currentStage,
      priorityLevel: contactUpdate.priorityLevel || contact.priorityLevel,
      observationsCount: obsList.length,
    };

    const updatedEntryRows = await db.update(aiVoiceEntries)
      .set({
        editedTranscription: editedTranscription ? String(editedTranscription).trim() : entry.editedTranscription,
        approvedCategoryIds: validatedCategoryIds,
        approvedChanges,
        status: 'approved',
        approvedAt: new Date(),
        updatedAt: new Date(),
        adminUserId: authUser.userId,
        adminUsername: authUser.username,
      })
      .where(eq(aiVoiceEntries.id, entry.id))
      .returning();

    // Generate & persist Gap Analysis and Personalized Dawah Guidance after approval
    const [allObs, salahList, followUpList, actList] = await Promise.all([
      db.select().from(observations).where(eq(observations.contactId, contact.id)).orderBy(desc(observations.date)),
      db.select().from(salahRecords).where(eq(salahRecords.contactId, contact.id)).orderBy(desc(salahRecords.date)).limit(14),
      db.select().from(followUps).where(eq(followUps.contactId, contact.id)).orderBy(desc(followUps.date)).limit(10),
      db.select().from(activityRecords).where(eq(activityRecords.contactId, contact.id)).orderBy(desc(activityRecords.date)).limit(10),
    ]);

    let insightsRecord: any = null;
    try {
      const insights = await generateGapAnalysisAndGuidance({
        contact: updatedContact,
        categories: allCategories,
        observations: allObs,
        salahRecords: salahList,
        followUps: followUpList,
        activityRecords: actList,
      });

      const existingInsight = await db.select().from(memberAiInsights).where(eq(memberAiInsights.contactId, contact.id));
      if (existingInsight.length > 0) {
        const resIns = await db.update(memberAiInsights)
          .set({
            sourceEntryId: entry.id,
            gapAnalysis: insights.gapAnalysis,
            dawahGuidance: insights.dawahGuidance,
            updatedAt: new Date(),
          })
          .where(eq(memberAiInsights.contactId, contact.id))
          .returning();
        insightsRecord = resIns[0];
      } else {
        const resIns = await db.insert(memberAiInsights).values({
          contactId: contact.id,
          sourceEntryId: entry.id,
          gapAnalysis: insights.gapAnalysis,
          dawahGuidance: insights.dawahGuidance,
        }).returning();
        insightsRecord = resIns[0];
      }
    } catch (insightErr) {
      console.error('[Post-Approval Insights Warning]', insightErr);
    }

    res.json({
      success: true,
      entry: updatedEntryRows[0],
      contact: updatedContact,
      insights: insightsRecord,
    });
  } catch (err: any) {
    console.error('[AI Approve Voice Error]', err);
    res.status(500).json({ error: err.message || 'অনুমোদন সংরক্ষণে সমস্যা হয়েছে।' });
  }
});

// 4. Cancel a pending AI review
apiRouter.post('/ai/voice-entries/:entryId/cancel', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updated = await db.update(aiVoiceEntries)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(aiVoiceEntries.id, req.params.entryId))
      .returning();

    if (updated.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true, entry: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Voice audit history for a member
apiRouter.get('/contacts/:id/voice-history', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const entries = await db.select().from(aiVoiceEntries)
      .where(eq(aiVoiceEntries.contactId, req.params.id))
      .orderBy(desc(aiVoiceEntries.createdAt));

    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get member AI Gap Analysis & Personalized Dawah Guidance + Observations
apiRouter.get('/contacts/:id/insights', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.role === 'member' && authUser.contactId && authUser.contactId !== req.params.id) {
      return res.status(403).json({ error: 'অনুমতি নেই।' });
    }

    const [insightRows, obsRows, catRows] = await Promise.all([
      db.select().from(memberAiInsights).where(eq(memberAiInsights.contactId, req.params.id)),
      db.select().from(observations).where(eq(observations.contactId, req.params.id)).orderBy(desc(observations.date), desc(observations.createdAt)),
      db.select().from(customCategories),
    ]);

    res.json({
      insights: insightRows[0] || null,
      observations: obsRows,
      categories: catRows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Refresh/Generate Gap Analysis & Dawah Guidance for any member
apiRouter.post('/contacts/:id/insights/refresh', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন AI বিশ্লেষণ তৈরি বা আপডেট করতে পারবেন।' });
    }

    const contactId = req.params.id;
    const [contactRows, allCategories, allObs, salahList, followUpList, actList] = await Promise.all([
      db.select().from(contacts).where(eq(contacts.id, contactId)),
      db.select().from(customCategories),
      db.select().from(observations).where(eq(observations.contactId, contactId)).orderBy(desc(observations.date)),
      db.select().from(salahRecords).where(eq(salahRecords.contactId, contactId)).orderBy(desc(salahRecords.date)).limit(14),
      db.select().from(followUps).where(eq(followUps.contactId, contactId)).orderBy(desc(followUps.date)).limit(10),
      db.select().from(activityRecords).where(eq(activityRecords.contactId, contactId)).orderBy(desc(activityRecords.date)).limit(10),
    ]);

    if (contactRows.length === 0) return res.status(404).json({ error: 'Member not found' });

    const generated = await generateGapAnalysisAndGuidance({
      contact: contactRows[0],
      categories: allCategories,
      observations: allObs,
      salahRecords: salahList,
      followUps: followUpList,
      activityRecords: actList,
    });

    const existing = await db.select().from(memberAiInsights).where(eq(memberAiInsights.contactId, contactId));
    let saved;
    if (existing.length > 0) {
      const updated = await db.update(memberAiInsights)
        .set({
          gapAnalysis: generated.gapAnalysis,
          dawahGuidance: generated.dawahGuidance,
          updatedAt: new Date(),
        })
        .where(eq(memberAiInsights.contactId, contactId))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db.insert(memberAiInsights).values({
        contactId,
        gapAnalysis: generated.gapAnalysis,
        dawahGuidance: generated.dawahGuidance,
      }).returning();
      saved = inserted[0];
    }

    res.json({ insights: saved });
  } catch (err: any) {
    console.error('[Refresh Insights Error]', err);
    res.status(500).json({ error: err.message || 'AI বিশ্লেষণ তৈরি করতে সমস্যা হয়েছে।' });
  }
});

// ==========================================
// ADMIN AI DASHBOARD AGGREGATION
// ==========================================
apiRouter.get('/ai/dashboard', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [allContacts, allEntries, allFollowUps, allObs, allCats] = await Promise.all([
      db.select().from(contacts).orderBy(desc(contacts.updatedAt)),
      db.select().from(aiVoiceEntries).orderBy(desc(aiVoiceEntries.createdAt)).limit(50),
      db.select().from(followUps).orderBy(desc(followUps.createdAt)),
      db.select().from(observations).orderBy(desc(observations.createdAt)).limit(25),
      db.select().from(customCategories),
    ]);

    const contactMap = new Map(allContacts.map(c => [c.id, c]));
    const todayStr = new Date().toISOString().split('T')[0];

    const pendingApprovals = allEntries
      .filter(e => e.status === 'pending')
      .map(e => ({
        ...e,
        memberName: contactMap.get(e.contactId)?.name || 'Unknown Member',
        memberArea: contactMap.get(e.contactId)?.area || null,
      }));

    const recentlyUpdatedVoice = allEntries
      .filter(e => e.status === 'approved')
      .slice(0, 10)
      .map(e => ({
        ...e,
        memberName: contactMap.get(e.contactId)?.name || 'Unknown Member',
        memberStage: contactMap.get(e.contactId)?.currentStage || 1,
      }));

    const upcomingReminders = allFollowUps
      .filter(f => !f.isCompleted && f.nextActionDate && f.nextActionDate >= todayStr)
      .sort((a, b) => (a.nextActionDate || '').localeCompare(b.nextActionDate || ''))
      .map(f => ({
        ...f,
        memberName: contactMap.get(f.contactId)?.name || 'Unknown Member',
        memberPhone: contactMap.get(f.contactId)?.phone || null,
      }));

    const overdueFollowUps = allFollowUps
      .filter(f => !f.isCompleted && f.nextActionDate && f.nextActionDate < todayStr)
      .sort((a, b) => (a.nextActionDate || '').localeCompare(b.nextActionDate || ''))
      .map(f => ({
        ...f,
        memberName: contactMap.get(f.contactId)?.name || 'Unknown Member',
        memberPhone: contactMap.get(f.contactId)?.phone || null,
      }));

    const priorityFollowUpMembers = allContacts
      .filter(c => c.priorityLevel === 'high_priority' || c.priorityLevel === 'needs_attention')
      .slice(0, 12);

    const recentObservations = allObs.map(o => ({
      ...o,
      memberName: contactMap.get(o.contactId)?.name || 'Unknown Member',
    }));

    const obsContactIds = new Set(allObs.map(o => o.contactId));
    const incompleteInfoMembers = allContacts
      .map(c => {
        const missingFields: string[] = [];
        if (!c.phone) missingFields.push('ফোন নম্বর');
        if (!c.area) missingFields.push('এলাকা');
        if (!c.categoryTags || c.categoryTags.length === 0) missingFields.push('ক্যাটাগরি/ইনডিকেটর');
        if (!obsContactIds.has(c.id)) missingFields.push('সাম্প্রতিক পর্যবেক্ষণ');
        return {
          id: c.id,
          name: c.name,
          area: c.area,
          currentStage: c.currentStage,
          missingFields,
        };
      })
      .filter(m => m.missingFields.length > 0)
      .slice(0, 15);

    res.json({
      recentlyUpdatedVoice,
      pendingApprovals,
      overdueFollowUps,
      upcomingReminders,
      priorityFollowUpMembers,
      recentObservations,
      incompleteInfoMembers,
      allCategories: allCats,
    });
  } catch (err: any) {
    console.error('[AI Dashboard Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MULTI-TURN GEMINI DAWAH CHATBOT
// ==========================================
apiRouter.post('/ai/chat', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'চ্যাট ব্যবহার করতে অনুগ্রহ করে লগইন করুন।' });
    }

    const { message, history = [], modelMode = 'standard', contactId } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'বার্তা খালি রাখা যাবে না।' });
    }

    let contextSummary = '';
    if (contactId && (authUser.role === 'admin' || authUser.contactId === contactId)) {
      const cRows = await db.select().from(contacts).where(eq(contacts.id, contactId));
      if (cRows.length > 0) {
        const c = cRows[0];
        contextSummary = `বর্তমান নির্বাচিত সদস্য: ${c.name}, স্টেজ: ${c.currentStage}/16 (${STAGES[(c.currentStage || 1) - 1] || ''}), এলাকা: ${c.area || 'অজানা'}, ক্যাটাগরি: ${(c.categoryTags || []).join(', ') || 'নেই'}`;
      }
    }

    const reply = await chatWithDawahAssistant({
      history: Array.isArray(history) ? history : [],
      message: String(message).trim(),
      userRole: authUser.role,
      userName: authUser.username,
      modelMode: modelMode === 'fast' ? 'fast' : 'standard',
      contextSummary,
    });

    res.json({ reply });
  } catch (err: any) {
    console.error('[AI Chat Error]', err);
    res.status(500).json({ error: err.message || 'AI সহায়ক উত্তর দিতে ব্যর্থ হয়েছে।' });
  }
});


