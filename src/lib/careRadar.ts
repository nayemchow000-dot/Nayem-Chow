import { db } from '../db/db';
import {
  contacts,
  followUps,
  observations,
  salahRecords,
  aiVoiceEntries,
  memberAccounts,
  memberAssignments,
  memberSharingSettings,
  memberDailyReports,
  careTasks,
  careSnapshots,
  brandingSettings,
} from '../db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import type { CareChannel, CareUrgency, CareTask } from '../types';
import { STAGES } from '../types';
import { refineCareRadarWording } from './ai';
import { getDhakaDateStr } from './dhakaTime';

export interface CareSignalResult {
  key: string;
  urgency: CareUrgency;
  title: string;
  reason: string;
  suggestedAction: string;
  channel: CareChannel;
  dueDays: number;
}

export interface CareThresholds {
  noContactSoonDays: number;
  noContactUrgentDays: number;
  stalledStageDays: number;
}

export async function getCareThresholds(): Promise<CareThresholds> {
  try {
    const rows = await db.select().from(brandingSettings).where(eq(brandingSettings.id, 1));
    if (rows.length > 0) {
      return {
        noContactSoonDays: rows[0].careNoContactSoonDays ?? 7,
        noContactUrgentDays: rows[0].careNoContactUrgentDays ?? 14,
        stalledStageDays: rows[0].careStalledStageDays ?? 30,
      };
    }
  } catch {
    // fallback
  }
  return { noContactSoonDays: 7, noContactUrgentDays: 14, stalledStageDays: 30 };
}

