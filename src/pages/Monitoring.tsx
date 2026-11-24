import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Eye,
  Users,
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowRight,
  Printer,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import CareRadarBell from '../components/CareRadarBell';

export default function Monitoring() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisibleMembers: 0,
    monitoringEnabledCount: 0,
    newReportsTodayCount: 0,
    notReportedTodayCount: 0,
  });
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [summaryRange, setSummaryRange] = useState<'week' | 'month'>('week');
  const [adminSummary, setAdminSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/monitoring/overview');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || stats);
        setRecentReports(Array.isArray(data.recentReports) ? data.recentReports : []);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminSummary = async (range: 'week' | 'month') => {
    try {
      setLoadingSummary(true);
      const res = await apiFetch(`/api/reports/admin-summary?range=${range}`);
      if (res.ok) {
        setAdminSummary(await res.json());
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchAdminSummary(summaryRange);
  }, []);

  const handleRangeChange = (range: 'week' | 'month') => {
    setSummaryRange(range);
    fetchAdminSummary(range);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="eyebrow text-[#34D399] mb-1">CONSENT-BASED MONITORING</div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-[#EDF4F0] flex items-center gap-2.5">
            <Eye className="w-6 h-6 text-[#34D399]" />
            সদস্য মনিটরিং ও সাম্প্রতিক রিপোর্ট
          </h1>
          <p className="text-xs sm:text-sm text-[#8EA39A] mt-1">
            শুধুমাত্র যেসব সদস্য স্বেচ্ছায় মনিটরিং চালু করেছেন তাদের অনুমোদিত রিপোর্ট এখানে দেখা যায়
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={fetchOverview} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            রিফ্রেশ
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5 text-[#34D399]" />
            সারাংশ প্রিন্ট / PDF
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#34D399]" /> মোট দৃশ্যমান সদস্য
          </div>
          <div className="text-2xl font-serif italic text-[#EDF4F0] mt-1 tabular-nums">
            {stats.totalVisibleMembers}
          </div>
        </div>
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" /> মনিটরিং চালু
          </div>
          <div className="text-2xl font-serif italic text-[#34D399] mt-1 tabular-nums">
            {stats.monitoringEnabledCount}
          </div>
        </div>
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#B6F5D8]" /> আজ নতুন রিপোর্ট
          </div>
          <div className="text-2xl font-serif italic text-[#B6F5D8] mt-1 tabular-nums">
            {stats.newReportsTodayCount}
          </div>
        </div>
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#F4A85E]" /> আজ রিপোর্ট বাকি
          </div>
          <div className="text-2xl font-serif italic text-[#F4A85E] mt-1 tabular-nums">
            {stats.notReportedTodayCount}
          </div>
        </div>
      </div>

      {/* Recent Consented Reports Feed */}
      <Card className="no-print">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-sm font-semibold text-[#EDF4F0]">
            সদস্যদের সাম্প্রতিক রিপোর্ট ({recentReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-10 text-center text-xs text-[#8EA39A] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#34D399]" />
              <span>রিপোর্ট লোড হচ্ছে...</span>
            </div>
          ) : recentReports.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#8EA39A]">
              এখনো কোনো মনিটরিং-অনুমোদিত সদস্য রিপোর্ট জমা দেননি।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {recentReports.map((rep) => (
                <div
                  key={rep.id}
                  className={`p-4 rounded-2xl glass-2 flex flex-col justify-between gap-3 ${
                    rep.isToday ? 'animate-pulse-twice border-[#34D399]/35' : ''
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
                          <span>{rep.memberName}</span>
                          {rep.isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-[#34D399]/18 text-[#B6F5D8] text-[10px]">
                              আজকের নতুন
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8EA39A] font-mono tabular-nums mt-0.5">
                          তারিখ: {rep.reportDate} {rep.area ? `· ${rep.area}` : ''}
                        </div>
                      </div>
                      {rep.contactId && <CareRadarBell contactId={rep.contactId} compact />}
                    </div>

                    {rep.completedCount !== null && (
                      <div className="text-xs text-[#B6F5D8] font-mono tabular-nums">
                        সম্পন্ন আমল: {rep.completedCount}/{rep.totalCount}
                      </div>
                    )}
                    {rep.note && (
                      <p className="text-xs text-[#EDF4F0]/80 italic line-clamp-2">“{rep.note}”</p>
                    )}
                  </div>

                  {rep.contactId && (
                    <div className="flex justify-end pt-2 border-t border-white/[0.08]">
                      <Link
                        to={`/contacts/${rep.contactId}?tab=self-report`}
                        className="text-xs text-[#34D399] hover:text-[#B6F5D8] flex items-center gap-1 font-medium"
                      >
                        <span>রিপোর্ট দেখুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printable Admin Consenting Summary Table (NEVER includes raw private notes) */}
      <Card>
        <CardHeader className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-[#EDF4F0]">
              সম্মতিপ্রাপ্ত সদস্যদের {summaryRange === 'week' ? 'সাপ্তাহিক' : 'মাসিক'} সারাংশ (প্রিন্টযোগ্য)
            </CardTitle>
            <p className="text-[11px] text-[#8EA39A] mt-0.5">
              কোনো ব্যক্তিগত নোট ছাড়া শুধুমাত্র সম্মতিপ্রাপ্ত সদস্যদের পরিসংখ্যান
            </p>
          </div>
          <div className="flex rounded-xl glass-2 p-1 no-print">
            <button
              type="button"
              onClick={() => handleRangeChange('week')}
              className={`px-3 py-1 rounded-lg text-xs ${
                summaryRange === 'week' ? 'forest-btn-primary' : 'text-[#8EA39A]'
              }`}
            >
              ৭ দিন
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange('month')}
              className={`px-3 py-1 rounded-lg text-xs ${
                summaryRange === 'month' ? 'forest-btn-primary' : 'text-[#8EA39A]'
              }`}
            >
              ৩০ দিন
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingSummary ? (
            <div className="py-6 text-center text-xs text-[#8EA39A]">সারাংশ লোড হচ্ছে...</div>
          ) : !adminSummary || (adminSummary.members || []).length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8EA39A]">
              সারাংশ দেখানোর মতো সম্মতিপ্রাপ্ত সদস্য পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-white/10 text-[#8EA39A]">
                  <tr>
                    <th className="py-2.5 px-3">সদস্যের নাম</th>
                    <th className="py-2.5 px-3">এলাকা</th>
                    <th className="py-2.5 px-3 text-center">ধাপ</th>
                    <th className="py-2.5 px-3 text-center">রিপোর্ট জমা</th>
                    <th className="py-2.5 px-3 text-right">গড় সম্পূর্ণতা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {adminSummary.members.map((m: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium text-[#EDF4F0]">{m.memberName}</td>
                      <td className="py-2.5 px-3 text-[#8EA39A]">{m.area}</td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">{m.currentStage}/16</td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">{m.submittedDays} দিন</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#34D399] tabular-nums">
                        {m.completionPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
