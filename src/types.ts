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
  createdAt: string;
}

export interface Observation {
  id: string;
  contactId: string;
  category: string;
  observation: string;
  level?: string | null;
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
  role: 'admin' | 'member';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contact?: Contact | null;
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