function daysBetween(fromDate: Date | string | null | undefined, toDate: Date): number {
  if (!fromDate) return 999;
  const d = fromDate instanceof Date ? fromDate : new Date(fromDate);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.max(0, Math.floor((toDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

function serializeCareTask(row: typeof careTasks.$inferSelect): CareTask {
  return {
    id: row.id,
    contactId: row.contactId,
    assignedAccountId: row.assignedAccountId ?? null,
    urgency: (row.urgency as CareUrgency) || 'ok',
    title: row.title,
    reason: row.reason,
    suggestedAction: row.suggestedAction,
    channel: (row.channel as CareChannel) || 'call',
    dueAt: toIso(row.dueAt),
    status: (row.status as CareTask['status']) || 'open',
    snoozedUntil: toIso(row.snoozedUntil),
    cycleNo: row.cycleNo ?? 1,
    sourceSignals: row.sourceSignals || [],
    completedOutcome: row.completedOutcome ?? null,
    completedAt: toIso(row.completedAt),
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
  };
}

export async function recomputeCareForContact(
  contactId: string,
  options?: { allowAiRefinement?: boolean; minCycleNo?: number }
): Promise<{ snapshot: any; openTasks: CareTask[] }> {
  const now = new Date();
  const todayStr = getDhakaDateStr(0, now);

  const [contactRows, thresholds] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.id, contactId)),
    getCareThresholds(),
  ]);
  if (contactRows.length === 0) {
    throw new Error('Contact not found');
  }
  const contact = contactRows[0];

  const [
    fuRows,
    obsRows,
    salahRows,
    voiceRows,
    assignRows,
    linkedAccounts,
    existingTasks,
    existingSnapRows,
  ] = await Promise.all([
    db.select().from(followUps).where(eq(followUps.contactId, contactId)).orderBy(desc(followUps.date), desc(followUps.createdAt)),
    db.select().from(observations).where(eq(observations.contactId, contactId)).orderBy(desc(observations.date), desc(observations.createdAt)),
    db.select().from(salahRecords).where(eq(salahRecords.contactId, contactId)).orderBy(desc(salahRecords.date)).limit(7),
    db.select().from(aiVoiceEntries).where(eq(aiVoiceEntries.contactId, contactId)).orderBy(desc(aiVoiceEntries.createdAt)).limit(10),
    db.select().from(memberAssignments).where(eq(memberAssignments.contactId, contactId)).limit(1),
    db.select().from(memberAccounts).where(eq(memberAccounts.contactId, contactId)),
    db.select().from(careTasks).where(eq(careTasks.contactId, contactId)).orderBy(desc(careTasks.updatedAt)),
    db.select().from(careSnapshots).where(eq(careSnapshots.contactId, contactId)),
  ]);

  const assignedAccountId = assignRows[0]?.responsibleAccountId ?? null;
  const maxExistingCycle = existingTasks.reduce((max, t) => Math.max(max, t.cycleNo || 1), 0);
  const currentCycleNo = Math.max(options?.minCycleNo ?? 1, maxExistingCycle || 1);

  // Check strict sharing consent BEFORE ever touching member_daily_reports
  let sharing: { monitoringEnabled: boolean; shareDailyAmal: boolean; shareWeeklySummary: boolean } | null = null;
  let linkedAccountId: string | null = null;
  if (linkedAccounts.length > 0) {
    linkedAccountId = linkedAccounts[0].id;
    const shareRows = await db
      .select()
      .from(memberSharingSettings)
      .where(eq(memberSharingSettings.memberAccountId, linkedAccountId));
    if (shareRows.length > 0 && shareRows[0].monitoringEnabled) {
      sharing = {
        monitoringEnabled: shareRows[0].monitoringEnabled,
        shareDailyAmal: shareRows[0].shareDailyAmal,
        shareWeeklySummary: shareRows[0].shareWeeklySummary,
      };
    }
  }

  const signals: CareSignalResult[] = [];

  // 1. Overdue Follow-ups
  const overdueFu = fuRows.find((f) => !f.isCompleted && f.nextActionDate && f.nextActionDate < todayStr);
  if (overdueFu) {
    signals.push({
      key: 'overdue_followup',
      urgency: 'urgent',
      title: 'নির্ধারিত ফলো-আপের সময় পেরিয়েছে',
      reason: `পরবর্তী যোগাযোগের তারিখ (${overdueFu.nextActionDate}) অতিক্রম হয়েছে${overdueFu.reminderNote ? ` — ${overdueFu.reminderNote}` : ''}।`,
      suggestedAction: `${contact.name}-কে আজই একটি আন্তরিক কল বা মেসেজ দিয়ে খোঁজ নিন।`,
      channel: contact.phone ? 'call' : 'whatsapp',
      dueDays: 0,
    });
  }

  // 2. No contact days
  const lastFuDate = fuRows[0]?.date;
  const lastObsDate = obsRows[0]?.date;
  const latestTouch = [lastFuDate, lastObsDate].filter(Boolean).sort().reverse()[0];
  const daysSinceTouch = latestTouch ? daysBetween(latestTouch, now) : daysBetween(contact.firstContactDate, now);

  if (daysSinceTouch >= thresholds.noContactUrgentDays) {
    signals.push({
      key: 'no_contact',
      urgency: 'urgent',
      title: `${daysSinceTouch} দিন ধরে কোনো যোগাযোগ নেই`,
      reason: `সর্বশেষ যোগাযোগ বা পর্যবেক্ষণের পর ${daysSinceTouch} দিন পেরিয়ে গেছে।`,
      suggestedAction: `${contact.name}-এর ব্যক্তিগত ও পারিবারিক কুশলাদি জিজ্ঞেস করতে একটি ছোট কল বা সাক্ষাৎ করুন।`,
      channel: contact.phone ? 'call' : 'visit',
      dueDays: 0,
    });
  } else if (daysSinceTouch >= thresholds.noContactSoonDays) {
    signals.push({
      key: 'no_contact',
      urgency: 'soon',
      title: `${daysSinceTouch} দিন পর খোঁজ নেওয়ার সময় হয়েছে`,
      reason: `সর্বশেষ যোগাযোগের পর ${daysSinceTouch} দিন হয়েছে। নিয়মিত সম্পর্ক বজায় রাখা উপকারী।`,
      suggestedAction: `${contact.name}-কে সালাম ও হালকা খোঁজখবরের বার্তা পাঠান বা মসজিদে দেখা হলে কথা বলুন।`,
      channel: contact.phone ? 'whatsapp' : 'mosque',
      dueDays: 2,
    });
  }

  // 3. New member without first follow-up
  if ((contact.currentStage || 1) <= 2 && fuRows.length === 0 && daysBetween(contact.firstContactDate, now) <= 14) {
    signals.push({
      key: 'new_member_no_followup',
      urgency: 'soon',
      title: 'নতুন পরিচিত ভাই — প্রথম ফলো-আপ বাকি',
      reason: `নতুন পরিচিতির পর এখনো প্রথম ফলো-আপ নোট যুক্ত হয়নি।`,
      suggestedAction: `${contact.name}-এর সাথে চা/কফিতে বসে পরিচিতি ও সম্পর্ক দৃঢ় করার সময় নির্ধারণ করুন।`,
      channel: 'visit',
      dueDays: 2,
    });
  }

  // 4. Pending Voice Approval
  const pendingVoice = voiceRows.find((v) => v.status === 'pending');
  if (pendingVoice) {
    signals.push({
      key: 'pending_voice',
      urgency: 'soon',
      title: 'অপেক্ষমাণ ভয়েস আপডেট অনুমোদন বাকি',
      reason: 'একটি ভয়েস নোট বিশ্লেষণ হয়ে অনুমোদনের অপেক্ষায় আছে।',
      suggestedAction: 'ভয়েস রিভিউ খুলে অনুমোদন (Approve) বা বাতিল করুন।',
      channel: 'note',
      dueDays: 1,
    });
  }

  // 5. Stalled stage
  const daysSinceUpdate = daysBetween(contact.updatedAt, now);
  if (daysSinceUpdate >= thresholds.stalledStageDays && (contact.currentStage || 1) < 16) {
    const nextStageName = STAGES[Math.min(15, contact.currentStage || 1)] || '';
    signals.push({
      key: 'stalled_stage',
      urgency: 'soon',
      title: `বর্তমান ধাপে ${daysSinceUpdate} দিন ধরে স্থির`,
      reason: `"${STAGES[(contact.currentStage || 1) - 1] || 'বর্তমান ধাপ'}" ধাপটি প্রায় ${daysSinceUpdate} দিন ধরে অপরিবর্তিত রয়েছে।`,
      suggestedAction: `পরবর্তী ধাপ ("${nextStageName}")-এর জন্য উপযোগী কোনো দ্বীনি আলোচনা বা মসজিদ প্রোগ্রামে আমন্ত্রণ জানান।`,
      channel: 'mosque',
      dueDays: 3,
    });
  }

  // 6. Active Targets Gap
  const missingTargetObs: string[] = [];
  const obsJoined = obsRows.slice(0, 8).map((o) => `${o.category} ${o.observation}`.toLowerCase()).join(' ');
  if (contact.fajrTarget && !obsJoined.includes('ফজর') && !obsJoined.includes('fajr')) missingTargetObs.push('ফজর');
  if (contact.tafseerTarget && !obsJoined.includes('তাফসির') && !obsJoined.includes('মুহাজারা') && !obsJoined.includes('tafseer')) missingTargetObs.push('তাফসির/মুহাজারা');
  if (contact.deeniyatTarget && !obsJoined.includes('দীনিয়াত') && !obsJoined.includes('কুরআন')) missingTargetObs.push('দীনিয়াত/কুরআন');
  if (missingTargetObs.length > 0 && obsRows.length > 0) {
    signals.push({
      key: 'target_gap',
      urgency: 'ok',
      title: `টার্গেট অনুযায়ী খোঁজ (${missingTargetObs.join(', ')})`,
      reason: `${missingTargetObs.join(', ')} টার্গেট সক্রিয় থাকলেও সাম্প্রতিক পর্যবেক্ষণে এ বিষয়ে তথ্য নেই।`,
      suggestedAction: `সৌজন্যমূলক কথোপকথনে ${missingTargetObs.join(' ও ')} বিষয়ে কোনো সহায়তা লাগবে কি না জেনে নিন।`,
      channel: 'call',
      dueDays: 5,
    });
  }

  // 7. Salah decline (only if recorded)
  if (salahRows.length >= 3) {
    let missedCount = 0;
    let totalCount = 0;
    for (const r of salahRows.slice(0, 5)) {
      for (const w of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
        if (r[w]) {
          totalCount++;
          if (r[w] === 'missed') missedCount++;
        }
      }
    }
    if (totalCount >= 10 && missedCount / totalCount >= 0.45) {
      signals.push({
        key: 'salah_decline',
        urgency: 'soon',
        title: 'সালাতের ধারাবাহিকতায় উৎসাহ প্রয়োজন',
        reason: 'সাম্প্রতিক রেকর্ডে সালাতের ধারাবাহিকতা কিছুটা কমেছে দেখা যাচ্ছে (চাপ নয়, সহানুভূতির সাথে)।',
        suggestedAction: 'কোনো ব্যক্তিগত ব্যস্ততা বা অসুবিধা আছে কি না আন্তরিকভাবে খোঁজ নিন এবং ফজর/মাগরিবে সাথে থাকার আমন্ত্রণ জানান।',
        channel: 'mosque',
        dueDays: 2,
      });
    }
  }

  // 8. Consent-gated Self Report Signals (ONLY when monitoringEnabled === true!)
  if (linkedAccountId && sharing?.monitoringEnabled) {
    if (sharing.shareWeeklySummary || sharing.shareDailyAmal) {
      const fiveDaysAgo = getDhakaDateStr(-5, now);
      const recentReports = await db
        .select()
        .from(memberDailyReports)
        .where(eq(memberDailyReports.memberAccountId, linkedAccountId))
        .orderBy(desc(memberDailyReports.reportDate))
        .limit(7);

      const submittedRecent = recentReports.filter((r) => r.status === 'submitted' && r.reportDate >= fiveDaysAgo);
      if (submittedRecent.length === 0) {
        signals.push({
          key: 'missing_reports',
          urgency: 'ok',
          title: 'গত কয়েকদিন ব্যক্তিগত রিপোর্ট আসেনি (শেয়ার সক্রিয়)',
          reason: 'সদস্য মনিটরিং চালু রেখেছেন, তবে গত ৫ দিনে নতুন রিপোর্ট জমা পড়েনি।',
          suggestedAction: 'ব্যস্ততা বা কোনো সমস্যা যাচ্ছে কি না জানতে চেয়ে একটি আন্তরিক সালাম ও দোয়ার বার্তা পাঠান।',
          channel: 'whatsapp',
          dueDays: 4,
        });
      } else if (sharing.shareDailyAmal && obsRows.length > 0) {
        // Gentle check for self vs admin difference (neutral)
        const latestSub = submittedRecent[0];
        const itemsObj = (latestSub.items || {}) as Record<string, boolean>;
        const checkedCount = Object.values(itemsObj).filter(Boolean).length;
        if (checkedCount >= 8 && (contact.priorityLevel === 'high_priority' || contact.priorityLevel === 'needs_attention')) {
          signals.push({
            key: 'self_admin_diff',
            urgency: 'ok',
            title: 'সেলফ রিপোর্ট ও পর্যবেক্ষণ মিলিয়ে দেখার প্রয়োজন',
            reason: 'সদস্যের শেয়ারকৃত রিপোর্ট সক্রিয়, তবে পূর্বের অ্যাডমিন প্রায়োরিটি আপডেট পুরোনো হতে পারে।',
            suggestedAction: 'পরবর্তী সাক্ষাতে ভাইয়ের সাম্প্রতিক অগ্রগতি জেনে প্রোফাইল প্রায়োরিটি হালনাগাদ করুন।',
            channel: 'visit',
            dueDays: 4,
          });
        }
      }
    }
  }

  // 9. Unknown info
  const missingMeta: string[] = [];
  if (!contact.phone) missingMeta.push('ফোন নম্বর');
  if (!contact.area) missingMeta.push('এলাকা');
  if (!contact.categoryTags || contact.categoryTags.length === 0) missingMeta.push('ক্যাটাগরি/ইনডিকেটর');
  if (obsRows.length === 0) missingMeta.push('প্রাথমিক পর্যবেক্ষণ');
  if (missingMeta.length >= 2) {
    signals.push({
      key: 'unknown_info',
      urgency: 'ok',
      title: 'কিছু মৌলিক তথ্য এখনো যুক্ত হয়নি',
      reason: `এখনো জানা/রেকর্ড করা হয়নি: ${missingMeta.join(', ')} (তথ্য না থাকা মানে আমল না করা নয়)।`,
      suggestedAction: 'পরবর্তী সাক্ষাতে সৌজন্যমূলকভাবে প্রয়োজনীয় তথ্যগুলো নোট করে নিন।',
      channel: 'note',
      dueDays: 5,
    });
  }

  // Suppress signals that already have an active snoozed or dismissed task
  const suppressedKeys = new Set<string>();
  for (const t of existingTasks) {
    if (t.status === 'dismissed') {
      for (const k of t.sourceSignals || []) suppressedKeys.add(k);
    } else if (t.status === 'snoozed' && t.snoozedUntil && new Date(t.snoozedUntil) > now) {
      for (const k of t.sourceSignals || []) suppressedKeys.add(k);
    }
  }

  const activeSignals = signals.filter((s) => !suppressedKeys.has(s.key));
  const existingOpenTasks = existingTasks.filter((t) => t.status === 'open');

  const urgencyRank: Record<CareUrgency, number> = { urgent: 3, soon: 2, ok: 1 };
  activeSignals.sort((a, b) => urgencyRank[b.urgency] - urgencyRank[a.urgency]);

  let primarySignal = activeSignals[0];
  let createdOrKeptTasks: CareTask[] = existingOpenTasks.map(serializeCareTask);

  if (activeSignals.length > 0 && primarySignal) {
    // Check if an open task already covers the top signal
    const alreadyOpenSame = existingOpenTasks.find((t) => (t.sourceSignals || []).includes(primarySignal.key));
    if (!alreadyOpenSame) {
      let title = primarySignal.title;
      let reason = primarySignal.reason;
      let suggestedAction = primarySignal.suggestedAction;
      let aiRefinedAt: Date | null = existingSnapRows[0]?.aiRefinedAt ?? null;

      // Optional cached AI refinement (at most once per hour per member)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      if (options?.allowAiRefinement && (!aiRefinedAt || aiRefinedAt < oneHourAgo)) {
        const refined = await refineCareRadarWording({
          memberName: contact.name,
          currentStage: contact.currentStage || 1,
          signals: activeSignals.map((s) => s.key),
          defaultTitle: title,
          defaultReason: reason,
          defaultAction: suggestedAction,
        });
        if (refined) {
          title = refined.title;
          reason = refined.reason;
          suggestedAction = refined.suggestedAction;
          aiRefinedAt = now;
        }
      }

      const dueAt = new Date(now.getTime() + primarySignal.dueDays * 24 * 60 * 60 * 1000);
      const inserted = await db
        .insert(careTasks)
        .values({
          contactId,
          assignedAccountId,
          urgency: primarySignal.urgency,
          title,
          reason,
          suggestedAction,
          channel: primarySignal.channel,
          dueAt,
          status: 'open',
          cycleNo: currentCycleNo,
          sourceSignals: activeSignals.map((s) => s.key),
        })
        .returning();

      createdOrKeptTasks = [serializeCareTask(inserted[0]), ...existingOpenTasks.map(serializeCareTask)];

      await upsertCareSnapshot({
        contactId,
        gapKeys: activeSignals.map((s) => s.key),
        urgency: primarySignal.urgency,
        openTaskCount: createdOrKeptTasks.length,
        nextStepSummary: suggestedAction,
        aiRefinedAt,
      });

      return {
        snapshot: (await db.select().from(careSnapshots).where(eq(careSnapshots.contactId, contactId)))[0],
        openTasks: createdOrKeptTasks,
      };
    }
  } else if (existingOpenTasks.length === 0 && (options?.minCycleNo || 0) > 1) {
    // When completing a task and no urgent gaps remain, generate a gentle positive maintenance next step so the loop continues!
    const nextStageName = STAGES[Math.min(15, contact.currentStage || 1)] || '';
    const dueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inserted = await db
      .insert(careTasks)
      .values({
        contactId,
        assignedAccountId,
        urgency: 'ok',
        title: 'সাপ্তাহিক আন্তরিক খোঁজখবর ও উৎসাহ প্রদান',
        reason: 'পূর্বের ধাপ সম্পন্ন হয়েছে — নিয়মিত সম্পর্ক ও পরবর্তী অগ্রগতির জন্য প্রস্তুত।',
        suggestedAction: `আগামী ৭ দিনের মধ্যে ${contact.name}-কে সালাম দিয়ে কুশল বিনিময় করুন এবং "${nextStageName}"-এর পথে উৎসাহ দিন।`,
        channel: contact.phone ? 'whatsapp' : 'mosque',
        dueAt,
        status: 'open',
        cycleNo: currentCycleNo,
        sourceSignals: ['next_cycle_care'],
      })
      .returning();
    createdOrKeptTasks = [serializeCareTask(inserted[0])];
  }

  const finalUrgency: CareUrgency =
    createdOrKeptTasks.some((t) => t.urgency === 'urgent')
      ? 'urgent'
      : createdOrKeptTasks.some((t) => t.urgency === 'soon')
      ? 'soon'
      : activeSignals[0]?.urgency || 'ok';

  await upsertCareSnapshot({
    contactId,
    gapKeys: activeSignals.map((s) => s.key),
    urgency: finalUrgency,
    openTaskCount: createdOrKeptTasks.length,
    nextStepSummary: createdOrKeptTasks[0]?.suggestedAction || activeSignals[0]?.suggestedAction || 'সবকিছু স্বাভাবিক আছে — সাপ্তাহিক খোঁজখবর রাখুন।',
    aiRefinedAt: existingSnapRows[0]?.aiRefinedAt ?? null,
  });

  const snapRows = await db.select().from(careSnapshots).where(eq(careSnapshots.contactId, contactId));
  return {
    snapshot: snapRows[0],
    openTasks: createdOrKeptTasks,
  };
}

