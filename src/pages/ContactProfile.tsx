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
import { useCareRadar } from '../contexts/CareRadarContext';
import VoiceDawahModal from '../components/VoiceDawahModal';
import CareRadarBell from '../components/CareRadarBell';
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
  Shield,
  Eye,
  Lock,
} from 'lucide-react';

export default function ContactProfile() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin, isCoordinator, hasPermission } = useAuth();
  const { refreshRadar } = useCareRadar();
  const [contact, setContact] = useState<Contact | null>(null);
  const canVoice =
    isAdmin ||
    (isCoordinator && hasPermission('useVoiceUpdate')) ||
    (!!user && !!contact && (contact.id === user.contactId || contact.createdByAccountId === user.id));
  const rawTab = searchParams.get('tab') || 'overview';
  const validTabs = [
    'overview',
    'ai-guidance',
    'journey',
    'salah',
    ...(isCoordinator ? ['self-report', 'admin-obs', 'ai-analysis'] : []),
    ...(isCoordinator || canVoice ? ['audit'] : []),
  ];
  const activeTab = validTabs.includes(rawTab) ? rawTab : 'overview';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile form states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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

  // Self-report & Admin Observation monitoring view
  const [monitoringView, setMonitoringView] = useState<{
    selfReport: any;
    adminObservations: Observation[];
    trackerItems: any[];
  } | null>(null);
  const [newObsText, setNewObsText] = useState('');
  const [newObsCategory, setNewObsCategory] = useState('Admin Observation');
  const [savingObs, setSavingObs] = useState(false);

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
        (isCoordinator || user?.role === 'member')
          ? apiFetch(`/api/contacts/${id}/voice-history`).then((r) => (r.ok ? r.json() : []))
          : Promise.resolve([]),
        isCoordinator ? apiFetch(`/api/contacts/${id}/monitoring-view`).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null),
      ])
        .then(([salahData, fuData, insData, vhData, monData]) => {
          setSalahLogs(Array.isArray(salahData) ? salahData : []);
          setFollowUpsList(Array.isArray(fuData) ? fuData : []);
          if (insData) {
            setInsights(insData.insights || null);
            setObservationsList(Array.isArray(insData.observations) ? insData.observations : []);
            setCategories(Array.isArray(insData.categories) ? insData.categories : []);
          }
          setVoiceHistory(Array.isArray(vhData) ? vhData : []);
          setMonitoringView(monData || null);
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
  }, [id, isCoordinator]);

  useEffect(() => {
    if (rawTab === 'edit') {
      setEditDialogOpen(true);
    }
  }, [rawTab]);

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

  const handleAddManualObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newObsText.trim()) return;
    try {
      setSavingObs(true);
      const res = await apiFetch(`/api/contacts/${id}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observation: newObsText.trim(),
          category: newObsCategory.trim() || 'Admin Observation',
          date: today,
        }),
      });
      if (res.ok) {
        setNewObsText('');
        fetchContact();
        refreshRadar();
      }
    } finally {
      setSavingObs(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-[#8EA39A]">Loading profile...</div>;
  if (error) {
    return (
      <div className="p-8 max-w-md mx-auto mt-12 text-center border border-rose-400/35 rounded-[20px] glass-hot">
        <h3 className="text-lg font-medium text-rose-300 mb-2">Error Loading Profile</h3>
        <p className="text-rose-200/80 text-sm mb-6">{error}</p>
        <Link to="/contacts" className="text-[#34D399] hover:text-[#B6F5D8] text-sm underline underline-offset-4">
          Return to Contacts
        </Link>
      </div>
    );
  }
  if (!contact || contact.id === undefined) {
    return <div className="p-8 text-center text-[#8EA39A]">Brother not found.</div>;
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
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif italic tracking-tight text-[#EDF4F0] truncate">
                {contact.name}
              </h1>
              <CareRadarBell contactId={contact.id} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[#8EA39A]">
              {contact.phone && (
                <span className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-[#34D399]" /> {contact.phone}
                </span>
              )}
              {contact.area && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#34D399]" /> {contact.area}
                </span>
              )}
              <span className="flex items-center gap-1.5 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-[#34D399]" /> যুক্ত: {new Date(contact.firstContactDate).toLocaleDateString()}
              </span>
            </div>
            {resolvedMemberCategories.length > 0 && (
              <div className="text-xs text-[#B6F5D8] mt-2">
                সক্রিয় ইনডিকেটর: {resolvedMemberCategories.join(' · ')}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canVoice && (
            <Button
              type="button"
              onClick={() => {
                setReviewPendingEntry(null);
                setVoiceModalOpen(true);
              }}
              className="gap-2"
            >
              <Mic className="w-4 h-4" />
              ভয়েস নোট (Voice Input)
            </Button>
          )}

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
                  <label className="text-xs text-[#8EA39A]">Full Name</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#8EA39A]">Phone Number</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#8EA39A]">Area/Location</label>
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

          {(isAdmin || (!!user && contact.createdByAccountId === user.id && contact.id !== user.contactId)) && (
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
                      const res = await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' });
                      if (res.ok) {
                        window.location.href = '/contacts';
                      }
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
          {isCoordinator && <TabsTrigger value="self-report">Self Report</TabsTrigger>}
          {isCoordinator && <TabsTrigger value="admin-obs">Admin Observation</TabsTrigger>}
          {isCoordinator && <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>}
          <TabsTrigger value="ai-guidance">AI Gap & Guidance</TabsTrigger>
          <TabsTrigger value="journey">Growth Journey</TabsTrigger>
          <TabsTrigger value="salah">Salah Tracking</TabsTrigger>
          {(isCoordinator || canVoice) && <TabsTrigger value="audit">Voice Audit Log</TabsTrigger>}
        </TabsList>

        {/* OVERVIEW & FOLLOW-UPS TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-widest text-[#8EA39A] font-semibold">
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-[11px] text-[#8EA39A] mb-1">Overall Growth Score</div>
                    <div className="text-3xl font-serif italic text-[#34D399] tabular-nums">
                      {contact.growthScore}%
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs text-[#8EA39A]">Weekly Change</span>
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

                  <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs text-[#8EA39A]">Current Priority</span>
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

                  <div className="pt-4 border-t border-white/[0.08]">
                    <div className="text-xs text-[#8EA39A] mb-1">Current Stage</div>
                    <div className="text-sm font-medium text-[#EDF4F0]">
                      {contact.currentStage}/16 · {STAGES[(contact.currentStage || 1) - 1] || ''}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-white/[0.025] border-b border-white/[0.08] pb-4">
                  <CardTitle className="text-xs flex items-center gap-2 text-[#34D399] font-semibold">
                    <Activity className="w-4 h-4" /> দ্রুত দাওয়াহ গাইডেন্স
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-[#EDF4F0]/80 text-xs sm:text-sm leading-relaxed">
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
                  <CardTitle className="text-xs uppercase tracking-widest text-[#8EA39A] font-semibold">
                    পর্যবেক্ষিত ইনডিকেটর ও সাম্প্রতিক নোট (Observations)
                  </CardTitle>
                  {canVoice && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setVoiceModalOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Mic className="w-3.5 h-3.5 text-[#34D399]" />
                      ভয়েস নোট যোগ করুন
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {resolvedMemberCategories.length > 0 ? (
                    <div className="p-4 rounded-2xl glass-2">
                      <div className="text-[11px] text-[#8EA39A] mb-1.5">যুক্ত ক্যাটাগরি সমূহ</div>
                      <div className="text-sm text-[#B6F5D8] leading-relaxed">
                        {resolvedMemberCategories.join(' · ')}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl glass-2 text-xs text-[#8EA39A]">
                      এখনো কোনো ক্যাটাগরি যুক্ত করা হয়নি। ভয়েস নোট বা ক্যাটাগরি পেজ থেকে যুক্ত করতে পারেন।
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs text-[#8EA39A] font-medium">
                      সাম্প্রতিক পর্যবেক্ষণ ({observationsList.length})
                    </div>
                    {observationsList.length === 0 ? (
                      <p className="text-xs text-[#5D726A] py-2">
                        এখনো কোনো লিখিত বা ভয়েস পর্যবেক্ষণ রেকর্ড করা হয়নি।
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {observationsList.slice(0, 8).map((obs) => (
                          <div
                            key={obs.id}
                            className="p-3.5 rounded-2xl glass-2 flex items-start justify-between gap-3"
                          >
                            <p className="text-xs text-[#EDF4F0]/85">{obs.observation}</p>
                            <span className="text-[11px] font-mono text-[#5D726A] shrink-0 tabular-nums">{obs.date}</span>
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
                    <CardTitle className="text-xs uppercase tracking-widest text-[#8EA39A] font-semibold flex items-center gap-2">
                      <span>Follow-ups & Reminders</span>
                      {overdueCount > 0 && (
                        <span className="text-[11px] font-normal text-rose-300 normal-case">
                          · {overdueCount}টি মেয়াদোত্তীর্ণ
                        </span>
                      )}
                    </CardTitle>
                  </div>
                  {isCoordinator && (
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
                            <label className="text-xs text-[#8EA39A]">আলোচনার বিষয় (Topic)</label>
                            <Input
                              value={fuTopic}
                              onChange={(e) => setFuTopic(e.target.value)}
                              placeholder="যেমন: ফজরের জামাত ও ইলমি মুহাজারা"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#8EA39A]">সদস্যের সাড়া / নোট</label>
                            <Input
                              value={fuResponse}
                              onChange={(e) => setFuResponse(e.target.value)}
                              placeholder="যেমন: ইতিবাচক সাড়া দিয়েছেন, শুক্রবার আসার ইচ্ছা"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-[#8EA39A]">পরবর্তী যোগাযোগের তারিখ</label>
                              <Input
                                type="date"
                                value={fuNextDate}
                                onChange={(e) => setFuNextDate(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-[#8EA39A]">দায়িত্বপ্রাপ্ত ব্যক্তি</label>
                              <Input
                                value={fuAssignedTo}
                                onChange={(e) => setFuAssignedTo(e.target.value)}
                                placeholder="যেমন: নাঈম ভাই"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-[#8EA39A]">রিমাইন্ডার নোট (Reminder Note)</label>
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
                    <div className="text-xs text-[#8EA39A] py-4 text-center">
                      এখনো কোনো ফলো-আপ বা রিমাইন্ডার যুক্ত করা হয়নি।
                    </div>
                  ) : (
                    followUpsList.map((fu) => {
                      const isOverdue = !fu.isCompleted && fu.nextActionDate && fu.nextActionDate < today;
                      return (
                        <div
                          key={fu.id}
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                            fu.isCompleted
                              ? 'glass-2 opacity-60'
                              : isOverdue
                              ? 'glass-hot border-rose-400/35'
                              : 'glass-2'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-semibold text-[#EDF4F0]">
                                {fu.topic || 'ফলো-আপ নোট'}
                              </span>
                              <span className="text-[#5D726A] font-mono tabular-nums">· {fu.date}</span>
                              {isOverdue && (
                                <span className="text-rose-300 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> মেয়াদোত্তীর্ণ ({fu.nextActionDate})
                                </span>
                              )}
                              {!isOverdue && fu.nextActionDate && !fu.isCompleted && (
                                <span className="text-[#34D399] font-mono tabular-nums">
                                  পরবর্তী: {fu.nextActionDate}
                                </span>
                              )}
                              {fu.isCompleted && (
                                <span className="text-[#34D399]">সম্পন্ন</span>
                              )}
                            </div>
                            {fu.response && <p className="text-xs text-[#EDF4F0]/75">{fu.response}</p>}
                            {(fu.reminderNote || fu.nextAction) && (
                              <p className="text-xs text-[#F4A85E]">
                                রিমাইন্ডার: {fu.reminderNote || fu.nextAction}
                              </p>
                            )}
                            {fu.assignedTo && (
                              <div className="text-[11px] text-[#8EA39A] flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> দায়িত্বপ্রাপ্ত: {fu.assignedTo}
                              </div>
                            )}
                          </div>

                          {isCoordinator && (
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
                                className="h-8 w-8 p-0 text-rose-300/75 hover:text-rose-300"
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
              <h3 className="text-lg font-semibold text-[#EDF4F0] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#34D399]" />
                <span>AI গ্যাপ অ্যানালাইসিস ও ব্যক্তিগত দাওয়াহ গাইডেন্স</span>
              </h3>
              <p className="text-xs text-[#8EA39A] mt-0.5">
                পর্যবেক্ষিত তথ্যের ভিত্তিতে সম্মানজনক ও ধাপে ধাপে অগ্রগতির পরামর্শ (তথ্য অনুপস্থিত থাকা মানে আমল না করা নয়)।
              </p>
            </div>
            {(isCoordinator || canVoice) && (
              <Button
                type="button"
                onClick={handleRefreshInsights}
                disabled={refreshingInsights}
                className="gap-2 shrink-0"
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
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/35 text-rose-300 text-xs">
              {insightsError}
            </div>
          )}

          {!insights ? (
            <Card>
              <CardContent className="py-10 text-center space-y-3">
                <p className="text-sm text-[#8EA39A]">
                  এই সদস্যের জন্য এখনো AI গ্যাপ অ্যানালাইসিস ও দাওয়াহ গাইডেন্স তৈরি করা হয়নি।
                </p>
                {isAdmin && (
                  <p className="text-xs text-[#5D726A]">
                    উপরের “AI বিশ্লেষণ তৈরি করুন” অথবা “ভয়েস নোট” বাটনে ক্লিক করে শুরু করুন।
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gap Analysis Card */}
              <Card>
                <CardHeader className="border-b border-white/[0.08] pb-4">
                  <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#34D399]" />
                    <span>AI গ্যাপ অ্যানালাইসিস (Gap Analysis)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-[#34D399] flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> অর্জিত ও পর্যবেক্ষিত ইনডিকেটর
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#EDF4F0]/85">
                      {(insights.gapAnalysis?.achieved || []).map((item, i) => (
                        <li key={i} className="p-2.5 rounded-xl glass-2">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#F4A85E] flex items-center gap-1.5 mb-2">
                      <AlertCircle className="w-3.5 h-3.5" /> যেসব ক্ষেত্রে আরো মনোযোগ দেওয়া যায়
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#EDF4F0]/85">
                      {(insights.gapAnalysis?.needsAttention || []).map((item, i) => (
                        <li key={i} className="p-2.5 rounded-xl glass-2">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#8EA39A] flex items-center gap-1.5 mb-2">
                      <HelpCircle className="w-3.5 h-3.5" /> যেসব তথ্য এখনো অজানা (অনুমান নয়)
                    </h4>
                    <ul className="space-y-1.5 text-xs text-[#8EA39A]">
                      {(insights.gapAnalysis?.unknownInfo || []).map((item, i) => (
                        <li key={i} className="p-2.5 rounded-xl glass-2">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#B6F5D8] mb-2">প্রস্তাবিত পরবর্তী পদক্ষেপ</h4>
                    <ul className="space-y-1.5 text-xs text-[#EDF4F0]/85">
                      {(insights.gapAnalysis?.nextSteps || []).map((item, i) => (
                        <li key={i} className="p-2.5 rounded-xl glass-2">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Personalized Dawah Guidance Card */}
              <Card>
                <CardHeader className="border-b border-white/[0.08] pb-4">
                  <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#34D399]" />
                    <span>ব্যক্তিগত দাওয়াহ গাইডেন্স (Personalized Guidance)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="p-3.5 rounded-2xl glass-2">
                    <div className="text-[#8EA39A] mb-1">দাওয়াহর উপযুক্ত পরবর্তী ধাপ</div>
                    <div className="text-sm font-medium text-[#34D399]">
                      {insights.dawahGuidance?.nextStage}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl glass-2">
                    <div className="text-[#8EA39A] mb-1">আলোচনার উপযুক্ত বিষয়</div>
                    <div className="text-[#EDF4F0]/85 leading-relaxed">
                      {insights.dawahGuidance?.topicToDiscuss}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl glass-2">
                    <div className="text-[#8EA39A] mb-1">সম্মানজনক পরামর্শ ও দাওয়াত</div>
                    <div className="text-[#EDF4F0]/85 leading-relaxed">
                      {insights.dawahGuidance?.adviceOrInvitation}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl glass-2">
                    <div className="text-[#8EA39A] mb-1">পরবর্তীতে উৎসাহিত করার মতো কার্যক্রম</div>
                    <div className="text-[#EDF4F0]/85 leading-relaxed">
                      {insights.dawahGuidance?.activityToEncourage}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl glass-2 space-y-1.5">
                    <div className="text-[#8EA39A]">ফলো-আপে জিজ্ঞাসার জন্য সৌজন্যমূলক প্রশ্ন</div>
                    {(insights.dawahGuidance?.followUpQuestions || []).map((q, i) => (
                      <div key={i} className="text-[#EDF4F0]/85">
                        • {q}
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#34D399]/12 border border-[#34D399]/30">
                    <div className="text-[#34D399] font-semibold mb-1">বাস্তবসম্মত পরবর্তী করণীয়</div>
                    <div className="text-[#EDF4F0] leading-relaxed">
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
          <Card className="overflow-hidden border-[#34D399]/25 relative">
            <CardContent className="p-6 sm:p-8 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-xs font-bold text-[#34D399] uppercase tracking-widest">
                    The 16 Stages of Growth
                  </h4>
                  <p className="text-sm text-[#8EA39A] mt-1">Track spiritual and organizational progression.</p>
                </div>
                {(isAdmin || (!!user && contact.createdByAccountId === user.id)) && (
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
                          className="w-full h-10 rounded-xl forest-input px-3 py-2 text-sm"
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
                            <option key={i} value={i + 1} className="bg-[#0A1210]">
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
                <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />
                <div className="space-y-6">
                  {STAGES.map((stageName, idx) => {
                    const step = idx + 1;
                    const isCompleted = step < contact.currentStage;
                    const isCurrent = step === contact.currentStage;

                    return (
                      <div key={idx} className={`relative flex items-center gap-6 ${isCompleted ? 'opacity-55' : ''}`}>
                        <div
                          className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-lg font-serif italic border-2 transition-colors z-10 tabular-nums ${
                            isCompleted
                              ? 'bg-[#08120E] border-[#34D399]/50 text-[#34D399]'
                              : isCurrent
                              ? 'bg-[#08120E] border-[#34D399] text-[#B6F5D8] ring-4 ring-[#34D399]/15'
                              : 'bg-[#08120E] border-white/12 text-[#5D726A]'
                          }`}
                        >
                          {step}
                        </div>
                        <div
                          className={`flex-1 p-4 rounded-2xl border transition-colors ${
                            isCurrent ? 'bg-[#34D399]/10 border-[#34D399]/30' : 'glass-2'
                          }`}
                        >
                          <h5 className={`font-semibold ${isCurrent ? 'text-[#B6F5D8]' : 'text-[#EDF4F0]'}`}>
                            {stageName}
                          </h5>
                          {isCurrent && (
                            <p className="text-xs text-[#8EA39A] mt-2">
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
                <CardTitle className="text-xs uppercase tracking-widest text-[#8EA39A] font-semibold">
                  Weekly Salah Log
                </CardTitle>
                <p className="text-[#8EA39A] text-xs mt-1">Track 5 daily prayers (Jama'ah, Alone, Missed)</p>
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
                        <label className="text-sm text-[#EDF4F0] font-medium w-24">{name}</label>
                        <select
                          className="flex-1 h-10 rounded-xl forest-input px-3 py-2 text-sm"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        >
                          <option value="jamaah" className="bg-[#0A1210]">Jama'ah (Mosque)</option>
                          <option value="alone" className="bg-[#0A1210]">Prayed Alone</option>
                          <option value="missed" className="bg-[#0A1210]">Missed</option>
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
                  <thead className="bg-white/[0.03] text-[#8EA39A] text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-medium w-32">Waqt</th>
                      {past7DaysData.map((day) => (
                        <th key={day.dateStr} className="p-4 font-medium text-center">
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((waqt) => (
                      <tr key={waqt} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-4 font-medium text-[#8EA39A]">{waqt}</td>
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
                                        ? 'bg-[#34D399]'
                                        : status === 'alone'
                                        ? 'bg-[#F4A85E]'
                                        : 'bg-rose-400'
                                    }`}
                                    title={String(status)}
                                  />
                                ) : (
                                  <div className="w-3 h-3 rounded-full bg-white/10" title="No Data" />
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
              <div className="flex items-center gap-6 mt-6 p-4 glass-2 rounded-2xl text-xs text-[#8EA39A] justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#34D399]" /> Jama'ah (Mosque)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#F4A85E]" /> Prayed Alone
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400" /> Missed
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SELF REPORT TAB (CONSENT-GATED READ-ONLY) */}
        {isCoordinator && (
          <TabsContent value="self-report" className="space-y-5">
            {(() => {
              const sr = monitoringView?.selfReport;
              const tItems = monitoringView?.trackerItems || [];
              const itemLabelMap = new Map(tItems.map((it: any) => [it.key, it.banglaLabel]));

              if (!sr || !sr.hasLinkedAccount) {
                return (
                  <Card>
                    <CardContent className="py-10 text-center text-xs text-[#8EA39A]">
                      এই সদস্যের সাথে এখনো কোনো লগইন অ্যাকাউন্ট সংযুক্ত নেই।
                    </CardContent>
                  </Card>
                );
              }

              if (!sr.monitoringEnabled && !sr.previouslySharedOnly) {
                return (
                  <Card>
                    <CardContent className="py-10 text-center space-y-2.5">
                      <Lock className="w-7 h-7 text-[#8EA39A] mx-auto" />
                      <div className="text-sm font-semibold text-[#EDF4F0]">
                        সদস্যের মনিটরিং বর্তমানে বন্ধ আছে
                      </div>
                      <p className="text-xs text-[#8EA39A] max-w-md mx-auto">
                        সদস্য নিজে থেকে মনিটরিং শেয়ারিং চালু না করা পর্যন্ত তার কোনো Self Report, দাওয়াহ লগ বা ব্যক্তিগত নোট এখানে দেখানো হয় না।
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div className="space-y-4">
                  {sr.previouslySharedOnly && !sr.monitoringEnabled && (
                    <div className="p-4 rounded-2xl glass-hot text-xs text-[#E8CD92] flex items-center gap-2">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>
                        এই রিপোর্টগুলো আগে শেয়ার করা হয়েছিল। বর্তমানে সদস্য মনিটরিং বন্ধ রেখেছেন, তাই নতুন কোনো রিপোর্ট দেখানো হচ্ছে না।
                      </span>
                    </div>
                  )}

                  {sr.weeklySummary && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="glass rounded-[20px] p-4">
                        <div className="text-xs text-[#8EA39A]">গত ৭ দিনে রিপোর্ট</div>
                        <div className="text-2xl font-serif italic text-[#34D399] mt-1 tabular-nums">
                          {sr.weeklySummary.daysReported} দিন
                        </div>
                      </div>
                      <div className="glass rounded-[20px] p-4">
                        <div className="text-xs text-[#8EA39A]">সাপ্তাহিক সম্পূর্ণতা</div>
                        <div className="text-2xl font-serif italic text-[#B6F5D8] mt-1 tabular-nums">
                          {sr.weeklySummary.completionPct}%
                        </div>
                      </div>
                      <div className="glass rounded-[20px] p-4">
                        <div className="text-xs text-[#8EA39A]">সর্বশেষ রিপোর্ট</div>
                        <div className="text-lg font-mono text-[#EDF4F0] mt-1 tabular-nums">
                          {sr.weeklySummary.lastReportDate || '—'}
                        </div>
                      </div>
                    </div>
                  )}

                  <Card>
                    <CardHeader className="border-b border-white/10 pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[#34D399]" />
                        সদস্যের দৈনিক Self Report (শুধুমাত্র দেখার জন্য)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      {(sr.dailyReports || []).length === 0 ? (
                        <p className="text-xs text-[#8EA39A] text-center py-6">
                          এই বিভাগে শেয়ারকৃত কোনো দৈনিক রিপোর্ট নেই।
                        </p>
                      ) : (
                        sr.dailyReports.map((rep: any) => {
                          const checkedLabels = Object.entries(rep.items || {})
                            .filter(([, v]) => Boolean(v))
                            .map(([k]) => itemLabelMap.get(k) || k);
                          return (
                            <div key={rep.id} className="p-4 rounded-2xl glass-2 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-[#34D399] tabular-nums">{rep.reportDate}</span>
                                <span className="text-[#B6F5D8] font-mono tabular-nums">
                                  সম্পন্ন: {checkedLabels.length}টি
                                </span>
                              </div>
                              {checkedLabels.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {checkedLabels.map((lbl, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-full bg-[#34D399]/12 text-[#B6F5D8] text-[11px]">
                                      ✓ {lbl}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {rep.note && (
                                <p className="text-xs text-[#EDF4F0]/80 italic pt-1">“{rep.note}”</p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  {(sr.dawahLogs || []).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">শেয়ারকৃত দাওয়াহ কার্যক্রম</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {sr.dawahLogs.map((dl: any) => (
                          <div key={dl.id} className="p-3 rounded-xl glass-2 text-xs">
                            <span className="font-mono text-[#34D399]">{dl.date}</span> · {dl.description}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {(sr.personalNotes || []).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">শেয়ারকৃত ব্যক্তিগত নোট</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {sr.personalNotes.map((pn: any) => (
                          <div key={pn.id} className="p-3 rounded-xl glass-2 text-xs">
                            <span className="font-mono text-[#34D399]">{pn.date}</span> · {pn.body}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}
          </TabsContent>
        )}

        {/* ADMIN OBSERVATION TAB */}
        {isCoordinator && (
          <TabsContent value="admin-obs" className="space-y-5">
            <Card>
              <CardHeader className="border-b border-white/10 pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm">অ্যাডমিন / দায়িত্বশীলের পর্যবেক্ষণ যোগ করুন</CardTitle>
                {canVoice && (
                  <Button type="button" size="sm" onClick={() => setVoiceModalOpen(true)} className="gap-1.5 text-xs">
                    <Mic className="w-3.5 h-3.5" />
                    ভয়েস নোট
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleAddManualObservation} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      value={newObsCategory}
                      onChange={(e) => setNewObsCategory(e.target.value)}
                      placeholder="ক্যাটাগরি (যেমন: মসজিদ সংযোগ)"
                    />
                    <Input
                      value={newObsText}
                      onChange={(e) => setNewObsText(e.target.value)}
                      placeholder="মাঠ পর্যায়ের পর্যবেক্ষণ লিখুন..."
                      className="sm:col-span-2"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingObs} size="sm" className="text-xs">
                      {savingObs ? 'সংরক্ষণ হচ্ছে...' : 'পর্যবেক্ষণ সংরক্ষণ করুন'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  সকল Admin ও Voice পর্যবেক্ষণ ({(monitoringView?.adminObservations || observationsList).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {(monitoringView?.adminObservations || observationsList).length === 0 ? (
                  <p className="text-xs text-[#8EA39A] text-center py-6">কোনো পর্যবেক্ষণ রেকর্ড নেই।</p>
                ) : (
                  (monitoringView?.adminObservations || observationsList).map((obs) => (
                    <div key={obs.id} className="p-3.5 rounded-2xl glass-2 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded-full border ${
                              obs.source === 'voice'
                                ? 'bg-[#34D399]/15 border-[#34D399]/35 text-[#B6F5D8]'
                                : 'bg-[#F4A85E]/15 border-[#F4A85E]/35 text-[#F4A85E]'
                            }`}
                          >
                            {obs.source === 'voice' ? 'Voice Update' : 'Admin'}
                          </span>
                          <span className="text-[#8EA39A]">{obs.category}</span>
                        </div>
                        <p className="text-xs text-[#EDF4F0]/90 leading-relaxed">{obs.observation}</p>
                      </div>
                      <span className="text-[11px] font-mono text-[#5D726A] shrink-0 tabular-nums">{obs.date}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* AI ANALYSIS (NEUTRAL COMPARISON) TAB */}
        {isCoordinator && (
          <TabsContent value="ai-analysis" className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#34D399]/10 border border-[#34D399]/25 text-xs text-[#B6F5D8]">
              এখানে কোনো অভিযোগ ছাড়াই সদস্যের Self Report ও মাঠ পর্যায়ের Admin Observation পাশাপাশি দেখানো হয়েছে — যাতে আন্তরিকতা ও হিকমাহর সাথে পরবর্তী কেয়ার প্ল্যান নেওয়া যায়।
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="border-b border-white/10 pb-3">
                  <CardTitle className="text-sm text-[#34D399]">সদস্যের Self Report (সম্মতি-ভিত্তিক)</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-xs space-y-2">
                  {!monitoringView?.selfReport?.monitoringEnabled ? (
                    <p className="text-[#8EA39A]">মনিটরিং বন্ধ আছে — বর্তমান Self Report প্রদর্শিত হচ্ছে না।</p>
                  ) : (
                    <>
                      <p className="text-[#EDF4F0]">
                        সাপ্তাহিক রিপোর্ট: {monitoringView.selfReport.weeklySummary?.daysReported ?? 0} দিন · সম্পূর্ণতা:{' '}
                        {monitoringView.selfReport.weeklySummary?.completionPct ?? 0}%
                      </p>
                      <p className="text-[#8EA39A]">
                        মোট জমাকৃত দৈনিক রিপোর্ট: {(monitoringView.selfReport.dailyReports || []).length}টি
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-white/10 pb-3">
                  <CardTitle className="text-sm text-[#F4A85E]">মাঠ পর্যায়ের Admin Observation</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-xs space-y-2">
                  <p className="text-[#EDF4F0]">
                    মোট পর্যবেক্ষণ: {(monitoringView?.adminObservations || observationsList).length}টি · গ্রোথ স্টেজ:{' '}
                    {contact.currentStage}/16
                  </p>
                  {(monitoringView?.adminObservations || observationsList).slice(0, 2).map((o) => (
                    <p key={o.id} className="text-[#8EA39A] truncate">• {o.observation}</p>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setSearchParams({ tab: 'ai-guidance' })} className="gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-[#34D399]" />
                সম্পূর্ণ AI Gap & Guidance ট্যাব দেখুন
              </Button>
            </div>
          </TabsContent>
        )}

        {/* VOICE AUDIT HISTORY TAB */}
        {(isCoordinator || canVoice) && (
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader className="border-b border-white/[0.08] pb-4">
                <CardTitle className="text-sm font-semibold text-[#EDF4F0] flex items-center gap-2">
                  <History className="w-4 h-4 text-[#34D399]" />
                  <span>ভয়েস ইনপুট ও অনুমোদন অডিট ইতিহাস (Audit History)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {voiceHistory.length === 0 ? (
                  <p className="text-xs text-[#8EA39A] py-6 text-center">
                    এই সদস্যের জন্য এখনো কোনো ভয়েস নোট রেকর্ড করা হয়নি।
                  </p>
                ) : (
                  voiceHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-2xl space-y-2 ${entry.status === 'pending' ? 'glass-hot' : 'glass-2'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span
                          className={`font-semibold ${
                            entry.status === 'approved'
                              ? 'text-[#34D399]'
                              : entry.status === 'pending'
                              ? 'text-[#F4A85E]'
                              : 'text-[#8EA39A]'
                          }`}
                        >
                          {entry.status === 'approved'
                            ? 'অনুমোদিত (Approved)'
                            : entry.status === 'pending'
                            ? 'অপেক্ষমাণ (Pending Review)'
                            : 'বাতিল (Cancelled)'}
                        </span>
                        <span className="text-[#8EA39A] font-mono tabular-nums">
                          অ্যাডমিন: {entry.adminUsername || 'admin'} ·{' '}
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#EDF4F0]/85">“{entry.editedTranscription}”</p>
                      {entry.status === 'approved' &&
                        Array.isArray((entry.approvedChanges as any)?.addedCategories) &&
                        (entry.approvedChanges as any).addedCategories.length > 0 && (
                          <div className="text-[11px] text-[#34D399]">
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
                          className="bg-gradient-to-r from-[#F4A85E] to-[#E8CD92] text-[#1A0D02] font-semibold hover:brightness-105 text-xs"
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
      {canVoice && (
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
            refreshRadar();
          }}
        />
      )}
    </div>
  );
}
