import { Router } from 'express';
import { db, ensureAiTables } from '../db/db';
import {
  contacts,
  observations,
  salahRecords,
  trackerItems,
  memberDailyReports,
  memberScreenTimeRecords,
  memberDawahLogs,
  memberNotes,
  memberSharingSettings,
  memberSharingLog,
  memberAssignments,
  memberAccounts,
  careTasks,
  careSnapshots,
  memberReminders,
  brandingSettings,
} from '../db/schema';
import { eq, desc, and, asc } from 'drizzle-orm';
import {
  resolveAuthUser,
  getPortalFeatureFlags,
  canCareForContact,
  canAccessContact,
  getConsentedSelfReportForAdmin,
  getAssignedResponsiblesForContact,
} from './accessControl';
import {
  recomputeCareForContact,
  completeCareTaskAndGenerateNext,
} from './careRadar';
import { analyzeVoiceForMyTrack } from './ai';
import {
  getDhakaDateStr,
  formatDhakaDisplayDateBn,
  computeProductiveMinutes,
  sanitizeItemMinutes,
} from './dhakaTime';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getDateStr(offsetDays = 0): string {
  return getDhakaDateStr(offsetDays);
}

function isDateEditableForMember(dateStr: string): boolean {
  // Editable today and yesterday in Asia/Dhaka timezone
  const today = getDateStr(0);
  const yesterday = getDateStr(-1);
  return dateStr === today || dateStr === yesterday;
}

function isValidScreenTimeDateForMember(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const today = getDateStr(0);
  const sevenDaysAgo = getDateStr(-6);
  return dateStr >= sevenDaysAgo && dateStr <= today;
}

export const portalRouter = Router();

