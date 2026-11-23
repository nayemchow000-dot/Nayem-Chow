import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../components/ui';
import { Contact, STAGES } from '../types';
import { Search, UserPlus, Filter, Trash2, Mic } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import VoiceDawahModal from '../components/VoiceDawahModal';

export default function Contacts() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [voiceMember, setVoiceMember] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newPriority, setNewPriority] = useState('growing');
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

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
      console.error("Error loading contacts:", err);
      setError("Unable to load members. Please check your database connection.");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddBrother = async () => {
    if (!newName.trim()) return;
    
    await apiFetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        phone: newPhone,
        area: newArea,
        priorityLevel: newPriority,
        firstContactDate: new Date().toISOString().split('T')[0]
      })
    });
    
    setNewName('');
    setNewPhone('');
    setNewArea('');
    setNewPriority('growing');
    fetchContacts();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/contacts/${id}`, {
      method: 'DELETE'
    });
    setContactToDelete(null);
    fetchContacts();
  };

  const filtered = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.area?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = filterPriority === 'all' || c.priorityLevel === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const PriorityBadge = ({ level }: { level: string }) => {
    const props = {
      growing: { variant: 'success', label: 'Growing' },
      stable: { variant: 'secondary', label: 'Stable' },
      needs_attention: { variant: 'warning', label: 'Attention' },
      high_priority: { variant: 'destructive', label: 'High Priority' }
    }[level] || { variant: 'secondary', label: level };
    
    // @ts-ignore
    return <Badge variant={props.variant}>{props.label}</Badge>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="eyebrow text-[#34D399] mb-1">MEMBER DIRECTORY</div>
          <h1 className="text-3xl font-serif italic tracking-tight text-[#EDF4F0]">Dawah Members & Contacts</h1>
          <p className="text-[#8EA39A] mt-1 text-sm">Track and manage growth journeys.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl">
              <UserPlus className="w-4 h-4" />
              Add Brother
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Brother</DialogTitle>
              <DialogDescription>Add a new contact to your Dawah list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-[#8EA39A]">Name</label>
                <Input
                  placeholder="e.g. Abdullah"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#8EA39A]">Phone</label>
                <Input
                  placeholder="e.g. 01700000000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#8EA39A]">Area</label>
                <Input
                  placeholder="e.g. Mirpur, Dhaka"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#8EA39A]">Priority Level</label>
                <select
                  className="w-full h-10 rounded-xl forest-input px-3 py-2 text-sm text-[#EDF4F0]"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="growing" className="bg-[#0A1210]">Growing</option>
                  <option value="stable" className="bg-[#0A1210]">Stable</option>
                  <option value="needs_attention" className="bg-[#0A1210]">Needs Attention</option>
                  <option value="high_priority" className="bg-[#0A1210]">High Priority</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleAddBrother}>Save</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-white/10 flex gap-4 bg-white/[0.025] flex-col sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8EA39A]" />
              <Input
                placeholder="Search by name or area..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-xl forest-input px-3 py-2 text-sm text-[#EDF4F0]"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all" className="bg-[#0A1210]">All Priorities</option>
                <option value="high_priority" className="bg-[#0A1210]">High Priority</option>
                <option value="needs_attention" className="bg-[#0A1210]">Needs Attention</option>
                <option value="growing" className="bg-[#0A1210]">Growing</option>
                <option value="stable" className="bg-[#0A1210]">Stable</option>
              </select>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-white/[0.04] border-b border-white/10 text-[#8EA39A] text-[10px] font-mono uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 font-medium">সদস্যের নাম</th>
                  <th className="px-5 py-4 font-medium">ফোন ও ঠিকানা</th>
                  <th className="px-5 py-4 font-medium">গ্রোথ স্টেজ (Growth Stage)</th>
                  <th className="px-5 py-4 font-medium text-center">অগ্রগতি স্কোর</th>
                  <th className="px-5 py-4 font-medium text-center">প্রায়োরিটি</th>
                  <th className="px-5 py-4 font-medium text-right">অ্যাকশন বাটন সমূহ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#8EA39A]">Loading contacts...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-rose-300 bg-rose-500/10">{error}</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#8EA39A]">কোনো মেম্বার পাওয়া যায়নি।</td>
                  </tr>
                ) : (
                  filtered.map(contact => (
                    <tr key={contact.id} className="hover:bg-white/[0.04] transition-colors group">
                      <td className="px-5 py-4">
                        <Link to={`/contacts/${contact.id}`} className="font-semibold text-[#EDF4F0] hover:text-[#B6F5D8] transition-colors block">
                          {contact.name}
                        </Link>
                        <div className="text-[#8EA39A] text-[11px] mt-0.5 font-mono tabular-nums">
                          যুক্ত: {contact.firstContactDate || '২০২৬'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[#EDF4F0]/90 font-mono text-xs tabular-nums">{contact.phone || '—'}</div>
                        <div className="text-[#34D399] text-[11px] mt-0.5">{contact.area || 'এলাকা অনির্ধারিত'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#34D399]/12 border border-[#34D399]/30 rounded-full text-xs text-[#B6F5D8] font-medium max-w-xs truncate">
                          {STAGES[contact.currentStage - 1] || `স্টেজ ${contact.currentStage}`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-[#EDF4F0] text-xs font-mono tabular-nums">{contact.growthScore || 0}%</span>
                          <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-gradient-to-r from-[#0E9F6E] to-[#34D399] h-full rounded-full"
                              style={{ width: `${Math.min(100, Math.max(5, contact.growthScore || 0))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <PriorityBadge level={contact.priorityLevel} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] bg-[#34D399]/15 hover:bg-[#34D399]/25 text-[#B6F5D8] border border-[#34D399]/35 rounded-lg gap-1"
                              onClick={() => setVoiceMember(contact)}
                              title="AI ভয়েস নোট"
                            >
                              <Mic className="w-3 h-3 text-[#34D399]" />
                              Voice
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-white/[0.05] hover:bg-[#34D399]/20 hover:text-[#B6F5D8] text-[#EDF4F0]/80 border border-white/10 rounded-lg"
                            onClick={() => navigate(`/contacts/${contact.id}?tab=overview`)}
                          >
                            Overview
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-white/[0.05] hover:bg-[#34D399]/20 hover:text-[#B6F5D8] text-[#EDF4F0]/80 border border-white/10 rounded-lg"
                            onClick={() => navigate(`/contacts/${contact.id}?tab=journey`)}
                          >
                            Growth Journey
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-white/[0.05] hover:bg-[#34D399]/20 hover:text-[#B6F5D8] text-[#EDF4F0]/80 border border-white/10 rounded-lg"
                            onClick={() => navigate(`/contacts/${contact.id}?tab=salah`)}
                          >
                            Salah Tracking
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-white/[0.05] hover:bg-white/10 text-[#EDF4F0]/80 border border-white/10 rounded-lg"
                            onClick={() => navigate(`/contacts/${contact.id}?tab=edit`)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-300/70 hover:text-rose-200 hover:bg-rose-500/15 rounded-lg ml-1"
                            onClick={() => setContactToDelete(contact.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col divide-y divide-white/10">
            {loading ? (
              <div className="p-8 text-center text-[#8EA39A]">Loading contacts...</div>
            ) : error ? (
              <div className="p-8 text-center text-rose-300 bg-rose-500/10">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-[#8EA39A]">কোনো মেম্বার পাওয়া যায়নি।</div>
            ) : (
              filtered.map(contact => (
                <div
                  key={contact.id}
                  className="p-4 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-[#EDF4F0] text-base">{contact.name}</div>
                      <div className="text-[#34D399] text-xs font-mono mt-0.5">{contact.phone || 'ফোন নেই'} • {contact.area || 'এলাকা নেই'}</div>
                    </div>
                    <PriorityBadge level={contact.priorityLevel} />
                  </div>

                  <div className="p-3 rounded-2xl glass-2 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#8EA39A]">গ্রোথ স্টেজ:</div>
                      <div className="text-xs font-medium text-[#B6F5D8]">
                        {STAGES[contact.currentStage - 1] || `স্টেজ ${contact.currentStage}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#8EA39A]">অগ্রগতি:</div>
                      <div className="text-xs font-bold text-[#EDF4F0] font-mono tabular-nums">{contact.growthScore || 0}%</div>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5 pt-1`}>
                    <button
                      type="button"
                      className="py-1.5 px-2 text-[11px] font-medium glass-2 hover:border-[#34D399]/35 rounded-xl text-[#EDF4F0] text-center"
                      onClick={() => navigate(`/contacts/${contact.id}?tab=overview`)}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      className="py-1.5 px-2 text-[11px] font-medium glass-2 hover:border-[#34D399]/35 rounded-xl text-[#EDF4F0] text-center"
                      onClick={() => navigate(`/contacts/${contact.id}?tab=journey`)}
                    >
                      Journey
                    </button>
                    <button
                      type="button"
                      className="py-1.5 px-2 text-[11px] font-medium glass-2 hover:border-[#34D399]/35 rounded-xl text-[#EDF4F0] text-center"
                      onClick={() => navigate(`/contacts/${contact.id}?tab=salah`)}
                    >
                      Salah
                    </button>
                    <button
                      type="button"
                      className="py-1.5 px-2 text-[11px] font-medium glass-2 hover:border-white/25 rounded-xl text-[#EDF4F0] text-center"
                      onClick={() => navigate(`/contacts/${contact.id}?tab=edit`)}
                    >
                      Edit
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="py-1.5 px-2 text-[11px] font-medium bg-[#34D399]/15 border border-[#34D399]/35 hover:bg-[#34D399]/25 rounded-xl text-[#B6F5D8] text-center inline-flex items-center justify-center gap-1"
                        onClick={() => setVoiceMember(contact)}
                        title="ভয়েস নোট রেকর্ড করুন"
                      >
                        <Mic className="w-3 h-3" />
                        Voice
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </CardContent>
      </Card>

      <Dialog open={!!contactToDelete} onOpenChange={(open) => !open && setContactToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brother</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this brother? This action cannot be undone and will remove all their records.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setContactToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => contactToDelete && handleDelete(contactToDelete)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAdmin && voiceMember && (
        <VoiceDawahModal
          open={!!voiceMember}
          onOpenChange={(open) => {
            if (!open) setVoiceMember(null);
          }}
          member={{
            id: voiceMember.id,
            name: voiceMember.name,
            currentStage: voiceMember.currentStage,
            priorityLevel: voiceMember.priorityLevel,
            categoryTags: voiceMember.categoryTags,
          }}
          onApproved={() => {
            setVoiceMember(null);
            fetchContacts();
          }}
        />
      )}
    </div>
  );
}
