import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, Input } from '../components/ui';
import { Plus, Search, Phone, MapPin, Check, Tags, UserCircle2, MessageCircle, Edit2 } from 'lucide-react';
import { Contact } from '../types';

const DEFAULT_CATEGORIES = [
  "🌅 Fajr Regular",
  "🔥 Fajr Campaign",
  "🕌 Jumu'ah Companion",
  "📚 Ilmi Muhajara / Study Circle",
  "🤝 Regular Dawah Activities",
  "📞 Phone Responsive",
  "👂 Listens to Dawah",
  "⚡ Call করলে দ্রুত আসে",
  "⭐ Highly Active / Always Available",
  "🌱 Growing Brother",
  "🎯 Special Follow-up"
];

export default function Categories() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [search, setSearch] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchData = async () => {
    try {
      const [contRes, catRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/custom-categories')
      ]);
      const contData = await contRes.json();
      const catData = await catRes.json();
      setContacts(Array.isArray(contData) ? contData : []);
      setCustomCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)];

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    await fetch('/api/custom-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName })
    });
    setNewCategoryName('');
    fetchData();
  };

  const toggleCategory = async (contact: Contact, category: string) => {
    const tags = contact.categoryTags || [];
    const newTags = tags.includes(category) 
      ? tags.filter(t => t !== category) 
      : [...tags, category];

    await fetch(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryTags: newTags })
    });
    fetchData();
  };

  const uploadPhoto = async (contact: Contact, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: base64 })
      });
      fetchData();
    };
    reader.readAsDataURL(file);
  };

  const filteredContacts = contacts.filter(c => 
    (c.categoryTags || []).includes(selectedCategory) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || 
     c.phone?.includes(search))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif italic tracking-tight text-white">Brother Categories</h1>
          <p className="text-white/60 text-sm mt-1">Organize and manage brothers into dynamic tags.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Create Custom Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Category</DialogTitle>
              <DialogDescription>Add a new category label to organize brothers.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-white/60">Category Name</label>
                <Input 
                  placeholder="e.g. 🏏 Cricket Players" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={handleCreateCategory}>Create</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
        {/* Categories Sidebar */}
        <div className="w-full md:w-72 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-white/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Categories</div>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-left px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                selectedCategory === cat 
                  ? 'bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20' 
                  : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Category Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-medium text-white flex items-center gap-2">
              {selectedCategory}
              <Badge className="bg-white/10 text-white/70 ml-2">{filteredContacts.length}</Badge>
            </h2>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                className="pl-9 bg-[#0A0A0B] border-white/10 rounded-full" 
                placeholder="Search brothers..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {loading ? (
              <div className="text-center text-white/40 mt-10">Loading brothers...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <Tags className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/60 text-sm">No brothers in this category.</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-4 gap-2">
                      <Plus className="w-4 h-4" /> Add Brothers
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Add to {selectedCategory}</DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto py-4 space-y-2 flex-1 pr-2">
                      {contacts.map(contact => {
                        const isAdded = (contact.categoryTags || []).includes(selectedCategory);
                        return (
                          <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]">
                            <div>
                              <p className="text-sm font-medium text-[#E5E5E7]">{contact.name}</p>
                              <p className="text-xs text-white/40">{contact.area || 'Unknown Area'}</p>
                            </div>
                            <Button 
                              variant={isAdded ? "default" : "outline"} 
                              size="sm"
                              className={`h-7 w-20 text-xs ${isAdded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                              onClick={() => toggleCategory(contact, selectedCategory)}
                            >
                              {isAdded ? 'Added' : 'Add'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-white">
                        <Edit2 className="w-4 h-4" /> Manage List
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Manage {selectedCategory}</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-y-auto py-4 space-y-2 flex-1 pr-2">
                        {contacts.map(contact => {
                          const isAdded = (contact.categoryTags || []).includes(selectedCategory);
                          return (
                            <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]">
                              <div>
                                <p className="text-sm font-medium text-[#E5E5E7]">{contact.name}</p>
                                <p className="text-xs text-white/40">{contact.area || 'Unknown Area'}</p>
                              </div>
                              <Button 
                                variant={isAdded ? "default" : "outline"} 
                                size="sm"
                                className={`h-7 w-20 text-xs ${isAdded ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                                onClick={() => toggleCategory(contact, selectedCategory)}
                              >
                                {isAdded ? 'Added' : 'Add'}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredContacts.map(contact => (
                    <Card key={contact.id} className="overflow-hidden group hover:border-white/20 transition-colors">
                      <CardContent className="p-0">
                        <div className="flex p-4 gap-4 items-center">
                          <div className="relative">
                            {contact.photoUrl ? (
                              <img src={contact.photoUrl} alt={contact.name} className="w-14 h-14 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <UserCircle2 className="w-8 h-8" />
                              </div>
                            )}
                            <label className="absolute -bottom-1 -right-1 bg-[#1A1A1E] border border-white/10 rounded-full p-1 cursor-pointer hover:bg-white/10 transition-colors">
                              <Plus className="w-3 h-3 text-white/60" />
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) uploadPhoto(contact, e.target.files[0]);
                                }}
                              />
                            </label>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-white truncate">{contact.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-white/60 bg-white/5 px-2 py-0.5 rounded-full truncate">
                                {contact.priorityLevel.replace('_', ' ')}
                              </span>
                              {contact.area && (
                                <span className="text-xs text-white/40 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {contact.area}
                                </span>
                              )}
                            </div>
                          </div>

                          {contact.phone && (
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button size="sm" className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                                <a href={`tel:${contact.phone}`}>
                                  <Phone className="w-3 h-3" /> <span className="hidden sm:inline">Call</span>
                                </a>
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-300" asChild>
                                <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                                  <MessageCircle className="w-3 h-3" /> <span className="hidden sm:inline">WhatsApp</span>
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
