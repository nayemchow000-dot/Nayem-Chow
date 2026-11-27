import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  Smartphone,
  Clock,
  CheckCircle2,
  Circle,
  Flame,
  Mic,
  ArrowRight,
  Shield,
  Award,
  Users,
  BarChart3,
  Send,
  Loader2,
  Lock,
  Eye,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { STAGES, TrackerItem } from '../types';
import {
  formatMinutesBn,
  formatMinutesCompactBn,
  toBanglaDigits,
  computeProductiveMinutes,
} from '../lib/dhakaTime';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
} from '../components/ui';
import TimePickerSheet from '../components/TimePickerSheet';
import ScreenTimeComparisonCard, {
  getScreenTimeSourceLabelBn,
} from '../components/ScreenTimeComparisonCard';

export default function MemberHome() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [comparisonSeries, setComparisonSeries] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Quick checklist interactive state synced with server
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [itemMinutesMap, setItemMinutesMap] = useState<Record<string, number>>({});
  const [timePickerItem, setTimePickerItem] = useState<TrackerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Screen Time modal
  const [screenModalOpen, setScreenModalOpen] = useState(false);
  const [stHours, setStHours] = useState('0');
  const [stMins, setStMins] = useState('0');
  const [savingSt, setSavingSt] = useState(false);

  // Monitoring quick toggles
  const [savingSharing, setSavingSharing] = useState(false);

  const loadHome = useCallback(async () => {
    try {
      setLoading(true);
      const [ovRes, timeRes] = await Promise.all([
        apiFetch('/api/my-home/overview'),
        apiFetch('/api/my-time/summary?range=week'),
      ]);
      if (ovRes.ok) {
        const ov = await ovRes.json();
        setOverview(ov);
        setCheckedMap(ov.todayItems || {});
        setItemMinutesMap(ov.todayItemMinutes || {});
        const m = Number(ov.todayScreenTime?.minutes || 0);
        setStHours(String(Math.floor(m / 60)));
        setStMins(String(m % 60));
      }
      if (timeRes.ok) {
        const tm = await timeRes.json();
        setComparisonSeries(Array.isArray(tm.comparisonSeries) ? tm.comparisonSeries : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleItem = async (key: string) => {
    if (!overview) return;
    const nextItems = { ...checkedMap, [key]: !checkedMap[key] };
    setCheckedMap(nextItems);
    try {
      const res = await apiFetch('/api/my-track/today', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate: overview.dhakaToday,
          items: nextItems,
          itemMinutes: itemMinutesMap,
        }),
      });
      if (res.ok) {
        await loadHome();
      }
    } catch {
      // ignore network error
    }
  };

  const handleSaveItemTime = async (
    item: TrackerItem,
    minutes: number | null,
    alsoCheck?: boolean
  ) => {
    if (!overview) return;
    const nextMinutes = { ...itemMinutesMap };
    if (minutes && minutes > 0) {
      nextMinutes[item.key] = minutes;
    } else {
      delete nextMinutes[item.key];
    }
    const nextItems = alsoCheck ? { ...checkedMap, [item.key]: true } : checkedMap;
    setItemMinutesMap(nextMinutes);
    if (alsoCheck) setCheckedMap(nextItems);

    const res = await apiFetch('/api/my-track/today', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportDate: overview.dhakaToday,
        items: nextItems,
        itemMinutes: nextMinutes,
      }),
    });
    if (res.ok) {
      showToast(
        minutes
          ? `${item.banglaLabel}: ${formatMinutesBn(minutes)} সংরক্ষিত হয়েছে।`
          : `${item.banglaLabel}-এর সময় মুছে ফেলা হয়েছে।`
      );
      await loadHome();
    }
  };

  const handleQuickSubmitReport = async () => {
    if (!overview) return;
    try {
      setSubmitting(true);
      const res = await apiFetch('/api/my-track/report/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate: overview.dhakaToday,
          items: checkedMap,
          itemMinutes: itemMinutesMap,
          status: 'submitted',
        }),
      });
      if (res.ok) {
        showToast('জাযাকাল্লাহু খাইরান! আজকের রিপোর্ট জমা হয়েছে।');
        await loadHome();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSaveScreenTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview) return;
    const totalMins = Math.min(
      1440,
      Math.max(0, (parseInt(stHours || '0', 10) || 0) * 60 + (parseInt(stMins || '0', 10) || 0))
    );
    try {
      setSavingSt(true);
      const res = await apiFetch('/api/my-time/screen-time', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordDate: overview.dhakaToday,
          minutes: totalMins,
          dataSource: 'manual',
        }),
      });
      if (res.ok) {
        setScreenModalOpen(false);
        showToast(`আজকের স্ক্রিন টাইম (${formatMinutesBn(totalMins)}) সংরক্ষিত হয়েছে।`);
        await loadHome();
      }
    } finally {
      setSavingSt(false);
    }
  };

  const handleToggleMonitoring = async (patch: Record<string, boolean>) => {
    if (!overview) return;
    try {
      setSavingSharing(true);
      const res = await apiFetch('/api/my-track/sharing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        showToast('মনিটরিং সেটিংস আপডেট হয়েছে।');
        await loadHome();
      }
    } finally {
      setSavingSharing(false);
    }
  };

  const trackerItems: TrackerItem[] = overview?.trackerItems || [];
  const totalCount = trackerItems.length;
  const completedCount = trackerItems.filter((it) => Boolean(checkedMap[it.key])).length;
  const pendingCount = Math.max(0, totalCount - completedCount);
  const dailyPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const liveProductiveMinutes = computeProductiveMinutes(checkedMap, itemMinutesMap);

  const contact = user?.contact;
  const currentStage = contact?.currentStage || 1;
  const stageName = STAGES[Math.max(0, currentStage - 1)] || `ধাপ ${currentStage}`;
  const sharing = overview?.sharingSettings;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Greeting & Dhaka Date Banner */}
      <div className="glass rounded-[24px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="eyebrow text-[#34D399] mb-1">MEMBER HOME · DAWAH CONTROL CENTER</div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-[#EDF4F0]">
            আসসালামু আলাইকুম, {contact?.name || user?.username}
          </h1>
          <p className="text-xs sm:text-sm text-[#8EA39A] mt-1">
            {overview?.displayDateBn || 'বাংলাদেশ সময় (Asia/Dhaka)'} · আপনার দৈনিক আমল, দাওয়াহ ও সময়ের সারসংক্ষেপ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="glass-2 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs">
            <Flame className="w-4 h-4 text-[#F4A85E]" />
            <span className="text-[#8EA39A]">স্ট্রিক:</span>
            <span className="font-mono font-bold text-[#EDF4F0] tabular-nums">
              {toBanglaDigits(overview?.streak || 0)} দিন
            </span>
          </div>
          <Link
            to="/my-track?voice=1"
            className="min-h-[40px] px-4 py-2 rounded-xl forest-btn-primary text-xs flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>AI ভয়েস ট্র্যাক</span>
          </Link>
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-2xl bg-[#34D399]/18 border border-[#34D399]/40 text-[#B6F5D8] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {loading && !overview ? (
        <div className="glass rounded-[22px] p-12 text-center text-xs text-[#8EA39A] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>ড্যাশবোর্ড লোড হচ্ছে...</span>
        </div>
      ) : (
        <>
          {/* A. Today's Overview 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass rounded-[20px] p-4 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-1 text-xs text-[#8EA39A]">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#F4A85E]" /> আজকের স্ক্রিন টাইম
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#F4A85E] tabular-nums">
                {overview?.todayScreenTime
                  ? formatMinutesBn(overview.todayScreenTime.minutes)
                  : 'লগ বাকি'}
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#8EA39A]">
                <span className="truncate">
                  {overview?.todayScreenTime
                    ? getScreenTimeSourceLabelBn(overview.todayScreenTime.dataSource)
                    : 'ম্যানুয়াল/অটো'}
                </span>
                <button
                  type="button"
                  onClick={() => setScreenModalOpen(true)}
                  className="text-[#F4A85E] hover:underline font-medium shrink-0"
                >
                  আপডেট
                </button>
              </div>
            </div>

            <div className="glass rounded-[20px] p-4 flex flex-col justify-between gap-2">
              <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#34D399]" /> আজকের Productive Time
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#34D399] tabular-nums">
                {formatMinutesBn(liveProductiveMinutes)}
              </div>
              <div className="text-[11px] text-[#8EA39A] tabular-nums">
                ৭ দিন: {formatMinutesCompactBn(overview?.weeklyProductiveMinutes || 0)} · ৩০ দিন:{' '}
                {formatMinutesCompactBn(overview?.monthlyProductiveMinutes || 0)}
              </div>
            </div>

            <div className="glass rounded-[20px] p-4 flex flex-col justify-between gap-2">
              <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B6F5D8]" /> আমল সম্পন্ন ও বাকি
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#EDF4F0] tabular-nums">
                {toBanglaDigits(completedCount)}/{toBanglaDigits(totalCount)} সম্পন্ন
              </div>
              <div className="text-[11px] text-[#8EA39A] tabular-nums">
                আজ এখনো বাকি: {toBanglaDigits(pendingCount)}টি আমল
              </div>
            </div>

            <div className="glass rounded-[20px] p-4 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-xs text-[#8EA39A]">
                <span>দৈনিক অগ্রগতি</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#B6F5D8]">
                  {overview?.reportStatus === 'submitted' ? 'জমা হয়েছে' : 'চলমান'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#B6F5D8] tabular-nums">
                {toBanglaDigits(dailyPct)}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0E9F6E] to-[#34D399] transition-all duration-500"
                  style={{ width: `${dailyPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Screen Time vs Productive Time Comparison */}
          <ScreenTimeComparisonCard
            todayScreenMinutes={overview?.todayScreenTime?.minutes ?? null}
            todayScreenSource={overview?.todayScreenTime?.dataSource}
            weeklyAvgScreenMinutes={overview?.weeklyAvgScreenTimeMinutes || 0}
            todayProductiveMinutes={liveProductiveMinutes}
            weeklyProductiveMinutes={overview?.weeklyProductiveMinutes || 0}
            series={comparisonSeries}
            onQuickLogClick={() => setScreenModalOpen(true)}
          />

          {/* B. Quick My Dawah Track (with Time Chips) + Sidebar Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Quick Interactive Checklist */}
            <Card className="lg:col-span-7">
              <CardHeader className="border-b border-white/10 pb-3.5 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">আজকের My Dawah Track (দ্রুত আপডেট)</CardTitle>
                  <p className="text-[11px] text-[#8EA39A] mt-0.5">
                    টিক দিয়ে কাজ সম্পন্ন করুন এবং পাশের ঘড়ি বাটনে ব্যয় করা সময় যোগ করুন
                  </p>
                </div>
                <Link
                  to="/my-track"
                  className="text-xs text-[#34D399] hover:text-[#B6F5D8] flex items-center gap-1 shrink-0"
                >
                  <span>পূর্ণ ট্র্যাক</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {trackerItems.slice(0, 8).map((item) => {
                  const checked = Boolean(checkedMap[item.key]);
                  const mins = itemMinutesMap[item.key] || null;
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all ${
                        checked
                          ? 'bg-[#34D399]/12 border-[#34D399]/35 text-[#EDF4F0]'
                          : 'glass-2 text-[#EDF4F0]/85'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item.key)}
                        className="flex-1 min-h-[40px] flex items-center gap-2.5 text-left"
                      >
                        {checked ? (
                          <CheckCircle2 className="w-5 h-5 text-[#34D399] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-[#5D726A] shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm font-medium">{item.banglaLabel}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTimePickerItem(item)}
                        title="এই কাজের সময় নির্ধারণ করুন"
                        className={`min-h-[36px] px-2.5 py-1 rounded-xl border text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors tabular-nums ${
                          mins && checked
                            ? 'bg-[#34D399]/20 border-[#34D399]/40 text-[#B6F5D8]'
                            : mins && !checked
                            ? 'bg-white/[0.03] border-white/10 text-[#8EA39A] line-through'
                            : 'bg-white/[0.04] border-white/15 hover:border-[#34D399]/40 text-[#8EA39A] hover:text-[#EDF4F0]'
                        }`}
                      >
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{mins ? formatMinutesCompactBn(mins) : '+ সময়'}</span>
                      </button>
                    </div>
                  );
                })}

                <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to="/my-track"
                    className="text-xs text-[#8EA39A] hover:text-[#EDF4F0] flex items-center gap-1"
                  >
                    <span>আরও {Math.max(0, trackerItems.length - 8)}টি আইটেম ও নোট দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    disabled={submitting}
                    onClick={handleQuickSubmitReport}
                    className="gap-1.5 text-xs min-h-[40px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'জমা হচ্ছে...' : 'আজকের রিপোর্ট জমা দিন'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Profile + Assigned Worker + Monitoring Control + Reports */}
            <div className="lg:col-span-5 space-y-5">
              {/* E. My Profile & Assigned Dawah Worker */}
              <Card>
                <CardHeader className="border-b border-white/10 pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#34D399]" />
                    <span>আমার দাওয়াহ প্রোফাইল ও দায়িত্বশীল</span>
                  </CardTitle>
                  <Link to="/my-dashboard" className="text-xs text-[#34D399] hover:underline">
                    বিস্তারিত →
                  </Link>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs">
                  <div className="p-3 rounded-xl glass-2 flex items-center justify-between">
                    <div>
                      <div className="text-[#8EA39A]">বর্তমান ধাপ</div>
                      <div className="text-sm font-semibold text-[#B6F5D8] mt-0.5">{stageName}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#34D399]/15 text-[#B6F5D8] font-mono tabular-nums">
                      {toBanglaDigits(currentStage)}/১৬
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[#8EA39A] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#34D399]" />
                      <span>নির্ধারিত দাওয়াহ কর্মী / দায়িত্বশীল:</span>
                    </div>
                    {(overview?.assignedResponsibles || []).length === 0 ? (
                      <div className="p-2.5 rounded-xl glass-2 text-[#8EA39A]">
                        এখনো কোনো ব্যক্তিগত দায়িত্বশীল নির্ধারিত নেই (অ্যাডমিন টিম তত্ত্বাবধান করছেন)।
                      </div>
                    ) : (
                      (overview.assignedResponsibles || []).map((r: any) => (
                        <div
                          key={r.id}
                          className="p-2.5 rounded-xl glass-2 flex items-center justify-between"
                        >
                          <span className="font-medium text-[#EDF4F0]">{r.name}</span>
                          {r.phone && (
                            <span className="font-mono text-[11px] text-[#34D399] tabular-nums">
                              {r.phone}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* F. Monitoring Control */}
              <Card>
                <CardHeader className="border-b border-white/10 pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#34D399]" />
                    <span>মনিটরিং ও শেয়ারিং নিয়ন্ত্রণ</span>
                  </CardTitle>
                  <Link to="/my-settings" className="text-xs text-[#34D399] hover:underline">
                    সব সেটিংস →
                  </Link>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl glass-2">
                    <div className="flex items-center gap-2">
                      {sharing?.monitoringEnabled ? (
                        <Eye className="w-4 h-4 text-[#34D399]" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#8EA39A]" />
                      )}
                      <div>
                        <div className="text-xs font-semibold text-[#EDF4F0]">
                          {sharing?.monitoringEnabled ? 'মনিটরিং চালু আছে' : 'মনিটরিং বন্ধ (Private)'}
                        </div>
                        <div className="text-[10px] text-[#8EA39A]">
                          বন্ধ করলে নতুন কোনো তথ্য শেয়ার হবে না
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={savingSharing}
                      onClick={() =>
                        handleToggleMonitoring({
                          monitoringEnabled: !sharing?.monitoringEnabled,
                        })
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        sharing?.monitoringEnabled ? 'bg-[#34D399]' : 'bg-white/15'
                      }`}
                      aria-label="Toggle monitoring"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          sharing?.monitoringEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {sharing?.monitoringEnabled && (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        { key: 'shareDailyAmal', label: 'দৈনিক আমল' },
                        { key: 'shareProductiveTime', label: 'Productive Time' },
                        { key: 'shareScreenTime', label: 'Screen Time' },
                        { key: 'shareWeeklySummary', label: 'সাপ্তাহিক সারাংশ' },
                      ].map((opt) => {
                        const active = Boolean(sharing?.[opt.key]);
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            disabled={savingSharing}
                            onClick={() => handleToggleMonitoring({ [opt.key]: !active })}
                            className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between ${
                              active
                                ? 'bg-[#34D399]/15 border-[#34D399]/35 text-[#B6F5D8]'
                                : 'glass-2 text-[#8EA39A]'
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            <span>{active ? 'ON' : 'OFF'}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick links to Reports & Time */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      to="/my-reports"
                      className="min-h-[42px] px-3 py-2 rounded-xl glass-2 hover:border-white/25 text-xs font-medium text-[#EDF4F0] flex items-center justify-center gap-1.5"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#34D399]" />
                      <span>My Reports</span>
                    </Link>
                    <Link
                      to="/my-time"
                      className="min-h-[42px] px-3 py-2 rounded-xl glass-2 hover:border-white/25 text-xs font-medium text-[#EDF4F0] flex items-center justify-center gap-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-[#F4A85E]" />
                      <span>My Time</span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Time Picker Sheet for Quick Home Checklist */}
      <TimePickerSheet
        open={Boolean(timePickerItem)}
        onOpenChange={(o) => {
          if (!o) setTimePickerItem(null);
        }}
        activityLabel={timePickerItem?.banglaLabel || ''}
        currentMinutes={timePickerItem ? itemMinutesMap[timePickerItem.key] || null : null}
        isChecked={timePickerItem ? Boolean(checkedMap[timePickerItem.key]) : false}
        onSave={async (mins, alsoCheck) => {
          if (timePickerItem) {
            await handleSaveItemTime(timePickerItem, mins, alsoCheck);
          }
        }}
      />

      {/* Quick Screen Time Update Dialog */}
      <Dialog open={screenModalOpen} onOpenChange={setScreenModalOpen}>
        <DialogContent className="max-w-sm p-5 sm:p-6">
          <DialogHeader className="text-left pr-8">
            <DialogTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#F4A85E]" />
              আজকের মোবাইল স্ক্রিন টাইম
            </DialogTitle>
            <DialogDescription className="text-xs">
              আপনার ফোনের Digital Wellbeing / Screen Time দেখে আজকের মোট ব্যবহার লিখুন।
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickSaveScreenTime} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8EA39A] mb-1">ঘণ্টা</label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  value={stHours}
                  onChange={(e) => setStHours(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8EA39A] mb-1">মিনিট</label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={stMins}
                  onChange={(e) => setStMins(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScreenModalOpen(false)}
                className="text-xs"
              >
                বাতিল
              </Button>
              <Button type="submit" size="sm" disabled={savingSt} className="text-xs">
                {savingSt ? 'সেভ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
