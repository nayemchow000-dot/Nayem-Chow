export type Priority = 'growing' | 'stable' | 'needs_attention' | 'high_priority';

export interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  age?: number | null;
  area?: string | null;
  firstContactDate: string;
  currentStage: number;
  growthScore: number;
  weeklyChange: number;
  monthlyChange: number;
  priorityLevel: Priority;
  fajrTarget?: boolean;
  jummahTarget?: boolean;
  deeniyatTarget?: boolean;
  tafseerTarget?: boolean;
  photoUrl?: string;
  categoryTags?: string[];
  createdByAccountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalahRecord {
  id: string;
  contactId: string;
  date: string;
  fajr?: string | null;
  dhuhr?: string | null;
  asr?: string | null;
  maghrib?: string | null;
  isha?: string | null;
  createdAt: string;
}

export interface ActivityRecord {
  id: string;
  contactId: string;
  activityType: string;
  date: string;
  notes?: string | null;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  contactId: string;
  date: string;
  durationMinutes?: number | null;
  topic?: string | null;
  response?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  assignedTo?: string | null;
  reminderNote?: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  banglaName?: string | null;
  description?: string | null;
  image?: string | null;
  icon?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface AiVoiceEntry {
  id: string;
  contactId: string;
  adminUserId?: string | null;
  adminUsername?: string | null;
  originalTranscription: string;
  editedTranscription: string;
  aiObservations: string[];
  existingIndicators: Array<{ id: string; name: string; banglaName?: string | null }>;
  suggestedIndicators: Array<{ categoryId: string; name: string; banglaName?: string | null; reason: string; confidence: number }>;
  uncertainObservations: Array<{ statement: string; possibleCategoryId?: string | null; possibleCategoryName?: string | null; question: string }>;
  indicatorUpdates: {
    suggestedStage?: number | null;
    stageReason?: string | null;
    suggestedPriority?: Priority | null;
    fajrTarget?: boolean | null;
    jummahTarget?: boolean | null;
    deeniyatTarget?: boolean | null;
    tafseerTarget?: boolean | null;
  };
  approvedCategoryIds: string[];
  approvedChanges: Record<string, any>;
  status: 'pending' | 'approved' | 'cancelled';
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberAiInsights {
  id: string;
  contactId: string;
  sourceEntryId?: string | null;
  gapAnalysis?: {
    achieved: string[];
    needsAttention: string[];
    unknownInfo: string[];
    nextSteps: string[];
  } | null;
  dawahGuidance?: {
    nextStage: string;
    topicToDiscuss: string;
    adviceOrInvitation: string;
    activityToEncourage: string;
    followUpQuestions: string[];
    practicalNextAction: string;
  } | null;
  updatedAt: string;
}

export interface Observation {
  id: string;
  contactId: string;
  category: string;
  observation: string;
  level?: string | null;
  source?: string | null;
  sourceVoiceEntryId?: string | null;
  date: string;
  createdAt: string;
}

export const STAGES = [
  "নতুন পরিচিতি",
  "দাওয়াহ দেওয়া হয়েছে",
  "ইতিবাচক সাড়া",
  "নিয়মিত যোগাযোগ",
  "সালাতের উন্নতি",
  "মসজিদের সাথে সংযোগ",
  "জামাতে অংশগ্রহণ",
  "ফজরের সাথে সংযোগ",
  "কুরআন ও দ্বীনি শিক্ষা",
  "ইলমি মুহাজারা / পাঠচক্র",
  "দাওয়াহ মুভমেন্টের সাথে সংযোগ",
  "ফজর ক্যাম্পেইনে অংশগ্রহণ",
  "ব্যক্তিগত আমলের উন্নতি",
  "চরিত্র ও পারিবারিক উন্নতি",
  "দাওয়াহ কাজে অংশগ্রহণ",
  "সক্রিয় দাওয়াহ কর্মী"
];

export type UserRole = 'admin' | 'responsible' | 'member';

export interface MemberPermissions {
  viewAssignedMembers?: boolean;
  logDawahForOthers?: boolean;
  useVoiceUpdate?: boolean;
}

export interface PrivacySettings {
  isPublic: boolean;
  shareSlug?: string | null;
  customBio?: string | null;
  privacyProfileInfo: boolean;
  privacyGrowthStage: boolean;
  privacyGrowthJourney: boolean;
  privacySalahTracking: boolean;
  privacyActivities: boolean;
  privacyPhone: boolean;
  privacyArea: boolean;
}

export interface MemberAccount extends PrivacySettings {
  id: string;
  contactId?: string | null;
  username: string;
  role: UserRole;
  permissions?: MemberPermissions;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contact?: Contact | null;
  assignedContactIds?: string[];
}

export interface PublicProfileData {
  isPublic: boolean;
  message?: string;
  id?: string;
  name?: string;
  username?: string;
  slug?: string;
  customBio?: string | null;
  photoUrl?: string | null;
  area?: string | null;
  phone?: string | null;
  currentStage?: number;
  stageName?: string;
  growthScore?: number;
  priorityLevel?: string;
  weeklyChange?: number;
  monthlyChange?: number;
  categoryTags?: string[];
  salahRecords?: SalahRecord[];
  activities?: ActivityRecord[];
  settings?: {
    showProfileInfo: boolean;
    showGrowthStage: boolean;
    showGrowthJourney: boolean;
    showSalahTracking: boolean;
    showActivities: boolean;
    showPhone: boolean;
    showArea: boolean;
  };
}

export interface TrackerItem {
  id: string;
  key: string;
  banglaLabel: string;
  group: 'amal' | 'dawah';
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface MemberDailyReport {
  id: string;
  memberAccountId: string;
  contactId?: string | null;
  reportDate: string;
  items: Record<string, boolean>;
  itemMinutes?: Record<string, number>;
  totalProductiveMinutes?: number;
  note?: string | null;
  status: 'draft' | 'submitted' | 'skipped';
  wasSharedAtSubmit?: boolean;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScreenTimeDataSource =
  | 'manual'
  | 'android_usage_access'
  | 'ios_screen_time'
  | 'companion_sync';

export interface ScreenTimeRecord {
  id: string;
  memberAccountId: string;
  contactId?: string | null;
  recordDate: string;
  minutes: number;
  dataSource: ScreenTimeDataSource;
  wasSharedAtSubmit?: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDawahLog {
  id: string;
  memberAccountId: string;
  date: string;
  targetContactId?: string | null;
  targetName?: string | null;
  description: string;
  outcome?: string | null;
  createdAt: string;
}

export interface MemberNote {
  id: string;
  memberAccountId: string;
  date: string;
  body: string;
  createdAt: string;
}

export interface MemberSharingSettings {
  memberAccountId: string;
  monitoringEnabled: boolean;
  shareDailyAmal: boolean;
  shareDawahActivities: boolean;
  sharePersonalNotes: boolean;
  shareWeeklySummary: boolean;
  shareProductiveTime: boolean;
  shareScreenTime: boolean;
  updatedAt: string;
}

export interface AssignedResponsibleWorker {
  id: string;
  name: string;
  username: string;
  phone?: string | null;
}

export type CareUrgency = 'urgent' | 'soon' | 'ok';
export type CareChannel = 'call' | 'whatsapp' | 'visit' | 'mosque' | 'note';
export type CareTaskStatus = 'open' | 'done' | 'snoozed' | 'dismissed';

export interface CareTask {
  id: string;
  contactId: string;
  assignedAccountId?: string | null;
  urgency: CareUrgency;
  title: string;
  reason: string;
  suggestedAction: string;
  channel: CareChannel;
  dueAt?: string | null;
  status: CareTaskStatus;
  snoozedUntil?: string | null;
  cycleNo: number;
  sourceSignals: string[];
  completedOutcome?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CareSnapshot {
  contactId: string;
  gapKeys: string[];
  urgency: CareUrgency;
  openTaskCount: number;
  nextStepSummary?: string | null;
  aiRefinedAt?: string | null;
  recomputedAt: string;
}

export interface MemberCareSummary {
  contactId: string;
  urgency: CareUrgency;
  openTaskCount: number;
  gapKeys: string[];
  nextStepSummary?: string | null;
  topTask?: CareTask | null;
}

export interface MemberReminder {
  id: string;
  memberAccountId: string;
  itemKey?: string | null;
  title?: string | null;
  time: string;
  daysOfWeek: number[];
  isActive: boolean;
  createdAt: string;
}

export interface PortalSettings {
  featureMyDawahTrack: boolean;
  featureCareRadar: boolean;
  careNoContactSoonDays: number;
  careNoContactUrgentDays: number;
  careStalledStageDays: number;
}

