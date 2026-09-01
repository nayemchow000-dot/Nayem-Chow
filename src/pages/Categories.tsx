import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, Input } from '../components/ui';
import { Plus, Search, Edit2, Users, Check, Save, Image as ImageIcon, CheckSquare, Square, X, MapPin, Phone, MessageCircle, MoreVertical } from 'lucide-react';
import { Contact } from '../types';

export default function Categories() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Left Panel State
  const [categorySearch, setCategorySearch] = useState('');
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  
  // Right Panel State
  const [memberSearch, setMemberSearch] = useState('');

  // Modals state
  const [editCategory, setEditCategory] = useState<any | null>(null);
  const [manageCategory, setManageCategory] = useState<string | null>(null);

  // Manage Members Modal State
  const [manageSearch, setManageSearch] = useState('');
  const [draftAddedIds, setDraftAddedIds] = useState<Set<string>>(new Set());
  const [draftRemovedIds, setDraftRemovedIds] = useState<Set<string>>(new Set());
  const [savingMembers, setSavingMembers] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contRes, catRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/custom-categories')
      ]);
      if (!contRes.ok || !catRes.ok) throw new Error('API request failed');
      const contData = await contRes.json();
      const catData = await catRes.json();
      setContacts(Array.isArray(contData) ? contData : []);
      const cats = Array.isArray(catData) ? catData : [];
      setCategories(cats);
      
      // Auto-select first category if none selected
      if (cats.length > 0 && !activeCategoryName) {
        setActiveCategoryName(cats[0].name);
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError("Unable to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync initial selections when Manage Modal opens
  useEffect(() => {
    if (manageCategory) {
      setDraftAddedIds(new Set());
      setDraftRemovedIds(new Set());
      setManageSearch('');
    }
  }, [manageCategory]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory?.name) return;
    
    try {
      const isNew = !editCategory.id;
      const url = isNew ? '/api/custom-categories' : `/api/custom-categories/${editCategory.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCategory)
      });
      
      if (!res.ok) throw new Error('Failed to save category');
      
      const savedCat = await res.json();
      
      // Update UI instantly
      if (isNew) {
        setCategories([savedCat, ...categories]);
        setActiveCategoryName(savedCat.name);
      } else {
        setCategories(categories.map(c => c.id === savedCat.id ? savedCat : c));
        if (activeCategoryName === editCategory.originalName) {
           setActiveCategoryName(savedCat.name);
        }
      }
      
      setEditCategory(null);
      fetchData(); // Silently refresh background for member tag sync
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    }
  };

  const handleSaveMembers = async () => {
    if (!manageCategory) return;
    try {
      setSavingMembers(true);
      const res = await fetch('/api/contacts/bulk-assign-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: manageCategory,
          addedContactIds: Array.from(draftAddedIds),
          removedContactIds: Array.from(draftRemovedIds)
        })
      });
      if (!res.ok) throw new Error('Failed to save members');
      
      // Update local state to reflect instantly without full page refresh
      setContacts(prev => prev.map(c => {
        let tags = c.categoryTags || [];
        if (draftAddedIds.has(c.id)) {
          if (!tags.includes(manageCategory)) tags = [...tags, manageCategory];
        }
        if (draftRemovedIds.has(c.id)) {
          tags = tags.filter(t => t !== manageCategory);
        }
        return { ...c, categoryTags: tags };
      }));
      
      setManageCategory(null); // Close modal
    } catch(err) {
      console.error(err);
      alert('Failed to save members');
    } finally {
      setSavingMembers(false);
    }
  };

  const toggleMemberSelection = (contactId: string, currentlyHasTag: boolean) => {
    if (currentlyHasTag) {
      if (draftRemovedIds.has(contactId)) {
        const newRemoved = new Set(draftRemovedIds);
        newRemoved.delete(contactId);
        setDraftRemovedIds(newRemoved);
      } else {
        const newRemoved = new Set(draftRemovedIds);
        newRemoved.add(contactId);
        setDraftRemovedIds(newRemoved);
        if (draftAddedIds.has(contactId)) {
          const newAdded = new Set(draftAddedIds);
          newAdded.delete(contactId);
          setDraftAddedIds(newAdded);
        }
      }
    } else {
      if (draftAddedIds.has(contactId)) {
        const newAdded = new Set(draftAddedIds);
        newAdded.delete(contactId);
        setDraftAddedIds(newAdded);
      } else {
        const newAdded = new Set(draftAddedIds);
        newAdded.add(contactId);
        setDraftAddedIds(newAdded);
        if (draftRemovedIds.has(contactId)) {
          const newRemoved = new Set(draftRemovedIds);
          newRemoved.delete(contactId);
          setDraftRemovedIds(newRemoved);
        }
      }
    }
  };

  // Filtered data for UI
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase()) || 
    (c.banglaName && c.banglaName.toLowerCase().includes(categorySearch.toLowerCase()))
  );

  const activeCategoryObj = categories.find(c => c.name === activeCategoryName);
  
  const activeCategoryMembers = contacts.filter(c => 
    (c.categoryTags || []).includes(activeCategoryName || '')
  ).filter(c => 
    c.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
    (c.phone && c.phone.includes(memberSearch))
  );

  const filteredMembersForManage = contacts.filter(c => 
    c.name.toLowerCase().includes(manageSearch.toLowerCase()) || 
    (c.phone && c.phone.includes(manageSearch))
  );
  
  const manageOriginalCount = contacts.filter(c => (c.categoryTags || []).includes(manageCategory || '')).length;
  const manageCurrentCount = manageOriginalCount + draftAddedIds.size - draftRemovedIds.size;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-white">Brother Categories</h1>
        <p className="text-white/60 mt-1">Manage campaigns and assign brothers to specific activities</p>
      </div>

      {error && <div className="p-4 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 mb-4">{error}</div>}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT PANEL: Category List (The Classic Sidebar Structure) */}
        <div className="w-full lg:w-80 flex flex-col gap-4 bg-[#121214] border border-white/5 rounded-xl p-4 shrink-0 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search categories..." 
              className="pl-9 bg-white/5 border-white/10 text-white h-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2">
            {loading ? (
              <div className="text-center py-10 text-white/40 text-sm">Loading...</div>
            ) : (
              filteredCategories.map(cat => {
                const isActive = activeCategoryName === cat.name;
                const memberCount = contacts.filter(c => (c.categoryTags || []).includes(cat.name)).length;
                
                return (
                  <div 
                    key={cat.id}
                    onClick={() => setActiveCategoryName(cat.name)}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-[inset_4px_0_0_0_rgba(16,185,129,1)]' 
                        : 'bg-transparent border border-transparent hover:bg-white/5'
                    } ${!cat.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/60'}`}>
                        {cat.image ? (
                          <img src={cat.image} alt="" className="w-full h-full rounded-md object-cover opacity-80" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="truncate">
                        <h3 className={`text-sm font-medium truncate ${isActive ? 'text-emerald-400' : 'text-white'}`}>
                          {cat.banglaName || cat.name}
                        </h3>
                        <p className="text-xs text-white/40 truncate">{memberCount} Members</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Button 
            onClick={() => setEditCategory({ name: '', banglaName: '', description: '', image: '', isActive: true, displayOrder: 0 })}
            className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-2 mt-auto"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>

        {/* RIGHT PANEL: Selected Category Details & Members */}
        <div className="flex-1 flex flex-col bg-[#121214] border border-white/5 rounded-xl overflow-hidden shadow-lg min-w-0">
          {activeCategoryObj ? (
            <>
              {/* Category Header */}
              <div className="p-6 border-b border-white/5 relative overflow-hidden">
                {/* Optional Background Banner Hint */}
                {activeCategoryObj.image && (
                  <div 
                    className="absolute inset-0 opacity-10 bg-cover bg-center" 
                    style={{ backgroundImage: `url(${activeCategoryObj.image})` }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-serif text-white">{activeCategoryObj.banglaName || activeCategoryObj.name}</h2>
                      {!activeCategoryObj.isActive && (
                        <Badge variant="outline" className="border-white/10 text-white/40">Inactive</Badge>
                      )}
                    </div>
                    {activeCategoryObj.banglaName && (
                      <p className="text-sm text-emerald-400/80 mb-2">{activeCategoryObj.name}</p>
                    )}
                    {activeCategoryObj.description && (
                      <p className="text-sm text-white/60 max-w-2xl">{activeCategoryObj.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      onClick={() => setManageCategory(activeCategoryObj.name)}
                      className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Manage Members
                    </Button>
                    <Button 
                      onClick={() => setEditCategory({ ...activeCategoryObj, originalName: activeCategoryObj.name })}
                      variant="outline"
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10 px-3"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Members List Area */}
              <div className="p-6 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    Assigned Brothers
                    <Badge className="bg-white/10 text-white hover:bg-white/10">{activeCategoryMembers.length}</Badge>
                  </h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input 
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search in category..." 
                      className="pl-9 bg-white/5 border-white/10 text-white h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {activeCategoryMembers.map(contact => (
                      <div key={contact.id} className="bg-[#0F0F12] border border-white/5 rounded-lg p-4 flex items-center justify-between group hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <span className="text-emerald-500 font-medium text-sm">
                              {contact.name.charAt(0)}
                            </span>
                          </div>
                          <div className="truncate">
                            <h4 className="font-medium text-white truncate">{contact.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {contact.area || 'Unknown'}</span>
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-md flex items-center justify-center bg-white/5 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                            <Phone className="w-4 h-4" />
                          </a>
                          <a href={`https://wa.me/+88${contact.phone}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-md flex items-center justify-center bg-white/5 text-white/60 hover:text-green-400 hover:bg-green-500/10 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                    
                    {activeCategoryMembers.length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-xl">
                        <Users className="w-8 h-8 text-white/20 mx-auto mb-3" />
                        <p className="text-white/60 font-medium">No members found</p>
                        <p className="text-white/40 text-sm mt-1">Click "Manage Members" to assign brothers to this category.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/40">
              <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a category to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* Edit Category Modal (Compact Popover Style) */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editCategory?.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">English Name (System ID)</label>
              <Input 
                value={editCategory?.name || ''} 
                onChange={e => setEditCategory({...editCategory, name: e.target.value})}
                className="bg-white/5 border-white/10 text-white" 
                placeholder="e.g. Fajr Campaign"
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Bangla Name (Display Name)</label>
              <Input 
                value={editCategory?.banglaName || ''} 
                onChange={e => setEditCategory({...editCategory, banglaName: e.target.value})}
                className="bg-white/5 border-white/10 text-white" 
                placeholder="e.g. ফজর ক্যাম্পেইন"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Description</label>
              <Input 
                value={editCategory?.description || ''} 
                onChange={e => setEditCategory({...editCategory, description: e.target.value})}
                className="bg-white/5 border-white/10 text-white" 
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60">Image URL</label>
              <Input 
                value={editCategory?.image || ''} 
                onChange={e => setEditCategory({...editCategory, image: e.target.value})}
                className="bg-white/5 border-white/10 text-white" 
                placeholder="https://..."
              />
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="isActive"
                checked={editCategory?.isActive ?? true}
                onChange={e => setEditCategory({...editCategory, isActive: e.target.checked})}
                className="rounded bg-white/5 border-white/10 text-emerald-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isActive" className="text-sm cursor-pointer text-white">Active Status</label>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" onClick={() => setEditCategory(null)} variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-500 text-white hover:bg-emerald-600">
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal (Bulk Assignment) */}
      <Dialog open={!!manageCategory} onOpenChange={(open) => {
        if (!open) {
          if (draftAddedIds.size > 0 || draftRemovedIds.size > 0) {
            if (!confirm('You have unsaved member selections. Are you sure you want to cancel?')) {
              return; // prevent close
            }
          }
          setManageCategory(null);
        }
      }}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-2xl max-h-[85vh] flex flex-col p-0">
          <div className="p-6 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Manage Members</DialogTitle>
                <DialogDescription className="text-white/60 mt-1">
                  Assign brothers to <strong className="text-emerald-400">{manageCategory}</strong>
                </DialogDescription>
              </div>
              <DialogClose className="text-white/40 hover:text-white transition-colors p-2 -mr-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </DialogClose>
            </div>
            
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                value={manageSearch}
                onChange={e => setManageSearch(e.target.value)}
                placeholder="Search by name or phone..." 
                className="pl-9 bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0A0A0B]/50">
            {filteredMembersForManage.map(contact => {
              const originalHasTag = (contact.categoryTags || []).includes(manageCategory || '');
              const isAddedDraft = draftAddedIds.has(contact.id);
              const isRemovedDraft = draftRemovedIds.has(contact.id);
              
              const isSelected = (originalHasTag && !isRemovedDraft) || isAddedDraft;

              return (
                <div 
                  key={contact.id} 
                  onClick={() => toggleMemberSelection(contact.id, originalHasTag)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-[#0F0F12] border-white/5 hover:bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`shrink-0 transition-colors ${isSelected ? 'text-emerald-500' : 'text-white/20'}`}>
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className={`font-medium ${isSelected ? 'text-emerald-400' : 'text-white'}`}>{contact.name}</h4>
                      <p className="text-xs text-white/40">{contact.phone} • {contact.area || 'Unknown Area'}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none">
                      <Check className="w-3 h-3 mr-1" /> Added
                    </Badge>
                  )}
                </div>
              );
            })}
            
            {filteredMembersForManage.length === 0 && (
              <div className="text-center py-10 text-white/40">
                No members found matching your search.
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-white/5 bg-[#121214] shrink-0 flex items-center justify-between">
            <div className="text-sm text-white/60">
              Selected Members: <strong className="text-white text-base">{manageCurrentCount}</strong>
              {(draftAddedIds.size > 0 || draftRemovedIds.size > 0) && (
                <span className="ml-2 text-emerald-400 text-xs">
                  (Unsaved changes)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <DialogClose asChild>
                <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                onClick={handleSaveMembers} 
                disabled={savingMembers || (draftAddedIds.size === 0 && draftRemovedIds.size === 0)}
                className="bg-emerald-500 text-white hover:bg-emerald-600 min-w-[120px]"
              >
                {savingMembers ? 'Saving...' : 'Save Members'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
