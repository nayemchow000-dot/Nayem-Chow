import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, Input, Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui';
import { Calendar, Plus, Search, Sunrise, Moon, BookOpen, Users, Phone, MapPin, CheckSquare, Edit2, Target } from 'lucide-react';
import { Contact } from '../types';

export default function Activities() {
  const [activities, setActivities] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form states for new activity
  const [activityType, setActivityType] = useState('Mosque Visit');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [actRes, contRes] = await Promise.all([
        fetch('/api/activities'),
        fetch('/api/contacts')
      ]);
      if (!actRes.ok || !contRes.ok) throw new Error('API request failed');
      const actData = await actRes.json();
      const contData = await contRes.json();
      setActivities(Array.isArray(actData) ? actData : []);
      setAllContacts(Array.isArray(contData) ? contData : []);
    } catch (err: any) {
      console.error("Error loading activities:", err);
      setError("Unable to load activities. Please check your database connection or backend deployment.");
      setActivities([]);
      setAllContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddActivity = async () => {
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityType, date, notes })
    });
    fetchData();
    setNotes('');
  };

  const toggleContactTarget = async (contact: Contact, targetKey: string, currentValue: boolean) => {
    await fetch(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [targetKey]: !currentValue })
    });
    fetchData();
  };

  const filteredActs = activities.filter(a => a.activityType?.toLowerCase().includes(search.toLowerCase()) || a.notes?.toLowerCase().includes(search.toLowerCase()));

  const TargetList = ({ title, icon: Icon, targetKey, description, colorClass }: { title: string, icon: any, targetKey: keyof Contact, description: string, colorClass: string }) => {
    const list = allContacts.filter(c => c[targetKey]);
    
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
              <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{list.length} Members</p>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                <Edit2 className="w-3 h-3" /> Manage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Manage {title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto py-4 space-y-2 flex-1 pr-2">
                {allContacts.map(contact => (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#E5E5E7]">{contact.name}</p>
                      <p className="text-xs text-white/40">{contact.area}</p>
                    </div>
                    <Button 
                      variant={contact[targetKey] ? "default" : "outline"} 
                      size="sm"
                      className={`h-7 w-20 text-xs ${contact[targetKey] ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                      onClick={() => toggleContactTarget(contact, targetKey as string, contact[targetKey] as boolean)}
                    >
                      {contact[targetKey] ? 'Added' : 'Add'}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-4 border-t border-white/5">
                <DialogClose asChild>
                  <Button>Done</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">No members added yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {list.map(contact => (
                <div key={contact.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#E5E5E7]">{contact.name}</p>
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                      <MapPin className="w-3 h-3" /> {contact.area || 'Unknown Area'}
                    </div>
                  </div>
                  {contact.phone ? (
                    <Button variant="outline" size="sm" className="gap-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300" asChild>
                      <a href={`tel:${contact.phone}`}>
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-white/20 italic">No phone</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif italic tracking-tight text-white">Regular Dawah Activity</h1>
          <p className="text-white/60 text-sm mt-1">Manage target sectors and log daily Dawah efforts.</p>
        </div>
      </div>

      <Tabs defaultValue="sectors" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sectors" className="gap-2"><Target className="w-4 h-4" /> Target Sectors</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><CheckSquare className="w-4 h-4" /> Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sectors" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[70vh]">
            <TargetList 
              title="Fajr Campaign" 
              icon={Sunrise} 
              targetKey="fajrTarget" 
              description="Brothers to call and invite for Fajr congregation."
              colorClass="bg-amber-500 text-amber-500" 
            />
            <TargetList 
              title="Jummah Target" 
              icon={Users} 
              targetKey="jummahTarget" 
              description="Brothers to invite and accompany for Jummah prayer."
              colorClass="bg-emerald-500 text-emerald-500" 
            />
            <TargetList 
              title="Deeniyat & Ilmi" 
              icon={BookOpen} 
              targetKey="deeniyatTarget" 
              description="Brothers engaged in Deeniyat classes or Ilmi discussions."
              colorClass="bg-blue-500 text-blue-500" 
            />
            <TargetList 
              title="Weekly Tafseer" 
              icon={Moon} 
              targetKey="tafseerTarget" 
              description="Brothers invited to Friday post-Isha Tafseer."
              colorClass="bg-purple-500 text-purple-500" 
            />
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-0 space-y-6">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Log Activity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log New Dawah Activity</DialogTitle>
                  <DialogDescription>Record a recent Dawah effort or visit.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Activity Type</label>
                    <select 
                      className="w-full h-10 rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                    >
                      <option value="Mosque Visit">Mosque Visit</option>
                      <option value="Tea Table Dawah">Tea Table Dawah</option>
                      <option value="Halaka">Halaka / Study Circle</option>
                      <option value="Individual Meeting">Individual Meeting</option>
                      <option value="Literature Distribution">Literature Distribution</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Date</label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Notes / Outcomes</label>
                    <textarea 
                      className="flex w-full rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm ring-offset-[#0A0A0B] placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 text-[#E5E5E7] min-h-[100px]"
                      placeholder="Summarize the discussion or outcome..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleAddActivity}>Save Activity</Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b border-white/5 bg-white/[0.02] rounded-t-xl">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input 
                    className="pl-9 bg-[#0A0A0B] border-white/10" 
                    placeholder="Search activities or notes..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                  <thead className="bg-white/[0.03] text-white/40 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-medium w-40">Date</th>
                      <th className="px-6 py-4 font-medium w-64">Activity Type</th>
                      <th className="px-6 py-4 font-medium">Notes & Outcomes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-white/40">Loading...</td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-rose-500 bg-rose-500/5">{error}</td>
                      </tr>
                    ) : filteredActs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-white/40">No activities found.</td>
                      </tr>
                    ) : (
                      filteredActs.map((activity, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-white/60">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(activity.date).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5">
                              {activity.activityType}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-white/60 truncate max-w-lg" title={activity.notes}>
                              {activity.notes || <span className="italic opacity-50">No notes provided</span>}
                            </p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
