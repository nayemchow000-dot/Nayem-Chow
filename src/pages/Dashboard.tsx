import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../components/ui';
import { Contact, STAGES } from '../types';
import { ArrowRight, Flame, Target, UserPlus, MessageCircle, ThumbsUp, PhoneCall, ArrowUpCircle, Home, Users, Sunrise, BookOpen, Library, Link as LinkIcon, Flag, TrendingUp, TrendingDown, Minus, Edit2, Heart, Megaphone, Star, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';

  const BENGALI_STAGES = [
    { title: "নতুন পরিচিতি", icon: UserPlus },
    { title: "দাওয়াহ দেওয়া হয়েছে", icon: MessageCircle },
    { title: "ইতিবাচক সাড়া", icon: ThumbsUp },
    { title: "নিয়মিত যোগাযোগ", icon: PhoneCall },
    { title: "সালাতের উন্নতি", icon: ArrowUpCircle },
    { title: "মসজিদের সাথে সংযোগ", icon: Home },
    { title: "জামাতে অংশগ্রহণ", icon: Users },
    { title: "ফজরের সাথে সংযোগ", icon: Sunrise },
    { title: "কুরআন ও দ্বীনি শিক্ষা", icon: BookOpen },
    { title: "ইলমি মুহাজারা / পাঠচক্র", icon: Library },
    { title: "দাওয়াহ মুভমেন্টের সাথে সংযোগ", icon: LinkIcon },
    { title: "ফজর ক্যাম্পেইনে অংশগ্রহণ", icon: Flag },
    { title: "ব্যক্তিগত আমলের উন্নতি", icon: TrendingUp },
    { title: "চরিত্র ও পারিবারিক উন্নতি", icon: Heart },
    { title: "দাওয়াহ কাজে অংশগ্রহণ", icon: Megaphone },
    { title: "সক্রিয় দাওয়াহ কর্মী", icon: Star }
  ];

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageIdx, setSelectedStageIdx] = useState<number | null>(null);
  const { branding } = useBranding();
  const { user } = useAuth();

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/contacts');
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (err: any) {
      console.error("Error loading priorities:", err);
      setError("Unable to load priorities. Please check your database connection.");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleQuickUpdate = async (id: string, stage: number, priorityLevel: string, growthScore: number) => {
    await apiFetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStage: stage, priorityLevel, growthScore })
    });
    fetchContacts();
  };

  const QuickUpdateDialog = ({ contact }: { contact: Contact }) => {
    const [stage, setStage] = useState(contact.currentStage);
    const [priority, setPriority] = useState<string>(contact.priorityLevel);
    const [score, setScore] = useState(contact.growthScore);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8EA39A] hover:text-[#EDF4F0]" title="Quick Update">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Update: {contact.name}</DialogTitle>
            <DialogDescription>Update stage, score, and priority directly from the dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs text-[#8EA39A]">Current Stage</label>
              <select
                className="w-full h-10 rounded-xl forest-input px-3 py-2 text-sm text-[#EDF4F0]"
                value={stage}
                onChange={(e) => setStage(Number(e.target.value))}
              >
                {STAGES.map((s, i) => <option key={i} value={i + 1} className="bg-[#0A1210]">{i + 1}. {s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#8EA39A]">Priority Level</label>
              <select
                className="w-full h-10 rounded-xl forest-input px-3 py-2 text-sm text-[#EDF4F0]"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="high_priority" className="bg-[#0A1210]">High Priority</option>
                <option value="needs_attention" className="bg-[#0A1210]">Needs Attention</option>
                <option value="growing" className="bg-[#0A1210]">Growing</option>
                <option value="stable" className="bg-[#0A1210]">Stable</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#8EA39A]">Growth Score (%)</label>
              <input
                type="number"
                min="0" max="100"
                className="flex h-10 w-full rounded-xl forest-input px-3 py-2 text-sm text-[#EDF4F0]"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button onClick={() => handleQuickUpdate(contact.id!, stage, priority, score)}>Save Changes</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const growing = contacts.filter(c => c.priorityLevel === 'growing');
  const stable = contacts.filter(c => c.priorityLevel === 'stable');
  const needsAttention = contacts.filter(c => c.priorityLevel === 'needs_attention');
  const highPriority = contacts.filter(c => c.priorityLevel === 'high_priority');

  const topPriority = contacts
    .filter(c => c.priorityLevel === 'high_priority' || c.priorityLevel === 'needs_attention')
    .sort((a, b) => a.updatedAt > b.updatedAt ? 1 : -1)
    .slice(0, 5);

  const avgGrowth = contacts.length > 0
    ? Math.round(contacts.reduce((sum, c) => sum + (c.growthScore || 0), 0) / contacts.length)
    : 64;

  // Build 8-bucket sparkline heights from real stage counts
  const sparkBuckets = Array.from({ length: 8 }, (_, b) => {
    const countA = contacts.filter(c => c.currentStage === b * 2 + 1).length;
    const countB = contacts.filter(c => c.currentStage === b * 2 + 2).length;
    return countA + countB;
  });
  const maxSpark = Math.max(1, ...sparkBuckets);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-12">
      {/* Background Images Layer */}
      {branding?.heroBackground && (
        <div
          className="absolute inset-0 opacity-5 pointer-events-none z-0 mix-blend-screen bg-cover bg-center"
          style={{ backgroundImage: `url(${branding.heroBackground})` }}
        />
      )}
      {branding?.cornerImage && (
        <img
          src={branding.cornerImage}
          alt="Decoration"
          className="absolute top-0 right-0 w-64 md:w-96 opacity-10 pointer-events-none z-0 mix-blend-lighten mask-image-fade"
        />
      )}

      {/* Content Layer */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-8 relative z-10"
      >
        {/* Top Hero Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Greeting & Focus Card */}
          <div className="lg:col-span-8 glass rounded-[24px] p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute -bottom-16 -right-12 w-72 h-72 rounded-full bg-[#F4A85E]/15 blur-[80px] pointer-events-none" aria-hidden="true" />
            <div className="relative z-10 flex flex-col justify-between h-full gap-5">
              <div>
                <div className="eyebrow text-[#34D399] mb-2">DAWAH PRIORITY · {(user?.contact?.name || user?.username || 'admin').toUpperCase()}</div>
                <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#EDF4F0] leading-tight">
                  My Dawah Priority
                </h1>
                <p className="text-[#8EA39A] mt-2 text-sm leading-relaxed">
                  Assalamu Alaikum. Here is your focus for today.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => {
                    document.getElementById('priority-matrix')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="gap-2 rounded-full px-5"
                >
                  <span>My Dawah Priority Matrix</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.dispatchEvent(new Event('open-dawah-chatbot'))}
                  className="gap-2 rounded-full px-4"
                >
                  <Sparkles className="w-4 h-4 text-[#34D399]" />
                  <span>দাওয়াহ AI সহায়ক</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Right Total Members Stat Card */}
          <div className="lg:col-span-4 glass rounded-[24px] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="eyebrow text-[#8EA39A]">TOTAL MEMBERS</div>
                <div className="text-4xl sm:text-5xl font-serif text-[#EDF4F0] tabular-nums mt-2 leading-none">
                  {contacts.length}
                </div>
                <p className="text-xs text-[#34D399] mt-2 tabular-nums">
                  {growing.length} Growing · {highPriority.length + needsAttention.length} Priority
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 flex items-center justify-center text-[#34D399]">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Mini Stage Sparkline */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-end gap-1.5 h-12">
                {sparkBuckets.map((val, i) => {
                  const pct = Math.max(18, Math.round((val / maxSpark) * 100));
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-[#0E9F6E]/40 to-[#34D399] transition-all"
                      style={{ height: `${pct}%` }}
                      title={`Stages ${i * 2 + 1}-${i * 2 + 2}: ${val}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 16 Stages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 md:gap-4">
          {BENGALI_STAGES.map((stage, idx) => {
            const count = contacts.filter(c => c.currentStage === idx + 1).length;
            const Icon = stage.icon;
            const isHot = idx === 0 && count > 0;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedStageIdx(idx)}
                className={`group cursor-pointer relative rounded-[20px] p-5 flex flex-col items-center text-center transition-all duration-300 ${
                  isHot
                    ? 'glass-hot hover:border-[#F4A85E]/60'
                    : 'glass hover:border-[#34D399]/40'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300 border ${
                    isHot
                      ? 'bg-[#F4A85E]/15 border-[#F4A85E]/40 text-[#F4A85E] shadow-[0_0_24px_rgba(244,168,94,0.22)]'
                      : count > 0
                      ? 'bg-[#34D399]/14 border-[#34D399]/35 text-[#34D399] shadow-[0_0_20px_rgba(52,211,153,0.16)]'
                      : 'bg-white/[0.04] border-white/10 text-[#8EA39A]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-[13px] sm:text-sm font-semibold text-[#EDF4F0] mb-1.5 leading-snug">
                  {stage.title}
                </h3>
                <p className="text-xs text-[#8EA39A] font-medium tabular-nums">
                  <span
                    className={`font-serif text-lg mr-1 ${
                      isHot ? 'text-[#F4A85E]' : count > 0 ? 'text-[#B6F5D8]' : 'text-[#5D726A]'
                    }`}
                  >
                    {count}
                  </span>
                  জন সদস্য
                </p>
              </motion.div>
            );
          })}
        </div>

        <div id="priority-matrix" className="grid grid-cols-1 lg:grid-cols-12 gap-8 scroll-mt-24">
          <div className="lg:col-span-8 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="eyebrow text-[#8EA39A]">My Dawah Priority Matrix</h3>
                <span className="text-[11px] px-2.5 py-1 rounded-full glass-2 text-[#E8CD92] font-medium">
                  Showing Critical First
                </span>
              </div>

              <div className="glass rounded-[22px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-white/[0.04] border-b border-white/10 text-[#8EA39A] text-[10px] font-mono uppercase tracking-wider">
                      <tr>
                        <th className="p-4 font-medium">Brother Name</th>
                        <th className="p-4 font-medium">Stage</th>
                        <th className="p-4 font-medium">Growth Score</th>
                        <th className="p-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[#8EA39A]">Loading priorities...</td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-rose-300 bg-rose-500/10">{error}</td>
                        </tr>
                      ) : topPriority.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[#8EA39A]">No high priority follow-ups needed today.</td>
                        </tr>
                      ) : (
                        topPriority.map(contact => (
                          <tr key={contact.id} className="hover:bg-white/[0.04] transition-colors">
                            <td className="p-4 flex items-center space-x-3">
                              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 ${
                                contact.priorityLevel === 'high_priority' ? 'bg-rose-500/15 border-rose-400/30 text-rose-300' :
                                contact.priorityLevel === 'needs_attention' ? 'bg-[#F4A85E]/15 border-[#F4A85E]/35 text-[#F4A85E]' :
                                contact.priorityLevel === 'growing' ? 'bg-[#34D399]/15 border-[#34D399]/35 text-[#B6F5D8]' :
                                'bg-white/10 border-white/15 text-[#8EA39A]'
                              }`}>
                                {contact.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <Link to={`/contacts/${contact.id}`} className="font-medium text-[#EDF4F0] hover:text-[#B6F5D8] transition-colors block">
                                  {contact.name}
                                </Link>
                                <div className="text-[11px] text-[#8EA39A]">{contact.area || 'Unknown'}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 bg-white/[0.05] border border-white/12 rounded-full text-[11px] text-[#EDF4F0]">
                                {STAGES[contact.currentStage - 1]}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className={`flex items-center space-x-2 tabular-nums ${
                                contact.priorityLevel === 'high_priority' ? 'text-rose-300' :
                                contact.priorityLevel === 'needs_attention' ? 'text-[#F4A85E]' :
                                contact.priorityLevel === 'growing' ? 'text-[#34D399]' :
                                'text-[#8EA39A]'
                              }`}>
                                <span className="font-mono font-semibold">{contact.growthScore}%</span>
                                <span className="text-[11px]">({contact.weeklyChange > 0 ? '+' : ''}{contact.weeklyChange}%)</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <QuickUpdateDialog contact={contact} />
                                <Button variant="outline" size="sm" className={`px-3 py-1 text-[10px] font-bold rounded-full ${
                                  contact.priorityLevel === 'high_priority' ? 'border-rose-400/40 text-rose-300 hover:bg-rose-500/20' :
                                  contact.priorityLevel === 'needs_attention' ? 'border-[#F4A85E]/40 text-[#F4A85E] hover:bg-[#F4A85E]/20' :
                                  'border-white/20 text-[#8EA39A] hover:text-[#EDF4F0]'
                                }`} asChild>
                                  <Link to={`/contacts/${contact.id}`}>
                                    {contact.priorityLevel === 'high_priority' ? 'RE-ENGAGE' : 'FOLLOW UP'}
                                  </Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <section className="glass p-6 rounded-[22px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#34D399]/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
              <h3 className="eyebrow text-[#34D399] mb-5">Growth Highlights</h3>

              <div className="space-y-4 relative">
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8EA39A]">Community Average</span>
                    <span className="text-xs font-mono text-[#B6F5D8] tabular-nums">{avgGrowth}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0E9F6E] to-[#34D399] shadow-[0_0_12px_rgba(52,211,153,0.5)] transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, avgGrowth))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#8EA39A] italic">Trending up: +8% increase in attendance this month.</p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-7 py-3 rounded-xl text-[11px] font-semibold uppercase tracking-widest" asChild>
                <Link to="/analytics">View Full Analytics</Link>
              </Button>
            </section>

            <section className="glass p-6 rounded-[22px] flex-1">
              <h3 className="eyebrow text-[#8EA39A] mb-4">Suggested Next Actions</h3>
              <div className="space-y-3">
                {topPriority.slice(0, 3).map(contact => (
                  <div
                    key={`action-${contact.id}`}
                    className={`p-3.5 rounded-2xl border ${
                      contact.priorityLevel === 'high_priority'
                        ? 'bg-rose-500/8 border-rose-400/25'
                        : contact.priorityLevel === 'needs_attention'
                        ? 'bg-[#F4A85E]/8 border-[#F4A85E]/25'
                        : 'bg-[#34D399]/8 border-[#34D399]/25'
                    }`}
                  >
                    <p className={`text-[11px] font-bold mb-1 ${
                      contact.priorityLevel === 'high_priority' ? 'text-rose-300' :
                      contact.priorityLevel === 'needs_attention' ? 'text-[#F4A85E]' :
                      'text-[#34D399]'
                    }`}>
                      {contact.priorityLevel === 'high_priority' ? 'URGENT: ' :
                       contact.priorityLevel === 'needs_attention' ? 'FOLLOW-UP: ' :
                       'PROMOTION: '}
                      {contact.name}
                    </p>
                    <p className="text-xs text-[#8EA39A] leading-relaxed">
                      {contact.priorityLevel === 'high_priority' ? 'Contact immediately. Growth score declining.' :
                       contact.priorityLevel === 'needs_attention' ? 'Schedule personal meeting to address stalled progress.' :
                       'Doing well. Provide positive reinforcement.'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <Dialog open={selectedStageIdx !== null} onOpenChange={(open) => !open && setSelectedStageIdx(null)}>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
            {selectedStageIdx !== null && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-xl text-[#EDF4F0]">
                    {(() => {
                      const Icon = BENGALI_STAGES[selectedStageIdx].icon;
                      return (
                        <div className="w-10 h-10 rounded-full bg-[#34D399]/15 border border-[#34D399]/35 flex items-center justify-center text-[#34D399]">
                          <Icon className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    {BENGALI_STAGES[selectedStageIdx].title}
                  </DialogTitle>
                  <DialogDescription className="text-[#8EA39A]">
                    এই ধাপে মোট <strong className="text-[#B6F5D8] tabular-nums">{contacts.filter(c => c.currentStage === selectedStageIdx + 1).length}</strong> জন সদস্য আছেন।
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto py-2 flex-1 pr-2 space-y-2 mt-4">
                  {contacts.filter(c => c.currentStage === selectedStageIdx + 1).length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/15 rounded-2xl">
                      <p className="text-[#8EA39A] text-sm">এই ধাপে বর্তমানে কোনো সদস্য নেই।</p>
                    </div>
                  ) : (
                    contacts.filter(c => c.currentStage === selectedStageIdx + 1).map(contact => (
                      <Link
                        key={contact.id}
                        to={`/contacts/${contact.id}`}
                        className="flex items-center justify-between p-4 rounded-2xl glass-2 hover:border-[#34D399]/40 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#34D399]/15 border border-[#34D399]/30 text-[#B6F5D8] flex items-center justify-center text-[10px] font-bold">
                            {contact.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#EDF4F0] group-hover:text-[#B6F5D8] transition-colors">{contact.name}</p>
                            <p className="text-[11px] text-[#8EA39A] mt-0.5">{contact.area || 'Unknown area'}</p>
                          </div>
                        </div>
                        <div className="text-[#5D726A] group-hover:text-[#34D399] transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
