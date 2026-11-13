import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  Input,
} from '../components/ui';
import {
  Contact,
  STAGES,
  FollowUp,
  Observation,
  MemberAiInsights,
  CustomCategory,
  AiVoiceEntry,
} from '../types';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import VoiceDawahModal from '../components/VoiceDawahModal';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Phone,
  MapPin,
  Activity,
  Trash2,
  Mic,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Compass,
  Clock,
  Check,
  Plus,
  RefreshCw,
  Loader2,
  History,
  UserCheck,
} from 'lucide-react';

export default function ContactProfile() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const { isAdmin } = useAuth();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile form states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editArea, setEditArea] = useState('');

  // Related data states
  const [salahLogs, setSalahLogs] = useState<any[]>([]);
  const [followUpsList, setFollowUpsList] = useState<FollowUp[]>([]);
  const [observationsList, setObservationsList] = useState<Observation[]>([]);
  const [insights, setInsights] = useState<MemberAiInsights | null>(null);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [voiceHistory, setVoiceHistory] = useState<AiVoiceEntry[]>([]);

  // UI / Modals
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [reviewPendingEntry, setReviewPendingEntry] = useState<AiVoiceEntry | null>(null);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Add Follow-up & Reminder state
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [fuTopic, setFuTopic] = useState('');
  const [fuResponse, setFuResponse] = useState('');
  const [fuNextDate, setFuNextDate] = useState('');
  const [fuReminderNote, setFuReminderNote] = useState('');
  const [fuAssignedTo, setFuAssignedTo] = useState('');
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // Salah state
  const today = new Date().toISOString().split('T')[0];
  const [logFajr, setLogFajr] = useState('missed');
  const [logDhuhr, setLogDhuhr] = useState('missed');
  const [logAsr, setLogAsr] = useState('missed');
  const [logMaghrib, setLogMaghrib] = useState('missed');
  const [logIsha, setLogIsha] = useState('missed');

  const fetchContact = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      setContact(data);
      setEditName(data.name);
      setEditPhone(data.phone || '');
      setEditArea(data.area || '');

      // Parallel fetch of secondary profile data
      Promise.all([
        apiFetch(`/api/contacts/${id}/salah`).then((r) => (r.ok ? r.json() : [])),
        apiFetch(`/api/contacts/${id}/follow-ups`).then((r) => (r.ok ? r.json() : [])),
        apiFetch(`/api/contacts/${id}/insights`).then((r) => (r.ok ? r.json() : null)),
        isAdmin ? apiFetch(`/api/contacts/${id}/voice-history`).then((r) => (r.ok ? r.json() : [])) : Promise.resolve([]),
      ])
        .then(([salahData, fuData, insData, vhData]) => {
          setSalahLogs(Array.isArray(salahData) ? salahData : []);
          setFollowUpsList(Array.isArray(fuData) ? fuData : []);
          if (insData) {
            setInsights(insData.insights || null);
            setObservationsList(Array.isArray(insData.observations) ? insData.observations : []);
            setCategories(Array.isArray(insData.categories) ? insData.categories : []);
          }
          setVoiceHistory(Array.isArray(vhData) ? vhData : []);
        })
        .catch(() => {});
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError('Unable to load profile. Please check your database connection or backend deployment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [id, isAdmin]);

  const handleLogSalah = async () => {
    await apiFetch(`/api/contacts/${id}/salah`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        fajr: logFajr,
        dhuhr: logDhuhr,
        asr: logAsr,
        maghrib: logMaghrib,
        isha: logIsha,
      }),
    });
    fetchContact();
  };

  const handleUpdateProfile = async () => {
    if (!contact) return;
    await apiFetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, phone: editPhone, area: editArea }),
    });
    fetchContact();
  };

  const handleRefreshInsights = async () => {
    if (!id) return;
    try {
      setRefreshingInsights(true);
      setInsightsError(null);
      const res = await apiFetch(`/api/contacts/${id}/insights/refresh`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI বিশ্লেষণ তৈরি করতে সমস্যা হয়েছে।');
      setInsights(data.insights || null);
    } catch (err: any) {
      setInsightsError(err.message);
    } finally {
      setRefreshingInsights(false);
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSavingFollowUp(true);
      const res = await apiFetch(`/api/contacts/${id}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          topic: fuTopic,
          response: fuResponse,
          nextActionDate: fuNextDate || null,
          reminderNote: fuReminderNote,
          nextAction: fuReminderNote,
          assignedTo: fuAssignedTo,
        }),
      });
      if (res.ok) {
        setFuTopic('');
        setFuResponse('');
        setFuNextDate('');
        setFuReminderNote('');
        setFuAssignedTo('');
        setFollowUpDialogOpen(false);
        fetchContact();
      }
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleToggleFollowUpComplete = async (fu: FollowUp) => {
    await apiFetch(`/api/follow-ups/${fu.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: !fu.isCompleted }),
    });
    fetchContact();
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    await apiFetch(`/api/follow-ups/${followUpId}`, { method: 'DELETE' });
    fetchContact();
  };

  if (loading) return <div className="p-8 text-center text-white/40">Loading profile...</div>;
  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto mt-12 text-center border border-rose-500/20 rounded-2xl bg-rose-500/5">
        <h3 className="text-lg font-medium text-rose-500 mb-2">Error Loading Profile</h3>
        <p className="text-rose-500/80 text-sm mb-6">{error}</p>
        <Link to="/contacts" className="text-emerald-500 hover:text-emerald-400 text-sm underline underline-offset-4">
          Return to Contacts
        </Link>
      </div>
    );
  }
  if (!contact || contact.id === undefined) {
    return <div className="p-8 text-center text-white/40">Brother not found.</div>;
  }

  const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const resolvedMemberCategories = (contact.categoryTags || []).map((tag) => {
    const matched = catMap.get(tag.toLowerCase());
    return matched ? matched.banglaName || matched.name : tag;
  });

  const past7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr: d.toISOString().split('T')[0],
    };
  });

  const overdueCount = followUpsList.filter(
    (f) => !f.isCompleted && f.nextActionDate && f.nextActionDate < today
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Member Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" asChild className="-ml-2 shrink-0">
            <Link to="/contacts">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-serif italic tracking-tight text-[#E5E5E7] truncate">
              {contact.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-white/50">
              {contact.phone && (
                <span className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Phone className="w-3.5 h-3.5" /> {contact.phone}
                </span>
              )}
              {contact.area && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {contact.area}
                </span>
              )}
              <span className="flex items-center gap-1.5 tabular-nums">
                <Calendar className="w-3.5 h-3.5" /> যুক্ত: {new Date(contact.firstContactDate).toLocaleDateString()}
              </span>
            </div>
            {resolvedMemberCategories.length > 0 && (
              <div className="text-xs text-emerald-400/90 mt-2">
                সক্রিয় ইনডিকেটর: {resolvedMemberCategories.join(' · ')}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <Button
              type="button"
              onClick={() => {
                setReviewPendingEntry(null);
                setVoiceModalOpen(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Mic className="w-4 h-4" />
              ভয়েস নোট (Voice Input)
            </Button>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile Details</DialogTitle>
                <DialogDescription>Update the basic contact information for this member.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Full Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Phone Number</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Area/Location</label>
                  <Input value={editArea} onChange={(e) => setEditArea(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleUpdateProfile}>Save Changes</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Brother</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this brother? This cannot be undone and will remove all their associated records.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 mt-4">
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                    onClick={async () => {
                      await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' });
                      window.location.href = '/contacts';
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview & Follow-ups</TabsTrigger>
          <TabsTrigger value="ai-guidance">AI Gap & Guidance</TabsTrigger>
          <TabsTrigger value="journey">Growth Journey</TabsTrigger>
          <TabsTrigger value="salah">Salah Tracking</TabsTrigger>
          {isAdmin && <TabsTrigger value="audit">Voice Audit Log</TabsTrigger>}
        </TabsList>

        {/* OVERVIEW & FOLLOW-UPS TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-[11px] text-white/45 mb-1">Overall Growth Score</div>
                    <div className="text-3xl font-serif italic text-emerald-500 tabular-nums">
                      {contact.growthScore}%
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/50">Weekly Change</span>
                    <Badge
                      variant={
                        contact.weeklyChange > 0
                          ? 'success'
                          : contact.weeklyChange < 0
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {contact.weeklyChange > 0 ? '+' : ''}
                      {contact.weeklyChange}%
                    </Badge>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-white/50">Current Priority</span>
                    <Badge
                      variant={
                        contact.priorityLevel === 'growing'
                          ? 'success'
                          : contact.priorityLevel === 'stable'
                          ? 'secondary'
                          : contact.priorityLevel === 'needs_attention'
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {contact.priorityLevel.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="text-xs text-white/50 mb-1">Current Stage</div>
                    <div className="text-sm font-medium text-[#E5E5E7]">
                      {contact.currentStage}/16 · {STAGES[(contact.currentStage || 1) - 1] || ''}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                  <CardTitle className="text-xs flex items-center gap-2 text-emerald-400 font-semibold">
                    <Activity className="w-4 h-4" /> দ্রুত দাওয়াহ গাইডেন্স
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-white/75 text-xs sm:text-sm leading-relaxed">
                    {insights?.dawahGuidance?.practicalNextAction ||
                      (contact.priorityLevel === 'high_priority'
                        ? 'হিকমাহ ও আন্তরিকতার সাথে ব্যক্তিগত খোঁজখবর নিন; কোনো ধরনের চাপ প্রয়োগ করবেন না।'
                        : contact.priorityLevel === 'needs_attention'
                        ? 'আন্তরিক যোগাযোগ বৃদ্ধি করুন এবং চা/কফি বা মসজিদে সাক্ষাতের দাওয়াত দিন।'
                        : contact.priorityLevel === 'stable'
                        ? 'নিয়মিত সম্পর্ক বজায় রাখুন এবং পরবর্তী সহায়ক ধাপ শনাক্ত করুন।'
                        : 'বর্তমান ধারাবাহিকতা উৎসাহিত করুন এবং অন্য ভাইদের সাথে যুক্ত হতে উদ্বুদ্ধ করুন।')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchParams({ tab: 'ai-guidance' })}
                    className="w-full text-xs"
                  >
                    বিস্তারিত AI গ্যাপ ও গাইডেন্স দেখুন
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
              {/* Real Observations & Categories Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">
                    পর্যবেক্ষিত ইনডিকেটর ও সাম্প্রতিক নোট (Observations)
                  </CardTitle>
                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setVoiceModalOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      ভয়েস নোট যোগ করুন
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {resolvedMemberCategories.length > 0 ? (
                    <div className="p-3.5 rounded-lg bg-[#0A0A0B] border border-white/10">
                      <div className="text-[11px] text-white/45 mb-1.5">যুক্ত ক্যাটাগরি সমূহ</div>
                      <div className="text-sm text-emerald-400 leading-relaxed">
                        {resolvedMemberCategories.join(' · ')}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-[#0A0A0B] border border-white/10 text-xs text-white/50">
                      এখনো কোনো ক্যাটাগরি যুক্ত করা হয়নি। ভয়েস নোট বা ক্যাটাগরি পেজ থেকে যুক্ত করতে পারেন।
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs text-white/50 font-medium">
                      সাম্প্রতিক পর্যবেক্ষণ ({observationsList.length})
                    </div>
                    {observationsList.length === 0 ? (
                      <p className="text-xs text-white/40 py-2">
                        এখনো কোনো লিখিত বা ভয়েস পর্যবেক্ষণ রেকর্ড করা হয়নি।
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {observationsList.slice(0, 8).map((obs) => (
                          <div
                            key={obs.id}
                            className="p-3 rounded-lg bg-[#0A0A0B] border border-white/5 flex items-start justify-between gap-3"
                          >
                            <p className="text-xs text-white/80">{obs.observation}</p>
                            <span className="text-[11px] font-mono text-white/40 shrink-0">{obs.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Real Reminder & Follow-up System */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold flex items-center gap-2">
                      <span>Follow-ups & Reminders</span>
                      {overdueCount > 0 && (
                        <span className="text-[11px] font-normal text-rose-400 normal-case">
                          · {overdueCount}টি মেয়াদোত্তীর্ণ
                        </span>
                      )}
                    </CardTitle>
                  </div>
                  {isAdmin && (
                    <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          <Plus className="w-3.5 h-3.5" />
                          রিমাইন্ডার / ফলো-আপ
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>নতুন ফলো-আপ ও রিমাইন্ডার যোগ করুন</DialogTitle>
                          <DialogDescription>
                            পরবর্তী যোগাযোগের তারিখ, রিমাইন্ডার নোট এবং দায়িত্বপ্রাপ্ত ব্যক্তি নির্ধারণ করুন।
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateFollowUp} className="space-y-3 py-2">
                          <div className="space-y-1">
                            <label className="text-xs text-white/60">আলোচনার বিষয় (Topic)</label>
                            <Input
                              value={fuTopic}
                              onChange={(e) => setFuTopic(e.target.value)}
                              placeholder="যেমন: ফজরের জামাত ও ইলমি মুহাজারা"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-white/60">সদস্যের সাড়া / নোট</label>
                            <Input
                              value={fuResponse}
                              onChange={(e) => setFuResponse(e.target.value)}
                              placeholder="যেমন: ইতিবাচক সাড়া দিয়েছেন, শুক্রবার আসার ইচ্ছা"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-white/60">পরবর্তী যোগাযোগের তারিখ</label>
                              <Input
                                type="date"
                                value={fuNextDate}
                                onChange={(e) => setFuNextDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-white/60">দায়িত্বপ্রাপ্ত ব্যক্তি</label>
                              <Input
                                value={fuAssignedTo}
                                onChange={(e) => setFuAssignedTo(e.target.value)}
                                placeholder="যেমন: নাঈম ভাই"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-white/60">রিমাইন্ডার নোট (Reminder Note)</label>
                            <Input
                              value={fuReminderNote}
                              onChange={(e) => setFuReminderNote(e.target.value)}
                              placeholder="যেমন: বৃহস্পতিবার মাগরিবের পর ফোন করে মনে করিয়ে দেবেন"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setFollowUpDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={savingFollowUp}>
                              {savingFollowUp ? 'Saving...' : 'Save Reminder'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {followUpsList.length === 0 ? (
                    <div className="text-xs text-white/45 py-4 text-center">
                      এখনো কোনো ফলো-আপ বা রিমাইন্ডার যুক্ত করা হয়নি।
                    </div>
                  ) : (
                    followUpsList.map((fu) => {
                      const isOverdue = !fu.isCompleted && fu.nextActionDate && fu.nextActionDate < today;
                      return (
                        <div
                          key={fu.id}
                          className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                            fu.isCompleted
                              ? 'bg-[#0A0A0B]/50 border-white/5 opacity-60'
                              : isOverdue
                              ? 'bg-rose-500/5 border-rose-500/30'
                              : 'bg-[#0A0A0B] border-white/10'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-semibold text-[#E5E5E7]">
                                {fu.topic || 'ফলো-আপ নোট'}
                              </span>
                              <span className="text-white/40 font-mono">· {fu.date}</span>
                              {isOverdue && (
                                <span className="text-rose-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> মেয়াদোত্তীর্ণ ({fu.nextActionDate})
                                </span>
                              )}
                              {!isOverdue && fu.nextActionDate && !fu.isCompleted && (
                                <span className="text-emerald-400 font-mono">
                                  পরবর্তী: {fu.nextActionDate}
                                </span>
                              )}
                              {fu.isCompleted && (
                                <span className="text-emerald-400">সম্পন্ন</span>
                              )}
                            </div>
                            {fu.response && <p className="text-xs text-white/70">{fu.response}</p>}
                            {(fu.reminderNote || fu.nextAction) && (
                              <p className="text-xs text-amber-300/90">
                                রিমাইন্ডার: {fu.reminderNote || fu.nextAction}
                              </p>
                            )}
                            {fu.assignedTo && (
                              <div className="text-[11px] text-white/45 flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> দায়িত্বপ্রাপ্ত: {fu.assignedTo}
                              </div>
                            )}
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleFollowUpComplete(fu)}
                                className="h-8 px-2.5 text-xs gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {fu.isCompleted ? 'পুনরায় খুলুন' : 'সম্পন্ন'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteFollowUp(fu.id)}
                                className="h-8 w-8 p-0 text-rose-400/70 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* AI GAP ANALYSIS & PERSONALIZED DAWAH GUIDANCE TAB */}
        <TabsContent value="ai-guidance" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#E5E5E7] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>AI গ্যাপ অ্যানালাইসিস ও ব্যক্তিগত দাওয়াহ গাইডেন্স</span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                পর্যবেক্ষিত তথ্যের ভিত্তিতে সম্মানজনক ও ধাপে ধাপে অগ্রগতির পরামর্শ (তথ্য অনুপস্থিত থাকা মানে আমল না করা নয়)।
              </p>
            </div>
            {isAdmin && (
              <Button
                type="button"
                onClick={handleRefreshInsights}
                disabled={refreshingInsights}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
              >
                {refreshingInsights ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    বিশ্লেষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {insights ? 'AI বিশ্লেষণ আপডেট করুন' : 'AI বিশ্লেষণ তৈরি করুন'}
                  </>
                )}
              </Button>
            )}
          </div>

          {insightsError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {insightsError}
            </div>
          )}

          {!insights ? (
            <Card>
              <CardContent className="py-10 text-center space-y-3">
                <p className="text-sm text-white/60">
                  এই সদস্যের জন্য এখনো AI গ্যাপ অ্যানালাইসিস ও দাওয়াহ গাইডেন্স তৈরি করা হয়নি।
                </p>
                {isAdmin && (
                  <p className="text-xs text-white/45">
                    উপরের “AI বিশ্লেষণ তৈরি করুন” অথবা “ভয়েস নোট” বাটনে ক্লিক করে শুরু করুন।
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gap Analysis Card */}
              <Card>
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>AI গ্যাপ অ্যানালাইসিস (Gap Analysis)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> অর্জিত ও পর্যবেক্ষিত ইনডিকেটর
                    </h4>
                    <ul className="space-y-1.5 text-xs text-white/80">
                      {(insights.gapAnalysis?.achieved || []).map((item, i) => (
                        <li key={i} className="p-2 rounded bg-[#0A0A0B] border border-white/5">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                      <AlertCircle className="w-3.5 h-3.5" /> যেসব ক্ষেত্রে আরো মনোযোগ দেওয়া যায়
                    </h4>
                    <ul className="space-y-1.5 text-xs text-white/80">
                      {(insights.gapAnalysis?.needsAttention || []).map((item, i) => (
                        <li key={i} className="p-2 rounded bg-[#0A0A0B] border border-white/5">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-2">
                      <HelpCircle className="w-3.5 h-3.5" /> যেসব তথ্য এখনো অজানা (অনুমান নয়)
                    </h4>
                    <ul className="space-y-1.5 text-xs text-white/65">
                      {(insights.gapAnalysis?.unknownInfo || []).map((item, i) => (
                        <li key={i} className="p-2 rounded bg-[#0A0A0B] border border-white/5">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-teal-400 mb-2">প্রস্তাবিত পরবর্তী পদক্ষেপ</h4>
                    <ul className="space-y-1.5 text-xs text-white/80">
                      {(insights.gapAnalysis?.nextSteps || []).map((item, i) => (
                        <li key={i} className="p-2 rounded bg-[#0A0A0B] border border-white/5">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Personalized Dawah Guidance Card */}
              <Card>
                <CardHeader className="border-b border-white/5 pb-4">
                  <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>ব্যক্তিগত দাওয়াহ গাইডেন্স (Personalized Guidance)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="p-3 rounded-lg bg-[#0A0A0B] border border-white/10">
                    <div className="text-white/45 mb-1">দাওয়াহর উপযুক্ত পরবর্তী ধাপ</div>
                    <div className="text-sm font-medium text-emerald-400">
                      {insights.dawahGuidance?.nextStage}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0A0B] border border-white/10">
                    <div className="text-white/45 mb-1">আলোচনার উপযুক্ত বিষয়</div>
                    <div className="text-white/85 leading-relaxed">
                      {insights.dawahGuidance?.topicToDiscuss}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0A0B] border border-white/10">
                    <div className="text-white/45 mb-1">সম্মানজনক পরামর্শ ও দাওয়াত</div>
                    <div className="text-white/85 leading-relaxed">
                      {insights.dawahGuidance?.adviceOrInvitation}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0A0B] border border-white/10">
                    <div className="text-white/45 mb-1">পরবর্তীতে উৎসাহিত করার মতো কার্যক্রম</div>
                    <div className="text-white/85 leading-relaxed">
                      {insights.dawahGuidance?.activityToEncourage}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0A0B] border border-white/10 space-y-1.5">
                    <div className="text-white/45">ফলো-আপে জিজ্ঞাসার জন্য সৌজন্যমূলক প্রশ্ন</div>
                    {(insights.dawahGuidance?.followUpQuestions || []).map((q, i) => (
                      <div key={i} className="text-white/80">
                        • {q}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                    <div className="text-emerald-400 font-semibold mb-1">বাস্তবসম্মত পরবর্তী করণীয়</div>
                    <div className="text-[#E5E5E7] leading-relaxed">
                      {insights.dawahGuidance?.practicalNextAction}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* GROWTH JOURNEY TAB */}
        <TabsContent value="journey" className="space-y-6">
          <Card className="overflow-hidden border-emerald-500/20 bg-[#16161A] shadow-xl relative">
            <CardContent className="p-6 sm:p-8 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-xs font-bold text-emerald-500/80 uppercase tracking-widest">
                    The 16 Stages of Growth
                  </h4>
                  <p className="text-sm text-white/40 mt-1">Track spiritual and organizational progression.</p>
                </div>
                {isAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-xs uppercase tracking-widest">
                        Update Stage
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Growth Stage</DialogTitle>
                        <DialogDescription>Select the current stage of {contact.name}.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <select
                          className="w-full h-10 rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={contact.currentStage}
                          onChange={async (e) => {
                            const newStage = Number(e.target.value);
                            await apiFetch(`/api/contacts/${id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ currentStage: newStage }),
                            });
                            fetchContact();
                          }}
                        >
                          {STAGES.map((s, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}. {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <DialogClose asChild>
                          <Button>Close</Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-px bg-white/5" />
                <div className="space-y-6">
                  {STAGES.map((stageName, idx) => {
                    const step = idx + 1;
                    const isCompleted = step < contact.currentStage;
                    const isCurrent = step === contact.currentStage;

                    return (
                      <div key={idx} className={`relative flex items-center gap-6 ${isCompleted ? 'opacity-50' : ''}`}>
                        <div
                          className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-lg font-serif italic border-2 transition-colors z-10 tabular-nums ${
                            isCompleted
                              ? 'bg-[#0A0A0B] border-emerald-500/50 text-emerald-500'
                              : isCurrent
                              ? 'bg-[#0A0A0B] border-emerald-400 text-emerald-400 ring-4 ring-emerald-500/10'
                              : 'bg-[#0A0A0B] border-white/10 text-white/20'
                          }`}
                        >
                          {step}
                        </div>
                        <div
                          className={`flex-1 p-4 rounded-xl border transition-colors ${
                            isCurrent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5'
                          }`}
                        >
                          <h5 className={`font-semibold ${isCurrent ? 'text-emerald-400' : 'text-[#E5E5E7]'}`}>
                            {stageName}
                          </h5>
                          {isCurrent && (
                            <p className="text-xs text-white/60 mt-2">
                              বর্তমানে এই ধাপটি সুদৃঢ় করার ওপর গুরুত্ব দেওয়া হচ্ছে।
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALAH TRACKING TAB */}
        <TabsContent value="salah" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">
                  Weekly Salah Log
                </CardTitle>
                <p className="text-white/40 text-xs mt-1">Track 5 daily prayers (Jama'ah, Alone, Missed)</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-xs uppercase tracking-widest">
                    Log Today
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Salah for Today</DialogTitle>
                    <DialogDescription>Record the status for all 5 daily prayers.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {[
                      ['Fajr', logFajr, setLogFajr],
                      ['Dhuhr', logDhuhr, setLogDhuhr],
                      ['Asr', logAsr, setLogAsr],
                      ['Maghrib', logMaghrib, setLogMaghrib],
                      ['Isha', logIsha, setLogIsha],
                    ].map(([name, val, setVal]: any) => (
                      <div key={name} className="flex items-center justify-between">
                        <label className="text-sm text-[#E5E5E7] font-medium w-24">{name}</label>
                        <select
                          className="flex-1 h-10 rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        >
                          <option value="jamaah">Jama'ah (Mosque)</option>
                          <option value="alone">Prayed Alone</option>
                          <option value="missed">Missed</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button onClick={handleLogSalah}>Save Log</Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-white/[0.03] text-white/40 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-medium w-32">Waqt</th>
                      {past7DaysData.map((day) => (
                        <th key={day.dateStr} className="p-4 font-medium text-center">
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((waqt) => (
                      <tr key={waqt} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-medium text-white/60">{waqt}</td>
                        {past7DaysData.map((day) => {
                          const log = salahLogs.find((l) => l.date === day.dateStr);
                          const waqtKey = waqt.toLowerCase();
                          const status = log ? log[waqtKey] : null;
                          return (
                            <td key={day.dateStr} className="p-4 text-center">
                              <div className="flex justify-center">
                                {status ? (
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      status === 'jamaah' || status === true
                                        ? 'bg-emerald-500'
                                        : status === 'alone'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    title={String(status)}
                                  />
                                ) : (
                                  <div className="w-3 h-3 rounded-full bg-white/5" title="No Data" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-6 mt-6 p-4 bg-white/5 rounded-lg text-xs text-white/60 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Jama'ah (Mosque)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" /> Prayed Alone
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" /> Missed
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VOICE AUDIT HISTORY TAB (ADMIN ONLY) */}
        {isAdmin && (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-sm font-semibold text-[#E5E5E7] flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>ভয়েস ইনপুট ও অনুমোদন অডিট ইতিহাস (Audit History)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {voiceHistory.length === 0 ? (
                  <p className="text-xs text-white/45 py-6 text-center">
                    এই সদস্যের জন্য এখনো কোনো ভয়েস নোট রেকর্ড করা হয়নি।
                  </p>
                ) : (
                  voiceHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-lg bg-[#0A0A0B] border border-white/10 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span
                          className={`font-semibold ${
                            entry.status === 'approved'
                              ? 'text-emerald-400'
                              : entry.status === 'pending'
                              ? 'text-amber-400'
                              : 'text-white/45'
                          }`}
                        >
                          {entry.status === 'approved'
                            ? 'অনুমোদিত (Approved)'
                            : entry.status === 'pending'
                            ? 'অপেক্ষমাণ (Pending Review)'
                            : 'বাতিল (Cancelled)'}
                        </span>
                        <span className="text-white/45 font-mono">
                          অ্যাডমিন: {entry.adminUsername || 'admin'} ·{' '}
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-white/80">“{entry.editedTranscription}”</p>
                      {entry.status === 'approved' &&
                        Array.isArray((entry.approvedChanges as any)?.addedCategories) &&
                        (entry.approvedChanges as any).addedCategories.length > 0 && (
                          <div className="text-[11px] text-emerald-400/90">
                            অনুমোদিত ক্যাটাগরি: {(entry.approvedChanges as any).addedCategories.join(' · ')}
                          </div>
                        )}
                      {entry.status === 'pending' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setReviewPendingEntry(entry);
                            setVoiceModalOpen(true);
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
                        >
                          রিভিউ ও অনুমোদন করুন
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Voice Dawah Modal */}
      {isAdmin && (
        <VoiceDawahModal
          open={voiceModalOpen}
          onOpenChange={setVoiceModalOpen}
          member={{
            id: contact.id,
            name: contact.name,
            currentStage: contact.currentStage,
            priorityLevel: contact.priorityLevel,
            categoryTags: contact.categoryTags,
          }}
          initialPendingEntry={reviewPendingEntry}
          allCategories={categories}
          onApproved={() => {
            setReviewPendingEntry(null);
            fetchContact();
          }}
        />
      )}
    </div>
  );
}
