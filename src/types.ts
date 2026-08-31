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
  "New Contact",
  "Dawah Given",
  "Positive Response",
  "Regular Conversation",
  "Salah Improvement",
  "Mosque Connection",
  "Jama'ah Participation",
  "Fajr Connection",
  "Quran / Islamic Learning",
  "Ilmi Muhajara / Study Circle",
  "Dawah Circle Connection",
  "Fajr Campaign",
  "Personal Amal Development",
  "Character / Family Improvement",
  "Dawah Participation",
  "Active Dawah Brother"
];
