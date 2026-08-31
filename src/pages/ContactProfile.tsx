import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, Input } from '../components/ui';
import { Contact, STAGES } from '../types';
import { ArrowLeft, Edit, Calendar, Phone, MapPin, Activity, Target, BookOpen, Heart, Users, Star, MessageCircle, Home, Trash2 } from 'lucide-react';

export default function ContactProfile() {
  const { id } = useParams();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for Edit Profile
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editArea, setEditArea] = useState('');

  const [salahLogs, setSalahLogs] = useState<any[]>([]);

  const fetchContact = () => {
    fetch(`/api/contacts/${id}`).then(r => r.json()).then(data => {
      setContact(data);
      setEditName(data.name);
      setEditPhone(data.phone || '');
      setEditArea(data.area || '');
      setLoading(false);
    });
    fetch(`/api/contacts/${id}/salah`).then(r => r.json()).then(data => {
      setSalahLogs(Array.isArray(data) ? data : []);
    }).catch(() => {
      setSalahLogs([]);
    });
  };

  useEffect(() => {
    fetchContact();
  }, [id]);

  const today = new Date().toISOString().split('T')[0];
  const [logFajr, setLogFajr] = useState('missed');
  const [logDhuhr, setLogDhuhr] = useState('missed');
  const [logAsr, setLogAsr] = useState('missed');
  const [logMaghrib, setLogMaghrib] = useState('missed');
  const [logIsha, setLogIsha] = useState('missed');

  const handleLogSalah = async () => {
    await fetch(`/api/contacts/${id}/salah`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        fajr: logFajr,
        dhuhr: logDhuhr,
        asr: logAsr,
        maghrib: logMaghrib,
        isha: logIsha
      })
    });
    fetchContact();
  };

  const handleUpdateProfile = async () => {
    if (!contact) return;
    await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, phone: editPhone, area: editArea })
    });
    fetchContact();
  };

  if (loading) return <div className="p-8 text-center text-white/40 animate-pulse">Loading profile...</div>;
  if (!contact || contact.id === undefined) return <div className="p-8 text-center text-white/40">Brother not found.</div>;

  const past7DaysData = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr: d.toISOString().split('T')[0]
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="-ml-2">
          <Link to="/contacts"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-serif italic tracking-tight text-[#E5E5E7]">{contact.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            {contact.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {contact.phone}</span>}
            {contact.area && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {contact.area}</span>}
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Since {new Date(contact.firstContactDate).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
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
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Phone Number</label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Area/Location</label>
                  <Input value={editArea} onChange={e => setEditArea(e.target.value)} />
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
                  Are you sure you want to delete this brother? This cannot be undone and will remove all their associated records (salah, activities, follow-ups).
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
                    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
                    window.location.href = '/contacts';
                  }}
                >
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="journey">Growth Journey</TabsTrigger>
          <TabsTrigger value="salah">Salah Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 mb-1">Overall Growth Score</div>
                    <div className="text-3xl font-serif italic text-emerald-500">{contact.growthScore}%</div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 mb-2">Weekly Change</div>
                    <Badge variant={contact.weeklyChange > 0 ? 'success' : contact.weeklyChange < 0 ? 'destructive' : 'secondary'}>
                      {contact.weeklyChange > 0 ? '+' : ''}{contact.weeklyChange}%
                    </Badge>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 mb-2">Current Priority</div>
                    <Badge variant={
                      contact.priorityLevel === 'growing' ? 'success' :
                      contact.priorityLevel === 'stable' ? 'secondary' :
                      contact.priorityLevel === 'needs_attention' ? 'warning' : 'destructive'
                    }>
                      {contact.priorityLevel.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                  <CardTitle className="text-[10px] uppercase tracking-widest flex items-center gap-2 text-emerald-500 font-bold">
                    <Activity className="w-4 h-4" /> Suggested Next Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-white/60 text-sm font-medium leading-relaxed">
                    {contact.priorityLevel === 'high_priority' ? "Review situation and consider a more appropriate personal approach. Do not pressure." :
                     contact.priorityLevel === 'needs_attention' ? "Increase meaningful follow-up. Invite for a casual meet." :
                     contact.priorityLevel === 'stable' ? "Maintain contact and identify the next step in his journey." :
                     "Continue current follow-up. Encourage him to invite others."}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">Comprehensive Deeni Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-[#0A0A0B] border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 flex items-center gap-1.5 mb-2"><BookOpen className="w-3 h-3"/> Quran & Ilm</div>
                      <div className="text-sm font-semibold text-[#E5E5E7]">Daily Tilawat</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0A0A0B] border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 flex items-center gap-1.5 mb-2"><Heart className="w-3 h-3"/> Character (Akhlaq)</div>
                      <div className="text-sm font-semibold text-emerald-500">Excellent</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0A0A0B] border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 flex items-center gap-1.5 mb-2"><Users className="w-3 h-3"/> Parents & Family</div>
                      <div className="text-sm font-semibold text-[#E5E5E7]">Improving</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0A0A0B] border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 flex items-center gap-1.5 mb-2"><Star className="w-3 h-3"/> Personal Amal</div>
                      <div className="text-sm font-semibold text-amber-500">Needs Focus</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0A0A0B] border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 flex items-center gap-1.5 mb-2"><MessageCircle className="w-3 h-3"/> Dawah Participation</div>
                      <div className="text-sm font-semibold text-emerald-500">Active</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0A0A0B] border border-white/5">
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 flex items-center gap-1.5 mb-2"><Home className="w-3 h-3"/> Islamic Environment</div>
                      <div className="text-sm font-semibold text-[#E5E5E7]">Supportive</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">Follow-up History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l border-white/10 ml-3 space-y-8 py-4">
                    <div className="relative pl-6">
                      <div className="absolute w-2 h-2 bg-emerald-500 rounded-full -left-[4.5px] top-1.5 ring-4 ring-[#16161A]" />
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 mb-1">Today</div>
                      <div className="bg-[#0A0A0B] border border-white/5 rounded-lg p-4 shadow-sm">
                        <p className="font-semibold text-[#E5E5E7] text-sm">Phone Conversation</p>
                        <p className="text-white/60 text-xs mt-1">Discussed recent progress with Fajr. Response was very positive.</p>
                      </div>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute w-2 h-2 bg-white/20 rounded-full -left-[4.5px] top-1.5 ring-4 ring-[#16161A]" />
                      <div className="text-[10px] uppercase tracking-widest font-medium text-white/40 mb-1">3 Days Ago</div>
                      <div className="bg-[#0A0A0B] border border-white/5 rounded-lg p-4 shadow-sm">
                        <p className="font-semibold text-[#E5E5E7] text-sm">Mosque Meeting</p>
                        <p className="text-white/60 text-xs mt-1">Invited to the upcoming Ilmi Muhajara.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="journey" className="space-y-6">
          <Card className="overflow-hidden border-emerald-500/20 bg-[#16161A] shadow-xl relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">The 16 Stages of Growth</h4>
                  <p className="text-sm text-white/40 mt-1">Track spiritual and organizational progression.</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-[10px] uppercase tracking-widest">Update Stage</Button>
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
                          await fetch(`/api/contacts/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ currentStage: newStage })
                          });
                          fetchContact();
                        }}
                      >
                        {STAGES.map((s, i) => <option key={i} value={i + 1}>{i + 1}. {s}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <DialogClose asChild>
                        <Button>Close</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <div className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-lg font-serif italic border-2 transition-colors z-10 ${
                          isCompleted ? 'bg-[#0A0A0B] border-emerald-500/50 text-emerald-500' : 
                          isCurrent ? 'bg-[#0A0A0B] border-emerald-400 text-emerald-400 ring-4 ring-emerald-500/10' : 
                          'bg-[#0A0A0B] border-white/10 text-white/20'
                        }`}>
                          {step}
                        </div>
                        <div className={`flex-1 p-4 rounded-xl border transition-colors ${
                          isCurrent ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5'
                        }`}>
                          <h5 className={`font-semibold ${isCurrent ? 'text-emerald-400' : 'text-[#E5E5E7]'}`}>{stageName}</h5>
                          {isCurrent && <p className="text-xs text-white/60 mt-2">Currently focusing on solidifying this stage before moving forward.</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salah" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">Weekly Salah Log</CardTitle>
                <p className="text-white/40 text-[10px] mt-1">Track 5 daily prayers (Jama'ah, Alone, Missed)</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-[10px] uppercase tracking-widest">Log Today</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Salah for Today</DialogTitle>
                    <DialogDescription>Record the status for all 5 daily prayers.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {[['Fajr', logFajr, setLogFajr], ['Dhuhr', logDhuhr, setLogDhuhr], ['Asr', logAsr, setLogAsr], ['Maghrib', logMaghrib, setLogMaghrib], ['Isha', logIsha, setLogIsha]].map(([name, val, setVal]: any) => (
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
                  <thead className="bg-white/[0.03] text-white/40 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-medium w-32">Waqt</th>
                      {past7DaysData.map(day => (
                        <th key={day.dateStr} className="p-4 font-medium text-center">{day.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(waqt => (
                      <tr key={waqt} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-medium text-white/60">{waqt}</td>
                        {past7DaysData.map((day, i) => {
                          const log = salahLogs.find(l => l.date === day.dateStr);
                          const waqtKey = waqt.toLowerCase();
                          let status = log ? log[waqtKey] : null;
                          
                          // If no log exists for past days, assume missed or empty.
                          // Here we leave it grey if totally absent, or 'missed' if it's not today.
                          
                          return (
                            <td key={day.dateStr} className="p-4 text-center">
                              <div className="flex justify-center">
                                {status ? (
                                  <div className={`w-3 h-3 rounded-full ${
                                    status === 'jamaah' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                    status === 'alone' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                    'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                  }`} title={status} />
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
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Jama'ah (Mosque)</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> Prayed Alone</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /> Missed</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
