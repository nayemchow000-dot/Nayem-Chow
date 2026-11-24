import React from 'react';
import { Bell } from 'lucide-react';
import { useCareRadar } from '../contexts/CareRadarContext';
import { cn } from '../lib/utils';

interface CareRadarBellProps {
  contactId: string;
  compact?: boolean;
  className?: string;
}

export default function CareRadarBell({ contactId, compact = false, className }: CareRadarBellProps) {
  const { enabled, summaries, openDrawer } = useCareRadar();

  if (!enabled) return null;

  const summary = summaries[contactId];
  const urgency = summary?.urgency || 'ok';
  const count = summary?.openTaskCount || 0;

  if (compact && count === 0) {
    return null;
  }

  const badgeStyle =
    urgency === 'urgent'
      ? 'bg-rose-500/18 text-rose-300 border-rose-400/45 hover:bg-rose-500/28'
      : urgency === 'soon'
      ? 'bg-[#F4A85E]/18 text-[#F4A85E] border-[#F4A85E]/45 hover:bg-[#F4A85E]/28'
      : 'bg-[#34D399]/14 text-[#34D399] border-[#34D399]/35 hover:bg-[#34D399]/24';

  const label =
    urgency === 'urgent'
      ? 'জরুরি কেয়ার প্রয়োজন'
      : urgency === 'soon'
      ? 'শীঘ্রই খোঁজ নিন'
      : 'স্বাভাবিক অবস্থা';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openDrawer(contactId);
      }}
      title={`Care Radar: ${label}${count > 0 ? ` (${count}টি ধাপ)` : ''}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border transition-all cursor-pointer shrink-0',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]',
        badgeStyle,
        className
      )}
    >
      <Bell className={cn(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      {count > 0 && <span className="font-mono font-semibold tabular-nums">{count}</span>}
    </button>
  );
}
