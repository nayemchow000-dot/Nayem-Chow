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
