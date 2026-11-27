import { db } from '../db/db';
import {
  memberAccounts,
  memberAssignments,
  memberSharingSettings,
  memberDailyReports,
  memberScreenTimeRecords,
  memberDawahLogs,
  memberNotes,
  brandingSettings,
  contacts,
} from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { parseToken } from './auth';
import { getDhakaDateStr, computeProductiveMinutes } from './dhakaTime';
import type { AssignedResponsibleWorker, MemberPermissions, UserRole } from '../types';

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
  return (
    (!!authUser.contactId && contact.id === authUser.contactId) ||
    contact.createdByAccountId === authUser.userId
  );
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

export async function getAssignedResponsiblesForContact(
  contactId: string | null | undefined
): Promise<AssignedResponsibleWorker[]> {
  if (!contactId) return [];
  const assigns = await db
    .select()
    .from(memberAssignments)
    .where(eq(memberAssignments.contactId, contactId));
  if (assigns.length === 0) return [];

  const allAccs = await db.select().from(memberAccounts);
  const allContacts = await db
    .select({ id: contacts.id, name: contacts.name, phone: contacts.phone })
    .from(contacts);
  const accMap = new Map(allAccs.map((a) => [a.id, a]));
  const contactMap = new Map(allContacts.map((c) => [c.id, c]));

  const out: AssignedResponsibleWorker[] = [];
  for (const a of assigns) {
    const acc = accMap.get(a.responsibleAccountId);
    if (!acc || !acc.isActive) continue;
    const linked = acc.contactId ? contactMap.get(acc.contactId) : null;
    out.push({
      id: acc.id,
      name: linked?.name || acc.username,
      username: acc.username,
      phone: linked?.phone || null,
    });
  }
  return out;
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
      productiveTimeSummary: null as any,
      screenTimeSummary: null as any,
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
    shareProductiveTime: false,
    shareScreenTime: false,
    updatedAt: new Date(),
  };

  if (!settings.monitoringEnabled) {
    // Monitoring OFF: future/new/unshared data strictly hidden.
    // Only prior records that had explicitly been saved/submitted while sharing was enabled are shown as snapshots.
    const [allSubmitted, allScreenRows] = await Promise.all([
      db
        .select()
        .from(memberDailyReports)
        .where(eq(memberDailyReports.memberAccountId, acc.id))
        .orderBy(desc(memberDailyReports.reportDate))
        .limit(30),
      db
        .select()
        .from(memberScreenTimeRecords)
        .where(eq(memberScreenTimeRecords.memberAccountId, acc.id))
        .orderBy(desc(memberScreenTimeRecords.recordDate))
        .limit(30),
    ]);

    const priorSnapshots = allSubmitted.filter(
      (r) => r.status === 'submitted' && r.wasSharedAtSubmit === true
    );
    const priorScreenSnapshots = allScreenRows.filter((s) => s.wasSharedAtSubmit === true);

    return {
      hasLinkedAccount: true,
      memberAccountId: acc.id,
      monitoringEnabled: false,
      settings,
      previouslySharedOnly: priorSnapshots.length > 0 || priorScreenSnapshots.length > 0,
      dailyReports: priorSnapshots.map((r) => ({ ...r, note: null })),
      dawahLogs: [],
      personalNotes: [],
      weeklySummary: null,
      productiveTimeSummary: null,
      screenTimeSummary:
        priorScreenSnapshots.length > 0
          ? {
              snapshotOnly: true,
              todayMinutes: null,
              todayDataSource: null,
              weeklyAverageMinutes: null,
              history: priorScreenSnapshots.slice(0, 14),
            }
          : null,
    };
  }

  const needReports =
    settings.shareDailyAmal || settings.shareWeeklySummary || settings.shareProductiveTime;

  const [reports, dawahLogs, notes, screenRows] = await Promise.all([
    needReports
      ? db
          .select()
          .from(memberDailyReports)
          .where(eq(memberDailyReports.memberAccountId, acc.id))
          .orderBy(desc(memberDailyReports.reportDate))
          .limit(35)
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
    settings.shareScreenTime
      ? db
          .select()
          .from(memberScreenTimeRecords)
          .where(eq(memberScreenTimeRecords.memberAccountId, acc.id))
          .orderBy(desc(memberScreenTimeRecords.recordDate))
          .limit(30)
      : Promise.resolve([]),
  ]);

  const todayDhaka = getDhakaDateStr(0);
  const sevenDaysStart = getDhakaDateStr(-6);
  const thirtyDaysStart = getDhakaDateStr(-29);

  const submittedReports = reports.filter((r) => r.status === 'submitted');
  let weeklySummary: any = null;
  if (settings.shareWeeklySummary) {
    const weekReps = submittedReports.filter((r) => r.reportDate >= sevenDaysStart);
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

  let productiveTimeSummary: any = null;
  if (settings.shareProductiveTime) {
    // Recompute deterministically from items & itemMinutes (skip 'skipped' reports)
    const activeReps = reports.filter((r) => r.status !== 'skipped');
    const minsFor = (r: any) =>
      computeProductiveMinutes(r.items || {}, r.itemMinutes || {});

    const todayRep = activeReps.find((r) => r.reportDate === todayDhaka);
    const todayMinutes = todayRep ? minsFor(todayRep) : 0;

    const weekReps = activeReps.filter((r) => r.reportDate >= sevenDaysStart);
    const monthReps = activeReps.filter((r) => r.reportDate >= thirtyDaysStart);

    const weekMinutes = weekReps.reduce((s, r) => s + minsFor(r), 0);
    const monthMinutes = monthReps.reduce((s, r) => s + minsFor(r), 0);
    const activeWeekDays = weekReps.filter((r) => minsFor(r) > 0).length;
    const dailyAverageMinutes =
      activeWeekDays > 0 ? Math.round(weekMinutes / activeWeekDays) : 0;

    productiveTimeSummary = {
      todayMinutes,
      weekMinutes,
      monthMinutes,
      dailyAverageMinutes,
      dailySeries: weekReps.map((r) => ({
        date: r.reportDate,
        minutes: minsFor(r),
      })),
    };
  }

  let screenTimeSummary: any = null;
  if (settings.shareScreenTime) {
    const todayScreen = screenRows.find((s) => s.recordDate === todayDhaka) || null;
    const weekScreenRows = screenRows.filter((s) => s.recordDate >= sevenDaysStart);
    const weekSum = weekScreenRows.reduce((s, r) => s + (Number(r.minutes) || 0), 0);
    const weeklyAverageMinutes =
      weekScreenRows.length > 0 ? Math.round(weekSum / weekScreenRows.length) : 0;

    screenTimeSummary = {
      snapshotOnly: false,
      todayMinutes: todayScreen ? todayScreen.minutes : null,
      todayDataSource: todayScreen ? todayScreen.dataSource : null,
      weeklyAverageMinutes,
      recordedDaysInWeek: weekScreenRows.length,
      history: screenRows.slice(0, 14),
    };
  }

  const sanitizeReports = (
    list: typeof submittedReports,
    includeNotes: boolean,
    includeProductiveTime: boolean
  ) =>
    list.map((r) => ({
      ...r,
      note: includeNotes ? r.note : null,
      itemMinutes: includeProductiveTime ? r.itemMinutes || {} : {},
      totalProductiveMinutes: includeProductiveTime
        ? computeProductiveMinutes(r.items || {}, r.itemMinutes || {})
        : null,
    }));

  return {
    hasLinkedAccount: true,
    memberAccountId: acc.id,
    monitoringEnabled: true,
    settings,
    previouslySharedOnly: false,
    dailyReports: settings.shareDailyAmal
      ? sanitizeReports(
          submittedReports,
          Boolean(settings.sharePersonalNotes),
          Boolean(settings.shareProductiveTime)
        )
      : [],
    dawahLogs: settings.shareDawahActivities ? dawahLogs : [],
    personalNotes: settings.sharePersonalNotes ? notes : [],
    weeklySummary,
    productiveTimeSummary,
    screenTimeSummary,
  };
}