async function upsertCareSnapshot(data: {
  contactId: string;
  gapKeys: string[];
  urgency: CareUrgency;
  openTaskCount: number;
  nextStepSummary: string;
  aiRefinedAt: Date | null;
}) {
  const existing = await db.select().from(careSnapshots).where(eq(careSnapshots.contactId, data.contactId));
  if (existing.length > 0) {
    await db
      .update(careSnapshots)
      .set({
        gapKeys: data.gapKeys,
        urgency: data.urgency,
        openTaskCount: data.openTaskCount,
        nextStepSummary: data.nextStepSummary,
        aiRefinedAt: data.aiRefinedAt,
        recomputedAt: new Date(),
      })
      .where(eq(careSnapshots.contactId, data.contactId));
  } else {
    await db.insert(careSnapshots).values({
      contactId: data.contactId,
      gapKeys: data.gapKeys,
      urgency: data.urgency,
      openTaskCount: data.openTaskCount,
      nextStepSummary: data.nextStepSummary,
      aiRefinedAt: data.aiRefinedAt,
      recomputedAt: new Date(),
    });
  }
}

export async function recomputeCareRadarForContacts(contactIds: string[]): Promise<void> {
  for (const id of contactIds) {
    try {
      await recomputeCareForContact(id, { allowAiRefinement: false });
    } catch (err) {
      console.error('[CareRadar Recompute Warning]', id, (err as any)?.message || err);
    }
  }
}

