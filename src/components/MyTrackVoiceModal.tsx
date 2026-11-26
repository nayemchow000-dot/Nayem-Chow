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
  Loader2,
  Check,
  Volume2,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { TrackerItem } from '../types';
import { apiFetch } from '../lib/api';

interface ExtractedLog {
  targetName: string | null;
  description: string;
  outcome: string | null;
}

interface MyTrackVoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportDate: string;
  trackerItems: TrackerItem[];
  currentCheckedMap: Record<string, boolean>;
  currentNote: string;
  onApplyUpdates: (payload: {
    mergedItems: Record<string, boolean>;
    dawahLogsToAdd: ExtractedLog[];
    noteToAppend: string | null;
  }) => Promise<void>;
}

export default function MyTrackVoiceModal({
  open,
  onOpenChange,
  reportDate,
  trackerItems,
  currentCheckedMap,
  currentNote,
  onApplyUpdates,
}: MyTrackVoiceModalProps) {
  const [step, setStep] = useState<'record' | 'review' | 'done'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [transcription, setTranscription] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [summary, setSummary] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dawahLogs, setDawahLogs] = useState<ExtractedLog[]>([]);
  const [extractedNote, setExtractedNote] = useState('');
  const [includeNote, setIncludeNote] = useState(true);

  useEffect(() => {
    if (!open) {
      stopMediaStream();
      return;
    }
    setStep('record');
    setError(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setRecordingSeconds(0);
    setTranscription('');
    setSummary('');
    setSelectedKeys(new Set());
    setDawahLogs([]);
    setExtractedNote('');
    setIncludeNote(true);
  }, [open]);

  const stopMediaStream = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData?.();
        }
        mediaRecorderRef.current.stop();
      } catch {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
      }
    }
    setIsRecording(false);
  };

  const transcribePayload = async (b64: string, mime: string) => {
    if (!b64) {
      setError('অডিও ডাটা প্রস্তুত হয়নি। অনুগ্রহ করে আবার রেকর্ড করুন বা অডিও ফাইল আপলোড করুন।');
      return;
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45000);
    try {
      setTranscribing(true);
      setError(null);
      const res = await apiFetch('/api/ai/transcribe', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: b64, mimeType: mime }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'ট্রান্সক্রিপশন ব্যর্থ হয়েছে');
      setTranscription(data.transcription);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('ভয়েস ট্রান্সক্রিপশনে বেশি সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা নিচে সরাসরি বাংলা লিখুন।');
      } else {
        setError(err?.message || 'ভয়েস থেকে টেক্সট রূপান্তর ব্যর্থ হয়েছে। নিচে সরাসরি বাংলা লিখতে পারেন।');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setTranscribing(false);
    }
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const mime = (file.type || 'audio/webm').split(';')[0];
    setAudioMimeType(mime);
    setAudioUrl(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAudioBase64(reader.result);
        transcribePayload(reader.result, mime);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('আপনার ব্রাউজারে মাইক্রোফোন সমর্থিত নয়। অডিও ফাইল আপলোড করুন অথবা নিচে সরাসরি বাংলা লিখুন।');
        return;
      }
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (perm.state === 'denied') {
            setError('মাইক্রোফোন অনুমতি বন্ধ রয়েছে। ব্রাউজার সেটিংস থেকে Allow করুন অথবা অডিও ফাইল / নিচে বাংলা লিখুন।');
            return;
          }
        }
      } catch {
        // ignore
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const chosenType = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      let recorder: MediaRecorder;
      try {
        recorder = chosenType
          ? new MediaRecorder(stream, { mimeType: chosenType, audioBitsPerSecond: 32000 })
          : new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      } catch {
        recorder = chosenType ? new MediaRecorder(stream, { mimeType: chosenType }) : new MediaRecorder(stream);
      }

      liveTranscriptRef.current = '';
      const existingBeforeStart = transcription.trim();

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = 'bn-BD';
          rec.continuous = true;
          rec.interimResults = true;
          let finalAccum = existingBeforeStart ? `${existingBeforeStart} ` : '';
          rec.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const part = event.results[i][0]?.transcript || '';
              if (event.results[i].isFinal) {
                finalAccum += `${part} `;
              } else {
                interim += part;
              }
            }
            const combined = (finalAccum + interim).trim();
            if (combined) {
              liveTranscriptRef.current = combined;
              setTranscription(combined);
            }
          };
          rec.onerror = () => {};
          rec.start();
          speechRecRef.current = rec;
        } catch {
          speechRecRef.current = null;
        }
      }

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const mime = (recorder.mimeType || chosenType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunksRef.current, { type: mime });
        stream.getTracks().forEach((t) => t.stop());

        if (blob.size < 100) {
          setError('কোনো অডিও রেকর্ড হয়নি। অনুগ্রহ করে অন্তত ১-২ সেকেন্ড কথা বলুন অথবা অডিও ফাইল আপলোড করুন।');
          return;
        }

        setAudioMimeType(mime);
        setAudioUrl(URL.createObjectURL(blob));

        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setAudioBase64(reader.result);
            if (liveTranscriptRef.current.trim().length < 3) {
              transcribePayload(reader.result, mime);
            }
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      const name = String(err?.name || '');
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('ডিভাইসে কোনো মাইক্রোফোন পাওয়া যায়নি। নিচে সরাসরি বাংলায় লিখুন।');
      } else {
        setError('মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি। নিচে সরাসরি বাংলায় লিখতে বা অডিও আপলোড করতে পারেন।');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!transcription.trim()) {
      setError('অনুগ্রহ করে বাংলায় বলুন অথবা লিখুন।');
      return;
    }
    try {
      setAnalyzing(true);
      setError(null);
      const res = await apiFetch('/api/my-track/analyze-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: transcription.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'AI বিশ্লেষণ ব্যর্থ হয়েছে');

      setSelectedKeys(new Set(Array.isArray(data.matchedItemKeys) ? data.matchedItemKeys : []));
      setDawahLogs(Array.isArray(data.extractedDawahLogs) ? data.extractedDawahLogs : []);
      setExtractedNote(data.extractedNote || '');
      setIncludeNote(Boolean(data.extractedNote));
      setSummary(data.summary || '');
      setStep('review');
    } catch (err: any) {
      setError(err?.message || 'AI বিশ্লেষণে সমস্যা হয়েছে।');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      setError(null);
      const mergedItems: Record<string, boolean> = { ...currentCheckedMap };
      selectedKeys.forEach((k) => {
        mergedItems[k] = true;
      });
      await onApplyUpdates({
        mergedItems,
        dawahLogsToAdd: dawahLogs.filter((l) => l.description.trim()),
        noteToAppend:
          includeNote && extractedNote.trim()
            ? currentNote.trim()
              ? `${currentNote.trim()}\n${extractedNote.trim()}`
              : extractedNote.trim()
            : null,
      });
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'আপডেট সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setApplying(false);
    }
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-[#EDF4F0]">
            <Mic className="w-5 h-5 text-[#34D399]" />
            <span>AI ভয়েস — আমার দৈনিক আমল ও দাওয়াহ আপডেট</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#8EA39A]">
            তারিখ: <span className="font-mono text-[#B6F5D8]">{reportDate}</span> · আপনার কথা থেকেই AI স্বয়ংক্রিয়ভাবে আমল ও দাওয়াহ তালিকা সাজিয়ে দেবে।
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/12 border border-rose-400/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'record' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl glass-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium text-[#EDF4F0]">১. বাংলায় আজকের আমল ও দাওয়াহ বলুন</h4>
                  <p className="text-xs text-[#8EA39A] mt-0.5">
                    যেমন: “আজ ফজর জামাতে পড়েছি, কুরআন তিলাওয়াত করেছি এবং এক ভাইকে ইলমি মুহাজারায় দাওয়াত দিয়েছি।”
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isRecording ? (
                    <>
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-[#C6D5CE] cursor-pointer min-h-[40px]">
                        <Upload className="w-3.5 h-3.5" />
                        অডিও ফাইল
                        <input type="file" accept="audio/*" onChange={handleAudioFileUpload} className="hidden" />
                      </label>
                      <Button type="button" onClick={startRecording} className="gap-2 min-h-[40px]">
                        <Mic className="w-4 h-4" />
                        রেকর্ডিং শুরু
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={stopMediaStream} variant="destructive" className="gap-2 min-h-[40px]">
                      <Square className="w-4 h-4" />
                      থামান ({formatTimer(recordingSeconds)})
                    </Button>
                  )}
                </div>
              </div>

              {isRecording && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-rose-300 font-mono tabular-nums">
                    রেকর্ডিং চলছে: {formatTimer(recordingSeconds)}
                  </div>
                  <div className="flex items-end gap-1 h-6" aria-hidden="true">
                    {[0, 0.14, 0.28, 0.1, 0.22, 0.05].map((delay, i) => (
                      <span
                        key={i}
                        className="w-1 h-5 rounded-full bg-rose-400 mic-wave-bar"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {audioUrl && !isRecording && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 flex-1">
                    <Volume2 className="w-4 h-4 text-[#34D399] shrink-0" />
                    <audio controls src={audioUrl} className="h-9 w-full" />
                  </div>
                  <Button
                    type="button"
                    onClick={() => audioBase64 && transcribePayload(audioBase64, audioMimeType)}
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
                        <Sparkles className="w-4 h-4 text-[#34D399]" />
                        আবার টেক্সটে রূপান্তর
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#8EA39A]">
                  ২. বাংলা লেখা (বিশ্লেষণের আগে সম্পাদনা করতে পারবেন)
                </label>
                {transcribing && (
                  <span className="text-[11px] text-[#34D399] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    বাংলায় রূপান্তর হচ্ছে...
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="ভয়েসে বললে এখানে লেখা আসবে, অথবা আপনি নিজেও বাংলায় লিখতে পারেন..."
                className="w-full rounded-xl forest-input p-3 text-sm text-[#EDF4F0] placeholder:text-[#5D726A]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                বাতিল
              </Button>
              <Button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || transcribing || !transcription.trim()}
                className="gap-2 min-h-[40px]"
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

        {step === 'review' && (
          <div className="space-y-4">
            {summary && (
              <div className="p-3.5 rounded-xl bg-[#34D399]/12 border border-[#34D399]/30 text-xs text-[#B6F5D8]">
                {summary}
              </div>
            )}

            <div className="p-4 rounded-2xl glass-2 space-y-2.5">
              <h4 className="text-sm font-semibold text-[#EDF4F0]">শনাক্তকৃত দৈনিক আমল ও দাওয়াহ আইটেম</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {trackerItems.map((item) => {
                  const checked = selectedKeys.has(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleKey(item.key)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs border transition-all ${
                        checked
                          ? 'bg-[#34D399]/15 border-[#34D399]/40 text-[#EDF4F0]'
                          : 'bg-white/[0.03] border-white/10 text-[#8EA39A]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          checked ? 'bg-[#34D399] text-[#05140E]' : 'border border-white/25'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      <span>{item.banglaLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {dawahLogs.length > 0 && (
              <div className="p-4 rounded-2xl glass-2 space-y-2">
                <h4 className="text-sm font-semibold text-[#EDF4F0]">শনাক্তকৃত দাওয়াহ কার্যক্রম ({dawahLogs.length})</h4>
                <div className="space-y-2">
                  {dawahLogs.map((log, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                      <input
                        type="text"
                        value={log.description}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDawahLogs((prev) => prev.map((x, idx) => (idx === i ? { ...x, description: v } : x)));
                        }}
                        className="w-full rounded-lg forest-input px-2.5 py-1.5 text-xs text-[#EDF4F0]"
                      />
                      {log.targetName && (
                        <div className="text-[11px] text-[#34D399]">ব্যক্তি: {log.targetName}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl glass-2 space-y-2">
              <label className="flex items-center gap-2 text-xs text-[#EDF4F0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNote}
                  onChange={(e) => setIncludeNote(e.target.checked)}
                  className="accent-[#34D399]"
                />
                <span>আজকের ব্যক্তিগত নোটে নিচের অংশটুকু যুক্ত করুন</span>
              </label>
              {includeNote && (
                <textarea
                  rows={2}
                  value={extractedNote}
                  onChange={(e) => setExtractedNote(e.target.value)}
                  className="w-full rounded-xl forest-input p-2.5 text-xs text-[#EDF4F0]"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep('record')} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                পিছনে যান
              </Button>
              <Button type="button" onClick={handleApply} disabled={applying} className="gap-2 min-h-[40px]">
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    অনুমোদন ও সেভ করুন
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#34D399]/20 border border-[#34D399]/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#EDF4F0]">জাযাকাল্লাহু খাইরান! আপডেট সম্পন্ন হয়েছে</h3>
              <p className="text-xs text-[#8EA39A] mt-1">
                আপনার আমল তালিকা ও দাওয়াহ কার্যক্রম সংরক্ষিত হয়েছে।
              </p>
            </div>
            <Button type="button" onClick={() => onOpenChange(false)}>
              বন্ধ করুন
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
