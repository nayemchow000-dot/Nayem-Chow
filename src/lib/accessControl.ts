import { db } from '../db/db';
import {
  memberAccounts,
  memberAssignments,
  memberSharingSettings,
  memberDailyReports,
  memberDawahLogs,
  memberNotes,
  brandingSettings,
} from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { parseToken } from './auth';
import type { MemberPermissions, UserRole } from '../types';

export interface ResolvedAuthUser {
  userId: string;
  username: string;
  role: UserRole;
  permissions: MemberPermissions;
  contactId: string | null;
  assignedContactIds: Set<string>;
}

export async function resolveAuthUser(req: any): Promise<ResolvedAuthUser | null> {
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
  const parsed = parseToken(token);
  if (!parsed) return null;

  try {
    const rows = await db.select().from(memberAccounts).where(eq(memberAccounts.id, parsed.userId));
    if (rows.length === 0 || !rows[0].isActive) return null;
    const acc = rows[0];
    const role: UserRole =
      acc.role === 'admin' ? 'admin' : acc.role === 'responsible' ? 'responsible' : 'member';
    const permissions: MemberPermissions = (acc.permissions || {}) as MemberPermissions;

    const assignedContactIds = new Set<string>();
    if (role === 'responsible') {
      const assignRows = await db
        .select()
        .from(memberAssignments)
        .where(eq(memberAssignments.responsibleAccountId, acc.id));
      for (const a of assignRows) {
        assignedContactIds.add(a.contactId);
      }
    }

    return {
      userId: acc.id,
      username: acc.username,
      role,
      permissions,
      contactId: acc.contactId || null,
      assignedContactIds,
    };
  } catch {
    return null;
  }
}

export async function getPortalFeatureFlags() {
  let dbFlags = {
    featureMyDawahTrack: true,
    featureCareRadar: true,
    careNoContactSoonDays: 7,
    careNoContactUrgentDays: 14,
    careStalledStageDays: 30,
  };
  try {
    const rows = await db.select().from(brandingSettings).where(eq(brandingSettings.id, 1));
    if (rows.length > 0) {
      dbFlags = {
        featureMyDawahTrack: rows[0].featureMyDawahTrack ?? true,
        featureCareRadar: rows[0].featureCareRadar ?? true,
        careNoContactSoonDays: rows[0].careNoContactSoonDays ?? 7,
        careNoContactUrgentDays: rows[0].careNoContactUrgentDays ?? 14,
        careStalledStageDays: rows[0].careStalledStageDays ?? 30,
      };
    }
  } catch {
    // ignore
  }
  return {
    ...dbFlags,
    featureMyDawahTrack:
      process.env.FEATURE_MY_DAWAH_TRACK === 'false' ? false : dbFlags.featureMyDawahTrack,
    featureCareRadar:
      process.env.FEATURE_CARE_RADAR === 'false' ? false : dbFlags.featureCareRadar,
  };
}

export function canAccessContact(
  authUser: ResolvedAuthUser | null,
  contact: { id: string; createdByAccountId?: string | null }
): boolean {
  if (!authUser) return false;
  if (authUser.role === 'admin') return true;
  if (authUser.role === 'responsible') {
    const canViewAssigned = authUser.permissions?.viewAssignedMembers !== false;
    return (
      (!!authUser.contactId && contact.id === authUser.contactId) ||
      contact.createdByAccountId === authUser.userId ||
      (canViewAssigned && authUser.assignedContactIds.has(contact.id))
    );
  }
  return (
    (!!authUser.contactId && contact.id === authUser.contactId) ||
    contact.createdByAccountId === authUser.userId
  );
}

export function canCareForContact(
  authUser: ResolvedAuthUser | null,
  contact: { id: string; createdByAccountId?: string | null }
): boolean {
  if (!authUser) return false;
  if (authUser.role === 'admin') return true;
  if (authUser.role === 'responsible') {
    const canViewAssigned = authUser.permissions?.viewAssignedMembers !== false;
    return (
      (canViewAssigned && authUser.assignedContactIds.has(contact.id)) ||
      contact.createdByAccountId === authUser.userId
    );
  }
  return false;
}

export function canUseVoiceForContact(
  authUser: ResolvedAuthUser | null,
  contact: { id: string; createdByAccountId?: string | null }
): boolean {
  if (!authUser) return false;
  if (authUser.role === 'admin') return true;
  if (authUser.role === 'responsible') {
    return !!authUser.permissions?.useVoiceUpdate && canCareForContact(authUser, contact);
  }
  return false;
}

