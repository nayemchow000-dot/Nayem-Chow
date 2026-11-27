import React from 'react';
import { Smartphone, Sparkles, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ScreenTimeDataSource } from '../types';
import { formatMinutesBn, toBanglaDigits } from '../lib/dhakaTime';

export function getScreenTimeSourceLabelBn(source?: ScreenTimeDataSource | string | null): string {
  switch (source) {
    case 'android_usage_access':
      return 'Android Usage Access';
    case 'ios_screen_time':
      return 'iOS Screen Time';
    case 'companion_sync':
      return 'অটো কম্প্যানিয়ন সিংক';
    case 'manual':
    default:
      return 'ম্যানুয়াল এন্ট্রি';
  }
}

interface ComparisonPoint {
  date: string;
  label: string;
  screenTimeMinutes: number;
  productiveMinutes: number;
}

interface ScreenTimeComparisonCardProps {
  todayScreenMinutes: number | null;
  todayScreenSource?: ScreenTimeDataSource | string | null;
  weeklyAvgScreenMinutes: number;
  todayProductiveMinutes: number;
  weeklyProductiveMinutes: number;
  series?: ComparisonPoint[];
  onQuickLogClick?: () => void;
}

export default function ScreenTimeComparisonCard({
  todayScreenMinutes,
  todayScreenSource,
  weeklyAvgScreenMinutes,
  todayProductiveMinutes,
  weeklyProductiveMinutes,
  series = [],
  onQuickLogClick,
}: ScreenTimeComparisonCardProps) {
  const safeScreenToday = todayScreenMinutes ?? 0;
  const maxBar = Math.max(safeScreenToday, todayProductiveMinutes, 60);
  const screenWidthPct = Math.min(100, Math.round((safeScreenToday / maxBar) * 100));
  const prodWidthPct = Math.min(100, Math.round((todayProductiveMinutes / maxBar) * 100));

  return (
    <div className="glass rounded-[22px] p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="eyebrow text-[#34D399] mb-1">TIME COMPARISON</div>
          <h2 className="text-base sm:text-lg font-semibold text-[#EDF4F0]">
            Screen Time বনাম Productive Time (পাশাপাশি তুলনা)
          </h2>
        </div>
        {onQuickLogClick && (
          <button
            type="button"
            onClick={onQuickLogClick}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-[#EDF4F0] transition-colors self-start sm:self-auto"
          >
            আজকের স্ক্রিন টাইম আপডেট
          </button>
        )}
      </div>

      {/* Side-by-Side Today's Time Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Screen Time Side */}
        <div className="p-4 rounded-2xl glass-2 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#8EA39A] flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#F4A85E]" />
              আজকের মোবাইল স্ক্রিন টাইম
            </span>
            {todayScreenMinutes !== null && (
              <span className="px-2 py-0.5 rounded-full bg-[#F4A85E]/15 border border-[#F4A85E]/30 text-[#E8CD92] text-[10px]">
                {getScreenTimeSourceLabelBn(todayScreenSource)}
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-serif italic text-[#F4A85E] tabular-nums">
            {todayScreenMinutes !== null ? formatMinutesBn(todayScreenMinutes) : 'আজ এখনো লগ হয়নি'}
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#DD7B3C] to-[#F4A85E] transition-all duration-500"
              style={{ width: `${todayScreenMinutes !== null ? Math.max(4, screenWidthPct) : 0}%` }}
            />
          </div>
          <div className="text-[11px] text-[#8EA39A] tabular-nums">
            সাপ্তাহিক দৈনিক গড়: {weeklyAvgScreenMinutes > 0 ? formatMinutesBn(weeklyAvgScreenMinutes) : 'তথ্য নেই'}
          </div>
        </div>

        {/* Productive Time Side */}
        <div className="p-4 rounded-2xl glass-2 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#8EA39A] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#34D399]" />
              আজকের Productive Time
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#B6F5D8] text-[10px]">
              সম্পন্ন আমল ও দাওয়াহ
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-serif italic text-[#34D399] tabular-nums">
            {formatMinutesBn(todayProductiveMinutes)}
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0E9F6E] to-[#34D399] transition-all duration-500"
              style={{ width: `${todayProductiveMinutes > 0 ? Math.max(4, prodWidthPct) : 0}%` }}
            />
          </div>
          <div className="text-[11px] text-[#8EA39A] tabular-nums">
            গত ৭ দিনে মোট Productive Time: {formatMinutesBn(weeklyProductiveMinutes)}
          </div>
        </div>
      </div>

      {/* Optional Multi-Day Chart */}
      {series.length > 0 && (
        <div className="pt-2">
          <div className="text-xs text-[#8EA39A] mb-3">
            গত {toBanglaDigits(series.length)} দিনের তুলনামূলক চিত্র (মিনিট)
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" stroke="#8EA39A" fontSize={11} />
                <YAxis stroke="#8EA39A" fontSize={11} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatMinutesBn(Number(value) || 0),
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: '#0A1210',
                    border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: '12px',
                    color: '#EDF4F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#8EA39A' }} />
                <Bar
                  dataKey="screenTimeMinutes"
                  fill="#F4A85E"
                  radius={[5, 5, 0, 0]}
                  name="মোবাইল স্ক্রিন টাইম"
                />
                <Bar
                  dataKey="productiveMinutes"
                  fill="#34D399"
                  radius={[5, 5, 0, 0]}
                  name="Productive Time"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Honest Caveat Note (Never subtract Productive Time from Screen Time) */}
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-start gap-2.5 text-[11px] text-[#8EA39A] leading-relaxed">
        <Info className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
        <span>
          <strong className="text-[#EDF4F0]">তুলনার সঠিক নিয়ম:</strong> Productive Time-এর মধ্যে অফলাইন ইবাদত ও দাওয়াহ কাজও (যেমন: মসজিদে সালাত, কুরআন তিলাওয়াত, সরাসরি দাওয়াহ) অন্তর্ভুক্ত থাকে। তাই এটি মোবাইল Screen Time-এর অংশ নয় — একটি থেকে অন্যটি বিয়োগ করা হয়নি; কেবল আপনার দৈনিক ডিজিটাল ব্যবহার বনাম আমল-দাওয়াহর ভারসাম্য বোঝার জন্য পাশাপাশি দেখানো হয়েছে।
        </span>
      </div>
    </div>
  );
}
