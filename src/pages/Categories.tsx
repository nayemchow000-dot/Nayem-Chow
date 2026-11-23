import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, Input } from '../components/ui';
import { Plus, Search, Edit2, Users, Check, Save, Image as ImageIcon, CheckSquare, Square, X, MapPin, Phone, MessageCircle, MoreVertical } from 'lucide-react';
import { Contact } from '../types';
import { apiFetch } from '../lib/api';

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
        apiFetch('/api/contacts'),
        apiFetch('/api/custom-categories')
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
      
      const res = await apiFetch(url, {
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
      const res = await apiFetch('/api/contacts/bulk-assign-category', {
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
    <div className="flex flex-col lg:h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <div className="eyebrow text-[#34D399] mb-1">CAMPAIGN INDICATORS</div>
        <h1 className="text-3xl font-serif text-[#EDF4F0]">Brother Categories</h1>
        <p className="text-[#8EA39A] mt-1 text-sm">Manage campaigns and assign brothers to specific activities</p>
      </div>

      {error && <div className="p-4 bg-rose-500/12 text-rose-300 rounded-2xl border border-rose-400/30 mb-4">{error}</div>}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* LEFT PANEL: Category List */}
        <div className="w-full lg:w-80 flex flex-col gap-4 glass rounded-[22px] p-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8EA39A]" />
            <Input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search categories..."
              className="pl-10 h-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-80 lg:max-h-none">
            {loading ? (
              <div className="text-center py-10 text-[#8EA39A] text-sm">Loading...</div>
            ) : (
              filteredCategories.map(cat => {
                const isActive = activeCategoryName === cat.name;
                const memberCount = contacts.filter(c => (c.categoryTags || []).includes(cat.name)).length;

                return (
                  <div
                    key={cat.id}
                    onClick={() => setActiveCategoryName(cat.name)}
                    className={`relative group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#34D399]/18 to-[#34D399]/4 border border-[#34D399]/35'
                        : 'bg-transparent border border-transparent hover:bg-white/[0.05]'
                    } ${!cat.isActive ? 'opacity-50' : ''}`}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#34D399] shadow-[0_0_10px_#34D399]"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center gap-3 truncate pl-1">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-[#34D399]/20 border-[#34D399]/35 text-[#B6F5D8]'
                          : 'bg-white/[0.04] border-white/10 text-[#8EA39A]'
                      }`}>
                        {cat.image ? (
                          <img src={cat.image} alt="" className="w-full h-full rounded-xl object-cover opacity-85" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="truncate">
                        <h3 className={`text-sm font-medium truncate ${isActive ? 'text-[#B6F5D8]' : 'text-[#EDF4F0]'}`}>
                          {cat.banglaName || cat.name}
                        </h3>
                        <p className="text-xs text-[#8EA39A] truncate tabular-nums">{memberCount} Members</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => setEditCategory({ name: '', banglaName: '', description: '', image: '', isActive: true, displayOrder: 0 })}
            className="w-full flex items-center gap-2 mt-auto"
          >
            <Plus className="w-4 h-4 text-[#34D399]" />
            Add Category
          </Button>
        </div>

        {/* RIGHT PANEL: Selected Category Details & Members */}
        <div className="flex-1 flex flex-col glass rounded-[22px] overflow-hidden min-w-0">
          {activeCategoryObj ? (
            <>
              {/* Category Header */}
              <div className="p-6 border-b border-white/10 relative overflow-hidden">
                {activeCategoryObj.image && (
                  <div
                    className="absolute inset-0 opacity-10 bg-cover bg-center"
                    style={{ backgroundImage: `url(${activeCategoryObj.image})` }}
                  />
                )}

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-serif text-[#EDF4F0]">{activeCategoryObj.banglaName || activeCategoryObj.name}</h2>
                      {!activeCategoryObj.isActive && (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    {activeCategoryObj.banglaName && (
                      <p className="text-sm text-[#34D399] mb-2">{activeCategoryObj.name}</p>
                    )}
                    {activeCategoryObj.description && (
                      <p className="text-sm text-[#8EA39A] max-w-2xl leading-relaxed">{activeCategoryObj.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setManageCategory(activeCategoryObj.name)}
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Manage Members
                    </Button>
                    <Button
                      onClick={() => setEditCategory({ ...activeCategoryObj, originalName: activeCategoryObj.name })}
                      variant="outline"
                      className="px-3"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Members List Area */}
              <div className="p-6 flex-1 flex flex-col min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-medium text-[#EDF4F0] flex items-center gap-2">
                    Assigned Brothers
                    <Badge variant="success" className="tabular-nums">{activeCategoryMembers.length}</Badge>
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8EA39A]" />
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search in category..."
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {activeCategoryMembers.map(contact => (
                      <div key={contact.id} className="glass-2 rounded-2xl p-4 flex items-center justify-between group hover:border-[#34D399]/35 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-[#34D399]/15 flex items-center justify-center shrink-0 border border-[#34D399]/30">
                            <span className="text-[#B6F5D8] font-medium text-sm">
                              {contact.name.charAt(0)}
                            </span>
                          </div>
                          <div className="truncate">
                            <h4 className="font-medium text-[#EDF4F0] truncate">{contact.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-[#8EA39A] mt-1">
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-[#34D399]" /> {contact.area || 'Unknown'}</span>
                              <span className="flex items-center gap-1 font-mono tabular-nums"><Phone className="w-3 h-3" /> {contact.phone}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 sm:opacity-70 group-hover:opacity-100 transition-opacity">
                          <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/10 text-[#8EA39A] hover:text-[#B6F5D8] hover:border-[#34D399]/35 transition-colors">
                            <Phone className="w-4 h-4" />
                          </a>
                          <a href={`https://wa.me/+88${contact.phone}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/10 text-[#8EA39A] hover:text-[#34D399] hover:border-[#34D399]/35 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}

                    {activeCategoryMembers.length === 0 && (
                      <div className="col-span-full py-12 text-center border border-dashed border-white/15 rounded-2xl">
                        <Users className="w-8 h-8 text-[#5D726A] mx-auto mb-3" />
                        <p className="text-[#EDF4F0]/80 font-medium">No members found</p>
                        <p className="text-[#8EA39A] text-sm mt-1">Click "Manage Members" to assign brothers to this category.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#8EA39A] p-8">
              <ImageIcon className="w-12 h-12 mb-4 opacity-30" />
              <p>Select a category to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* Edit Category Modal */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCategory?.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8EA39A]">English Name (System ID)</label>
              <Input
                value={editCategory?.name || ''}
                onChange={e => setEditCategory({...editCategory, name: e.target.value})}
                placeholder="e.g. Fajr Campaign"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8EA39A]">Bangla Name (Display Name)</label>
              <Input
                value={editCategory?.banglaName || ''}
                onChange={e => setEditCategory({...editCategory, banglaName: e.target.value})}
                placeholder="e.g. ফজর ক্যাম্পেইন"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8EA39A]">Description</label>
              <Input
                value={editCategory?.description || ''}
                onChange={e => setEditCategory({...editCategory, description: e.target.value})}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8EA39A]">Image URL</label>
              <Input
                value={editCategory?.image || ''}
                onChange={e => setEditCategory({...editCategory, image: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editCategory?.isActive ?? true}
                onChange={e => setEditCategory({...editCategory, isActive: e.target.checked})}
                className="rounded accent-[#34D399] w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isActive" className="text-sm cursor-pointer text-[#EDF4F0]">Active Status</label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" onClick={() => setEditCategory(null)} variant="outline">
                Cancel
              </Button>
              <Button type="submit">
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
              return;
            }
          }
          setManageCategory(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Manage Members</DialogTitle>
                <DialogDescription className="mt-1">
                  Assign brothers to <strong className="text-[#B6F5D8]">{manageCategory}</strong>
                </DialogDescription>
              </div>
              <DialogClose className="text-[#8EA39A] hover:text-[#EDF4F0] transition-colors p-2 -mr-2 rounded-xl hover:bg-white/10">
                <X className="w-5 h-5" />
              </DialogClose>
            </div>

            <div className="mt-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8EA39A]" />
              <Input
                value={manageSearch}
                onChange={e => setManageSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/20">
            {filteredMembersForManage.map(contact => {
              const originalHasTag = (contact.categoryTags || []).includes(manageCategory || '');
              const isAddedDraft = draftAddedIds.has(contact.id);
              const isRemovedDraft = draftRemovedIds.has(contact.id);

              const isSelected = (originalHasTag && !isRemovedDraft) || isAddedDraft;

              return (
                <div
                  key={contact.id}
                  onClick={() => toggleMemberSelection(contact.id, originalHasTag)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#34D399]/12 border-[#34D399]/40'
                      : 'glass-2 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`shrink-0 transition-colors ${isSelected ? 'text-[#34D399]' : 'text-[#5D726A]'}`}>
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className={`font-medium ${isSelected ? 'text-[#B6F5D8]' : 'text-[#EDF4F0]'}`}>{contact.name}</h4>
                      <p className="text-xs text-[#8EA39A]">{contact.phone} • {contact.area || 'Unknown Area'}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge variant="success">
                      <Check className="w-3 h-3 mr-1" /> Added
                    </Badge>
                  )}
                </div>
              );
            })}

            {filteredMembersForManage.length === 0 && (
              <div className="text-center py-10 text-[#8EA39A]">
                No members found matching your search.
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-black/25 shrink-0 flex items-center justify-between">
            <div className="text-sm text-[#8EA39A]">
              Selected Members: <strong className="text-[#EDF4F0] text-base tabular-nums">{manageCurrentCount}</strong>
              {(draftAddedIds.size > 0 || draftRemovedIds.size > 0) && (
                <span className="ml-2 text-[#34D399] text-xs">
                  (Unsaved changes)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <DialogClose asChild>
                <Button variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleSaveMembers}
                disabled={savingMembers || (draftAddedIds.size === 0 && draftRemovedIds.size === 0)}
                className="min-w-[120px]"
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
