import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from './ui';
import {
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  XCircle,
  Loader2,
  Check,
  Volume2,
  RotateCcw,
} from 'lucide-react';
import { AiVoiceEntry, CustomCategory, STAGES, Priority } from '../types';
import { apiFetch } from '../lib/api';

interface VoiceDawahModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    name: string;
    currentStage?: number;
    priorityLevel?: string;
    categoryTags?: string[];
  };
  initialPendingEntry?: AiVoiceEntry | null;
  allCategories?: CustomCategory[];
  onApproved?: () => void;
}

export default function VoiceDawahModal({
  open,
  onOpenChange,
  member,
  initialPendingEntry = null,
  allCategories: providedCategories,
  onApproved,
}: VoiceDawahModalProps) {
  // Workflow steps: 'record' -> 'transcribed' -> 'review' -> 'done'
  const [step, setStep] = useState<'record' | 'transcribed' | 'review' | 'done'>('record');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  // Transcription & AI state
  const [originalTranscription, setOriginalTranscription] = useState('');
  const [editedTranscription, setEditedTranscription] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review screen state
  const [pendingEntry, setPendingEntry] = useState<AiVoiceEntry | null>(null);
  const [categories, setCategories] = useState<CustomCategory[]>(providedCategories || []);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [editableObservations, setEditableObservations] = useState<string[]>([]);
  const [applyStage, setApplyStage] = useState<number | ''>('');
  const [applyPriority, setApplyPriority] = useState<Priority | ''>('');
  const [isEditingInReview, setIsEditingInReview] = useState(false);

  // Reset or load initial pending entry when modal opens
  useEffect(() => {
    if (!open) {
      stopMediaStream();
      return;
    }
    setError(null);

    if (initialPendingEntry) {
      setPendingEntry(initialPendingEntry);
      setOriginalTranscription(initialPendingEntry.originalTranscription);
      setEditedTranscription(initialPendingEntry.editedTranscription);
      setEditableObservations(initialPendingEntry.aiObservations || []);
      setSelectedCategoryIds(
        new Set((initialPendingEntry.suggestedIndicators || []).map((s) => s.categoryId))
      );
      setApplyStage(initialPendingEntry.indicatorUpdates?.suggestedStage || '');
      setApplyPriority((initialPendingEntry.indicatorUpdates?.suggestedPriority as Priority) || '');
      setStep('review');
      if (!providedCategories || providedCategories.length === 0) {
        apiFetch('/api/custom-categories')
          .then((r) => (r.ok ? r.json() : []))
          .then((cats) => setCategories(Array.isArray(cats) ? cats : []))
          .catch(() => {});
      }
    } else {
      setStep('record');
      setPendingEntry(null);
      setOriginalTranscription('');
      setEditedTranscription('');
      setAudioUrl(null);
      setAudioBase64(null);
      setRecordingSeconds(0);
      setSelectedCategoryIds(new Set());
      setEditableObservations([]);
      setApplyStage('');
      setApplyPriority('');
      setIsEditingInReview(false);
    }
  }, [open, initialPendingEntry]);

  const stopMediaStream = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('আপনার ব্রাউজারে মাইক্রোফোন রেকর্ডিং সমর্থিত নয়। নিচে সরাসরি বাংলা টেক্সট লিখে বিশ্লেষণ করতে পারেন।');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const chosenType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = chosenType ? new MediaRecorder(stream, { mimeType: chosenType }) : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        setAudioMimeType(mime.split(';')[0]);
        setAudioUrl(URL.createObjectURL(blob));

        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setAudioBase64(reader.result);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Mic error:', err);
      setError('মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি। ব্রাউজার সেটিংস থেকে মাইক্রোফোন Allow করুন অথবা নিচে টেক্সট লিখুন।');
    }
  };

  const stopRecording = () => {
    stopMediaStream();
  };

  const handleTranscribeAudio = async () => {
    if (!audioBase64) return;
    try {
      setTranscribing(true);
      setError(null);
      const res = await apiFetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType: audioMimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ট্রান্সক্রিপশন ব্যর্থ হয়েছে');
      setOriginalTranscription(data.transcription);
      setEditedTranscription(data.transcription);
      setStep('transcribed');
    } catch (err: any) {
      setError(err.message || 'ভয়েস থেকে টেক্সট রূপান্তর ব্যর্থ হয়েছে।');
    } finally {
      setTranscribing(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!editedTranscription.trim()) {
      setError('অনুগ্রহ করে বাংলা পর্যবেক্ষণ নোট লিখুন বা ভয়েস রেকর্ড করুন।');
      return;
    }
    try {
      setAnalyzing(true);
      setError(null);
      const res = await apiFetch('/api/ai/analyze-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: member.id,
          transcription: editedTranscription.trim(),
          originalTranscription: (originalTranscription || editedTranscription).trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI বিশ্লেষণ ব্যর্থ হয়েছে');

      const entry: AiVoiceEntry = data.entry;
      setPendingEntry(entry);
      if (Array.isArray(data.allCategories)) {
        setCategories(data.allCategories);
      }
      setEditableObservations(entry.aiObservations || []);
      // Only auto-check high-confidence suggested indicators; NEVER auto-check uncertain ones!
      setSelectedCategoryIds(
        new Set((entry.suggestedIndicators || []).map((s) => s.categoryId))
      );
      setApplyStage(entry.indicatorUpdates?.suggestedStage || '');
      setApplyPriority((entry.indicatorUpdates?.suggestedPriority as Priority) || '');
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'AI বিশ্লেষণ করতে সমস্যা হয়েছে।');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleApproveAndSave = async () => {
    if (!pendingEntry) return;
    try {
      setSavingApproval(true);
      setError(null);
      const updates = pendingEntry.indicatorUpdates || {};
      const res = await apiFetch(`/api/ai/voice-entries/${pendingEntry.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editedTranscription,
          approvedCategoryIds: Array.from(selectedCategoryIds),
          approvedObservations: editableObservations.filter((o) => o.trim()),
          applyStage: applyStage ? Number(applyStage) : undefined,
          applyPriority: applyPriority || undefined,
          fajrTarget: updates.fajrTarget ?? undefined,
          jummahTarget: updates.jummahTarget ?? undefined,
          deeniyatTarget: updates.deeniyatTarget ?? undefined,
          tafseerTarget: updates.tafseerTarget ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');

      setStep('done');
      if (onApproved) onApproved();
    } catch (err: any) {
      setError(err.message || 'অনুমোদন সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setSavingApproval(false);
    }
  };

  const handleCancelPending = async () => {
    if (pendingEntry && pendingEntry.status === 'pending') {
      try {
        await apiFetch(`/api/ai/voice-entries/${pendingEntry.id}/cancel`, {
          method: 'POST',
        });
      } catch {
        // ignore cancel failure
      }
    }
    onOpenChange(false);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#16161A] border border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-[#E5E5E7]">
            <Mic className="w-5 h-5 text-emerald-400" />
            <span>AI ভয়েস নোট ও প্রোফাইল আপডেট</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            সদস্য: <span className="text-emerald-400 font-medium">{member.name}</span> · ID:{' '}
            <span className="font-mono">{member.id.slice(0, 8)}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1 & 2: RECORD & EDIT TRANSCRIPTION */}
        {(step === 'record' || step === 'transcribed') && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0A0A0B] border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium text-[#E5E5E7]">১. বাংলায় ভয়েস নোট রেকর্ড করুন</h4>
                  <p className="text-xs text-white/45 mt-0.5">
                    সদস্যের সালাহ, মসজিদ, ইলমি মুহাজারা, পাঠচক্র বা যোগাযোগ সম্পর্কে স্বাভাবিকভাবে বলুন।
                  </p>
                </div>

                {!isRecording ? (
                  <Button
                    type="button"
                    onClick={startRecording}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white min-h-[40px]"
                  >
                    <Mic className="w-4 h-4" />
                    রেকর্ডিং শুরু
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={stopRecording}
                    variant="destructive"
                    className="gap-2 min-h-[40px]"
                  >
                    <Square className="w-4 h-4" />
                    থামান ({formatTimer(recordingSeconds)})
                  </Button>
                )}
              </div>

              {isRecording && (
                <div className="text-xs text-rose-400 font-mono tabular-nums">
                  রেকর্ডিং চলছে: {formatTimer(recordingSeconds)}
                </div>
              )}

              {audioUrl && !isRecording && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 flex-1">
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <audio controls src={audioUrl} className="h-9 w-full" />
                  </div>
                  <Button
                    type="button"
                    onClick={handleTranscribeAudio}
                    disabled={transcribing}
                    variant="outline"
                    className="gap-2 shrink-0 min-h-[40px]"
                  >
                    {transcribing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        রূপান্তর হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        টেক্সটে রূপান্তর করুন
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Editable Bengali Transcription Box (visible before AI analysis) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/70">
                  ২. বাংলা ট্রান্সক্রিপশন (বিশ্লেষণের আগে সম্পাদনা করতে পারবেন)
                </label>
                {step === 'transcribed' && (
                  <span className="text-[11px] text-emerald-400">ট্রান্সক্রিপশন সম্পন্ন</span>
                )}
              </div>
              <textarea
                rows={4}
                value={editedTranscription}
                onChange={(e) => {
                  setEditedTranscription(e.target.value);
                  if (!originalTranscription) setOriginalTranscription(e.target.value);
                }}
                placeholder="উদাহরণ: এই ভাই এখন নিয়মিত মসজিদে আসে, ইলমি মুহাজারায় মাঝে মাঝে আসে, বয়ানে উপস্থিত হয় এবং ফোন দিলে কথা বলা যায়।"
                className="w-full rounded-lg bg-[#0A0A0B] border border-white/10 p-3 text-sm text-[#E5E5E7] placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                বাতিল
              </Button>
              <Button
                type="button"
                onClick={handleAnalyzeText}
                disabled={analyzing || !editedTranscription.trim()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white min-h-[40px]"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI বিশ্লেষণ চলছে...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI বিশ্লেষণ ও রিভিউ দেখুন
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: AI REVIEW & EXPLICIT ADMIN APPROVAL */}
        {step === 'review' && pendingEntry && (
          <div className="space-y-5">
            {/* Member & Transcription Summary */}
            <div className="p-4 rounded-xl bg-[#0A0A0B] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">মূল ভয়েস ট্রান্সক্রিপশন</span>
                <button
                  type="button"
                  onClick={() => setIsEditingInReview(!isEditingInReview)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingInReview ? 'সম্পাদনা শেষ' : 'সম্পাদনা (Edit)'}
                </button>
              </div>
              {isEditingInReview ? (
                <textarea
                  rows={3}
                  value={editedTranscription}
                  onChange={(e) => setEditedTranscription(e.target.value)}
                  className="w-full rounded-md bg-[#16161A] border border-white/15 p-2.5 text-sm text-[#E5E5E7]"
                />
              ) : (
                <p className="text-sm text-[#E5E5E7] leading-relaxed">“{editedTranscription}”</p>
              )}
            </div>

            {/* AI-Understood Observations */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                AI-অনুধাবিত পর্যবেক্ষণ (Observations)
              </h4>
              <div className="space-y-1.5">
                {editableObservations.map((obs, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {isEditingInReview ? (
                      <input
                        value={obs}
                        onChange={(e) => {
                          const next = [...editableObservations];
                          next[idx] = e.target.value;
                          setEditableObservations(next);
                        }}
                        className="flex-1 rounded bg-[#0A0A0B] border border-white/10 px-3 py-1.5 text-xs text-[#E5E5E7]"
                      />
                    ) : (
                      <div className="text-xs text-white/80 bg-[#0A0A0B] border border-white/5 rounded-lg px-3 py-2 w-full">
                        • {obs}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Existing Indicators */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                বিদ্যমান ইনডিকেটর (Existing Indicators)
              </h4>
              <div className="text-xs text-white/60">
                {(pendingEntry.existingIndicators || []).length > 0
                  ? pendingEntry.existingIndicators.map((c) => c.banglaName || c.name).join(' · ')
                  : 'এখনো কোনো ক্যাটাগরি যুক্ত নেই'}
              </div>
            </div>

            {/* Newly Suggested Indicators */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                নতুন প্রস্তাবিত ইনডিকেটর (ডাটাবেস ক্যাটাগরি আইডিসহ)
              </h4>
              {(pendingEntry.suggestedIndicators || []).length === 0 ? (
                <p className="text-xs text-white/45">কোনো নিশ্চিত নতুন ক্যাটাগরি প্রস্তাবিত হয়নি।</p>
              ) : (
                <div className="space-y-2">
                  {pendingEntry.suggestedIndicators.map((sug) => {
                    const checked = selectedCategoryIds.has(sug.categoryId);
                    return (
                      <label
                        key={sug.categoryId}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/40'
                            : 'bg-[#0A0A0B] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(sug.categoryId)}
                          className="mt-1 accent-emerald-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium text-[#E5E5E7]">
                              {sug.banglaName || sug.name}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-white/40">
                              ID: {sug.categoryId.slice(0, 8)} · {Math.round((sug.confidence || 0.85) * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-white/55 mt-0.5">{sug.reason}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Uncertain Observations (Requires Confirmation, NOT auto-selected) */}
            {(pendingEntry.uncertainObservations || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  নিশ্চিতকরণ প্রয়োজন (Uncertain Observations — স্বয়ংক্রিয়ভাবে নির্বাচিত নয়)
                </h4>
                <div className="space-y-2">
                  {pendingEntry.uncertainObservations.map((u, idx) => {
                    const checked = u.possibleCategoryId ? selectedCategoryIds.has(u.possibleCategoryId) : false;
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/25 space-y-1.5"
                      >
                        <div className="text-xs text-amber-200 font-medium">“{u.statement}”</div>
                        <div className="text-xs text-white/60">{u.question}</div>
                        {u.possibleCategoryId && (
                          <label className="inline-flex items-center gap-2 text-xs text-amber-300 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCategory(u.possibleCategoryId!)}
                              className="accent-amber-500"
                            />
                            <span>সম্ভাব্য ক্যাটাগরি যুক্ত করুন: {u.possibleCategoryName}</span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual/Additional Category Picker when Editing */}
            {isEditingInReview && categories.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <h4 className="text-xs font-semibold text-white/60">সব ক্যাটাগরি থেকে নির্বাচন/সংশোধন</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 text-xs text-white/75 p-2 rounded bg-[#0A0A0B] border border-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.has(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="accent-emerald-500"
                      />
                      <span className="truncate">{cat.banglaName || cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Stage & Priority Suggested Updates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#0A0A0B] border border-white/10">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50">গ্রোথ স্টেজ আপডেট (ঐচ্ছিক)</label>
                <select
                  value={applyStage}
                  onChange={(e) => setApplyStage(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-9 rounded bg-[#16161A] border border-white/10 px-2.5 text-xs text-[#E5E5E7]"
                >
                  <option value="">বর্তমান স্টেজ অপরিবর্তিত ({member.currentStage || 1})</option>
                  {STAGES.map((s, idx) => (
                    <option key={idx} value={idx + 1}>
                      {idx + 1}. {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-white/50">প্রায়োরিটি লেভেল (ঐচ্ছিক)</label>
                <select
                  value={applyPriority}
                  onChange={(e) => setApplyPriority((e.target.value as Priority) || '')}
                  className="w-full h-9 rounded bg-[#16161A] border border-white/10 px-2.5 text-xs text-[#E5E5E7]"
                >
                  <option value="">অপরিবর্তিত</option>
                  <option value="growing">Growing</option>
                  <option value="stable">Stable</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="high_priority">High Priority</option>
                </select>
              </div>
            </div>

            {/* 3 Explicit Action Buttons: Approve, Edit, Cancel */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelPending}
                className="gap-1.5 text-rose-400 hover:text-rose-300"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingInReview(!isEditingInReview)}
                  className="gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  {isEditingInReview ? 'Done Editing' : 'Edit'}
                </Button>

                <Button
                  type="button"
                  onClick={handleApproveAndSave}
                  disabled={savingApproval}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white min-h-[40px]"
                >
                  {savingApproval ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DONE */}
        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-[#E5E5E7]">
                অনুমোদিত তথ্য ও AI গ্যাপ অ্যানালাইসিস সংরক্ষিত হয়েছে
              </h4>
              <p className="text-xs text-white/55">
                {member.name}-এর প্রোফাইল, অডিট লগ এবং পরবর্তী দাওয়াহ গাইডেন্স সফলভাবে আপডেট হয়েছে।
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('record');
                  setEditedTranscription('');
                  setAudioUrl(null);
                  setAudioBase64(null);
                }}
                className="gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                আরেকটি ভয়েস নোট দিন
              </Button>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                সম্পন্ন
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
