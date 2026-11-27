import React, { useState, useEffect } from 'react';
import { Clock, Check, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
} from './ui';
import { formatMinutesBn, toBanglaDigits } from '../lib/dhakaTime';

const QUICK_PRESETS = [
  { label: '৫ মিনিট', minutes: 5 },
  { label: '১০ মিনিট', minutes: 10 },
  { label: '১৫ মিনিট', minutes: 15 },
  { label: '২০ মিনিট', minutes: 20 },
  { label: '৩০ মিনিট', minutes: 30 },
  { label: '৪৫ মিনিট', minutes: 45 },
  { label: '১ ঘণ্টা', minutes: 60 },
  { label: '১.৫ ঘণ্টা', minutes: 90 },
];

interface TimePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityLabel: string;
  currentMinutes: number | null;
  isChecked: boolean;
  onSave: (minutes: number | null, alsoCheck?: boolean) => Promise<void> | void;
}

export default function TimePickerSheet({
  open,
  onOpenChange,
  activityLabel,
  currentMinutes,
  isChecked,
  onSave,
}: TimePickerSheetProps) {
  const [customHours, setCustomHours] = useState('0');
  const [customMinutes, setCustomMinutes] = useState('15');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const m = currentMinutes && currentMinutes > 0 ? currentMinutes : 15;
      setCustomHours(String(Math.floor(m / 60)));
      setCustomMinutes(String(m % 60));
    }
  }, [open, currentMinutes]);

  const parsedTotal = Math.min(
    600,
    Math.max(0, (parseInt(customHours || '0', 10) || 0) * 60 + (parseInt(customMinutes || '0', 10) || 0))
  );

  const handleSelectPreset = async (mins: number) => {
    try {
      setSaving(true);
      await onSave(mins, false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCustom = async (alsoCheck = false) => {
    try {
      setSaving(true);
      await onSave(parsedTotal > 0 ? parsedTotal : null, alsoCheck);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setSaving(true);
      await onSave(null, false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 sm:p-6">
        <DialogHeader className="text-left pr-8">
          <div className="eyebrow text-[#34D399] mb-1">ACTIVITY DURATION</div>
          <DialogTitle className="text-base sm:text-lg flex items-center gap-2 text-[#EDF4F0]">
            <Clock className="w-4 h-4 text-[#34D399] shrink-0" />
            <span>সময় নির্ধারণ করুন</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#B6F5D8] pt-1">
            {activityLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {!isChecked && (
            <div className="p-3 rounded-xl bg-[#F4A85E]/10 border border-[#F4A85E]/30 text-[11px] text-[#E8CD92]">
              দ্রষ্টব্য: এই আমলটি এখনো সম্পন্ন হিসেবে চেক করা হয়নি। কেবল চেক করা আমলের সময়ই দৈনিক Productive Time-এ যুক্ত হয়।
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <div className="text-[11px] font-medium text-[#8EA39A] mb-2">দ্রুত সময় নির্বাচন (Quick Presets)</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_PRESETS.map((p) => {
                const selected = currentMinutes === p.minutes;
                return (
                  <button
                    key={p.minutes}
                    type="button"
                    disabled={saving}
                    onClick={() => handleSelectPreset(p.minutes)}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-1 ${
                      selected
                        ? 'bg-[#34D399]/20 border-[#34D399]/50 text-[#B6F5D8]'
                        : 'glass-2 hover:border-white/25 text-[#EDF4F0]'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-[#34D399] shrink-0" />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hours + Minutes */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#8EA39A]">কাস্টম সময় (Custom Time)</span>
              <span className="text-xs font-mono text-[#34D399] tabular-nums">
                {parsedTotal > 0 ? formatMinutesBn(parsedTotal) : 'সময় নেই'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#8EA39A] mb-1">ঘণ্টা (Hours)</label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8EA39A] mb-1">মিনিট (Minutes)</label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {currentMinutes ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={saving}
                  onClick={handleClear}
                  className="gap-1.5 text-xs min-h-[42px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  সময় মুছুন ({toBanglaDigits(currentMinutes)} মি.)
                </Button>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {!isChecked && parsedTotal > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleApplyCustom(true)}
                    className="text-xs min-h-[42px]"
                  >
                    সম্পন্ন মার্কসহ সেভ
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || parsedTotal <= 0}
                  onClick={() => handleApplyCustom(false)}
                  className="text-xs min-h-[42px]"
                >
                  সংরক্ষণ করুন
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
