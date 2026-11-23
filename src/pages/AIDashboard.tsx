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
      <div className="p-8 text-center text-[#8EA39A] text-sm">
        AI দাওয়াহ ড্যাশবোর্ড লোড হচ্ছে...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl glass-hot border border-rose-400/35 text-rose-300 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="eyebrow">AI COMMAND CENTER</span>
          <h1 className="text-2xl sm:text-3xl font-serif italic tracking-tight text-[#EDF4F0] mt-1">
            AI দাওয়াহ কমান্ড সেন্টার
          </h1>
          <p className="text-xs sm:text-sm text-[#8EA39A] mt-1">
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
        <div className={`p-5 rounded-[20px] ${(data?.pendingApprovals.length || 0) > 0 ? 'glass-hot' : 'glass'}`}>
          <div className="eyebrow text-[#8EA39A]">পেন্ডিং AI অনুমোদন</div>
          <div className="text-3xl font-serif italic text-[#F4A85E] tabular-nums mt-2">
            {data?.pendingApprovals.length || 0}
          </div>
        </div>
        <div className={`p-5 rounded-[20px] ${(data?.overdueFollowUps.length || 0) > 0 ? 'glass border-rose-400/35' : 'glass'}`}>
          <div className="eyebrow text-[#8EA39A]">মেয়াদোত্তীর্ণ ফলো-আপ</div>
          <div className="text-3xl font-serif italic text-rose-300 tabular-nums mt-2">
            {data?.overdueFollowUps.length || 0}
          </div>
        </div>
        <div className="p-5 rounded-[20px] glass">
          <div className="eyebrow text-[#8EA39A]">আসন্ন রিমাইন্ডার</div>
          <div className="text-3xl font-serif italic text-[#34D399] tabular-nums mt-2">
            {data?.upcomingReminders.length || 0}
          </div>
        </div>
        <div className="p-5 rounded-[20px] glass">
          <div className="eyebrow text-[#8EA39A]">ভয়েস-আপডেটেড সদস্য</div>
          <div className="text-3xl font-serif italic text-[#EDF4F0] tabular-nums mt-2">
            {data?.recentlyUpdatedVoice.length || 0}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Pending AI Approvals */}
        <Card>
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F4A85E]" />
              <span>পেন্ডিং AI অনুমোদন (Pending AI Approvals)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {!data?.pendingApprovals.length ? (
              <p className="text-xs text-[#8EA39A] py-4 text-center">
                কোনো পেন্ডিং AI অনুমোদন অপেক্ষমাণ নেই।
              </p>
            ) : (
              data.pendingApprovals.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-2xl glass-hot flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-sm font-medium text-[#EDF4F0]">
                      {entry.memberName}
                      {entry.memberArea && (
                        <span className="text-xs text-[#8EA39A] font-normal"> · {entry.memberArea}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#EDF4F0]/75 line-clamp-2">“{entry.editedTranscription}”</p>
                    <div className="text-[11px] text-[#F4A85E] tabular-nums">
                      প্রস্তাবিত ক্যাটাগরি: {(entry.suggestedIndicators || []).length}টি · অনিশ্চিত:{' '}
                      {(entry.uncertainObservations || []).length}টি
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setReviewEntry(entry)}
                    className="shrink-0 bg-gradient-to-r from-[#F4A85E] to-[#E8CD92] text-[#1A0D02] font-semibold hover:brightness-105"
                  >
                    রিভিউ ও অনুমোদন
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 2. Overdue Follow-ups & Upcoming Reminders */}
        <Card>
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-300" />
              <span>মেয়াদোত্তীর্ণ ও আসন্ন রিমাইন্ডার (Follow-ups & Reminders)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {(data?.overdueFollowUps || []).map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl glass-hot border-rose-400/35 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/contacts/${f.contactId}`}
                      className="text-sm font-medium text-[#EDF4F0] hover:text-[#34D399] transition-colors"
                    >
                      {f.memberName}
                    </Link>
                    <span className="text-[11px] font-mono text-rose-300">
                      মেয়াদোত্তীর্ণ · {f.nextActionDate}
                    </span>
                  </div>
                  <p className="text-xs text-[#EDF4F0]/80">{f.reminderNote || f.nextAction || f.topic || 'ফলো-আপ'}</p>
                  {f.assignedTo && (
                    <div className="text-[11px] text-[#8EA39A] flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> দায়িত্বপ্রাপ্ত: {f.assignedTo}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkFollowUpDone(f.id)}
                  className="shrink-0 gap-1 text-[#B6F5D8] border-[#34D399]/35 hover:bg-[#34D399]/15"
                >
                  <Check className="w-3.5 h-3.5" />
                  সম্পন্ন
                </Button>
              </div>
            ))}

            {(data?.upcomingReminders || []).map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl glass-2 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/contacts/${f.contactId}`}
                      className="text-sm font-medium text-[#EDF4F0] hover:text-[#34D399] transition-colors"
                    >
                      {f.memberName}
                    </Link>
                    <span className="text-[11px] font-mono text-[#34D399] flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {f.nextActionDate}
                    </span>
                  </div>
                  <p className="text-xs text-[#EDF4F0]/80">{f.reminderNote || f.nextAction || f.topic}</p>
                  {f.assignedTo && (
                    <div className="text-[11px] text-[#8EA39A]">দায়িত্বপ্রাপ্ত: {f.assignedTo}</div>
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
              <p className="text-xs text-[#8EA39A] py-4 text-center">
                কোনো অসম্পন্ন ফলো-আপ বা রিমাইন্ডার নেই। সদস্য প্রোফাইল থেকে রিমাইন্ডার যোগ করুন।
              </p>
            )}
          </CardContent>
        </Card>

        {/* 3. Members Recently Updated Through Voice */}
        <Card>
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#34D399]" />
              <span>সাম্প্রতিক ভয়েস-আপডেটেড সদস্য</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {!data?.recentlyUpdatedVoice.length ? (
              <p className="text-xs text-[#8EA39A] py-4 text-center">
                এখনো কোনো ভয়েস নোট অনুমোদিত হয়নি। যেকোনো সদস্যের প্রোফাইলে গিয়ে মাইক বাটনে চাপুন।
              </p>
            ) : (
              data.recentlyUpdatedVoice.map((item) => (
                <Link
                  key={item.id}
                  to={`/contacts/${item.contactId}`}
                  className="block p-3.5 rounded-2xl glass-2 hover:border-[#34D399]/35 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#EDF4F0]">{item.memberName}</span>
                    <span className="text-[11px] text-[#8EA39A] tabular-nums">
                      {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : ''} · অনুমোদক:{' '}
                      {item.adminUsername || 'admin'}
                    </span>
                  </div>
                  <p className="text-xs text-[#EDF4F0]/75 mt-1 line-clamp-1">“{item.editedTranscription}”</p>
                  {Array.isArray((item.approvedChanges as any)?.addedCategories) &&
                    (item.approvedChanges as any).addedCategories.length > 0 && (
                      <div className="text-[11px] text-[#34D399] mt-1">
                        যুক্ত হয়েছে: {(item.approvedChanges as any).addedCategories.join(' · ')}
                      </div>
                    )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* 4. Members Requiring Follow-up (Priority) */}
        <Card>
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#F4A85E]" />
              <span>ফলো-আপ প্রয়োজন এমন সদস্য</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {!data?.priorityFollowUpMembers.length ? (
              <p className="text-xs text-[#8EA39A] py-4 text-center">সবাই স্বাভাবিক অগ্রগতিতে আছেন।</p>
            ) : (
              data.priorityFollowUpMembers.map((m) => (
                <Link
                  key={m.id}
                  to={`/contacts/${m.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl glass-2 hover:border-white/25 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#EDF4F0] truncate">{m.name}</div>
                    <div className="text-xs text-[#8EA39A]">
                      স্টেজ {m.currentStage} · {STAGES[(m.currentStage || 1) - 1] || ''}
                      {m.area ? ` · ${m.area}` : ''}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${
                      m.priorityLevel === 'high_priority' ? 'text-rose-300' : 'text-[#F4A85E]'
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
        <Card>
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
              <span>সাম্প্রতিক গ্রোথ পর্যবেক্ষণ (Recent Observations)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5">
            {!data?.recentObservations.length ? (
              <p className="text-xs text-[#8EA39A] py-4 text-center">
                এখনো কোনো পর্যবেক্ষণ সংরক্ষিত হয়নি।
              </p>
            ) : (
              data.recentObservations.slice(0, 8).map((obs) => (
                <Link
                  key={obs.id}
                  to={`/contacts/${obs.contactId}`}
                  className="block p-3.5 rounded-2xl glass-2 hover:border-white/25 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#34D399]">{obs.memberName}</span>
                    <span className="text-[#5D726A] font-mono tabular-nums">{obs.date}</span>
                  </div>
                  <p className="text-xs text-[#EDF4F0]/80 mt-1">{obs.observation}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* 6. Members with Incomplete Information */}
        <Card>
          <CardHeader className="border-b border-white/[0.08] pb-4">
            <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-[#8EA39A]" />
              <span>অসম্পূর্ণ তথ্য থাকা সদস্য (Data Not Yet Recorded)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {!data?.incompleteInfoMembers.length ? (
              <p className="text-xs text-[#8EA39A] py-4 text-center">সকল সদস্যের প্রাথমিক তথ্য সম্পূর্ণ।</p>
            ) : (
              data.incompleteInfoMembers.map((m) => (
                <Link
                  key={m.id}
                  to={`/contacts/${m.id}`}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl glass-2 hover:border-white/25 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#EDF4F0] truncate">{m.name}</div>
                    <div className="text-xs text-[#8EA39A] mt-0.5">
                      তথ্য প্রয়োজন: {m.missingFields.join(' · ')}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#5D726A] shrink-0" />
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
