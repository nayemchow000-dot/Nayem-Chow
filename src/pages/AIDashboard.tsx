import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from '../components/ui';
import {
  Mic,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  FileWarning,
  ArrowRight,
  RefreshCw,
  Check,
  UserCheck,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AiVoiceEntry, CustomCategory, STAGES } from '../types';
import VoiceDawahModal from '../components/VoiceDawahModal';

interface DashboardPayload {
  recentlyUpdatedVoice: Array<AiVoiceEntry & { memberName: string; memberStage: number }>;
  pendingApprovals: Array<AiVoiceEntry & { memberName: string; memberArea?: string | null }>;
  overdueFollowUps: Array<any>;
  upcomingReminders: Array<any>;
  priorityFollowUpMembers: Array<any>;
  recentObservations: Array<any>;
  incompleteInfoMembers: Array<{
    id: string;
    name: string;
    area?: string | null;
    currentStage: number;
    missingFields: string[];
  }>;
  allCategories: CustomCategory[];
}

export default function AIDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewEntry, setReviewEntry] = useState<(AiVoiceEntry & { memberName: string }) | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/ai/dashboard');
      if (!res.ok) throw new Error('Failed to load AI Dashboard');
      const payload = await res.json();
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'AI ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleMarkFollowUpDone = async (followUpId: string) => {
    try {
      const res = await apiFetch(`/api/follow-ups/${followUpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: true }),
      });
      if (res.ok) {
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-white/50 text-sm">
        AI দাওয়াহ ড্যাশবোর্ড লোড হচ্ছে...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif italic tracking-tight text-[#E5E5E7]">
            AI দাওয়াহ কমান্ড সেন্টার
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            ভয়েস আপডেট, পেন্ডিং AI অনুমোদন, মেয়াদোত্তীর্ণ ফলো-আপ এবং রিমাইন্ডার পর্যবেক্ষণ।
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={fetchDashboard}
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          রিফ্রেশ
        </Button>
      </div>

      {/* Top KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#16161A] border border-white/10">
          <div className="text-xs text-white/50">পেন্ডিং AI অনুমোদন</div>
          <div className="text-2xl font-bold text-amber-400 tabular-nums mt-1">
            {data?.pendingApprovals.length || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#16161A] border border-white/10">
          <div className="text-xs text-white/50">মেয়াদোত্তীর্ণ ফলো-আপ</div>
          <div className="text-2xl font-bold text-rose-400 tabular-nums mt-1">
            {data?.overdueFollowUps.length || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#16161A] border border-white/10">
          <div className="text-xs text-white/50">আসন্ন রিমাইন্ডার</div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">
            {data?.upcomingReminders.length || 0}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#16161A] border border-white/10">
          <div className="text-xs text-white/50">ভয়েস-আপডেটেড সদস্য</div>
          <div className="text-2xl font-bold text-[#E5E5E7] tabular-nums mt-1">
            {data?.recentlyUpdatedVoice.length || 0}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Pending AI Approvals */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>পেন্ডিং AI অনুমোদন (Pending AI Approvals)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {!data?.pendingApprovals.length ? (
              <p className="text-xs text-white/45 py-4 text-center">
                কোনো পেন্ডিং AI অনুমোদন অপেক্ষমাণ নেই।
              </p>
            ) : (
              data.pendingApprovals.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-lg bg-[#0A0A0B] border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-sm font-medium text-[#E5E5E7]">
                      {entry.memberName}
                      {entry.memberArea && (
                        <span className="text-xs text-white/45 font-normal"> · {entry.memberArea}</span>
                      )}
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2">“{entry.editedTranscription}”</p>
                    <div className="text-[11px] text-amber-400/90 tabular-nums">
                      প্রস্তাবিত ক্যাটাগরি: {(entry.suggestedIndicators || []).length}টি · অনিশ্চিত:{' '}
                      {(entry.uncertainObservations || []).length}টি
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setReviewEntry(entry)}
                    className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    রিভিউ ও অনুমোদন
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 2. Overdue Follow-ups & Upcoming Reminders */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>মেয়াদোত্তীর্ণ ও আসন্ন রিমাইন্ডার (Follow-ups & Reminders)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {(data?.overdueFollowUps || []).map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg bg-rose-500/5 border border-rose-500/25 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/contacts/${f.contactId}`}
                      className="text-sm font-medium text-[#E5E5E7] hover:text-emerald-400"
                    >
                      {f.memberName}
                    </Link>
                    <span className="text-[11px] font-mono text-rose-400">
                      মেয়াদোত্তীর্ণ · {f.nextActionDate}
                    </span>
                  </div>
                  <p className="text-xs text-white/65">{f.reminderNote || f.nextAction || f.topic || 'ফলো-আপ'}</p>
                  {f.assignedTo && (
                    <div className="text-[11px] text-white/45 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> দায়িত্বপ্রাপ্ত: {f.assignedTo}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkFollowUpDone(f.id)}
                  className="shrink-0 gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <Check className="w-3.5 h-3.5" />
                  সম্পন্ন
                </Button>
              </div>
            ))}

            {(data?.upcomingReminders || []).map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg bg-[#0A0A0B] border border-white/10 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/contacts/${f.contactId}`}
                      className="text-sm font-medium text-[#E5E5E7] hover:text-emerald-400"
                    >
                      {f.memberName}
                    </Link>
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {f.nextActionDate}
                    </span>
                  </div>
                  <p className="text-xs text-white/65">{f.reminderNote || f.nextAction || f.topic}</p>
                  {f.assignedTo && (
                    <div className="text-[11px] text-white/45">দায়িত্বপ্রাপ্ত: {f.assignedTo}</div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkFollowUpDone(f.id)}
                  className="shrink-0 gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  সম্পন্ন
                </Button>
              </div>
            ))}

            {!data?.overdueFollowUps.length && !data?.upcomingReminders.length && (
              <p className="text-xs text-white/45 py-4 text-center">
                কোনো অসম্পন্ন ফলো-আপ বা রিমাইন্ডার নেই। সদস্য প্রোফাইল থেকে রিমাইন্ডার যোগ করুন।
              </p>
            )}
          </CardContent>
        </Card>

        {/* 3. Members Recently Updated Through Voice */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>সাম্প্রতিক ভয়েস-আপডেটেড সদস্য</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {!data?.recentlyUpdatedVoice.length ? (
              <p className="text-xs text-white/45 py-4 text-center">
                এখনো কোনো ভয়েস নোট অনুমোদিত হয়নি। যেকোনো সদস্যের প্রোফাইলে গিয়ে মাইক বাটনে চাপুন।
              </p>
            ) : (
              data.recentlyUpdatedVoice.map((item) => (
                <Link
                  key={item.id}
                  to={`/contacts/${item.contactId}`}
                  className="block p-3 rounded-lg bg-[#0A0A0B] border border-white/5 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#E5E5E7]">{item.memberName}</span>
                    <span className="text-[11px] text-white/40 tabular-nums">
                      {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : ''} · অনুমোদক:{' '}
                      {item.adminUsername || 'admin'}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1 line-clamp-1">“{item.editedTranscription}”</p>
                  {Array.isArray((item.approvedChanges as any)?.addedCategories) &&
                    (item.approvedChanges as any).addedCategories.length > 0 && (
                      <div className="text-[11px] text-emerald-400/85 mt-1">
                        যুক্ত হয়েছে: {(item.approvedChanges as any).addedCategories.join(' · ')}
                      </div>
                    )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* 4. Members Requiring Follow-up (Priority) */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>ফলো-আপ প্রয়োজন এমন সদস্য</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {!data?.priorityFollowUpMembers.length ? (
              <p className="text-xs text-white/45 py-4 text-center">সবাই স্বাভাবিক অগ্রগতিতে আছেন।</p>
            ) : (
              data.priorityFollowUpMembers.map((m) => (
                <Link
                  key={m.id}
                  to={`/contacts/${m.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#0A0A0B] border border-white/5 hover:border-white/15 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#E5E5E7] truncate">{m.name}</div>
                    <div className="text-xs text-white/45">
                      স্টেজ {m.currentStage} · {STAGES[(m.currentStage || 1) - 1] || ''}
                      {m.area ? ` · ${m.area}` : ''}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      m.priorityLevel === 'high_priority' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {m.priorityLevel === 'high_priority' ? 'High Priority' : 'Needs Attention'}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* 5. Recent Growth Observations */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>সাম্প্রতিক গ্রোথ পর্যবেক্ষণ (Recent Observations)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {!data?.recentObservations.length ? (
              <p className="text-xs text-white/45 py-4 text-center">
                এখনো কোনো পর্যবেক্ষণ সংরক্ষিত হয়নি।
              </p>
            ) : (
              data.recentObservations.slice(0, 8).map((obs) => (
                <Link
                  key={obs.id}
                  to={`/contacts/${obs.contactId}`}
                  className="block p-3 rounded-lg bg-[#0A0A0B] border border-white/5 hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-emerald-400">{obs.memberName}</span>
                    <span className="text-white/40 font-mono">{obs.date}</span>
                  </div>
                  <p className="text-xs text-white/75 mt-1">{obs.observation}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* 6. Members with Incomplete Information */}
        <Card className="border-white/10">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-white/60" />
              <span>অসম্পূর্ণ তথ্য থাকা সদস্য (Data Not Yet Recorded)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {!data?.incompleteInfoMembers.length ? (
              <p className="text-xs text-white/45 py-4 text-center">সকল সদস্যের প্রাথমিক তথ্য সম্পূর্ণ।</p>
            ) : (
              data.incompleteInfoMembers.map((m) => (
                <Link
                  key={m.id}
                  to={`/contacts/${m.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0A0A0B] border border-white/5 hover:border-white/15 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#E5E5E7] truncate">{m.name}</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      তথ্য প্রয়োজন: {m.missingFields.join(' · ')}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Pending Approval Modal */}
      {reviewEntry && (
        <VoiceDawahModal
          open={!!reviewEntry}
          onOpenChange={(open) => {
            if (!open) setReviewEntry(null);
          }}
          member={{
            id: reviewEntry.contactId,
            name: reviewEntry.memberName,
          }}
          initialPendingEntry={reviewEntry}
          allCategories={data?.allCategories}
          onApproved={() => {
            setReviewEntry(null);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}
