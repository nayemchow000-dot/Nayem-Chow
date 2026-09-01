import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../components/ui';
import { Contact, STAGES } from '../types';
import { Search, UserPlus, Filter, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

export default function Contacts() {
  const navigate = useNavigate();
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
      const res = await fetch('/api/contacts');
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
    
    await fetch('/api/contacts', {
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
    await fetch(`/api/contacts/${id}`, {
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
          <h1 className="text-3xl font-serif italic tracking-tight text-[#E5E5E7]">Dawah Members & Contacts</h1>
          <p className="text-white/40 mt-1">Track and manage growth journeys.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
                <label className="text-xs text-white/60">Name</label>
                <Input 
                  placeholder="e.g. Abdullah" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/60">Phone</label>
                <Input 
                  placeholder="e.g. 01700000000" 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/60">Area</label>
                <Input 
                  placeholder="e.g. Mirpur, Dhaka" 
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-white/60">Priority Level</label>
                <select 
                  className="w-full h-10 rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="growing">Growing</option>
                  <option value="stable">Stable</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="high_priority">High Priority</option>
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

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-white/5 flex gap-4 bg-white/[0.02] rounded-t-xl flex-col sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="Search by name or area..." 
                className="pl-9 bg-[#0A0A0B] border-white/10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select 
                className="h-10 rounded-md border border-white/10 bg-[#0A0A0B] px-3 py-2 text-sm text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high_priority">High Priority</option>
                <option value="needs_attention">Needs Attention</option>
                <option value="growing">Growing</option>
                <option value="stable">Stable</option>
              </select>
            </div>
          </div>
          
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
              <thead className="bg-white/[0.03] text-white/40 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Current Stage</th>
                  <th className="px-6 py-4 font-medium text-right">Growth</th>
                  <th className="px-6 py-4 font-medium text-right">Weekly Change</th>
                  <th className="px-6 py-4 font-medium text-right">Monthly Change</th>
                  <th className="px-6 py-4 font-medium text-center">Last Contact</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-white/40">Loading contacts...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-rose-500 bg-rose-500/5">{error}</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-white/40">No contacts found.</td>
                  </tr>
                ) : (
                  filtered.map(contact => (
                    <tr key={contact.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => navigate(`/contacts/${contact.id}`)}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#E5E5E7] group-hover:text-emerald-500 transition-colors block">
                          {contact.name}
                        </div>
                        <div className="text-white/40 text-[10px] mt-0.5">{contact.area || 'Unknown area'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60">
                          {STAGES[contact.currentStage - 1] || `Stage ${contact.currentStage}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-[#E5E5E7]">
                        {contact.growthScore}%
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className={contact.weeklyChange > 0 ? 'text-emerald-500' : contact.weeklyChange < 0 ? 'text-rose-500' : 'text-white/60'}>
                          {contact.weeklyChange > 0 ? '+' : ''}{contact.weeklyChange}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className={contact.monthlyChange > 0 ? 'text-emerald-500' : contact.monthlyChange < 0 ? 'text-rose-500' : 'text-white/60'}>
                          {contact.monthlyChange > 0 ? '+' : ''}{contact.monthlyChange || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-white/60 text-[10px] uppercase tracking-widest">
                        {Math.random() > 0.5 ? 'Yesterday' : '3 Days Ago'}
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge level={contact.priorityLevel} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10"
                          onClick={(e) => { e.stopPropagation(); setContactToDelete(contact.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-white/40">Loading contacts...</div>
            ) : error ? (
              <div className="p-8 text-center text-rose-500 bg-rose-500/5">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-white/40">No contacts found.</div>
            ) : (
              filtered.map(contact => (
                <div 
                  key={contact.id} 
                  className="p-4 flex flex-col gap-3 active:bg-white/5 cursor-pointer"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-[#E5E5E7]">{contact.name}</div>
                      <div className="text-white/40 text-[10px] mt-0.5">{contact.area || 'Unknown area'}</div>
                    </div>
                    <PriorityBadge level={contact.priorityLevel} />
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded w-fit text-[10px] text-white/60">
                        {STAGES[contact.currentStage - 1] || `Stage ${contact.currentStage}`}
                      </span>
                      <div className="text-[10px] text-white/40">
                        Growth: <span className="text-[#E5E5E7]">{contact.growthScore}%</span> 
                        <span className="ml-2">Last: {Math.random() > 0.5 ? 'Yesterday' : '3 Days Ago'}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10"
                      onClick={(e) => { e.stopPropagation(); setContactToDelete(contact.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
            <Button variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white" onClick={() => contactToDelete && handleDelete(contactToDelete)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
