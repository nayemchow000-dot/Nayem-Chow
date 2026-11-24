import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Clock,
  EyeOff,
  Mic,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  History,
  Loader2,
  Bell,
} from 'lucide-react';
import { useCareRadar } from '../contexts/CareRadarContext';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { CareTask, CareSnapshot, Contact, STAGES } from '../types';
import { Button } from './ui';
import VoiceDawahModal from './VoiceDawahModal';

const GAP_LABELS: Record<string, string> = {
  overdue_followup: 'ফলো-আপ মেয়াদোত্তীর্ণ',
  no_contact: 'দীর্ঘদিন যোগাযোগ নেই',
  new_member_no_followup: 'নতুন সদস্য — প্রথম ফলো-আপ বাকি',
  pending_voice: 'ভয়েস রিভিউ অপেক্ষমাণ',
  stalled_stage: 'একই ধাপে দীর্ঘদিন অবস্থান',
  target_gap: 'সাপ্তাহিক/দ্বীনি টার্গেট গ্যাপ',
  salah_decline: 'সালাতের ধারাবাহিকতা কমেছে',
  missing_reports: 'নিয়মিত রিপোর্ট অনুপস্থিত',
  self_admin_diff: 'Self Report ও পর্যবেক্ষণে পার্থক্য',
  unknown_info: 'প্রাথমিক তথ্য অসম্পূর্ণ',
};

const CHANNEL_LABELS: Record<string, string> = {
  call: 'ফোন কল',
  whatsapp: 'হোয়াটসঅ্যাপ',
  visit: 'সাক্ষাৎ',
  mosque: 'মসজিদে দেখা',
  note: 'নোট / রিভিউ',
};