export async function completeCareTaskAndGenerateNext(
  taskId: string,
  outcome: string
): Promise<{ completedTask: CareTask; nextTasks: CareTask[]; snapshot: any }> {
  const rows = await db.select().from(careTasks).where(eq(careTasks.id, taskId));
  if (rows.length === 0) throw new Error('Care task not found');
  const task = rows[0];

  const cleanOutcome = outcome.trim() || 'সম্পন্ন করা হয়েছে';
  const now = new Date();
  const todayStr = getDhakaDateStr(0, now);

  const updated = await db
    .update(careTasks)
    .set({
      status: 'done',
      completedOutcome: cleanOutcome,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(careTasks.id, taskId))
    .returning();

  // Log outcome as a gentle observation / follow-up touch so contact history & last touch update cleanly
  await db.insert(observations).values({
    contactId: task.contactId,
    category: 'Care Radar',
    observation: `${task.title}: ${cleanOutcome}`,
    level: 'observed',
    source: 'admin',
    date: todayStr,
  });

  // Also close overdue follow-ups if this task addressed overdue_followup
  if ((task.sourceSignals || []).includes('overdue_followup')) {
    const fuRows = await db.select().from(followUps).where(eq(followUps.contactId, task.contactId));
    for (const f of fuRows) {
      if (!f.isCompleted && f.nextActionDate && f.nextActionDate < todayStr) {
        await db.update(followUps).set({ isCompleted: true, completedAt: now }).where(eq(followUps.id, f.id));
      }
    }
  }

  const nextCycle = (task.cycleNo || 1) + 1;
  const recomputed = await recomputeCareForContact(task.contactId, {
    allowAiRefinement: true,
    minCycleNo: nextCycle,
  });

  return {
    completedTask: serializeCareTask(updated[0]),
    nextTasks: recomputed.openTasks,
    snapshot: recomputed.snapshot,
  };
}