// ==========================================
// PORTAL FEATURE FLAGS & SETTINGS
// ==========================================
portalRouter.get('/portal/settings', async (req, res) => {
  try {
    await ensureAiTables();
    const flags = await getPortalFeatureFlags();
    res.json(flags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.put('/portal/settings', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const {
      featureMyDawahTrack,
      featureCareRadar,
      careNoContactSoonDays,
      careNoContactUrgentDays,
      careStalledStageDays,
    } = req.body;

    const existing = await db.select().from(brandingSettings).where(eq(brandingSettings.id, 1));
    const updatePayload: any = { updatedAt: new Date() };
    if (typeof featureMyDawahTrack === 'boolean') updatePayload.featureMyDawahTrack = featureMyDawahTrack;
    if (typeof featureCareRadar === 'boolean') updatePayload.featureCareRadar = featureCareRadar;
    if (Number.isFinite(Number(careNoContactSoonDays))) {
      updatePayload.careNoContactSoonDays = Math.max(1, Math.min(60, Math.round(Number(careNoContactSoonDays))));
    }
    if (Number.isFinite(Number(careNoContactUrgentDays))) {
      updatePayload.careNoContactUrgentDays = Math.max(2, Math.min(90, Math.round(Number(careNoContactUrgentDays))));
    }
    if (Number.isFinite(Number(careStalledStageDays))) {
      updatePayload.careStalledStageDays = Math.max(5, Math.min(180, Math.round(Number(careStalledStageDays))));
    }

    if (existing.length > 0) {
      await db.update(brandingSettings).set(updatePayload).where(eq(brandingSettings.id, 1));
    } else {
      await db.insert(brandingSettings).values({ id: 1, ...updatePayload });
    }
    res.json(await getPortalFeatureFlags());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TRACKER ITEMS (ADMIN CONFIG + MEMBER READ)
// ==========================================
portalRouter.get('/tracker-items', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন।' });
    const items = await db
      .select()
      .from(trackerItems)
      .where(eq(trackerItems.isActive, true))
      .orderBy(asc(trackerItems.displayOrder), asc(trackerItems.createdAt));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.get('/admin/tracker-items', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const items = await db
      .select()
      .from(trackerItems)
      .orderBy(asc(trackerItems.displayOrder), asc(trackerItems.createdAt));
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/admin/tracker-items', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const banglaLabel = String(req.body?.banglaLabel || '').trim();
    const group = req.body?.group === 'dawah' ? 'dawah' : 'amal';
    const rawKey = String(req.body?.key || '').trim();
    const key =
      rawKey ||
      `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!banglaLabel) {
      return res.status(400).json({ error: 'আইটেমের বাংলা নাম আবশ্যক।' });
    }
    const displayOrder = Number.isFinite(Number(req.body?.displayOrder))
      ? Math.round(Number(req.body.displayOrder))
      : 99;
    const inserted = await db
      .insert(trackerItems)
      .values({ key, banglaLabel, group, isActive: true, displayOrder })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.put('/admin/tracker-items/:id', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const updateData: any = {};
    if (req.body?.banglaLabel !== undefined) updateData.banglaLabel = String(req.body.banglaLabel).trim();
    if (req.body?.group === 'amal' || req.body?.group === 'dawah') updateData.group = req.body.group;
    if (typeof req.body?.isActive === 'boolean') updateData.isActive = req.body.isActive;
    if (Number.isFinite(Number(req.body?.displayOrder))) updateData.displayOrder = Math.round(Number(req.body.displayOrder));

    const updated = await db
      .update(trackerItems)
      .set(updateData)
      .where(eq(trackerItems.id, req.params.id))
      .returning();
    if (updated.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.delete('/admin/tracker-items/:id', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    await db.delete(trackerItems).where(eq(trackerItems.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PHASE 2: MY DAWAH TRACK (/api/my-track/*)
// Scoped strictly to req.user.userId
// ==========================================
portalRouter.get('/my-track/today', async (req, res) => {
  try {
    await ensureAiTables();
    const flags = await getPortalFeatureFlags();
    if (!flags.featureMyDawahTrack) {
      return res.status(403).json({ error: 'My Dawah Track বর্তমানে বন্ধ আছে।' });
    }
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'অনুগ্রহ করে লগইন করুন।' });

    const requestedDate = String(req.query.date || getDateStr(0));
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : getDateStr(0);

    const [itemsList, existingReports, recentReports, salahTodayRows] = await Promise.all([
      db.select().from(trackerItems).where(eq(trackerItems.isActive, true)).orderBy(asc(trackerItems.displayOrder)),
      db
        .select()
        .from(memberDailyReports)
        .where(and(eq(memberDailyReports.memberAccountId, authUser.userId), eq(memberDailyReports.reportDate, reportDate))),
      db
        .select()
        .from(memberDailyReports)
        .where(eq(memberDailyReports.memberAccountId, authUser.userId))
        .orderBy(desc(memberDailyReports.reportDate))
        .limit(35),
      authUser.contactId
        ? db
            .select()
            .from(salahRecords)
            .where(and(eq(salahRecords.contactId, authUser.contactId), eq(salahRecords.date, reportDate)))
        : Promise.resolve([]),
    ]);

    const todayReport = existingReports[0]
      ? {
          ...existingReports[0],
          itemMinutes: existingReports[0].itemMinutes || {},
          totalProductiveMinutes: computeProductiveMinutes(
            existingReports[0].items || {},
            existingReports[0].itemMinutes || {}
          ),
        }
      : null;

    // Compute current streak in Asia/Dhaka
    let streak = 0;
    const submittedDates = new Set(recentReports.filter((r) => r.status === 'submitted').map((r) => r.reportDate));
    for (let offset = 0; offset < 35; offset++) {
      const d = getDateStr(-offset);
      if (submittedDates.has(d)) {
        streak++;
      } else if (offset === 0) {
        continue; // Today might not be submitted yet
      } else {
        break;
      }
    }

    res.json({
      reportDate,
      dhakaToday: getDateStr(0),
      displayDateBn: formatDhakaDisplayDateBn(reportDate),
      editable: isDateEditableForMember(reportDate),
      trackerItems: itemsList,
      report: todayReport,
      salahRecord: salahTodayRows[0] || null,
      streak,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.put('/my-track/today', async (req, res) => {
  try {
    await ensureAiTables();
    const flags = await getPortalFeatureFlags();
    if (!flags.featureMyDawahTrack) return res.status(403).json({ error: 'Feature disabled' });
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const requestedDate = String(req.body?.reportDate || getDateStr(0));
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : getDateStr(0);

    if (!isDateEditableForMember(reportDate)) {
      return res.status(400).json({ error: 'শুধুমাত্র আজ ও গতকালের রিপোর্ট সম্পাদনা করা যাবে।' });
    }

    const existing = await db
      .select()
      .from(memberDailyReports)
      .where(and(eq(memberDailyReports.memberAccountId, authUser.userId), eq(memberDailyReports.reportDate, reportDate)));

    const itemsProvided = req.body?.items && typeof req.body.items === 'object';
    const sanitizedItems: Record<string, boolean> = itemsProvided
      ? Object.fromEntries(Object.entries(req.body.items).map(([k, v]) => [String(k), Boolean(v)]))
      : (existing[0]?.items as Record<string, boolean>) || {};

    const itemMinutesProvided = req.body?.itemMinutes && typeof req.body.itemMinutes === 'object';
    const sanitizedItemMinutes: Record<string, number> = itemMinutesProvided
      ? sanitizeItemMinutes(req.body.itemMinutes)
      : sanitizeItemMinutes(existing[0]?.itemMinutes || {});

    const totalProductiveMinutes = computeProductiveMinutes(sanitizedItems, sanitizedItemMinutes);
    const note = req.body?.note !== undefined ? (req.body.note ? String(req.body.note) : null) : undefined;

    let saved;
    if (existing.length > 0) {
      const updateObj: any = {
        items: sanitizedItems,
        itemMinutes: sanitizedItemMinutes,
        totalProductiveMinutes,
        updatedAt: new Date(),
      };
      if (note !== undefined) updateObj.note = note;
      const updated = await db
        .update(memberDailyReports)
        .set(updateObj)
        .where(eq(memberDailyReports.id, existing[0].id))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(memberDailyReports)
        .values({
          memberAccountId: authUser.userId,
          contactId: authUser.contactId,
          reportDate,
          items: sanitizedItems,
          itemMinutes: sanitizedItemMinutes,
          totalProductiveMinutes,
          note: note ?? null,
          status: 'draft',
        })
        .returning();
      saved = inserted[0];
    }

    res.json({ report: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/my-track/report/submit', async (req, res) => {
  try {
    await ensureAiTables();
    const flags = await getPortalFeatureFlags();
    if (!flags.featureMyDawahTrack) return res.status(403).json({ error: 'Feature disabled' });
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const requestedDate = String(req.body?.reportDate || getDateStr(0));
    const reportDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : getDateStr(0);

    if (!isDateEditableForMember(reportDate)) {
      return res.status(400).json({ error: 'এই তারিখের রিপোর্ট জমা দেওয়ার সময় শেষ হয়েছে।' });
    }

    const status = req.body?.status === 'skipped' ? 'skipped' : 'submitted';
    const itemsInput = req.body?.items && typeof req.body.items === 'object' ? req.body.items : undefined;
    const itemMinutesInput = req.body?.itemMinutes && typeof req.body.itemMinutes === 'object' ? req.body.itemMinutes : undefined;
    const note = req.body?.note !== undefined ? (req.body.note ? String(req.body.note) : null) : undefined;

    // Check current sharing consent to record snapshot flag cleanly
    const shareRows = await db
      .select()
      .from(memberSharingSettings)
      .where(eq(memberSharingSettings.memberAccountId, authUser.userId));
    const isSharingDailyNow = Boolean(
      shareRows[0]?.monitoringEnabled &&
        (shareRows[0]?.shareDailyAmal || shareRows[0]?.shareProductiveTime)
    );

    const existing = await db
      .select()
      .from(memberDailyReports)
      .where(and(eq(memberDailyReports.memberAccountId, authUser.userId), eq(memberDailyReports.reportDate, reportDate)));

    const sanitizedItems: Record<string, boolean> = itemsInput
      ? Object.fromEntries(Object.entries(itemsInput).map(([k, v]) => [String(k), Boolean(v)]))
      : (existing[0]?.items as Record<string, boolean>) || {};

    const sanitizedItemMinutes: Record<string, number> = itemMinutesInput
      ? sanitizeItemMinutes(itemMinutesInput)
      : sanitizeItemMinutes(existing[0]?.itemMinutes || {});

    const totalProductiveMinutes =
      status === 'skipped'
        ? 0
        : computeProductiveMinutes(sanitizedItems, sanitizedItemMinutes);

    let saved;
    if (existing.length > 0) {
      const updateObj: any = {
        status,
        items: sanitizedItems,
        itemMinutes: sanitizedItemMinutes,
        totalProductiveMinutes,
        submittedAt: new Date(),
        updatedAt: new Date(),
        wasSharedAtSubmit: existing[0].wasSharedAtSubmit || (status === 'submitted' && isSharingDailyNow),
      };
      if (note !== undefined) updateObj.note = note;
      const updated = await db
        .update(memberDailyReports)
        .set(updateObj)
        .where(eq(memberDailyReports.id, existing[0].id))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(memberDailyReports)
        .values({
          memberAccountId: authUser.userId,
          contactId: authUser.contactId,
          reportDate,
          items: sanitizedItems,
          itemMinutes: sanitizedItemMinutes,
          totalProductiveMinutes,
          note: note ?? null,
          status,
          wasSharedAtSubmit: status === 'submitted' && isSharingDailyNow,
          submittedAt: new Date(),
        })
        .returning();
      saved = inserted[0];
    }

    if (authUser.contactId) {
      recomputeCareForContact(authUser.contactId, { allowAiRefinement: false }).catch(() => {});
    }

    res.json({ report: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.get('/my-track/summary', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const range = req.query.range === 'month' ? 'month' : 'week';
    const daysCount = range === 'month' ? 30 : 7;
    const todayDhaka = getDateStr(0);
    const startDate = getDateStr(-(daysCount - 1));
    const sevenStart = getDateStr(-6);
    const thirtyStart = getDateStr(-29);

    const [itemsList, reports, dawahLogs, screenRows] = await Promise.all([
      db.select().from(trackerItems).where(eq(trackerItems.isActive, true)).orderBy(asc(trackerItems.displayOrder)),
      db
        .select()
        .from(memberDailyReports)
        .where(eq(memberDailyReports.memberAccountId, authUser.userId))
        .orderBy(desc(memberDailyReports.reportDate)),
      db
        .select()
        .from(memberDawahLogs)
        .where(eq(memberDawahLogs.memberAccountId, authUser.userId))
        .orderBy(desc(memberDawahLogs.date)),
      db
        .select()
        .from(memberScreenTimeRecords)
        .where(eq(memberScreenTimeRecords.memberAccountId, authUser.userId))
        .orderBy(desc(memberScreenTimeRecords.recordDate)),
    ]);

    const rangeReports = reports.filter((r) => r.reportDate >= startDate);
    const reportByDate = new Map(rangeReports.map((r) => [r.reportDate, r]));
    const screenByDate = new Map(screenRows.map((s) => [s.recordDate, s]));
    const activeCount = Math.max(1, itemsList.length);

    const minsForReport = (rep: any) =>
      rep && rep.status !== 'skipped'
        ? computeProductiveMinutes(rep.items || {}, rep.itemMinutes || {})
        : 0;

    const dailySeries = Array.from({ length: daysCount }, (_, idx) => {
      const dateStr = getDateStr(-(daysCount - 1 - idx));
      const rep = reportByDate.get(dateStr);
      const scr = screenByDate.get(dateStr);
      const checkedCount = rep
        ? itemsList.filter((it) => Boolean((rep.items || {})[it.key])).length
        : 0;
      const pct = Math.round((checkedCount / activeCount) * 100);
      return {
        date: dateStr,
        label: dateStr.slice(5),
        completed: checkedCount,
        total: itemsList.length,
        percentage: pct,
        productiveMinutes: minsForReport(rep),
        screenTimeMinutes: scr ? Number(scr.minutes) || 0 : 0,
        status: rep?.status || 'none',
      };
    });

    // Item-wise breakdown (including total time spent on each item in range)
    const itemStats = itemsList.map((it) => {
      let doneDays = 0;
      let totalMinutes = 0;
      for (const r of rangeReports) {
        if ((r.items || {})[it.key]) {
          doneDays++;
          const m = Number((r.itemMinutes || {})[it.key] || 0);
          if (Number.isFinite(m) && m > 0) totalMinutes += m;
        }
      }
      return {
        key: it.key,
        banglaLabel: it.banglaLabel,
        group: it.group,
        doneDays,
        totalMinutes,
        percentage: Math.round((doneDays / daysCount) * 100),
      };
    });

    const todayRep = reports.find((r) => r.reportDate === todayDhaka);
    const todayProductiveMinutes = minsForReport(todayRep);
    const weekProductiveMinutes = reports
      .filter((r) => r.reportDate >= sevenStart)
      .reduce((s, r) => s + minsForReport(r), 0);
    const monthProductiveMinutes = reports
      .filter((r) => r.reportDate >= thirtyStart)
      .reduce((s, r) => s + minsForReport(r), 0);

    const activeRangeDays = dailySeries.filter((d) => d.productiveMinutes > 0).length;
    const rangeProductiveTotal = dailySeries.reduce((s, d) => s + d.productiveMinutes, 0);
    const dailyAverageProductiveMinutes =
      activeRangeDays > 0 ? Math.round(rangeProductiveTotal / activeRangeDays) : 0;

    const todayScreen = screenByDate.get(todayDhaka) || null;
    const weekScreenRows = screenRows.filter((s) => s.recordDate >= sevenStart);
    const weeklyAvgScreenTimeMinutes =
      weekScreenRows.length > 0
        ? Math.round(
            weekScreenRows.reduce((s, r) => s + (Number(r.minutes) || 0), 0) /
              weekScreenRows.length
          )
        : 0;

    const submittedDays = rangeReports.filter((r) => r.status === 'submitted').length;
    const avgPct =
      dailySeries.length > 0
        ? Math.round(dailySeries.reduce((s, d) => s + d.percentage, 0) / dailySeries.length)
        : 0;

    res.json({
      range,
      daysCount,
      dhakaToday: todayDhaka,
      submittedDays,
      avgCompletionPct: avgPct,
      dawahLogsCount: dawahLogs.filter((l) => l.date >= startDate).length,
      productiveSummary: {
        todayMinutes: todayProductiveMinutes,
        weekMinutes: weekProductiveMinutes,
        monthMinutes: monthProductiveMinutes,
        dailyAverageMinutes: dailyAverageProductiveMinutes,
      },
      screenTimeSummary: {
        todayMinutes: todayScreen ? todayScreen.minutes : null,
        todayDataSource: todayScreen ? todayScreen.dataSource : null,
        weeklyAverageMinutes: weeklyAvgScreenTimeMinutes,
      },
      dailySeries,
      itemStats,
      bestItems: [...itemStats].sort((a, b) => b.doneDays - a.doneDays).slice(0, 3),
      focusItems: [...itemStats].sort((a, b) => a.doneDays - b.doneDays).slice(0, 3),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SCREEN TIME & PRODUCTIVE TIME + MEMBER HOME API
// ==========================================
portalRouter.get('/my-time/summary', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const range = req.query.range === 'month' ? 'month' : 'week';
    const daysCount = range === 'month' ? 30 : 7;
    const todayDhaka = getDateStr(0);
    const startDate = getDateStr(-(daysCount - 1));
    const sevenStart = getDateStr(-6);
    const thirtyStart = getDateStr(-29);

    const [itemsList, reports, screenRows] = await Promise.all([
      db.select().from(trackerItems).where(eq(trackerItems.isActive, true)).orderBy(asc(trackerItems.displayOrder)),
      db
        .select()
        .from(memberDailyReports)
        .where(eq(memberDailyReports.memberAccountId, authUser.userId))
        .orderBy(desc(memberDailyReports.reportDate))
        .limit(40),
      db
        .select()
        .from(memberScreenTimeRecords)
        .where(eq(memberScreenTimeRecords.memberAccountId, authUser.userId))
        .orderBy(desc(memberScreenTimeRecords.recordDate))
        .limit(40),
    ]);

    const reportByDate = new Map(reports.map((r) => [r.reportDate, r]));
    const screenByDate = new Map(screenRows.map((s) => [s.recordDate, s]));
    const minsForReport = (rep: any) =>
      rep && rep.status !== 'skipped'
        ? computeProductiveMinutes(rep.items || {}, rep.itemMinutes || {})
        : 0;

    const comparisonSeries = Array.from({ length: daysCount }, (_, idx) => {
      const dateStr = getDateStr(-(daysCount - 1 - idx));
      const rep = reportByDate.get(dateStr);
      const scr = screenByDate.get(dateStr);
      const completedCount = rep
        ? itemsList.filter((it) => Boolean((rep.items || {})[it.key])).length
        : 0;
      return {
        date: dateStr,
        label: dateStr.slice(5),
        screenTimeMinutes: scr ? Number(scr.minutes) || 0 : 0,
        hasScreenTimeRecord: Boolean(scr),
        dataSource: scr?.dataSource || null,
        productiveMinutes: minsForReport(rep),
        completedCount,
      };
    });

    const todayScreen = screenByDate.get(todayDhaka) || null;
    const weekScreenRows = screenRows.filter((s) => s.recordDate >= sevenStart);
    const weeklyAvgScreenTimeMinutes =
      weekScreenRows.length > 0
        ? Math.round(
            weekScreenRows.reduce((s, r) => s + (Number(r.minutes) || 0), 0) /
              weekScreenRows.length
          )
        : 0;

    const todayRep = reportByDate.get(todayDhaka);
    const todayProductiveMinutes = minsForReport(todayRep);
    const weekProductiveMinutes = reports
      .filter((r) => r.reportDate >= sevenStart)
      .reduce((s, r) => s + minsForReport(r), 0);
    const monthProductiveMinutes = reports
      .filter((r) => r.reportDate >= thirtyStart)
      .reduce((s, r) => s + minsForReport(r), 0);

    const activeRangeDays = comparisonSeries.filter((d) => d.productiveMinutes > 0).length;
    const rangeTotalProductive = comparisonSeries.reduce((s, d) => s + d.productiveMinutes, 0);
    const dailyAverageProductiveMinutes =
      activeRangeDays > 0 ? Math.round(rangeTotalProductive / activeRangeDays) : 0;

    // Today activity time breakdown
    const todayActivityBreakdown = itemsList
      .map((it) => {
        const checked = Boolean((todayRep?.items || {})[it.key]);
        const rawMin = Number((todayRep?.itemMinutes || {})[it.key] || 0);
        return {
          key: it.key,
          banglaLabel: it.banglaLabel,
          group: it.group,
          checked,
          minutes: checked && rawMin > 0 ? rawMin : 0,
          rawMinutes: rawMin > 0 ? rawMin : null,
        };
      })
      .filter((x) => x.checked || (x.rawMinutes !== null && x.rawMinutes > 0));

    res.json({
      range,
      dhakaToday: todayDhaka,
      displayDateBn: formatDhakaDisplayDateBn(todayDhaka),
      screenTime: {
        todayMinutes: todayScreen ? todayScreen.minutes : null,
        todayDataSource: todayScreen ? todayScreen.dataSource : null,
        todayNote: todayScreen ? todayScreen.note : null,
        weeklyAverageMinutes: weeklyAvgScreenTimeMinutes,
        recordedDaysInWeek: weekScreenRows.length,
        history: screenRows.filter((s) => s.recordDate >= startDate).slice(0, 30),
      },
      productiveTime: {
        todayMinutes: todayProductiveMinutes,
        weekMinutes: weekProductiveMinutes,
        monthMinutes: monthProductiveMinutes,
        dailyAverageMinutes: dailyAverageProductiveMinutes,
        activeDaysInRange: activeRangeDays,
        todayBreakdown: todayActivityBreakdown,
      },
      comparisonSeries,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.put('/my-time/screen-time', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const requestedDate = String(req.body?.recordDate || getDateStr(0));
    const recordDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : getDateStr(0);

    if (!isValidScreenTimeDateForMember(recordDate)) {
      return res.status(400).json({ error: 'গত ৭ দিন থেকে আজ পর্যন্ত তারিখের স্ক্রিন টাইম আপডেট করা যাবে।' });
    }

    const rawMinutes = Number(req.body?.minutes);
    if (!Number.isFinite(rawMinutes) || rawMinutes < 0 || rawMinutes > 1440) {
      return res.status(400).json({ error: 'দৈনিক স্ক্রিন টাইম ০ থেকে ১৪৪০ মিনিটের (২৪ ঘণ্টা) মধ্যে হতে হবে।' });
    }
    const minutes = Math.round(rawMinutes);

    const allowedSources = ['manual', 'android_usage_access', 'ios_screen_time', 'companion_sync'] as const;
    const dataSource = allowedSources.includes(req.body?.dataSource)
      ? req.body.dataSource
      : 'manual';
    const note = req.body?.note !== undefined ? (req.body.note ? String(req.body.note).trim().slice(0, 300) : null) : undefined;

    const shareRows = await db
      .select()
      .from(memberSharingSettings)
      .where(eq(memberSharingSettings.memberAccountId, authUser.userId));
    const isSharingScreenTimeNow = Boolean(
      shareRows[0]?.monitoringEnabled && shareRows[0]?.shareScreenTime
    );

    const existing = await db
      .select()
      .from(memberScreenTimeRecords)
      .where(
        and(
          eq(memberScreenTimeRecords.memberAccountId, authUser.userId),
          eq(memberScreenTimeRecords.recordDate, recordDate)
        )
      );

    let saved;
    if (existing.length > 0) {
      const updateObj: any = {
        minutes,
        dataSource,
        wasSharedAtSubmit: existing[0].wasSharedAtSubmit || isSharingScreenTimeNow,
        updatedAt: new Date(),
      };
      if (note !== undefined) updateObj.note = note;
      const updated = await db
        .update(memberScreenTimeRecords)
        .set(updateObj)
        .where(eq(memberScreenTimeRecords.id, existing[0].id))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(memberScreenTimeRecords)
        .values({
          memberAccountId: authUser.userId,
          contactId: authUser.contactId,
          recordDate,
          minutes,
          dataSource,
          wasSharedAtSubmit: isSharingScreenTimeNow,
          note: note ?? null,
        })
        .returning();
      saved = inserted[0];
    }

    res.json({ record: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.get('/my-home/overview', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const todayDhaka = getDateStr(0);
    const sevenStart = getDateStr(-6);
    const thirtyStart = getDateStr(-29);

    const [itemsList, reports, screenRows, shareRows, assignedResponsibles] = await Promise.all([
      db.select().from(trackerItems).where(eq(trackerItems.isActive, true)).orderBy(asc(trackerItems.displayOrder)),
      db
        .select()
        .from(memberDailyReports)
        .where(eq(memberDailyReports.memberAccountId, authUser.userId))
        .orderBy(desc(memberDailyReports.reportDate))
        .limit(40),
      db
        .select()
        .from(memberScreenTimeRecords)
        .where(eq(memberScreenTimeRecords.memberAccountId, authUser.userId))
        .orderBy(desc(memberScreenTimeRecords.recordDate))
        .limit(14),
      db
        .select()
        .from(memberSharingSettings)
        .where(eq(memberSharingSettings.memberAccountId, authUser.userId)),
      getAssignedResponsiblesForContact(authUser.contactId),
    ]);

    const todayReport = reports.find((r) => r.reportDate === todayDhaka) || null;
    const todayItems = (todayReport?.items as Record<string, boolean>) || {};
    const todayItemMinutes = sanitizeItemMinutes(todayReport?.itemMinutes || {});
    const totalAmalCount = itemsList.length;
    const completedAmalCount = itemsList.filter((it) => Boolean(todayItems[it.key])).length;
    const pendingAmalCount = Math.max(0, totalAmalCount - completedAmalCount);
    const dailyProgressPct = totalAmalCount > 0 ? Math.round((completedAmalCount / totalAmalCount) * 100) : 0;

    const minsForReport = (rep: any) =>
      rep && rep.status !== 'skipped'
        ? computeProductiveMinutes(rep.items || {}, rep.itemMinutes || {})
        : 0;

    const todayProductiveMinutes = minsForReport(todayReport);
    const weeklyProductiveMinutes = reports
      .filter((r) => r.reportDate >= sevenStart)
      .reduce((s, r) => s + minsForReport(r), 0);
    const monthlyProductiveMinutes = reports
      .filter((r) => r.reportDate >= thirtyStart)
      .reduce((s, r) => s + minsForReport(r), 0);

    const todayScreen = screenRows.find((s) => s.recordDate === todayDhaka) || null;
    const weekScreenRows = screenRows.filter((s) => s.recordDate >= sevenStart);
    const weeklyAvgScreenTimeMinutes =
      weekScreenRows.length > 0
        ? Math.round(
            weekScreenRows.reduce((s, r) => s + (Number(r.minutes) || 0), 0) /
              weekScreenRows.length
          )
        : 0;

    // Streak in Asia/Dhaka
    let streak = 0;
    const submittedDates = new Set(reports.filter((r) => r.status === 'submitted').map((r) => r.reportDate));
    for (let offset = 0; offset < 35; offset++) {
      const d = getDateStr(-offset);
      if (submittedDates.has(d)) streak++;
      else if (offset === 0) continue;
      else break;
    }

    const sharingSettings = shareRows[0] || {
      memberAccountId: authUser.userId,
      monitoringEnabled: false,
      shareDailyAmal: false,
      shareDawahActivities: false,
      sharePersonalNotes: false,
      shareWeeklySummary: false,
      shareProductiveTime: false,
      shareScreenTime: false,
      updatedAt: new Date(),
    };

    res.json({
      dhakaToday: todayDhaka,
      displayDateBn: formatDhakaDisplayDateBn(todayDhaka),
      todayScreenTime: todayScreen
        ? {
            minutes: todayScreen.minutes,
            dataSource: todayScreen.dataSource,
            updatedAt: todayScreen.updatedAt,
          }
        : null,
      weeklyAvgScreenTimeMinutes,
      todayProductiveMinutes,
      weeklyProductiveMinutes,
      monthlyProductiveMinutes,
      completedAmalCount,
      pendingAmalCount,
      totalAmalCount,
      dailyProgressPct,
      streak,
      reportStatus: todayReport?.status || 'none',
      trackerItems: itemsList,
      todayItems,
      todayItemMinutes,
      assignedResponsibles,
      sharingSettings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Member Dawah Logs CRUD
portalRouter.get('/my-track/dawah-logs', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const logs = await db
      .select()
      .from(memberDawahLogs)
      .where(eq(memberDawahLogs.memberAccountId, authUser.userId))
      .orderBy(desc(memberDawahLogs.date), desc(memberDawahLogs.createdAt));

    const allContacts = await db.select({ id: contacts.id, name: contacts.name }).from(contacts);
    const contactMap = new Map(allContacts.map((c) => [c.id, c.name]));

    res.json(
      logs.map((l) => ({
        ...l,
        targetName: l.targetContactId ? contactMap.get(l.targetContactId) || null : null,
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/my-track/dawah-logs', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const description = String(req.body?.description || '').trim();
    if (!description) return res.status(400).json({ error: 'বিবরণ আবশ্যক।' });
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || ''))
      ? String(req.body.date)
      : getDateStr(0);
    const targetContactId =
      req.body?.targetContactId && UUID_REGEX.test(String(req.body.targetContactId))
        ? String(req.body.targetContactId)
        : null;

    const inserted = await db
      .insert(memberDawahLogs)
      .values({
        memberAccountId: authUser.userId,
        date,
        targetContactId,
        description,
        outcome: req.body?.outcome ? String(req.body.outcome).trim() : null,
      })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.delete('/my-track/dawah-logs/:id', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (!UUID_REGEX.test(req.params.id)) return res.status(404).json({ error: 'Not found' });

    const existing = await db.select().from(memberDawahLogs).where(eq(memberDawahLogs.id, req.params.id));
    if (existing.length === 0 || existing[0].memberAccountId !== authUser.userId) {
      return res.status(403).json({ error: 'অনুমতি নেই।' });
    }
    await db.delete(memberDawahLogs).where(eq(memberDawahLogs.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Member AI Voice Analysis for My Dawah Track (preview before user confirms)
portalRouter.post('/my-track/analyze-voice', async (req, res) => {
  try {
    await ensureAiTables();
    const flags = await getPortalFeatureFlags();
    if (!flags.featureMyDawahTrack) return res.status(403).json({ error: 'Feature disabled' });
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const transcription = String(req.body?.transcription || '').trim();
    if (!transcription) {
      return res.status(400).json({ error: 'বাংলা বক্তব্য বা ট্রান্সক্রিপশন আবশ্যক।' });
    }

    const activeItems = await db
      .select()
      .from(trackerItems)
      .where(eq(trackerItems.isActive, true))
      .orderBy(asc(trackerItems.displayOrder));

    const result = await analyzeVoiceForMyTrack({
      transcription,
      trackerItems: activeItems.map((t) => ({
        key: t.key,
        banglaLabel: t.banglaLabel,
        group: t.group,
      })),
    });

    res.json({
      ...result,
      trackerItems: activeItems,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ভয়েস বিশ্লেষণে সমস্যা হয়েছে।' });
  }
});

// Member Private Notes CRUD
portalRouter.get('/my-track/notes', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await db
      .select()
      .from(memberNotes)
      .where(eq(memberNotes.memberAccountId, authUser.userId))
      .orderBy(desc(memberNotes.date), desc(memberNotes.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/my-track/notes', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'নোট খালি রাখা যাবে না।' });
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || ''))
      ? String(req.body.date)
      : getDateStr(0);
    const inserted = await db
      .insert(memberNotes)
      .values({ memberAccountId: authUser.userId, date, body })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.delete('/my-track/notes/:id', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (!UUID_REGEX.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const existing = await db.select().from(memberNotes).where(eq(memberNotes.id, req.params.id));
    if (existing.length === 0 || existing[0].memberAccountId !== authUser.userId) {
      return res.status(403).json({ error: 'অনুমতি নেই।' });
    }
    await db.delete(memberNotes).where(eq(memberNotes.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PHASE 6: MEMBER REMINDERS
// ==========================================
portalRouter.get('/my-track/reminders', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await db
      .select()
      .from(memberReminders)
      .where(eq(memberReminders.memberAccountId, authUser.userId))
      .orderBy(asc(memberReminders.time));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/my-track/reminders', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const time = String(req.body?.time || '21:00').trim();
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: 'সঠিক সময় (HH:MM) দিন।' });
    }
    const daysOfWeek = Array.isArray(req.body?.daysOfWeek)
      ? req.body.daysOfWeek.map(Number).filter((n: number) => n >= 0 && n <= 6)
      : [0, 1, 2, 3, 4, 5, 6];
    const inserted = await db
      .insert(memberReminders)
      .values({
        memberAccountId: authUser.userId,
        itemKey: req.body?.itemKey ? String(req.body.itemKey) : null,
        title: req.body?.title ? String(req.body.title).trim() : 'দৈনিক আমল ও দাওয়াহ রিপোর্ট',
        time,
        daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
        isActive: req.body?.isActive !== false,
      })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.put('/my-track/reminders/:id', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const existing = await db.select().from(memberReminders).where(eq(memberReminders.id, req.params.id));
    if (existing.length === 0 || existing[0].memberAccountId !== authUser.userId) {
      return res.status(403).json({ error: 'অনুমতি নেই।' });
    }
    const updateObj: any = {};
    if (typeof req.body?.isActive === 'boolean') updateObj.isActive = req.body.isActive;
    if (req.body?.time && /^\d{2}:\d{2}$/.test(String(req.body.time))) updateObj.time = String(req.body.time);
    if (req.body?.title !== undefined) updateObj.title = String(req.body.title);
    const updated = await db
      .update(memberReminders)
      .set(updateObj)
      .where(eq(memberReminders.id, req.params.id))
      .returning();
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.delete('/my-track/reminders/:id', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    const existing = await db.select().from(memberReminders).where(eq(memberReminders.id, req.params.id));
    if (existing.length === 0 || existing[0].memberAccountId !== authUser.userId) {
      return res.status(403).json({ error: 'অনুমতি নেই।' });
    }
    await db.delete(memberReminders).where(eq(memberReminders.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PHASE 3: MONITORING CONSENT & ADMIN MONITORING
// ==========================================
portalRouter.get('/my-track/sharing', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await db
      .select()
      .from(memberSharingSettings)
      .where(eq(memberSharingSettings.memberAccountId, authUser.userId));

    const settings = rows[0] || {
      memberAccountId: authUser.userId,
      monitoringEnabled: false,
      shareDailyAmal: false,
      shareDawahActivities: false,
      sharePersonalNotes: false,
      shareWeeklySummary: false,
      shareProductiveTime: false,
      shareScreenTime: false,
      updatedAt: new Date(),
    };

    // Determine who currently has visibility
    const viewers: Array<{ name: string; role: string }> = [];
    if (settings.monitoringEnabled) {
      const admins = await db.select().from(memberAccounts).where(eq(memberAccounts.role, 'admin'));
      for (const a of admins) {
        if (a.isActive) viewers.push({ name: a.username, role: 'Admin' });
      }
      if (authUser.contactId) {
        const assigns = await db
          .select()
          .from(memberAssignments)
          .where(eq(memberAssignments.contactId, authUser.contactId));
        for (const asg of assigns) {
          const rAcc = await db
            .select()
            .from(memberAccounts)
            .where(eq(memberAccounts.id, asg.responsibleAccountId));
          if (rAcc[0]?.isActive) {
            viewers.push({ name: rAcc[0].username, role: 'দায়িত্বশীল' });
          }
        }
      }
    }

    res.json({ settings, viewers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.put('/my-track/sharing', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const existingRows = await db
      .select()
      .from(memberSharingSettings)
      .where(eq(memberSharingSettings.memberAccountId, authUser.userId));

    const beforeState = existingRows[0] || {
      monitoringEnabled: false,
      shareDailyAmal: false,
      shareDawahActivities: false,
      sharePersonalNotes: false,
      shareWeeklySummary: false,
      shareProductiveTime: false,
      shareScreenTime: false,
    };

    const nextState = {
      monitoringEnabled:
        req.body?.monitoringEnabled !== undefined ? Boolean(req.body.monitoringEnabled) : beforeState.monitoringEnabled,
      shareDailyAmal:
        req.body?.shareDailyAmal !== undefined ? Boolean(req.body.shareDailyAmal) : beforeState.shareDailyAmal,
      shareDawahActivities:
        req.body?.shareDawahActivities !== undefined
          ? Boolean(req.body.shareDawahActivities)
          : beforeState.shareDawahActivities,
      sharePersonalNotes:
        req.body?.sharePersonalNotes !== undefined
          ? Boolean(req.body.sharePersonalNotes)
          : beforeState.sharePersonalNotes,
      shareWeeklySummary:
        req.body?.shareWeeklySummary !== undefined
          ? Boolean(req.body.shareWeeklySummary)
          : beforeState.shareWeeklySummary,
      shareProductiveTime:
        req.body?.shareProductiveTime !== undefined
          ? Boolean(req.body.shareProductiveTime)
          : beforeState.shareProductiveTime,
      shareScreenTime:
        req.body?.shareScreenTime !== undefined
          ? Boolean(req.body.shareScreenTime)
          : beforeState.shareScreenTime,
    };

    let saved;
    if (existingRows.length > 0) {
      const updated = await db
        .update(memberSharingSettings)
        .set({ ...nextState, updatedAt: new Date() })
        .where(eq(memberSharingSettings.memberAccountId, authUser.userId))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(memberSharingSettings)
        .values({
          memberAccountId: authUser.userId,
          ...nextState,
        })
        .returning();
      saved = inserted[0];
    }

    await db.insert(memberSharingLog).values({
      memberAccountId: authUser.userId,
      before: beforeState,
      after: nextState,
    });

    if (authUser.contactId) {
      recomputeCareForContact(authUser.contactId, { allowAiRefinement: false }).catch(() => {});
    }

    res.json({ settings: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin / Responsible: Member Self-Report & Admin Observation tabs
portalRouter.get('/contacts/:id/monitoring-view', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (!UUID_REGEX.test(req.params.id)) return res.status(404).json({ error: 'Not found' });

    const contactRows = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
    if (contactRows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!canAccessContact(authUser, contactRows[0])) {
      return res.status(403).json({ error: 'অনুমতি নেই।' });
    }

    const [consentedData, obsRows, tItems] = await Promise.all([
      getConsentedSelfReportForAdmin(req.params.id),
      db
        .select()
        .from(observations)
        .where(eq(observations.contactId, req.params.id))
        .orderBy(desc(observations.date), desc(observations.createdAt)),
      db.select().from(trackerItems).orderBy(asc(trackerItems.displayOrder)),
    ]);

    res.json({
      selfReport: consentedData,
      adminObservations: obsRows,
      trackerItems: tItems,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add manual admin/responsible observation
portalRouter.post('/contacts/:id/observations', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (!UUID_REGEX.test(req.params.id)) return res.status(404).json({ error: 'Not found' });

    const contactRows = await db.select().from(contacts).where(eq(contacts.id, req.params.id));
    if (contactRows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!canCareForContact(authUser, contactRows[0])) {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাডমিন বা দায়িত্বশীল পর্যবেক্ষণ যোগ করতে পারবেন।' });
    }

    const text = String(req.body?.observation || '').trim();
    if (!text) return res.status(400).json({ error: 'পর্যবেক্ষণ নোট আবশ্যক।' });
    const category = String(req.body?.category || 'Admin Observation').trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || ''))
      ? String(req.body.date)
      : getDateStr(0);

    const created = await db
      .insert(observations)
      .values({
        contactId: req.params.id,
        category,
        observation: text,
        level: 'observed',
        source: 'admin',
        date,
      })
      .returning();

    recomputeCareForContact(req.params.id, { allowAiRefinement: false }).catch(() => {});
    res.json(created[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Monitoring Overview Dashboard (/api/monitoring/overview)
portalRouter.get('/monitoring/overview', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'অ্যাডমিন বা দায়িত্বশীল অ্যাক্সেস প্রয়োজন।' });
    }

    const [allAccounts, allContacts, allSharing, allReports, tItems, allScreenRows] = await Promise.all([
      db.select().from(memberAccounts),
      db.select().from(contacts),
      db.select().from(memberSharingSettings),
      db.select().from(memberDailyReports).orderBy(desc(memberDailyReports.submittedAt)),
      db.select().from(trackerItems).where(eq(trackerItems.isActive, true)),
      db.select().from(memberScreenTimeRecords).orderBy(desc(memberScreenTimeRecords.recordDate)),
    ]);

    const contactMap = new Map(allContacts.map((c) => [c.id, c]));
    const sharingMap = new Map(allSharing.map((s) => [s.memberAccountId, s]));
    const today = getDateStr(0);

    // Map today's screen time by memberAccountId (only if consented)
    const todayScreenMap = new Map<string, number>();
    for (const scr of allScreenRows) {
      if (scr.recordDate === today && !todayScreenMap.has(scr.memberAccountId)) {
        todayScreenMap.set(scr.memberAccountId, Number(scr.minutes) || 0);
      }
    }

    // Filter visible accounts if responsible
    const visibleAccounts = allAccounts.filter((acc) => {
      if (acc.role === 'admin') return false;
      if (authUser.role === 'admin') return true;
      return !!acc.contactId && authUser.assignedContactIds.has(acc.contactId);
    });

    const monitoringOnAccounts = visibleAccounts.filter((acc) => sharingMap.get(acc.id)?.monitoringEnabled === true);
    const monitoringOnIds = new Set(monitoringOnAccounts.map((a) => a.id));

    const sharedReportsToday = allReports.filter(
      (r) =>
        monitoringOnIds.has(r.memberAccountId) &&
        r.status === 'submitted' &&
        r.reportDate === today &&
        (sharingMap.get(r.memberAccountId)?.shareDailyAmal ||
          sharingMap.get(r.memberAccountId)?.shareWeeklySummary ||
          sharingMap.get(r.memberAccountId)?.shareProductiveTime)
    );

    const recentFeed = allReports
      .filter(
        (r) =>
          monitoringOnIds.has(r.memberAccountId) &&
          r.status === 'submitted' &&
          (sharingMap.get(r.memberAccountId)?.shareDailyAmal ||
            sharingMap.get(r.memberAccountId)?.shareWeeklySummary ||
            sharingMap.get(r.memberAccountId)?.shareProductiveTime)
      )
      .slice(0, 20)
      .map((r) => {
        const acc = visibleAccounts.find((a) => a.id === r.memberAccountId);
        const contact = acc?.contactId ? contactMap.get(acc.contactId) : null;
        const share = sharingMap.get(r.memberAccountId);
        const checkedCount = share?.shareDailyAmal
          ? Object.values(r.items || {}).filter(Boolean).length
          : null;
        const productiveMinutes = share?.shareProductiveTime
          ? computeProductiveMinutes(r.items || {}, r.itemMinutes || {})
          : null;
        const screenTimeMinutes = share?.shareScreenTime
          ? (allScreenRows.find((s) => s.memberAccountId === r.memberAccountId && s.recordDate === r.reportDate)?.minutes ?? null)
          : null;
        return {
          id: r.id,
          reportDate: r.reportDate,
          submittedAt: r.submittedAt,
          memberAccountId: r.memberAccountId,
          contactId: acc?.contactId || null,
          memberName: contact?.name || acc?.username || 'সদস্য',
          area: contact?.area || null,
          completedCount: checkedCount,
          totalCount: tItems.length,
          productiveMinutes,
          screenTimeMinutes,
          note: share?.sharePersonalNotes ? r.note : null,
          isToday: r.reportDate === today,
        };
      });

    const reportedTodayAccountIds = new Set(sharedReportsToday.map((r) => r.memberAccountId));

    res.json({
      stats: {
        totalVisibleMembers: visibleAccounts.length,
        monitoringEnabledCount: monitoringOnAccounts.length,
        newReportsTodayCount: sharedReportsToday.length,
        notReportedTodayCount: Math.max(0, monitoringOnAccounts.length - reportedTodayAccountIds.size),
      },
      recentReports: recentFeed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PHASE 2: ADMIN MEMBER ASSIGNMENTS (FOR RESPONSIBLE ROLE)
// ==========================================
portalRouter.get('/admin/assignments', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const rows = await db.select().from(memberAssignments);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.put('/admin/accounts/:id/assignments', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (!UUID_REGEX.test(req.params.id)) return res.status(404).json({ error: 'Not found' });

    const contactIds: string[] = Array.isArray(req.body?.contactIds)
      ? req.body.contactIds.map(String).filter((id: string) => UUID_REGEX.test(id))
      : [];

    await db.delete(memberAssignments).where(eq(memberAssignments.responsibleAccountId, req.params.id));
    if (contactIds.length > 0) {
      await db.insert(memberAssignments).values(
        contactIds.map((contactId) => ({
          responsibleAccountId: req.params.id,
          contactId,
        }))
      );
    }
    res.json({ success: true, contactIds });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PHASE 5: CARE RADAR API
// Strictly Admin + Responsible (Never Member)
// ==========================================
portalRouter.get('/care/radar', async (req, res) => {
  try {
    await ensureAiTables();
    const flags = await getPortalFeatureFlags();
    if (!flags.featureCareRadar) {
      return res.json({ disabled: true, summaries: {}, tasks: [], stats: { urgent: 0, soon: 0, ok: 0 } });
    }

    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'Care Radar শুধুমাত্র অ্যাডমিন ও দায়িত্বশীলের জন্য।' });
    }

    const allContacts = await db.select().from(contacts);
    const visibleContacts = allContacts.filter((c) => canCareForContact(authUser, c));
    const visibleIds = new Set(visibleContacts.map((c) => c.id));
    const contactMap = new Map(visibleContacts.map((c) => [c.id, c]));

    const [snapshots, openTasks] = await Promise.all([
      db.select().from(careSnapshots),
      db.select().from(careTasks).where(eq(careTasks.status, 'open')).orderBy(desc(careTasks.updatedAt)),
    ]);

    const snapMap = new Map(snapshots.map((s) => [s.contactId, s]));

    // Lazy initial compute for up to 15 visible contacts that don't have a snapshot yet
    const missingIds = visibleContacts.filter((c) => !snapMap.has(c.id)).slice(0, 15).map((c) => c.id);
    if (missingIds.length > 0) {
      for (const cid of missingIds) {
        try {
          const resComp = await recomputeCareForContact(cid, { allowAiRefinement: false });
          if (resComp.snapshot) snapMap.set(cid, resComp.snapshot);
        } catch {
          // ignore
        }
      }
    }

    const refreshedOpenTasks =
      missingIds.length > 0
        ? await db.select().from(careTasks).where(eq(careTasks.status, 'open')).orderBy(desc(careTasks.updatedAt))
        : openTasks;

    const tasksByContact = new Map<string, any[]>();
    const visibleTasks: any[] = [];
    for (const t of refreshedOpenTasks) {
      if (!visibleIds.has(t.contactId)) continue;
      const c = contactMap.get(t.contactId);
      const enriched = {
        ...t,
        memberName: c?.name || 'সদস্য',
        memberPhone: c?.phone || null,
        memberArea: c?.area || null,
      };
      visibleTasks.push(enriched);
      const list = tasksByContact.get(t.contactId) || [];
      list.push(enriched);
      tasksByContact.set(t.contactId, list);
    }

    const summaries: Record<string, any> = {};
    let urgent = 0;
    let soon = 0;
    let ok = 0;

    for (const c of visibleContacts) {
      const snap = snapMap.get(c.id);
      const cTasks = tasksByContact.get(c.id) || [];
      const urgency = snap?.urgency || (cTasks[0]?.urgency ?? 'ok');
      const openTaskCount = cTasks.length;
      if (openTaskCount > 0) {
        if (urgency === 'urgent') urgent++;
        else if (urgency === 'soon') soon++;
        else ok++;
      } else {
        ok++;
      }
      summaries[c.id] = {
        contactId: c.id,
        urgency,
        openTaskCount,
        gapKeys: snap?.gapKeys || [],
        nextStepSummary: snap?.nextStepSummary || cTasks[0]?.suggestedAction || null,
        topTask: cTasks[0] || null,
      };
    }

    const rank: Record<string, number> = { urgent: 3, soon: 2, ok: 1 };
    visibleTasks.sort((a, b) => (rank[b.urgency] || 0) - (rank[a.urgency] || 0));

    res.json({
      disabled: false,
      stats: { urgent, soon, ok, totalOpen: visibleTasks.length },
      summaries,
      tasks: visibleTasks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.get('/care/members/:contactId', async (req, res) => {
  try {
    await ensureAiTables();
    const flags = await getPortalFeatureFlags();
    if (!flags.featureCareRadar) return res.status(403).json({ error: 'Care Radar disabled' });

    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!UUID_REGEX.test(req.params.contactId)) return res.status(404).json({ error: 'Not found' });

    const contactRows = await db.select().from(contacts).where(eq(contacts.id, req.params.contactId));
    if (contactRows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!canCareForContact(authUser, contactRows[0])) {
      return res.status(403).json({ error: 'এই সদস্যের কেয়ার প্ল্যান দেখার অনুমতি নেই।' });
    }

    let snapRows = await db.select().from(careSnapshots).where(eq(careSnapshots.contactId, req.params.contactId));
    if (snapRows.length === 0) {
      await recomputeCareForContact(req.params.contactId, { allowAiRefinement: true });
      snapRows = await db.select().from(careSnapshots).where(eq(careSnapshots.contactId, req.params.contactId));
    }

    const allTasks = await db
      .select()
      .from(careTasks)
      .where(eq(careTasks.contactId, req.params.contactId))
      .orderBy(desc(careTasks.updatedAt));

    res.json({
      contact: contactRows[0],
      snapshot: snapRows[0] || null,
      openTasks: allTasks.filter((t) => t.status === 'open'),
      historyTasks: allTasks.filter((t) => t.status !== 'open').slice(0, 12),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/care/members/:contactId/recompute', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!UUID_REGEX.test(req.params.contactId)) return res.status(404).json({ error: 'Not found' });
    const contactRows = await db.select().from(contacts).where(eq(contacts.id, req.params.contactId));
    if (contactRows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!canCareForContact(authUser, contactRows[0])) return res.status(403).json({ error: 'Access denied' });

    const result = await recomputeCareForContact(req.params.contactId, { allowAiRefinement: true });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/care/tasks/:id/complete', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!UUID_REGEX.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const taskRows = await db.select().from(careTasks).where(eq(careTasks.id, req.params.id));
    if (taskRows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const contactRows = await db.select().from(contacts).where(eq(contacts.id, taskRows[0].contactId));
    if (contactRows.length === 0 || !canCareForContact(authUser, contactRows[0])) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await completeCareTaskAndGenerateNext(
      req.params.id,
      String(req.body?.outcome || 'ফলো-আপ সম্পন্ন হয়েছে')
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/care/tasks/:id/snooze', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const taskRows = await db.select().from(careTasks).where(eq(careTasks.id, req.params.id));
    if (taskRows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const contactRows = await db.select().from(contacts).where(eq(contacts.id, taskRows[0].contactId));
    if (contactRows.length === 0 || !canCareForContact(authUser, contactRows[0])) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const days = Math.max(1, Math.min(30, Math.round(Number(req.body?.days || 3))));
    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const updated = await db
      .update(careTasks)
      .set({ status: 'snoozed', snoozedUntil, updatedAt: new Date() })
      .where(eq(careTasks.id, req.params.id))
      .returning();

    await recomputeCareForContact(taskRows[0].contactId, { allowAiRefinement: false });
    res.json({ task: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

portalRouter.post('/care/tasks/:id/dismiss', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const taskRows = await db.select().from(careTasks).where(eq(careTasks.id, req.params.id));
    if (taskRows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const contactRows = await db.select().from(contacts).where(eq(contacts.id, taskRows[0].contactId));
    if (contactRows.length === 0 || !canCareForContact(authUser, contactRows[0])) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await db
      .update(careTasks)
      .set({ status: 'dismissed', updatedAt: new Date() })
      .where(eq(careTasks.id, req.params.id))
      .returning();

    await recomputeCareForContact(taskRows[0].contactId, { allowAiRefinement: false });
    res.json({ task: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PHASE 6: ADMIN PRINTABLE / CONSENTING SUMMARY REPORT
// ==========================================
portalRouter.get('/reports/admin-summary', async (req, res) => {
  try {
    await ensureAiTables();
    const authUser = await resolveAuthUser(req);
    if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'responsible')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const range = req.query.range === 'month' ? 'month' : 'week';
    const daysCount = range === 'month' ? 30 : 7;
    const startDate = getDateStr(-(daysCount - 1));

    const [allAccounts, allContacts, allSharing, allReports, tItems, allScreenRows] = await Promise.all([
      db.select().from(memberAccounts),
      db.select().from(contacts),
      db.select().from(memberSharingSettings),
      db.select().from(memberDailyReports),
      db.select().from(trackerItems).where(eq(trackerItems.isActive, true)),
      db.select().from(memberScreenTimeRecords),
    ]);

    const contactMap = new Map(allContacts.map((c) => [c.id, c]));
    const sharingMap = new Map(allSharing.map((s) => [s.memberAccountId, s]));
    const totalActiveItems = Math.max(1, tItems.length);

    // ONLY members who have monitoringEnabled === true and shareWeeklySummary or shareDailyAmal or shareProductiveTime or shareScreenTime
    // NEVER include raw personal notes!
    const consentingSummaries = allAccounts
      .filter((acc) => {
        if (acc.role === 'admin') return false;
        if (authUser.role === 'responsible' && (!acc.contactId || !authUser.assignedContactIds.has(acc.contactId))) {
          return false;
        }
        const s = sharingMap.get(acc.id);
        return Boolean(
          s?.monitoringEnabled &&
            (s.shareWeeklySummary || s.shareDailyAmal || s.shareProductiveTime || s.shareScreenTime)
        );
      })
      .map((acc) => {
        const s = sharingMap.get(acc.id)!;
        const c = acc.contactId ? contactMap.get(acc.contactId) : null;
        const memberReps = allReports.filter(
          (r) => r.memberAccountId === acc.id && r.status === 'submitted' && r.reportDate >= startDate
        );
        let checked = 0;
        let slots = 0;
        let totalProductive = 0;
        for (const r of memberReps) {
          checked += Object.values(r.items || {}).filter(Boolean).length;
          slots += totalActiveItems;
          totalProductive += computeProductiveMinutes(r.items || {}, r.itemMinutes || {});
        }
        const memberScreen = allScreenRows.filter(
          (sr) => sr.memberAccountId === acc.id && sr.recordDate >= startDate
        );
        const avgScreenMinutes =
          s.shareScreenTime && memberScreen.length > 0
            ? Math.round(
                memberScreen.reduce((sum, r) => sum + (Number(r.minutes) || 0), 0) /
                  memberScreen.length
              )
            : null;
        return {
          contactId: acc.contactId || null,
          memberName: c?.name || acc.username,
          area: c?.area || '—',
          currentStage: c?.currentStage || 1,
          submittedDays: s.shareWeeklySummary || s.shareDailyAmal ? memberReps.length : null,
          completionPct:
            (s.shareWeeklySummary || s.shareDailyAmal) && slots > 0
              ? Math.round((checked / slots) * 100)
              : null,
          totalProductiveMinutes: s.shareProductiveTime ? totalProductive : null,
          avgScreenTimeMinutes: avgScreenMinutes,
        };
      });

    res.json({
      range,
      startDate,
      endDate: getDateStr(0),
      totalConsentedMembers: consentingSummaries.length,
      members: consentingSummaries,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
