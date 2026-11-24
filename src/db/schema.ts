import { pgTable, text, timestamp, integer, uuid, date, pgEnum, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import type { MemberPermissions } from "../types";

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
  createdByAccountId: uuid('created_by_account_id'),
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
  source: text('source').default('admin'),
  sourceVoiceEntryId: uuid('source_voice_entry_id'),
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
  featureMyDawahTrack: boolean('feature_my_dawah_track').default(true),
  featureCareRadar: boolean('feature_care_radar').default(true),
  careNoContactSoonDays: integer('care_no_contact_soon_days').default(7),
  careNoContactUrgentDays: integer('care_no_contact_urgent_days').default(14),
  careStalledStageDays: integer('care_stalled_stage_days').default(30),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberAccounts = pgTable('member_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('member').notNull(), // 'admin' | 'responsible' | 'member'
  permissions: jsonb('permissions').$type<MemberPermissions>().default({}),
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

export const memberAssignments = pgTable('member_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  responsibleAccountId: uuid('responsible_account_id').references(() => memberAccounts.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('member_assignments_resp_contact_idx').on(t.responsibleAccountId, t.contactId),
]);

export const trackerItems = pgTable('tracker_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  banglaLabel: text('bangla_label').notNull(),
  group: text('group').default('amal').notNull(), // 'amal' | 'dawah'
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memberDailyReports = pgTable('member_daily_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberAccountId: uuid('member_account_id').references(() => memberAccounts.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  reportDate: date('report_date').notNull(),
  items: jsonb('items').$type<Record<string, boolean>>().default({}).notNull(),
  note: text('note'),
  status: text('status').default('draft').notNull(), // 'draft' | 'submitted' | 'skipped'
  wasSharedAtSubmit: boolean('was_shared_at_submit').default(false).notNull(),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('member_daily_reports_acc_date_idx').on(t.memberAccountId, t.reportDate),
]);

export const memberDawahLogs = pgTable('member_dawah_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberAccountId: uuid('member_account_id').references(() => memberAccounts.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  targetContactId: uuid('target_contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  outcome: text('outcome'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memberNotes = pgTable('member_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberAccountId: uuid('member_account_id').references(() => memberAccounts.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memberSharingSettings = pgTable('member_sharing_settings', {
  memberAccountId: uuid('member_account_id').references(() => memberAccounts.id, { onDelete: 'cascade' }).primaryKey(),
  monitoringEnabled: boolean('monitoring_enabled').default(false).notNull(),
  shareDailyAmal: boolean('share_daily_amal').default(false).notNull(),
  shareDawahActivities: boolean('share_dawah_activities').default(false).notNull(),
  sharePersonalNotes: boolean('share_personal_notes').default(false).notNull(),
  shareWeeklySummary: boolean('share_weekly_summary').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberSharingLog = pgTable('member_sharing_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberAccountId: uuid('member_account_id').references(() => memberAccounts.id, { onDelete: 'cascade' }).notNull(),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  before: jsonb('before').$type<Record<string, any>>().notNull(),
  after: jsonb('after').$type<Record<string, any>>().notNull(),
});

export const careTasks = pgTable('care_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  assignedAccountId: uuid('assigned_account_id').references(() => memberAccounts.id, { onDelete: 'set null' }),
  urgency: text('urgency').default('ok').notNull(), // 'urgent' | 'soon' | 'ok'
  title: text('title').notNull(),
  reason: text('reason').notNull(),
  suggestedAction: text('suggested_action').notNull(),
  channel: text('channel').default('call').notNull(), // 'call' | 'whatsapp' | 'visit' | 'mosque' | 'note'
  dueAt: timestamp('due_at'),
  status: text('status').default('open').notNull(), // 'open' | 'done' | 'snoozed' | 'dismissed'
  snoozedUntil: timestamp('snoozed_until'),
  cycleNo: integer('cycle_no').default(1).notNull(),
  sourceSignals: jsonb('source_signals').$type<string[]>().default([]).notNull(),
  completedOutcome: text('completed_outcome'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const careSnapshots = pgTable('care_snapshots', {
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).primaryKey(),
  gapKeys: jsonb('gap_keys').$type<string[]>().default([]).notNull(),
  urgency: text('urgency').default('ok').notNull(),
  openTaskCount: integer('open_task_count').default(0).notNull(),
  nextStepSummary: text('next_step_summary'),
  aiRefinedAt: timestamp('ai_refined_at'),
  recomputedAt: timestamp('recomputed_at').defaultNow().notNull(),
});

export const memberReminders = pgTable('member_reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberAccountId: uuid('member_account_id').references(() => memberAccounts.id, { onDelete: 'cascade' }).notNull(),
  itemKey: text('item_key'),
  title: text('title'),
  time: text('time').notNull(), // HH:mm
  daysOfWeek: jsonb('days_of_week').$type<number[]>().default([0, 1, 2, 3, 4, 5, 6]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

