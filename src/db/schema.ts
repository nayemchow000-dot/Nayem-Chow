import { pgTable, text, timestamp, integer, uuid, date, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum('priority', ['growing', 'stable', 'needs_attention', 'high_priority']);

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  age: integer('age'),
  area: text('area'),
  firstContactDate: date('first_contact_date').notNull(),
  currentStage: integer('current_stage').default(1).notNull(),
  growthScore: integer('growth_score').default(0).notNull(),
  weeklyChange: integer('weekly_change').default(0).notNull(),
  monthlyChange: integer('monthly_change').default(0).notNull(),
  priorityLevel: priorityEnum('priority_level').default('stable').notNull(),
  fajrTarget: boolean('fajr_target').default(false).notNull(),
  jummahTarget: boolean('jummah_target').default(false).notNull(),
  deeniyatTarget: boolean('deeniyat_target').default(false).notNull(),
  tafseerTarget: boolean('tafseer_target').default(false).notNull(),
  photoUrl: text('photo_url'),
  categoryTags: jsonb('category_tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const salahRecords = pgTable('salah_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  date: date('date').notNull(),
  fajr: text('fajr'),
  dhuhr: text('dhuhr'),
  asr: text('asr'),
  maghrib: text('maghrib'),
  isha: text('isha'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityRecords = pgTable('activity_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  activityType: text('activity_type').notNull(),
  date: date('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const followUps = pgTable('follow_ups', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  date: date('date').notNull(),
  durationMinutes: integer('duration_minutes').default(0),
  topic: text('topic'),
  response: text('response'),
  nextAction: text('next_action'),
  nextActionDate: date('next_action_date'),
  assignedTo: text('assigned_to'),
  reminderNote: text('reminder_note'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const observations = pgTable('observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull(),
  category: text('category').notNull(),
  observation: text('observation').notNull(),
  level: text('level'),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const generalActivities = pgTable('general_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  activityType: text('activity_type').notNull(),
  date: date('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customCategories = pgTable('custom_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(), // System identifier (English)
  banglaName: text('bangla_name'),
  description: text('description'),
  image: text('image'),
  coverImage: text('cover_image'),
  icon: text('icon'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const brandingSettings = pgTable('branding_settings', {
  id: integer('id').primaryKey(),
  primaryLogo: text('primary_logo'),
  mobileLogo: text('mobile_logo'),
  favicon: text('favicon'),
  heroBackground: text('hero_background'),
  cornerImage: text('corner_image'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberAccounts = pgTable('member_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('member').notNull(), // 'admin' | 'member'
  isActive: boolean('is_active').default(true).notNull(),

  // Privacy & Public Sharing
  isPublic: boolean('is_public').default(false).notNull(),
  shareSlug: text('share_slug').unique(),
  customBio: text('custom_bio'),
  privacyProfileInfo: boolean('privacy_profile_info').default(true).notNull(),
  privacyGrowthStage: boolean('privacy_growth_stage').default(true).notNull(),
  privacyGrowthJourney: boolean('privacy_growth_journey').default(true).notNull(),
  privacySalahTracking: boolean('privacy_salah_tracking').default(true).notNull(),
  privacyActivities: boolean('privacy_activities').default(true).notNull(),
  privacyPhone: boolean('privacy_phone').default(false).notNull(),
  privacyArea: boolean('privacy_area').default(true).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiVoiceEntries = pgTable('ai_voice_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  adminUserId: uuid('admin_user_id').references(() => memberAccounts.id, { onDelete: 'set null' }),
  adminUsername: text('admin_username'),
  originalTranscription: text('original_transcription').notNull(),
  editedTranscription: text('edited_transcription').notNull(),
  aiObservations: jsonb('ai_observations').$type<string[]>().default([]),
  existingIndicators: jsonb('existing_indicators').$type<Array<{ id: string; name: string; banglaName?: string | null }>>().default([]),
  suggestedIndicators: jsonb('suggested_indicators').$type<Array<{ categoryId: string; name: string; banglaName?: string | null; reason: string; confidence: number }>>().default([]),
  uncertainObservations: jsonb('uncertain_observations').$type<Array<{ statement: string; possibleCategoryId?: string | null; possibleCategoryName?: string | null; question: string }>>().default([]),
  indicatorUpdates: jsonb('indicator_updates').$type<{
    suggestedStage?: number | null;
    stageReason?: string | null;
    suggestedPriority?: string | null;
    fajrTarget?: boolean | null;
    jummahTarget?: boolean | null;
    deeniyatTarget?: boolean | null;
    tafseerTarget?: boolean | null;
  }>().default({}),
  approvedCategoryIds: jsonb('approved_category_ids').$type<string[]>().default([]),
  approvedChanges: jsonb('approved_changes').$type<Record<string, any>>().default({}),
  status: text('status').default('pending').notNull(), // 'pending' | 'approved' | 'cancelled'
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberAiInsights = pgTable('member_ai_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull().unique(),
  sourceEntryId: uuid('source_entry_id').references(() => aiVoiceEntries.id, { onDelete: 'set null' }),
  gapAnalysis: jsonb('gap_analysis').$type<{
    achieved: string[];
    needsAttention: string[];
    unknownInfo: string[];
    nextSteps: string[];
  }>(),
  dawahGuidance: jsonb('dawah_guidance').$type<{
    nextStage: string;
    topicToDiscuss: string;
    adviceOrInvitation: string;
    activityToEncourage: string;
    followUpQuestions: string[];
    practicalNextAction: string;
  }>(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
