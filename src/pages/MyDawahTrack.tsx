import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  CheckCircle2,
  Circle,
  Flame,
  Calendar,
  BookOpen,
  HeartHandshake,
  StickyNote,
  Bell,
  Shield,
  Printer,
  Plus,
  Trash2,
  Send,
  SkipForward,
  Lock,
  Eye,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  TrackerItem,
  MemberDailyReport,
  MemberDawahLog,
  MemberNote,
  MemberReminder,
  MemberSharingSettings,
  Contact,
} from '../types';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../components/ui';

type TrackTab = 'today' | 'weekly' | 'monthly' | 'dawah' | 'notes' | 'reminders' | 'privacy';

function formatDateOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export default function MyDawahTrack() {
  const { user, featureFlags } = useAuth();
  const [activeTab, setActiveTab] = useState<TrackTab>('today');

  // Today / Yesterday date toggle
  const todayStr = formatDateOffset(0);
  const yesterdayStr = formatDateOffset(-1);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Today tab state
  const [loadingToday, setLoadingToday] = useState(true);
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);
  const [report, setReport] = useState<MemberDailyReport | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [noteInput, setNoteInput] = useState('');
  const [salahRecord, setSalahRecord] = useState<any>(null);
  const [streak, setStreak] = useState(0);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [todayToast, setTodayToast] = useState<string | null>(null);

  // Weekly & Monthly Summary
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Dawah Logs
  const [dawahLogs, setDawahLogs] = useState<MemberDawahLog[]>([]);
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [dawahDesc, setDawahDesc] = useState('');
  const [dawahOutcome, setDawahOutcome] = useState('');
  const [dawahTargetId, setDawahTargetId] = useState('');
  const [dawahDate, setDawahDate] = useState(todayStr);

  // Notes
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [newNoteBody, setNewNoteBody] = useState('');

  // Reminders
  const [reminders, setReminders] = useState<MemberReminder[]>([]);
  const [remTitle, setRemTitle] = useState('দৈনিক আমল ও দাওয়াহ রিপোর্ট');
  const [remTime, setRemTime] = useState('21:00');
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  // Privacy / Consent
  const [sharing, setSharing] = useState<MemberSharingSettings | null>(null);
  const [viewers, setViewers] = useState<Array<{ name: string; role: string }>>([]);
  const [savingSharing, setSavingSharing] = useState(false);
  const [sharingToast, setSharingToast] = useState<string | null>(null);

  const fetchToday = useCallback(async (targetDate: string) => {
    try {
      setLoadingToday(true);
      const res = await apiFetch(`/api/my-track/today?date=${targetDate}`);
      if (res.ok) {
        const data = await res.json();
        setTrackerItems(Array.isArray(data.trackerItems) ? data.trackerItems : []);
        setReport(data.report || null);
        setCheckedMap(data.report?.items || {});
        setNoteInput(data.report?.note || '');
        setSalahRecord(data.salahRecord || null);
        setStreak(data.streak || 0);
      }
    } finally {
      setLoadingToday(false);
    }
  }, []);

  const fetchReminders = useCallback(async () => {
    const res = await apiFetch('/api/my-track/reminders');
    if (res.ok) {
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    }
  }, []);

  useEffect(() => {
    fetchToday(selectedDate);
  }, [selectedDate, fetchToday]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  useEffect(() => {
    if (activeTab === 'weekly' || activeTab === 'monthly') {
      setLoadingSummary(true);
      apiFetch(`/api/my-track/summary?range=${activeTab === 'monthly' ? 'month' : 'week'}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setSummaryData(d))
        .finally(() => setLoadingSummary(false));
    } else if (activeTab === 'dawah') {
      Promise.all([
        apiFetch('/api/my-track/dawah-logs').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/contacts').then((r) => (r.ok ? r.json() : [])),
      ]).then(([logs, cts]) => {
        setDawahLogs(Array.isArray(logs) ? logs : []);
        setContactsList(Array.isArray(cts) ? cts : []);
      });
    } else if (activeTab === 'notes') {
      apiFetch('/api/my-track/notes')
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => setNotes(Array.isArray(d) ? d : []));
    } else if (activeTab === 'privacy') {
      apiFetch('/api/my-track/sharing')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setSharing(d.settings);
            setViewers(Array.isArray(d.viewers) ? d.viewers : []);
          }
        });
    }
  }, [activeTab]);

  if (!featureFlags.featureMyDawahTrack) {
    return (
      <div className="glass rounded-[22px] p-8 text-center max-w-lg mx-auto mt-8">
        <Lock className="w-8 h-8 text-[#8EA39A] mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-[#EDF4F0]">My Dawah Track সাময়িকভাবে বন্ধ আছে</h2>
        <p className="text-xs text-[#8EA39A] mt-2">অ্যাডমিন প্যানেল থেকে ফিচারটি সক্রিয় করলে আবার ব্যবহার করতে পারবেন।</p>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setTodayToast(msg);
    setTimeout(() => setTodayToast(null), 3500);
  };

  const handleToggleItem = async (key: string) => {
    const nextMap = { ...checkedMap, [key]: !checkedMap[key] };
    setCheckedMap(nextMap);
    try {
      const res = await apiFetch('/api/my-track/today', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate: selectedDate,
          items: nextMap,
          note: noteInput,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch {
      // revert silently if network failed
    }
  };

  const handleSubmitReport = async (status: 'submitted' | 'skipped') => {
    try {
      setSubmittingReport(true);
      const res = await apiFetch('/api/my-track/report/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportDate: selectedDate,
          items: checkedMap,
          note: noteInput,
          status,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        showToast(
          status === 'submitted'
            ? 'জাযাকাল্লাহু খাইরান! আপনার রিপোর্ট সফলভাবে সংরক্ষিত হয়েছে।'
            : 'আজকের দিনটি বাদ রাখা হয়েছে।'
        );
        fetchToday(selectedDate);
      }
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleAddDawahLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dawahDesc.trim()) return;
    const res = await apiFetch('/api/my-track/dawah-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dawahDate,
        targetContactId: dawahTargetId || null,
        description: dawahDesc.trim(),
        outcome: dawahOutcome.trim() || null,
      }),
    });
    if (res.ok) {
      setDawahDesc('');
      setDawahOutcome('');
      setDawahTargetId('');
      const fresh = await apiFetch('/api/my-track/dawah-logs').then((r) => r.json());
      setDawahLogs(Array.isArray(fresh) ? fresh : []);
    }
  };

  const handleDeleteDawahLog = async (id: string) => {
    await apiFetch(`/api/my-track/dawah-logs/${id}`, { method: 'DELETE' });
    setDawahLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteBody.trim()) return;
    const res = await apiFetch('/api/my-track/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr, body: newNoteBody.trim() }),
    });
    if (res.ok) {
      const created = await res.json();
      setNotes((prev) => [created, ...prev]);
      setNewNoteBody('');
    }
  };

  const handleDeleteNote = async (id: string) => {
    await apiFetch(`/api/my-track/notes/${id}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/my-track/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: remTitle.trim() || 'দৈনিক আমল ও দাওয়াহ রিপোর্ট',
        time: remTime,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        isActive: true,
      }),
    });
    if (res.ok) {
      fetchReminders();
    }
  };

  const handleToggleReminder = async (rem: MemberReminder) => {
    const res = await apiFetch(`/api/my-track/reminders/${rem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rem.isActive }),
    });
    if (res.ok) fetchReminders();
  };

  const handleDeleteReminder = async (id: string) => {
    await apiFetch(`/api/my-track/reminders/${id}`, { method: 'DELETE' });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRequestBrowserNotif = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      new Notification('Kotbari Dawah Track', {
        body: 'দৈনিক আমল ও দাওয়াহ রিমাইন্ডার চালু হয়েছে।',
      });
    }
  };

  const handleUpdateSharing = async (patch: Partial<MemberSharingSettings>) => {
    if (!sharing) return;
    const next = { ...sharing, ...patch };
    setSharing(next);
    setSavingSharing(true);
    setSharingToast(null);
    try {
      const res = await apiFetch('/api/my-track/sharing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const refreshed = await apiFetch('/api/my-track/sharing').then((r) => r.json());
        setSharing(refreshed.settings);
        setViewers(Array.isArray(refreshed.viewers) ? refreshed.viewers : []);
        setSharingToast('আপনার প্রাইভেসি ও শেয়ারিং পছন্দ সংরক্ষিত হয়েছে।');
        setTimeout(() => setSharingToast(null), 3000);
      }
    } finally {
      setSavingSharing(false);
    }
  };

  // Calculations for Today SVG Progress Ring
  const totalCount = trackerItems.length;
  const completedCount = trackerItems.filter((it) => Boolean(checkedMap[it.key])).length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const amalItems = trackerItems.filter((t) => t.group === 'amal');
  const dawahItems = trackerItems.filter((t) => t.group === 'dawah');

  // Check if any active reminder time has passed today and report is not submitted
  const nowHHMM = `${String(new Date().getHours()).padStart(2, '0')}:${String(
    new Date().getMinutes()
  ).padStart(2, '0')}`;
  const todayDay = new Date().getDay();
  const dueReminder =
    selectedDate === todayStr &&
    report?.status !== 'submitted' &&
    report?.status !== 'skipped' &&
    reminders.find(
      (r) =>
        r.isActive &&
        (r.daysOfWeek || [0, 1, 2, 3, 4, 5, 6]).includes(todayDay) &&
        r.time <= nowHHMM
    );

  const isEditedAfterSubmit =
    Boolean(report?.submittedAt && report?.updatedAt) &&
    new Date(report!.updatedAt).getTime() - new Date(report!.submittedAt!).getTime() > 5000;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="eyebrow text-[#34D399] mb-1">MY PERSONAL MUHASABAH</div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-[#EDF4F0]">
            My Dawah Track · আমার দাওয়াহ ট্র্যাক
          </h1>
          <p className="text-xs sm:text-sm text-[#8EA39A] mt-1">
            আপনার দৈনিক আমল, দাওয়াহ প্রচেষ্টা ও আত্মপর্যালোচনার সম্পূর্ণ ব্যক্তিগত স্থান (ডিফল্ট প্রাইভেট)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="glass-2 px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs">
            <Flame className="w-4 h-4 text-[#F4A85E]" />
            <span className="text-[#8EA39A]">ধারাবাহিকতা:</span>
            <span className="font-mono font-bold text-[#EDF4F0] tabular-nums">{streak} দিন</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 glass-2 p-1.5 rounded-2xl no-print">
        {(
          [
            { key: 'today', label: 'Today (আজ)', icon: CheckCircle2 },
            { key: 'weekly', label: 'Weekly', icon: Calendar },
            { key: 'monthly', label: 'Monthly', icon: Calendar },
            { key: 'dawah', label: 'My Dawah Activities', icon: HeartHandshake },
            { key: 'notes', label: 'Notes', icon: StickyNote },
            { key: 'reminders', label: 'Reminders', icon: Bell },
            { key: 'privacy', label: 'Privacy & Consent', icon: Shield },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                active
                  ? 'forest-btn-primary'
                  : 'text-[#8EA39A] hover:text-[#EDF4F0] hover:bg-white/[0.05]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================== */}
      {/* TAB 1: TODAY / YESTERDAY CHECKLIST */}
      {/* ========================================== */}
      {activeTab === 'today' && (
        <div className="space-y-5">
          {/* Active Reminder Due Banner */}
          {dueReminder && (
            <div className="p-4 rounded-2xl glass-hot flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs">
                <Bell className="w-4 h-4 text-[#F4A85E] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[#E8CD92]">
                    রিমাইন্ডার ({dueReminder.time}): {dueReminder.title || 'দৈনিক রিপোর্ট'}
                  </div>
                  <p className="text-[#EDF4F0]/80 mt-0.5">
                    আজকের আমল ও দাওয়াহ তালিকা আপডেট করে জমা দিন।
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveTab('reminders')}
                variant="outline"
                className="text-xs shrink-0"
              >
                রিমাইন্ডার সেটিংস
              </Button>
            </div>
          )}

          {todayToast && (
            <div className="p-3.5 rounded-2xl bg-[#34D399]/18 border border-[#34D399]/40 text-[#B6F5D8] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              <span>{todayToast}</span>
            </div>
          )}

          {/* Top Progress & Date Switcher Card */}
          <div className="glass rounded-[22px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              {/* SVG Progress Ring */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold font-mono text-[#EDF4F0] tabular-nums">{pct}%</span>
                  <span className="text-[10px] text-[#8EA39A] font-mono tabular-nums">
                    {completedCount}/{totalCount}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow text-[#34D399]">
                    {selectedDate === todayStr ? 'TODAY' : 'YESTERDAY'} · {selectedDate}
                  </span>
                  {report?.status === 'submitted' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#34D399]/15 border border-[#34D399]/35 text-[#B6F5D8] text-[10px] font-medium">
                      জমা হয়েছে {isEditedAfterSubmit ? '· সম্পাদিত' : ''}
                    </span>
                  )}
                  {report?.status === 'skipped' && (
                    <span className="px-2 py-0.5 rounded-full glass-2 text-[#8EA39A] text-[10px]">
                      বাদ রাখা হয়েছে
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-[#EDF4F0]">
                  দৈনিক আমল ও দাওয়াহ চেকলিস্ট
                </h2>
                <p className="text-xs text-[#8EA39A]">
                  প্রতিটি ট্যাপে স্বয়ংক্রিয়ভাবে সেভ হয়। আজ এবং গতকালের রিপোর্ট সম্পাদনা করা যাবে।
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2">
              <div className="flex rounded-xl glass-2 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedDate === todayStr ? 'forest-btn-primary' : 'text-[#8EA39A] hover:text-[#EDF4F0]'
                  }`}
                >
                  আজ ({todayStr.slice(5)})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(yesterdayStr)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedDate === yesterdayStr ? 'forest-btn-primary' : 'text-[#8EA39A] hover:text-[#EDF4F0]'
                  }`}
                >
                  গতকাল ({yesterdayStr.slice(5)})
                </button>
              </div>

              {user?.contactId && (
                <Link
                  to={`/contacts/${user.contactId}?tab=salah`}
                  className="text-[11px] text-[#34D399] hover:underline flex items-center gap-1"
                >
                  <span>সালাহ ট্র্যাকিং (আজ: {salahRecord ? 'লগ করা হয়েছে' : 'লগ বাকি'})</span>
                </Link>
              )}
            </div>
          </div>

          {loadingToday ? (
            <div className="glass rounded-[22px] p-10 text-center text-xs text-[#8EA39A] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#34D399]" />
              <span>দৈনিক তালিকা লোড হচ্ছে...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Group 1: Amal */}
              <Card>
                <CardHeader className="border-b border-white/10 pb-3">
                  <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#34D399]" />
                    <span>ব্যক্তিগত আমল ও ইবাদত ({amalItems.filter((i) => checkedMap[i.key]).length}/{amalItems.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {amalItems.map((item) => {
                    const checked = Boolean(checkedMap[item.key]);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleItem(item.key)}
                        className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          checked
                            ? 'bg-[#34D399]/14 border-[#34D399]/40 text-[#EDF4F0]'
                            : 'glass-2 hover:border-white/25 text-[#EDF4F0]/85'
                        }`}
                      >
                        <span className="text-sm font-medium">{item.banglaLabel}</span>
                        {checked ? (
                          <CheckCircle2 className="w-5 h-5 text-[#34D399] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-[#5D726A] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Group 2: Dawah */}
              <Card>
                <CardHeader className="border-b border-white/10 pb-3">
                  <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-[#F4A85E]" />
                    <span>দাওয়াহ ও জামাআত ({dawahItems.filter((i) => checkedMap[i.key]).length}/{dawahItems.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  {dawahItems.map((item) => {
                    const checked = Boolean(checkedMap[item.key]);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleItem(item.key)}
                        className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                          checked
                            ? 'bg-[#34D399]/14 border-[#34D399]/40 text-[#EDF4F0]'
                            : 'glass-2 hover:border-white/25 text-[#EDF4F0]/85'
                        }`}
                      >
                        <span className="text-sm font-medium">{item.banglaLabel}</span>
                        {checked ? (
                          <CheckCircle2 className="w-5 h-5 text-[#34D399] shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-[#5D726A] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Optional Note & Submit Actions */}
          <div className="glass rounded-[22px] p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#8EA39A] mb-1.5">
                আজকের সংক্ষিপ্ত ব্যক্তিগত নোট / অনুভূতি (ঐচ্ছিক — প্রাইভেসি বন্ধ থাকলে কেউ দেখবে না)
              </label>
              <textarea
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="যেমন: আজ ফজরের পর সূরা ইয়াসিন তিলাওয়াত করেছি এবং এক ভাইকে দাওয়াত দিয়েছি..."
                className="w-full rounded-xl forest-input p-3 text-sm text-[#EDF4F0] placeholder:text-[#5D726A]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-[#8EA39A] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#34D399]" />
                <span>আপনার রিপোর্ট ডিফল্টভাবে সম্পূর্ণ ব্যক্তিগত।</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingReport}
                  onClick={() => handleSubmitReport('skipped')}
                  className="gap-1.5 text-xs"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  আজ বাদ দিন
                </Button>
                <Button
                  type="button"
                  disabled={submittingReport}
                  onClick={() => handleSubmitReport('submitted')}
                  className="gap-1.5 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingReport ? 'জমা হচ্ছে...' : 'আজকের রিপোর্ট জমা দিন'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2 & 3: WEEKLY / MONTHLY & PRINTABLE PDF */}
      {/* ========================================== */}
      {(activeTab === 'weekly' || activeTab === 'monthly') && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div>
              <h2 className="text-lg font-semibold text-[#EDF4F0]">
                {activeTab === 'weekly' ? 'সাপ্তাহিক রিপোর্ট (৭ দিন)' : 'মাসিক রিপোর্ট (৩০ দিন)'}
              </h2>
              <p className="text-xs text-[#8EA39A]">
                আপনার আমল ও দাওয়াহর ধারাবাহিকতা এবং প্রিন্টযোগ্য সারাংশ
              </p>
            </div>
            <Button type="button" onClick={() => window.print()} variant="outline" className="gap-2 text-xs">
              <Printer className="w-4 h-4 text-[#34D399]" />
              প্রিন্ট / PDF রিপোর্ট
            </Button>
          </div>

          {loadingSummary || !summaryData ? (
            <div className="glass rounded-[22px] p-10 text-center text-xs text-[#8EA39A]">
              রিপোর্ট তৈরি হচ্ছে...
            </div>
          ) : (
            <>
              {/* Print header */}
              <div className="print-only mb-4 border-b pb-3">
                <h1 className="text-xl font-bold">কোটবাড়ি দাওয়াহ মুভমেন্ট — ব্যক্তিগত মুহাসাবা রিপোর্ট</h1>
                <p className="text-sm">
                  সদস্য: {user?.contact?.name || user?.username} | সময়কাল:{' '}
                  {activeTab === 'weekly' ? 'গত ৭ দিন' : 'গত ৩০ দিন'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="glass rounded-[20px] p-4">
                  <div className="text-xs text-[#8EA39A]">গড় সম্পূর্ণতা</div>
                  <div className="text-2xl font-serif italic text-[#34D399] mt-1 tabular-nums">
                    {summaryData.avgCompletionPct}%
                  </div>
                </div>
                <div className="glass rounded-[20px] p-4">
                  <div className="text-xs text-[#8EA39A]">জমাকৃত দিন</div>
                  <div className="text-2xl font-serif italic text-[#EDF4F0] mt-1 tabular-nums">
                    {summaryData.submittedDays}/{summaryData.daysCount}
                  </div>
                </div>
                <div className="glass rounded-[20px] p-4">
                  <div className="text-xs text-[#8EA39A]">বর্তমান স্ট্রিক</div>
                  <div className="text-2xl font-serif italic text-[#F4A85E] mt-1 tabular-nums">
                    {streak} দিন
                  </div>
                </div>
                <div className="glass rounded-[20px] p-4">
                  <div className="text-xs text-[#8EA39A]">দাওয়াহ লগ</div>
                  <div className="text-2xl font-serif italic text-[#B6F5D8] mt-1 tabular-nums">
                    {summaryData.dawahLogsCount}টি
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">দৈনিক অগ্রগতি চার্ট (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summaryData.dailySeries || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis dataKey="label" stroke="#8EA39A" fontSize={11} />
                        <YAxis stroke="#8EA39A" fontSize={11} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0A1210',
                            border: '1px solid rgba(255,255,255,0.16)',
                            borderRadius: '12px',
                            color: '#EDF4F0',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="percentage" fill="#34D399" radius={[6, 6, 0, 0]} name="অগ্রগতি (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-[#34D399]">সবচেয়ে শক্তিশালী আমলসমূহ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(summaryData.bestItems || []).map((it: any) => (
                      <div key={it.key} className="p-3 rounded-xl glass-2 flex items-center justify-between text-xs">
                        <span>{it.banglaLabel}</span>
                        <span className="font-mono text-[#34D399] tabular-nums">
                          {it.doneDays} দিন ({it.percentage}%)
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-[#F4A85E]">যেগুলোতে আরও মনোযোগ দেওয়া যায়</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(summaryData.focusItems || []).map((it: any) => (
                      <div key={it.key} className="p-3 rounded-xl glass-2 flex items-center justify-between text-xs">
                        <span>{it.banglaLabel}</span>
                        <span className="font-mono text-[#F4A85E] tabular-nums">
                          {it.doneDays} দিন ({it.percentage}%)
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: MY DAWAH ACTIVITIES */}
      {/* ========================================== */}
      {activeTab === 'dawah' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#34D399]" />
                নতুন দাওয়াহ প্রচেষ্টা যোগ করুন
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddDawahLog} className="space-y-3">
                <div>
                  <label className="block text-xs text-[#8EA39A] mb-1">তারিখ</label>
                  <Input type="date" value={dawahDate} onChange={(e) => setDawahDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-[#8EA39A] mb-1">সংশ্লিষ্ট ভাই (ঐচ্ছিক)</label>
                  <select
                    value={dawahTargetId}
                    onChange={(e) => setDawahTargetId(e.target.value)}
                    className="w-full h-10 rounded-xl forest-input px-3 text-xs text-[#EDF4F0]"
                  >
                    <option value="" className="bg-[#0A1210]">ব্যক্তিগত / সাধারণ দাওয়াহ</option>
                    {contactsList.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0A1210]">
                        {c.name} {c.area ? `(${c.area})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#8EA39A] mb-1">কাজের বিবরণ *</label>
                  <textarea
                    rows={3}
                    value={dawahDesc}
                    onChange={(e) => setDawahDesc(e.target.value)}
                    placeholder="যেমন: হলের এক বন্ধুকে আসরের নামাজ ও পাঠচক্রের দাওয়াত দিয়েছি"
                    className="w-full rounded-xl forest-input p-3 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8EA39A] mb-1">সাড়া / ফলাফল</label>
                  <Input
                    value={dawahOutcome}
                    onChange={(e) => setDawahOutcome(e.target.value)}
                    placeholder="যেমন: ইতিবাচক সাড়া, শুক্রবার আসবেন"
                  />
                </div>
                <Button type="submit" className="w-full text-xs">
                  সংরক্ষণ করুন
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="text-sm">আমার দাওয়াহ লগ ({dawahLogs.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {dawahLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#8EA39A]">
                  এখনো কোনো দাওয়াহ কার্যক্রম যোগ করা হয়নি।
                </div>
              ) : (
                dawahLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl glass-2 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-mono text-[#34D399] tabular-nums">{log.date}</span>
                        {log.targetName && (
                          <span className="px-2 py-0.5 rounded-full bg-[#34D399]/12 text-[#B6F5D8]">
                            {log.targetName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#EDF4F0] leading-relaxed">{log.description}</p>
                      {log.outcome && (
                        <p className="text-[11px] text-[#8EA39A]">সাড়া: {log.outcome}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDawahLog(log.id)}
                      className="p-1.5 rounded-lg text-rose-300/75 hover:text-rose-200 hover:bg-rose-500/15 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 5: PRIVATE NOTES */}
      {/* ========================================== */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  placeholder="আপনার ব্যক্তিগত আত্মসমালোচনা, দুআ বা লক্ষ্য লিখুন..."
                  className="flex-1"
                />
                <Button type="submit" className="gap-1.5 shrink-0 text-xs">
                  <Plus className="w-4 h-4" />
                  নোট যোগ করুন
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2.5">
            {notes.length === 0 ? (
              <div className="glass rounded-[22px] p-8 text-center text-xs text-[#8EA39A]">
                কোনো ব্যক্তিগত নোট নেই।
              </div>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="glass rounded-2xl p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-[#34D399] tabular-nums">{n.date}</div>
                    <p className="text-sm text-[#EDF4F0]/90 leading-relaxed">{n.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1.5 rounded-lg text-rose-300/75 hover:text-rose-200 hover:bg-rose-500/15"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 6: REMINDERS */}
      {/* ========================================== */}
      {activeTab === 'reminders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#34D399]" />
                নতুন দৈনিক রিমাইন্ডার সেট করুন
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddReminder} className="space-y-3">
                <div>
                  <label className="block text-xs text-[#8EA39A] mb-1">রিমাইন্ডার শিরোনাম</label>
                  <Input value={remTitle} onChange={(e) => setRemTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-[#8EA39A] mb-1">প্রতিদিন সময়</label>
                  <Input type="time" value={remTime} onChange={(e) => setRemTime(e.target.value)} />
                </div>
                <Button type="submit" className="w-full text-xs">
                  রিমাইন্ডার যোগ করুন
                </Button>
              </form>

              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-xs font-medium text-[#EDF4F0]">ব্রাউজার নোটিফিকেশন (ঐচ্ছিক)</div>
                <p className="text-[11px] text-[#8EA39A]">
                  অ্যাপ খোলা থাকলে ব্রাউজারে রিমাইন্ডার সতর্কবার্তা পেতে অনুমতি দিতে পারেন।
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRequestBrowserNotif}
                  disabled={notifPermission === 'granted' || notifPermission === 'unsupported'}
                  className="text-xs w-full"
                >
                  {notifPermission === 'granted'
                    ? 'নোটিফিকেশন চালু আছে ✓'
                    : notifPermission === 'unsupported'
                    ? 'ব্রাউজারে সমর্থিত নয়'
                    : 'ব্রাউজার নোটিফিকেশন অনুমতি দিন'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle className="text-sm">আমার রিমাইন্ডার তালিকা ({reminders.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {reminders.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#8EA39A]">
                  কোনো রিমাইন্ডার সেট করা নেই।
                </div>
              ) : (
                reminders.map((rem) => (
                  <div key={rem.id} className="p-3.5 rounded-2xl glass-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-[#EDF4F0]">
                        {rem.title || 'দৈনিক রিপোর্ট'}
                      </div>
                      <div className="text-xs font-mono text-[#34D399] tabular-nums mt-0.5">
                        প্রতিদিন {rem.time}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(rem)}
                        className={`px-3 py-1 rounded-full text-xs border ${
                          rem.isActive
                            ? 'bg-[#34D399]/15 border-[#34D399]/35 text-[#B6F5D8]'
                            : 'glass-2 text-[#8EA39A]'
                        }`}
                      >
                        {rem.isActive ? 'চালু' : 'বন্ধ'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1.5 rounded-lg text-rose-300/75 hover:text-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 7: PRIVACY & MONITORING CONSENT */}
      {/* ========================================== */}
      {activeTab === 'privacy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#34D399]" />
                  <span>অভিভাবক/অ্যাডমিন মনিটরিং অনুমতি (Monitoring Consent)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {sharingToast && (
                  <div className="p-3 rounded-xl bg-[#34D399]/15 border border-[#34D399]/35 text-[#B6F5D8] text-xs">
                    {sharingToast}
                  </div>
                )}

                <div className="p-4 rounded-2xl glass-2 text-xs text-[#EDF4F0]/85 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>
                    আপনার দৈনিক আমল, দাওয়াহ নোট ও প্রাইভেট ট্র্যাক সম্পূর্ণ আপনার নিয়ন্ত্রণে। মনিটরিং বন্ধ থাকলে কোনো অ্যাডমিন বা দায়িত্বশীল আপনার সেলফ-রিপোর্ট দেখতে পাবেন না। আপনি যখন খুশি এটি চালু বা বন্ধ করতে পারবেন।
                  </span>
                </div>

                {sharing && (
                  <>
                    <label className="flex items-center justify-between p-4 rounded-2xl border border-[#34D399]/30 bg-[#34D399]/10 cursor-pointer">
                      <div>
                        <div className="text-sm font-semibold text-[#EDF4F0]">
                          মনিটরিং শেয়ারিং চালু করুন
                        </div>
                        <div className="text-xs text-[#8EA39A] mt-0.5">
                          এটি চালু থাকলে নিচের নির্বাচিত অংশগুলো অ্যাডমিন ও আপনার দায়িত্বশীল দেখতে পারবেন।
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={savingSharing}
                        checked={sharing.monitoringEnabled}
                        onChange={(e) => handleUpdateSharing({ monitoringEnabled: e.target.checked })}
                        className="w-5 h-5 accent-[#34D399]"
                      />
                    </label>

                    <div className={`space-y-2.5 ${!sharing.monitoringEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                      {[
                        {
                          key: 'shareDailyAmal' as const,
                          label: 'দৈনিক আমল চেকলিস্ট শেয়ার করুন',
                          desc: 'প্রতিদিন কোন আমল ও দাওয়াহ আইটেম সম্পন্ন হয়েছে',
                        },
                        {
                          key: 'shareDawahActivities' as const,
                          label: 'আমার দাওয়াহ কার্যক্রম শেয়ার করুন',
                          desc: 'My Dawah Activities ট্যাবের বিবরণ',
                        },
                        {
                          key: 'sharePersonalNotes' as const,
                          label: 'রিপোর্টের সংক্ষিপ্ত নোট শেয়ার করুন',
                          desc: 'আজকের রিপোর্টের নিচে লেখা অনুভূতি/নোট',
                        },
                        {
                          key: 'shareWeeklySummary' as const,
                          label: 'সাপ্তাহিক/মাসিক সারাংশ শেয়ার করুন',
                          desc: 'মোট শতাংশ ও উপস্থিতির প্রিন্টযোগ্য সারাংশ',
                        },
                      ].map((opt) => (
                        <label
                          key={opt.key}
                          className="flex items-center justify-between p-3.5 rounded-2xl glass-2 cursor-pointer"
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#EDF4F0]">{opt.label}</div>
                            <div className="text-[11px] text-[#8EA39A]">{opt.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            disabled={savingSharing || !sharing.monitoringEnabled}
                            checked={Boolean(sharing[opt.key])}
                            onChange={(e) => handleUpdateSharing({ [opt.key]: e.target.checked })}
                            className="w-4 h-4 accent-[#34D399]"
                          />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card>
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#34D399]" />
                  এখন কারা দেখতে পাচ্ছে
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {!sharing?.monitoringEnabled || viewers.length === 0 ? (
                  <div className="p-5 rounded-2xl glass-2 text-center space-y-2">
                    <Lock className="w-6 h-6 text-[#8EA39A] mx-auto" />
                    <div className="text-xs font-semibold text-[#EDF4F0]">সম্পূর্ণ ব্যক্তিগত (Private)</div>
                    <p className="text-[11px] text-[#8EA39A]">
                      এই মুহূর্তে অন্য কেউ আপনার Self Report দেখতে পাচ্ছে না।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewers.map((v, idx) => (
                      <div key={idx} className="p-3 rounded-xl glass-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-[#EDF4F0]">{v.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#34D399]/15 text-[#B6F5D8] text-[10px]">
                          {v.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
