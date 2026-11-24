import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronRight, Phone } from 'lucide-react';
import { useCareRadar } from '../contexts/CareRadarContext';

export default function TopCareRadarDropdown() {
  const { enabled, stats, tasks, openDrawer } = useCareRadar();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!enabled) return null;

  const alertCount = stats.urgent + stats.soon;
  const topItems = tasks.slice(0, 12);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`relative px-2.5 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all ${
          stats.urgent > 0
            ? 'bg-rose-500/15 border-rose-400/40 text-rose-200 hover:bg-rose-500/25'
            : alertCount > 0
            ? 'bg-[#F4A85E]/15 border-[#F4A85E]/40 text-[#F4A85E] hover:bg-[#F4A85E]/25'
            : 'glass-2 text-[#8EA39A] hover:text-[#EDF4F0]'
        }`}
        title="আজকের কেয়ার তালিকা (Care Radar)"
      >
        <Bell className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Care Radar</span>
        {alertCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-black/35 text-[10px] font-mono tabular-nums font-bold">
            {alertCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-modal rounded-2xl overflow-hidden z-50 border border-white/15">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="eyebrow text-[#34D399]">CARE RADAR</div>
              <div className="text-xs font-semibold text-[#EDF4F0]">আজকের কেয়ার তালিকা</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/18 text-rose-300">
                জরুরি: {stats.urgent}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#F4A85E]/18 text-[#F4A85E]">
                শীঘ্রই: {stats.soon}
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
            {topItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#8EA39A]">
                আজ কোনো বকেয়া কেয়ার রিমাইন্ডার নেই। মাশাআল্লাহ!
              </div>
            ) : (
              topItems.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openDrawer(t.contactId);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-2.5 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          t.urgency === 'urgent'
                            ? 'bg-rose-400'
                            : t.urgency === 'soon'
                            ? 'bg-[#F4A85E]'
                            : 'bg-[#34D399]'
                        }`}
                      />
                      <span className="text-xs font-semibold text-[#EDF4F0] group-hover:text-[#B6F5D8] truncate">
                        {t.memberName || 'সদস্য'}
                      </span>
                      {t.memberArea && (
                        <span className="text-[10px] text-[#8EA39A] truncate">· {t.memberArea}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#EDF4F0]/80 mt-0.5 truncate">{t.title}</div>
                    <div className="text-[10px] text-[#8EA39A] truncate">{t.reason}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.memberPhone && (
                      <Phone className="w-3 h-3 text-[#34D399] opacity-75" />
                    )}
                    <ChevronRight className="w-4 h-4 text-[#5D726A] group-hover:text-[#34D399]" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
