import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../components/ui';
import { Contact, STAGES } from '../types';
import { ArrowRight, Flame, Target, UserPlus, MessageCircle, ThumbsUp, PhoneCall, ArrowUpCircle, Home, Users, Sunrise, BookOpen, Library, Link as LinkIcon, Flag, TrendingUp, TrendingDown, Minus, Edit2, Heart, Megaphone, Star } from 'lucide-react';
import { Link } from 'react-router';
import { useBranding } from '../contexts/BrandingContext';

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
    { title: "দাওয়াহ সার্কেলের সাথে সংযোগ", icon: LinkIcon },
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

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/contacts');
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
    await fetch(`/api/contacts/${id}`, {
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white" title="Quick Update">
            <Edit2 className="w-3 h-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Update: {contact.name}</DialogTitle>
            <DialogDescription>Update stage, score, and priority directly from the dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs text-white/60">Current Stage</label>
              <select 
                className="w-full h-10 rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={stage}
                onChange={(e) => setStage(Number(e.target.value))}
              >
                {STAGES.map((s, i) => <option key={i} value={i + 1}>{i + 1}. {s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Priority Level</label>
              <select 
                className="w-full h-10 rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="high_priority">High Priority</option>
                <option value="needs_attention">Needs Attention</option>
                <option value="growing">Growing</option>
                <option value="stable">Stable</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/60">Growth Score (%)</label>
              <input 
                type="number"
                min="0" max="100"
                className="flex h-10 w-full rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
      <div className="space-y-8 animate-in fade-in duration-500 relative z-10">
        <div>
          <h1 className="text-3xl font-serif italic tracking-tight text-[#E5E5E7]">My Dawah Priority</h1>
          <p className="text-white/40 mt-1 text-sm">Assalamu Alaikum. Here is your focus for today.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {BENGALI_STAGES.map((stage, idx) => {
            const count = contacts.filter(c => c.currentStage === idx + 1).length;
            const Icon = stage.icon;
            return (
              <div 
                key={idx} 
                onClick={() => setSelectedStageIdx(idx)}
                className="group cursor-pointer relative bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-xl p-5 flex flex-col items-center text-center hover:border-emerald-500/40 hover:bg-white/[0.04] hover:-translate-y-1 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:bg-emerald-500/20 text-emerald-500 shadow-inner">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-[12px] sm:text-sm font-bold text-[#E5E5E7] mb-1 leading-tight">{stage.title}</h3>
                <p className="text-[11px] text-white/50 font-medium tracking-wide">
                  <span className="text-emerald-400 font-bold text-sm">{count}</span> জন সদস্য
                </p>
              </div>
            );
          })}
        </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest text-white/60 font-semibold">My Dawah Priority Matrix</h3>
              <span className="text-[10px] px-2 py-1 bg-white/5 rounded text-white/40">Showing Critical First</span>
            </div>
            
            <div className="bg-[#16161A] rounded-xl border border-white/5 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-white/[0.03] text-white/40 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-medium">Brother Name</th>
                      <th className="p-4 font-medium">Stage</th>
                      <th className="p-4 font-medium">Growth Score</th>
                      <th className="p-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-white/40">Loading priorities...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-rose-500 bg-rose-500/5 rounded-b-xl border border-rose-500/20">{error}</td>
                      </tr>
                    ) : topPriority.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-white/40">No high priority follow-ups needed today.</td>
                      </tr>
                    ) : (
                      topPriority.map(contact => (
                        <tr key={contact.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold ${
                              contact.priorityLevel === 'high_priority' ? 'bg-rose-500/20 text-rose-500' :
                              contact.priorityLevel === 'needs_attention' ? 'bg-amber-500/20 text-amber-500' :
                              contact.priorityLevel === 'growing' ? 'bg-emerald-500/20 text-emerald-500' :
                              'bg-white/10 text-white/60'
                            }`}>
                              {contact.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <Link to={`/contacts/${contact.id}`} className="font-medium hover:text-emerald-500 transition-colors block">
                                {contact.name}
                              </Link>
                              <div className="text-[10px] text-white/40">{contact.area || 'Unknown'}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px]">
                              {STAGES[contact.currentStage - 1]}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className={`flex items-center space-x-2 ${
                              contact.priorityLevel === 'high_priority' ? 'text-rose-500' :
                              contact.priorityLevel === 'needs_attention' ? 'text-amber-500' :
                              contact.priorityLevel === 'growing' ? 'text-emerald-500' :
                              'text-white/60'
                            }`}>
                              <span className="font-mono">{contact.growthScore}%</span>
                              <span className="text-[10px]">({contact.weeklyChange > 0 ? '+' : ''}{contact.weeklyChange}%)</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <QuickUpdateDialog contact={contact} />
                              <Button variant="outline" size="sm" className={`px-3 py-1 text-[10px] font-bold ${
                                contact.priorityLevel === 'high_priority' ? 'border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white' :
                                contact.priorityLevel === 'needs_attention' ? 'border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white' :
                                'border-white/20 text-white/40 hover:bg-white/10 hover:text-white'
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
          <section className="bg-[#16161A] p-6 rounded-xl border border-emerald-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h3 className="text-xs uppercase tracking-widest text-emerald-500/80 font-bold mb-6">Growth Highlights</h3>
            
            <div className="space-y-4 relative">
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60">Community Average</span>
                  <span className="text-[10px] font-mono text-emerald-400">64%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[64%] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                </div>
                <p className="text-[10px] text-white/30 italic">Trending up: +8% increase in attendance this month.</p>
              </div>
            </div>

            <Button className="w-full mt-8 py-3 bg-white/[0.03] border border-white/10 text-white/80 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all" asChild>
              <Link to="/analytics">View Full Analytics</Link>
            </Button>
          </section>

          <section className="bg-[#16161A] p-5 rounded-xl border border-white/5 flex-1">
            <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-4">Suggested Next Actions</h3>
            <div className="space-y-4">
              {topPriority.slice(0, 3).map(contact => (
                <div key={`action-${contact.id}`} className={`p-3 border-l-2 rounded ${
                  contact.priorityLevel === 'high_priority' ? 'bg-rose-500/5 border-rose-500' :
                  contact.priorityLevel === 'needs_attention' ? 'bg-amber-500/5 border-amber-500' :
                  'bg-emerald-500/5 border-emerald-500'
                }`}>
                  <p className={`text-[10px] font-bold mb-1 ${
                    contact.priorityLevel === 'high_priority' ? 'text-rose-500' :
                    contact.priorityLevel === 'needs_attention' ? 'text-amber-500' :
                    'text-emerald-500'
                  }`}>
                    {contact.priorityLevel === 'high_priority' ? 'URGENT: ' : 
                     contact.priorityLevel === 'needs_attention' ? 'FOLLOW-UP: ' : 
                     'PROMOTION: '}
                    {contact.name}
                  </p>
                  <p className="text-[11px] text-white/60">
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
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-[#0F0F12] border-white/10">
          {selectedStageIdx !== null && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl text-[#E5E5E7]">
                  {(() => {
                    const Icon = BENGALI_STAGES[selectedStageIdx].icon;
                    return (
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Icon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  {BENGALI_STAGES[selectedStageIdx].title}
                </DialogTitle>
                <DialogDescription className="text-white/60">
                  এই ধাপে মোট <strong className="text-emerald-400">{contacts.filter(c => c.currentStage === selectedStageIdx + 1).length}</strong> জন সদস্য আছেন।
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto py-2 flex-1 pr-2 space-y-2 mt-4">
                {contacts.filter(c => c.currentStage === selectedStageIdx + 1).length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                    <p className="text-white/40 text-sm">এই ধাপে বর্তমানে কোনো সদস্য নেই।</p>
                  </div>
                ) : (
                  contacts.filter(c => c.currentStage === selectedStageIdx + 1).map(contact => (
                    <Link 
                      key={contact.id} 
                      to={`/contacts/${contact.id}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] font-bold">
                          {contact.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#E5E5E7] group-hover:text-emerald-400 transition-colors">{contact.name}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{contact.area || 'Unknown area'}</p>
                        </div>
                      </div>
                      <div className="text-white/20 group-hover:text-emerald-500 transition-colors">
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
    </div>
    </div>
  );
}