export default function CarePlanDrawer() {
  const { enabled, drawerContactId, closeDrawer, refreshRadar } = useCareRadar();
  const { isAdmin, hasPermission } = useAuth();

  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [snapshot, setSnapshot] = useState<CareSnapshot | null>(null);
  const [openTasks, setOpenTasks] = useState<CareTask[]>([]);
  const [historyTasks, setHistoryTasks] = useState<CareTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState('');
  const [snoozeOpenId, setSnoozeOpenId] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const canVoice = isAdmin || hasPermission('useVoiceUpdate');

  const fetchMemberCare = async (contactId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/care/members/${contactId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'কেয়ার প্ল্যান লোড করা যায়নি');
      }
      const data = await res.json();
      setContact(data.contact);
      setSnapshot(data.snapshot);
      setOpenTasks(Array.isArray(data.openTasks) ? data.openTasks : []);
      setHistoryTasks(Array.isArray(data.historyTasks) ? data.historyTasks : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && drawerContactId) {
      setCompletingId(null);
      setOutcomeText('');
      setSnoozeOpenId(null);
      setToastMsg(null);
      fetchMemberCare(drawerContactId);
    }
  }, [enabled, drawerContactId]);

  if (!enabled || !drawerContactId) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setBusyTaskId(taskId);
      const res = await apiFetch(`/api/care/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: outcomeText.trim() || 'ফলো-আপ সম্পন্ন হয়েছে' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'আপডেট করা যায়নি');
      setCompletingId(null);
      setOutcomeText('');
      showToast('আপডেট নেওয়া হয়েছে — পরবর্তী ধাপ তৈরি');
      await fetchMemberCare(drawerContactId);
      refreshRadar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleSnoozeTask = async (taskId: string, days: number) => {
    try {
      setBusyTaskId(taskId);
      const res = await apiFetch(`/api/care/tasks/${taskId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) throw new Error('স্নুজ করা যায়নি');
      setSnoozeOpenId(null);
      showToast(`${days} দিনের জন্য রিমাইন্ডার পিছিয়ে দেওয়া হয়েছে`);
      await fetchMemberCare(drawerContactId);
      refreshRadar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleDismissTask = async (taskId: string) => {
    try {
      setBusyTaskId(taskId);
      const res = await apiFetch(`/api/care/tasks/${taskId}/dismiss`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('বাতিল করা যায়নি');
      showToast('এই ধাপটি প্রযোজ্য নয় হিসেবে চিহ্নিত হয়েছে');
      await fetchMemberCare(drawerContactId);
      refreshRadar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyTaskId(null);
    }
  };

  const topTask = openTasks[0] || null;
  const urgency = snapshot?.urgency || topTask?.urgency || 'ok';
  const cleanPhone = (contact?.phone || '').replace(/[^0-9+]/g, '');
  const waPhone = cleanPhone.startsWith('0') ? `88${cleanPhone}` : cleanPhone;

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-end md:items-stretch">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      {/* Drawer (right on desktop, bottom sheet on mobile) */}
      <div className="relative z-10 w-full md:max-w-lg max-h-[88vh] md:max-h-screen md:h-full glass-modal rounded-t-[24px] md:rounded-t-none md:rounded-l-[24px] flex flex-col overflow-hidden border-t md:border-t-0 md:border-l border-white/15">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                urgency === 'urgent'
                  ? 'bg-rose-500/18 border-rose-400/40 text-rose-300'
                  : urgency === 'soon'
                  ? 'bg-[#F4A85E]/18 border-[#F4A85E]/40 text-[#F4A85E]'
                  : 'bg-[#34D399]/18 border-[#34D399]/35 text-[#34D399]'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="eyebrow text-[#34D399]">CARE RADAR PLAN</div>
              <h3 className="text-base font-semibold text-[#EDF4F0] truncate">
                {contact?.name || 'সদস্যের কেয়ার প্ল্যান'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-2 rounded-xl text-[#8EA39A] hover:text-[#EDF4F0] hover:bg-white/10 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Banner */}
        {toastMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-[#34D399]/18 border border-[#34D399]/40 text-[#B6F5D8] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-[#8EA39A]">
              <Loader2 className="w-5 h-5 animate-spin text-[#34D399]" />
              <span>কেয়ার প্ল্যান বিশ্লেষণ হচ্ছে...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl glass-alert text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : contact ? (
            <>
              {/* Section 1: Member Snapshot */}
              <div className="p-4 rounded-2xl glass-2 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold text-[#EDF4F0]">{contact.name}</div>
                    <div className="text-xs text-[#8EA39A] mt-0.5">
                      ধাপ {contact.currentStage}/16 · {STAGES[(contact.currentStage || 1) - 1] || ''}
                    </div>
                  </div>
                  <Link
                    to={`/contacts/${contact.id}`}
                    onClick={closeDrawer}
                    className="text-xs text-[#34D399] hover:underline flex items-center gap-1 shrink-0"
                  >
                    <span>প্রোফাইল</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#8EA39A]">
                  {contact.area && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04]">
                      <MapPin className="w-3 h-3 text-[#34D399]" />
                      {contact.area}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] font-mono tabular-nums">
                      <Phone className="w-3 h-3 text-[#34D399]" />
                      {contact.phone}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-[#B6F5D8] font-mono tabular-nums">
                    স্কোর: {contact.growthScore}%
                  </span>
                </div>
              </div>

              {/* Section 2: Immediate Next Action & Contact Channel */}
              <div
                className={`p-4 rounded-2xl space-y-3 ${
                  urgency === 'urgent'
                    ? 'glass-alert'
                    : urgency === 'soon'
                    ? 'glass-hot'
                    : 'glass-2'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    তাৎক্ষণিক পরবর্তী পদক্ষেপ
                  </span>
                  {topTask && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/25 text-[#EDF4F0]/90 font-mono">
                      Cycle #{topTask.cycleNo} · {CHANNEL_LABELS[topTask.channel] || topTask.channel}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#EDF4F0] leading-relaxed">
                  {topTask?.suggestedAction ||
                    snapshot?.nextStepSummary ||
                    'এই সদস্যের জন্য বর্তমানে কোনো জরুরি গ্যাপ নেই — স্বাভাবিক সৌজন্যমূলক যোগাযোগ রাখুন।'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl forest-btn-primary text-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      কল করুন
                    </a>
                  )}
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-2 hover:border-[#34D399]/40 text-xs text-[#B6F5D8]"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#34D399]" />
                      WhatsApp
                    </a>
                  )}
                  {canVoice && (
                    <button
                      type="button"
                      onClick={() => setVoiceOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-2 hover:border-[#34D399]/40 text-xs text-[#EDF4F0]"
                    >
                      <Mic className="w-3.5 h-3.5 text-[#34D399]" />
                      ভয়েস আপডেট দিন
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Active Gap Reasons ("কেন গুরুত্বপূর্ণ") */}
              <div className="space-y-2">
                <h4 className="eyebrow text-[#8EA39A]">কেন গুরুত্বপূর্ণ (শনাক্তকৃত গ্যাপ)</h4>
                {(snapshot?.gapKeys || []).length === 0 ? (
                  <div className="p-3 rounded-xl glass-2 text-xs text-[#8EA39A]">
                    কোনো বকেয়া বা অসংগতি শনাক্ত হয়নি।
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {snapshot!.gapKeys.map((key) => (
                      <span
                        key={key}
                        className="px-2.5 py-1 rounded-full glass-2 text-xs text-[#EDF4F0]/90 border border-white/12"
                      >
                        • {GAP_LABELS[key] || key}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Open Tasks with Complete / Snooze / Dismiss */}
              <div className="space-y-2.5">
                <h4 className="eyebrow text-[#34D399]">
                  চলমান করণীয় ধাপসমূহ ({openTasks.length})
                </h4>
                {openTasks.length === 0 ? (
                  <div className="p-4 rounded-2xl glass-2 text-xs text-[#8EA39A] text-center">
                    এই মুহূর্তে কোনো খোলা কেয়ার টাস্ক নেই।
                  </div>
                ) : (
                  <div className="space-y-3">
                    {openTasks.map((task) => (
                      <div key={task.id} className="p-4 rounded-2xl glass-2 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  task.urgency === 'urgent'
                                    ? 'bg-rose-400'
                                    : task.urgency === 'soon'
                                    ? 'bg-[#F4A85E]'
                                    : 'bg-[#34D399]'
                                }`}
                              />
                              <h5 className="text-sm font-semibold text-[#EDF4F0]">{task.title}</h5>
                            </div>
                            <p className="text-xs text-[#8EA39A] mt-1 leading-relaxed">{task.reason}</p>
                            <p className="text-xs text-[#B6F5D8] mt-1 leading-relaxed">
                              প্রস্তাবিত পদক্ষেপ: {task.suggestedAction}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-[#8EA39A] shrink-0">
                            চক্র #{task.cycleNo}
                          </span>
                        </div>

                        {/* Complete inline box */}
                        {completingId === task.id ? (
                          <div className="p-3 rounded-xl bg-black/25 border border-[#34D399]/30 space-y-2">
                            <input
                              type="text"
                              value={outcomeText}
                              onChange={(e) => setOutcomeText(e.target.value)}
                              placeholder="ফলাফল সংক্ষেপে লিখুন (যেমন: ফোনে কথা হয়েছে, জুমায় আসবেন)"
                              className="w-full px-3 py-2 rounded-xl forest-input text-xs"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setCompletingId(null)}
                              >
                                বাতিল
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={busyTaskId === task.id}
                                onClick={() => handleCompleteTask(task.id)}
                              >
                                {busyTaskId === task.id ? 'সংরক্ষণ হচ্ছে...' : 'নিশ্চিত করুন ও পরবর্তী ধাপ'}
                              </Button>
                            </div>
                          </div>
                        ) : snoozeOpenId === task.id ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] text-[#8EA39A]">কত দিন পর মনে করাবো?</span>
                            {[1, 3, 7].map((d) => (
                              <button
                                key={d}
                                type="button"
                                disabled={busyTaskId === task.id}
                                onClick={() => handleSnoozeTask(task.id, d)}
                                className="px-2.5 py-1 rounded-lg glass-2 hover:border-[#F4A85E]/50 text-xs text-[#F4A85E]"
                              >
                                {d} দিন
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setSnoozeOpenId(null)}
                              className="text-[11px] text-[#8EA39A] hover:text-[#EDF4F0] ml-1"
                            >
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCompletingId(task.id);
                                setOutcomeText('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#34D399]/18 hover:bg-[#34D399]/28 border border-[#34D399]/40 text-[#B6F5D8] text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                              করেছি — আপডেট দিন
                            </button>
                            <button
                              type="button"
                              onClick={() => setSnoozeOpenId(task.id)}
                              className="px-2.5 py-1.5 rounded-xl glass-2 hover:border-white/25 text-xs text-[#8EA39A] hover:text-[#EDF4F0] flex items-center gap-1"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              পরে মনে করান
                            </button>
                            <button
                              type="button"
                              disabled={busyTaskId === task.id}
                              onClick={() => handleDismissTask(task.id)}
                              className="px-2.5 py-1.5 rounded-xl glass-2 hover:border-rose-400/35 text-xs text-[#8EA39A] hover:text-rose-300 flex items-center gap-1"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              প্রযোজ্য নয়
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5: Cycle History */}
              {historyTasks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="eyebrow text-[#8EA39A] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    সম্পন্ন ও পূর্ববর্তী চক্র ({historyTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {historyTasks.map((ht) => (
                      <div key={ht.id} className="p-3 rounded-xl glass-2 text-xs space-y-1 opacity-85">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#EDF4F0]">{ht.title}</span>
                          <span className="text-[10px] font-mono text-[#34D399]">
                            চক্র #{ht.cycleNo} · {ht.status === 'done' ? 'সম্পন্ন' : ht.status}
                          </span>
                        </div>
                        {ht.completedOutcome && (
                          <p className="text-[#8EA39A]">ফলাফল: {ht.completedOutcome}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Optional Voice Modal right from Care Plan Drawer */}
      {canVoice && contact && (
        <VoiceDawahModal
          open={voiceOpen}
          onOpenChange={setVoiceOpen}
          member={{
            id: contact.id,
            name: contact.name,
            currentStage: contact.currentStage,
            priorityLevel: contact.priorityLevel,
            categoryTags: contact.categoryTags,
          }}
          onApproved={() => {
            setVoiceOpen(false);
            showToast('ভয়েস আপডেট সংরক্ষিত হয়েছে ও কেয়ার রাডার আপডেট হয়েছে');
            fetchMemberCare(contact.id);
            refreshRadar();
          }}
        />
      )}
    </div>
  );
}
