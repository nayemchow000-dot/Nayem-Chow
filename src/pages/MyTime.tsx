import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  Smartphone,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  Info,
  Loader2,
  ArrowRight,
  Save,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { ScreenTimeDataSource } from '../types';
import {
  getDhakaDateStr,
  formatMinutesBn,
  formatMinutesCompactBn,
  formatDhakaShortDateBn,
  toBanglaDigits,
} from '../lib/dhakaTime';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../components/ui';
import ScreenTimeComparisonCard, {
  getScreenTimeSourceLabelBn,
} from '../components/ScreenTimeComparisonCard';

const SCREEN_TIME_PRESETS = [
  { label: '১ ঘ.', minutes: 60 },
  { label: '২ ঘ.', minutes: 120 },
  { label: '৩ ঘ.', minutes: 180 },
  { label: '৪ ঘ. ৩০ মি.', minutes: 270 },
  { label: '৫ ঘ.', minutes: 300 },
  { label: '৬ ঘ.', minutes: 360 },
];

export default function MyTime() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const todayDhaka = getDhakaDateStr(0);
  const minDateDhaka = getDhakaDateStr(-6);

  const [recordDate, setRecordDate] = useState(todayDhaka);
  const [hoursInput, setHoursInput] = useState('0');
  const [minutesInput, setMinutesInput] = useState('0');
  const [dataSource, setDataSource] = useState<ScreenTimeDataSource>('manual');
  const [noteInput, setNoteInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSummary = useCallback(async (targetRange: 'week' | 'month') => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/my-time/summary?range=${targetRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        const existingToday = (json.screenTime?.history || []).find(
          (h: any) => h.recordDate === todayDhaka
        );
        if (existingToday && recordDate === todayDhaka) {
          const m = Number(existingToday.minutes) || 0;
          setHoursInput(String(Math.floor(m / 60)));
          setMinutesInput(String(m % 60));
          setDataSource((existingToday.dataSource as ScreenTimeDataSource) || 'manual');
          setNoteInput(existingToday.note || '');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [todayDhaka, recordDate]);

  useEffect(() => {
    fetchSummary(range);
  }, [range]);

  const handleDateChange = (nextDate: string) => {
    setRecordDate(nextDate);
    const match = (data?.screenTime?.history || []).find((h: any) => h.recordDate === nextDate);
    if (match) {
      const m = Number(match.minutes) || 0;
      setHoursInput(String(Math.floor(m / 60)));
      setMinutesInput(String(m % 60));
      setDataSource((match.dataSource as ScreenTimeDataSource) || 'manual');
      setNoteInput(match.note || '');
    } else {
      setHoursInput('0');
      setMinutesInput('0');
      setDataSource('manual');
      setNoteInput('');
    }
  };

  const applyPreset = (mins: number) => {
    setHoursInput(String(Math.floor(mins / 60)));
    setMinutesInput(String(mins % 60));
  };

  const totalEnteredMinutes = Math.min(
    1440,
    Math.max(
      0,
      (parseInt(hoursInput || '0', 10) || 0) * 60 + (parseInt(minutesInput || '0', 10) || 0)
    )
  );

  const handleSaveScreenTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setToast(null);
    try {
      setSaving(true);
      const res = await apiFetch('/api/my-time/screen-time', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordDate,
          minutes: totalEnteredMinutes,
          dataSource,
          note: noteInput.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'স্ক্রিন টাইম সংরক্ষণ করা যায়নি।');
        return;
      }
      setToast(`${formatDhakaShortDateBn(recordDate)}-এর স্ক্রিন টাইম (${formatMinutesBn(totalEnteredMinutes)}) সংরক্ষিত হয়েছে।`);
      await fetchSummary(range);
    } catch {
      setErrorMsg('সার্ভারে সংযোগ ব্যর্থ হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const st = data?.screenTime || {};
  const pt = data?.productiveTime || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="eyebrow text-[#34D399] mb-1">MY TIME · SCREEN & PRODUCTIVE</div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-[#EDF4F0]">
            My Time · সময় ও স্ক্রিন টাইম
          </h1>
          <p className="text-xs sm:text-sm text-[#8EA39A] mt-1">
            {data?.displayDateBn || 'বাংলাদেশ সময় (Asia/Dhaka)'} · মোবাইল স্ক্রিন টাইম ও আমল-দাওয়াহর প্রোডাক্টিভ সময়
          </p>
        </div>

        <div className="flex rounded-xl glass-2 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              range === 'week' ? 'forest-btn-primary' : 'text-[#8EA39A] hover:text-[#EDF4F0]'
            }`}
          >
            ৭ দিন (Weekly)
          </button>
          <button
            type="button"
            onClick={() => setRange('month')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              range === 'month' ? 'forest-btn-primary' : 'text-[#8EA39A] hover:text-[#EDF4F0]'
            }`}
          >
            ৩০ দিন (Monthly)
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="glass rounded-[22px] p-12 text-center text-xs text-[#8EA39A] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#34D399]" />
          <span>সময়ের তথ্য লোড হচ্ছে...</span>
        </div>
      ) : (
        <>
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass rounded-[20px] p-4 space-y-1">
              <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#F4A85E]" /> আজকের স্ক্রিন টাইম
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#F4A85E] tabular-nums">
                {st.todayMinutes !== null && st.todayMinutes !== undefined
                  ? formatMinutesBn(st.todayMinutes)
                  : 'লগ বাকি'}
              </div>
              <div className="text-[11px] text-[#8EA39A]">
                {st.todayMinutes !== null && st.todayMinutes !== undefined
                  ? getScreenTimeSourceLabelBn(st.todayDataSource)
                  : 'নিচ থেকে যোগ করুন'}
              </div>
            </div>

            <div className="glass rounded-[20px] p-4 space-y-1">
              <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#E8CD92]" /> সাপ্তাহিক গড় স্ক্রিন টাইম
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#E8CD92] tabular-nums">
                {st.weeklyAverageMinutes > 0 ? formatMinutesBn(st.weeklyAverageMinutes) : '০ মিনিট'}
              </div>
              <div className="text-[11px] text-[#8EA39A] tabular-nums">
                রেকর্ডকৃত দিন: {toBanglaDigits(st.recordedDaysInWeek || 0)}/৭ দিন
              </div>
            </div>

            <div className="glass rounded-[20px] p-4 space-y-1">
              <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#34D399]" /> আজকের Productive Time
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#34D399] tabular-nums">
                {formatMinutesBn(pt.todayMinutes || 0)}
              </div>
              <div className="text-[11px] text-[#8EA39A] tabular-nums">
                ৭ দিনে মোট: {formatMinutesCompactBn(pt.weekMinutes || 0)}
              </div>
            </div>

            <div className="glass rounded-[20px] p-4 space-y-1">
              <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#B6F5D8]" /> মাসিক ও দৈনিক গড়
              </div>
              <div className="text-xl sm:text-2xl font-serif italic text-[#B6F5D8] tabular-nums">
                {formatMinutesBn(pt.monthMinutes || 0)}
              </div>
              <div className="text-[11px] text-[#8EA39A] tabular-nums">
                দৈনিক গড়: {formatMinutesBn(pt.dailyAverageMinutes || 0)}
              </div>
            </div>
          </div>

          {/* Screen Time Logger + Activity Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Screen Time Entry Form */}
            <Card className="lg:col-span-6">
              <CardHeader className="border-b border-white/10 pb-3.5">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#F4A85E]" />
                  <span>দৈনিক মোবাইল স্ক্রিন টাইম রিপোর্ট</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSaveScreenTime} className="space-y-4">
                  {toast && (
                    <div className="p-3 rounded-xl bg-[#34D399]/15 border border-[#34D399]/35 text-[#B6F5D8] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{toast}</span>
                    </div>
                  )}
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/35 text-rose-300 text-xs">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#8EA39A] mb-1">তারিখ (বাংলাদেশ সময়)</label>
                      <Input
                        type="date"
                        min={minDateDhaka}
                        max={todayDhaka}
                        value={recordDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8EA39A] mb-1">ডেটা উৎস (Data Source)</label>
                      <select
                        value={dataSource}
                        onChange={(e) => setDataSource(e.target.value as ScreenTimeDataSource)}
                        className="w-full h-10 rounded-xl forest-input px-3 text-xs text-[#EDF4F0]"
                      >
                        <option value="manual" className="bg-[#0A1210]">
                          ম্যানুয়াল এন্ট্রি (Digital Wellbeing / iOS থেকে দেখে)
                        </option>
                        <option value="android_usage_access" className="bg-[#0A1210]">
                          Android UsageStats কম্প্যানিয়ন
                        </option>
                        <option value="ios_screen_time" className="bg-[#0A1210]">
                          iOS Screen Time কম্প্যানিয়ন
                        </option>
                        <option value="companion_sync" className="bg-[#0A1210]">
                          অটো কম্প্যানিয়ন সিংক
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div>
                    <div className="text-[11px] text-[#8EA39A] mb-1.5">দ্রুত নির্বাচন:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SCREEN_TIME_PRESETS.map((p) => (
                        <button
                          key={p.minutes}
                          type="button"
                          onClick={() => applyPreset(p.minutes)}
                          className="min-h-[36px] px-2.5 py-1 rounded-xl glass-2 hover:border-[#F4A85E]/40 text-xs text-[#EDF4F0] transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#8EA39A] mb-1">ঘণ্টা (০–২৪)</label>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        value={hoursInput}
                        onChange={(e) => setHoursInput(e.target.value)}
                        className="font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#8EA39A] mb-1">মিনিট (০–৫৯)</label>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={minutesInput}
                        onChange={(e) => setMinutesInput(e.target.value)}
                        className="font-mono tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#8EA39A] mb-1">সংক্ষিপ্ত মন্তব্য (ঐচ্ছিক)</label>
                    <Input
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="যেমন: আজ ক্লাস/কাজের জন্য ফোন বেশি ব্যবহার হয়েছে"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-[#F4A85E] font-medium tabular-nums">
                      মোট: {formatMinutesBn(totalEnteredMinutes)}
                    </span>
                    <Button type="submit" disabled={saving} className="gap-1.5 text-xs min-h-[42px]">
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'সংরক্ষণ হচ্ছে...' : 'স্ক্রিন টাইম সেভ করুন'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Today's Productive Time Breakdown */}
            <Card className="lg:col-span-6">
              <CardHeader className="border-b border-white/10 pb-3.5 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#34D399]" />
                  <span>আজকের আমলভিত্তিক Productive Time</span>
                </CardTitle>
                <Link
                  to="/my-track"
                  className="text-xs text-[#34D399] hover:text-[#B6F5D8] flex items-center gap-1"
                >
                  <span>সময় যোগ/সম্পাদনা</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5">
                {(pt.todayBreakdown || []).length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-[#8EA39A]">
                      আজ এখনো কোনো সম্পন্ন আমল বা সময় যুক্ত করা হয়নি।
                    </p>
                    <Link
                      to="/my-track"
                      className="inline-flex items-center gap-1.5 text-xs text-[#34D399] hover:underline"
                    >
                      My Dawah Track-এ যান <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  (pt.todayBreakdown || []).map((item: any) => (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl glass-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#EDF4F0] truncate">
                          {item.checked ? '✓ ' : '○ '}
                          {item.banglaLabel}
                        </div>
                        {!item.checked && item.rawMinutes ? (
                          <div className="text-[11px] text-[#F4A85E] mt-0.5">
                            চেক করা হয়নি — মোট Productive Time-এ গণনা হয়নি
                          </div>
                        ) : item.checked && !item.minutes ? (
                          <div className="text-[11px] text-[#8EA39A] mt-0.5">
                            সময় উল্লেখ করা হয়নি (অনুমান যোগ করা হয়নি)
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={`font-mono shrink-0 tabular-nums px-2.5 py-1 rounded-full border text-[11px] ${
                          item.checked && item.minutes > 0
                            ? 'bg-[#34D399]/15 border-[#34D399]/35 text-[#B6F5D8]'
                            : 'border-white/10 text-[#8EA39A]'
                        }`}
                      >
                        {item.checked && item.minutes > 0
                          ? formatMinutesCompactBn(item.minutes)
                          : item.rawMinutes
                          ? `${formatMinutesCompactBn(item.rawMinutes)} (অসম্পন্ন)`
                          : 'সময় নেই'}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comparison Chart */}
          <ScreenTimeComparisonCard
            todayScreenMinutes={st.todayMinutes ?? null}
            todayScreenSource={st.todayDataSource}
            weeklyAvgScreenMinutes={st.weeklyAverageMinutes || 0}
            todayProductiveMinutes={pt.todayMinutes || 0}
            weeklyProductiveMinutes={pt.weekMinutes || 0}
            series={data?.comparisonSeries || []}
          />

          {/* Daily Screen Time History + Platform API Limitation Note */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-7">
              <CardHeader className="border-b border-white/10 pb-3.5">
                <CardTitle className="text-sm">দৈনিক স্ক্রিন টাইম ইতিহাস</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {(st.history || []).length === 0 ? (
                  <p className="text-xs text-[#8EA39A] text-center py-6">
                    এই সময়কালে কোনো স্ক্রিন টাইম রেকর্ড নেই।
                  </p>
                ) : (
                  (st.history || []).map((rec: any) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl glass-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#EDF4F0] tabular-nums">{rec.recordDate}</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8EA39A] text-[10px]">
                            {getScreenTimeSourceLabelBn(rec.dataSource)}
                          </span>
                        </div>
                        {rec.note && <p className="text-[11px] text-[#8EA39A] truncate">{rec.note}</p>}
                      </div>
                      <span className="font-mono font-semibold text-[#F4A85E] tabular-nums shrink-0">
                        {formatMinutesBn(rec.minutes)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader className="border-b border-white/10 pb-3.5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#34D399]" />
                  স্বয়ংক্রিয় স্ক্রিন টাইম ও প্রাইভেসি নীতি
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5 text-xs text-[#8EA39A] leading-relaxed">
                <p>
                  ওয়েব ব্রাউজারের নিরাপত্তা বিধির কারণে কোনো ওয়েব অ্যাপ ফোনের অন্যান্য অ্যাপের মোট স্ক্রিন টাইম স্বয়ংক্রিয়ভাবে পড়তে পারে না।
                </p>
                <p>
                  • <strong className="text-[#EDF4F0]">Android-এ স্বয়ংক্রিয় ট্র্যাকিং:</strong> নেটিভ অ্যাপে <span className="font-mono text-[#B6F5D8]">UsageStatsManager</span> ও ব্যবহারকারীর <span className="font-mono text-[#B6F5D8]">PACKAGE_USAGE_STATS</span> অনুমতি প্রয়োজন।
                </p>
                <p>
                  • <strong className="text-[#EDF4F0]">iOS-এ স্বয়ংক্রিয় ট্র্যাকিং:</strong> <span className="font-mono text-[#B6F5D8]">FamilyControls / DeviceActivity</span> ফ্রেমওয়ার্ক ও Screen Time অনুমোদন প্রয়োজন।
                </p>
                <p>
                  তাই ওয়েবে আপনার সম্মতি ও স্বচ্ছতার জন্য ম্যানুয়াল এন্ট্রি (ফোনের Digital Wellbeing / Screen Time দেখে) এবং ডেটা-সোর্স ট্যাগসহ কম্প্যানিয়ন সিংক উভয়ই সমর্থিত।
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