export function canDeleteContact(
  authUser: ResolvedAuthUser | null,
  contact: { id: string; createdByAccountId?: string | null }
): boolean {
  if (!authUser) return false;
  if (authUser.role === 'admin') return true;
  return (
    (authUser.role === 'member' || authUser.role === 'responsible') &&
    contact.createdByAccountId === authUser.userId &&
    contact.id !== authUser.contactId
  );
}

export async function getConsentedSelfReportForAdmin(contactId: string) {
  const linkedAccounts = await db
    .select()
    .from(memberAccounts)
    .where(eq(memberAccounts.contactId, contactId));

  if (linkedAccounts.length === 0) {
    return {
      hasLinkedAccount: false,
      monitoringEnabled: false,
      settings: null,
      previouslySharedOnly: false,
      dailyReports: [] as any[],
      dawahLogs: [] as any[],
      personalNotes: [] as any[],
      weeklySummary: null as any,
    };
  }

  const acc = linkedAccounts[0];
  const shareRows = await db
    .select()
    .from(memberSharingSettings)
    .where(eq(memberSharingSettings.memberAccountId, acc.id));

  const settings = shareRows[0] || {
    memberAccountId: acc.id,
    monitoringEnabled: false,
    shareDailyAmal: false,
    shareDawahActivities: false,
    sharePersonalNotes: false,
    shareWeeklySummary: false,
    updatedAt: new Date(),
  };

  if (!settings.monitoringEnabled) {
    // Monitoring OFF: future/new/unshared data strictly hidden.
    // Only reports that had previously been submitted while sharing was enabled are shown with the snapshot label.
    const allSubmitted = await db
      .select()
      .from(memberDailyReports)
      .where(eq(memberDailyReports.memberAccountId, acc.id))
      .orderBy(desc(memberDailyReports.reportDate))
      .limit(30);

    const priorSnapshots = allSubmitted.filter(
      (r) => r.status === 'submitted' && r.wasSharedAtSubmit === true
    );

    return {
      hasLinkedAccount: true,
      memberAccountId: acc.id,
      monitoringEnabled: false,
      settings,
      previouslySharedOnly: priorSnapshots.length > 0,
      dailyReports: priorSnapshots.map((r) => ({ ...r, note: null })),
      dawahLogs: [],
      personalNotes: [],
      weeklySummary: null,
    };
  }

  const [reports, dawahLogs, notes] = await Promise.all([
    settings.shareDailyAmal || settings.shareWeeklySummary
      ? db
          .select()
          .from(memberDailyReports)
          .where(eq(memberDailyReports.memberAccountId, acc.id))
          .orderBy(desc(memberDailyReports.reportDate))
          .limit(30)
      : Promise.resolve([]),
    settings.shareDawahActivities
      ? db
          .select()
          .from(memberDawahLogs)
          .where(eq(memberDawahLogs.memberAccountId, acc.id))
          .orderBy(desc(memberDawahLogs.date))
          .limit(30)
      : Promise.resolve([]),
    settings.sharePersonalNotes
      ? db
          .select()
          .from(memberNotes)
          .where(eq(memberNotes.memberAccountId, acc.id))
          .orderBy(desc(memberNotes.date))
          .limit(30)
      : Promise.resolve([]),
  ]);

  const submittedReports = reports.filter((r) => r.status === 'submitted');
  let weeklySummary: any = null;
  if (settings.shareWeeklySummary) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekReps = submittedReports.filter((r) => r.reportDate >= sevenDaysAgo);
    let checkedTotal = 0;
    let totalSlots = 0;
    for (const r of weekReps) {
      const vals = Object.values(r.items || {});
      checkedTotal += vals.filter(Boolean).length;
      totalSlots += Math.max(vals.length, 1);
    }
    weeklySummary = {
      daysReported: weekReps.length,
      completionPct: totalSlots > 0 ? Math.round((checkedTotal / totalSlots) * 100) : 0,
      lastReportDate: submittedReports[0]?.reportDate || null,
    };
  }

  const sanitizeReports = (list: typeof submittedReports, includeNotes: boolean) =>
    list.map((r) => ({
      ...r,
      note: includeNotes ? r.note : null,
    }));

  return {
    hasLinkedAccount: true,
    memberAccountId: acc.id,
    monitoringEnabled: true,
    settings,
    previouslySharedOnly: false,
    dailyReports: settings.shareDailyAmal
      ? sanitizeReports(submittedReports, Boolean(settings.sharePersonalNotes))
      : [],
    dawahLogs: settings.shareDawahActivities ? dawahLogs : [],
    personalNotes: settings.sharePersonalNotes ? notes : [],
    weeklySummary,
  };
}
