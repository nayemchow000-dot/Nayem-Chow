import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldCheck, Lock, Globe,
  Search, Plus, Trash2, Edit3, ExternalLink, RefreshCw, Users
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Contact, MemberPermissions, UserRole } from '../types';

export default function AdminAccounts() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [assignments, setAssignments] = useState<Array<{ responsibleAccountId: string; contactId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [newPerms, setNewPerms] = useState<MemberPermissions>({
    viewAssignedMembers: true,
    logDawahForOthers: true,
    useVoiceUpdate: true,
  });
  const [createError, setCreateError] = useState('');

  // Edit modal
  const [editingAcc, setEditingAcc] = useState<any | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editPerms, setEditPerms] = useState<MemberPermissions>({
    viewAssignedMembers: true,
    logDawahForOthers: false,
    useVoiceUpdate: false,
  });
  const [editAssignedIds, setEditAssignedIds] = useState<Set<string>>(new Set());
  const [assignSearch, setAssignSearch] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchAll = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [accRes, contRes, asgRes] = await Promise.all([
        apiFetch('/api/admin/accounts'),
        apiFetch('/api/contacts'),
        apiFetch('/api/admin/assignments'),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (contRes.ok) setContactsList(await contRes.json());
      if (asgRes.ok) setAssignments(await asgRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newUsername || !newPassword) {
      setCreateError('ইউজারনেম এবং পাসওয়ার্ড দিন।');
      return;
    }

    try {
      const res = await apiFetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          permissions: newRole === 'responsible' ? newPerms : {},
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewRole('member');
        fetchAll();
      } else {
        setCreateError(data.error || 'তৈরি করতে সমস্যা হয়েছে।');
      }
    } catch {
      setCreateError('সার্ভার সমস্যা।');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAcc) return;
    setSaveLoading(true);

    try {
      const updatePayload: any = {
        role: editRole,
        permissions: editRole === 'responsible' ? editPerms : {},
        isActive: editIsActive,
        isPublic: editIsPublic,
      };
      if (editPassword.trim()) {
        updatePayload.password = editPassword.trim();
      }

      const res = await apiFetch(`/api/admin/accounts/${editingAcc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (res.ok) {
        if (editRole === 'responsible') {
          await apiFetch(`/api/admin/accounts/${editingAcc.id}/assignments`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactIds: Array.from(editAssignedIds) }),
          });
        }
        setEditingAcc(null);
        setEditPassword('');
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে অ্যাকাউন্ট "${username}" ডিলিট করবেন?`)) return;

    try {
      const res = await apiFetch(`/api/admin/accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts(prev => prev.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = accounts.filter(acc => {
    const term = search.toLowerCase();
    const nameMatch = acc.contact?.name?.toLowerCase().includes(term);
    const phoneMatch = acc.contact?.phone?.includes(term);
    const userMatch = acc.username.toLowerCase().includes(term);
    const matchesSearch = !search || nameMatch || phoneMatch || userMatch;
    const matchesRole = filterRole === 'all' || acc.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalAdmins = accounts.filter(a => a.role === 'admin').length;
  const totalResponsibles = accounts.filter(a => a.role === 'responsible').length;
  const totalPublic = accounts.filter(a => a.isPublic).length;

  const assignedCountByAcc = new Map<string, number>();
  for (const a of assignments) {
    assignedCountByAcc.set(a.responsibleAccountId, (assignedCountByAcc.get(a.responsibleAccountId) || 0) + 1);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="eyebrow">ACCOUNT GOVERNANCE</span>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-[#EDF4F0] flex items-center gap-2.5 mt-1">
            <ShieldCheck className="w-6 h-6 text-[#34D399]" />
            মেম্বার অ্যাকাউন্ট, দায়িত্বশীল ও সিকিউরিটি
          </h1>
          <p className="text-xs sm:text-sm text-[#8EA39A] mt-1">
            সদস্যের অ্যাকাউন্ট, দায়িত্বশীল রোল, পারমিশন এবং নির্দিষ্ট সদস্য নির্ধারণ করুন
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl forest-btn-primary text-xs transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন অ্যাকাউন্ট যোগ করুন</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A]">মোট অ্যাকাউন্ট</div>
          <div className="text-2xl font-serif italic text-[#EDF4F0] mt-1 tabular-nums">{accounts.length}</div>
        </div>
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A]">অ্যাডমিন (Admin)</div>
          <div className="text-2xl font-serif italic text-[#34D399] mt-1 tabular-nums">{totalAdmins}</div>
        </div>
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A]">দায়িত্বশীল (Responsible)</div>
          <div className="text-2xl font-serif italic text-[#F4A85E] mt-1 tabular-nums">{totalResponsibles}</div>
        </div>
        <div className="glass rounded-[20px] p-4">
          <div className="text-xs text-[#8EA39A]">পাবলিক প্রোফাইল</div>
          <div className="text-2xl font-serif italic text-[#B6F5D8] mt-1 tabular-nums">{totalPublic}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5D726A]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="নাম, ফোন বা ইউজারনেম দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 forest-input rounded-xl text-xs placeholder-[#5D726A]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'admin', 'responsible', 'member'] as const).map(role => (
            <button
              key={role}
              type="button"
              onClick={() => setFilterRole(role)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors border ${
                filterRole === role
                  ? 'bg-[#34D399]/18 text-[#B6F5D8] border-[#34D399]/40'
                  : 'glass-2 text-[#8EA39A] hover:text-[#EDF4F0]'
              }`}
            >
              {role === 'all' ? 'সকল' : role === 'admin' ? 'অ্যাডমিন' : role === 'responsible' ? 'দায়িত্বশীল' : 'মেম্বার'}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts List */}
      <div className="glass rounded-[22px] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#8EA39A] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#34D399]" />
            <span>অ্যাকাউন্ট তালিকা লোড হচ্ছে...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8EA39A]">
            কোনো অ্যাকাউন্ট পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.08] text-[#8EA39A] font-semibold">
                  <th className="py-3.5 px-4">মেম্বার / ইউজারনেম</th>
                  <th className="py-3.5 px-4">ফোন ও এলাকা</th>
                  <th className="py-3.5 px-4 text-center">রোল (Role)</th>
                  <th className="py-3.5 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-3.5 px-4 text-center">পাবলিক ভিউ</th>
                  <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map(acc => {
                  const assignedCnt = assignedCountByAcc.get(acc.id) || 0;
                  return (
                    <tr key={acc.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#EDF4F0]">
                          {acc.contact?.name || acc.username}
                        </div>
                        <div className="text-[11px] text-[#8EA39A] font-mono">
                          user: {acc.username}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[#EDF4F0] font-mono tabular-nums">{acc.contact?.phone || '—'}</div>
                        <div className="text-[11px] text-[#8EA39A]">{acc.contact?.area || '—'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            acc.role === 'admin'
                              ? 'bg-[#34D399]/15 text-[#B6F5D8] border border-[#34D399]/35'
                              : acc.role === 'responsible'
                              ? 'bg-[#F4A85E]/15 text-[#F4A85E] border border-[#F4A85E]/35'
                              : 'bg-white/[0.06] text-[#EDF4F0] border border-white/12'
                          }`}>
                            {acc.role === 'admin' ? 'Admin' : acc.role === 'responsible' ? 'দায়িত্বশীল' : 'Member'}
                          </span>
                          {acc.role === 'responsible' && (
                            <span className="text-[10px] text-[#8EA39A] font-mono tabular-nums">
                              {assignedCnt} জন নির্ধারিত
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                          acc.isActive
                            ? 'bg-[#34D399]/12 text-[#34D399] border border-[#34D399]/25'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                        }`}>
                          {acc.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <a
                          href={`/p/${acc.shareSlug || acc.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full transition-colors ${
                            acc.isPublic
                              ? 'bg-[#34D399]/12 text-[#B6F5D8] hover:bg-[#34D399]/22 border border-[#34D399]/25'
                              : 'bg-white/[0.05] text-[#8EA39A] hover:text-[#EDF4F0] border border-white/10'
                          }`}
                        >
                          {acc.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{acc.isPublic ? 'Public' : 'Private'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAcc(acc);
                              setEditRole(acc.role);
                              setEditPerms({
                                viewAssignedMembers: acc.permissions?.viewAssignedMembers ?? true,
                                logDawahForOthers: acc.permissions?.logDawahForOthers ?? false,
                                useVoiceUpdate: acc.permissions?.useVoiceUpdate ?? false,
                              });
                              const assigned = assignments
                                .filter((asg) => asg.responsibleAccountId === acc.id)
                                .map((asg) => asg.contactId);
                              setEditAssignedIds(new Set(assigned));
                              setAssignSearch('');
                              setEditIsActive(acc.isActive);
                              setEditIsPublic(acc.isPublic);
                              setEditPassword('');
                            }}
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#8EA39A] hover:text-[#EDF4F0] transition-colors"
                            title="সম্পাদনা, পারমিশন ও পাসওয়ার্ড রিসেট"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {acc.username !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(acc.id, acc.username)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                              title="অ্যাকাউন্ট মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Role / Permissions / Assigned Contacts Modal */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="glass-modal rounded-[22px] p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="font-semibold text-[#EDF4F0] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#34D399]" />
                অ্যাকাউন্ট সম্পাদনা: {editingAcc.contact?.name || editingAcc.username}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAcc(null)}
                className="text-[#8EA39A] hover:text-[#EDF4F0]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8EA39A] mb-1.5">রোল (Role)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'member', label: 'সাধারণ মেম্বার' },
                      { key: 'responsible', label: 'দায়িত্বশীল' },
                      { key: 'admin', label: 'অ্যাডমিন' },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setEditRole(r.key)}
                      className={`py-2 rounded-xl border text-center font-medium transition-colors ${
                        editRole === r.key
                          ? 'bg-[#34D399]/15 text-[#B6F5D8] border-[#34D399]/40'
                          : 'glass-2 text-[#8EA39A]'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {editRole === 'responsible' && (
                <>
                  <div className="p-3.5 rounded-2xl glass-2 space-y-2.5">
                    <div className="font-semibold text-[#F4A85E]">দায়িত্বশীল পারমিশন (Permissions)</div>
                    {[
                      { key: 'viewAssignedMembers' as const, label: 'নির্ধারিত সদস্যদের দেখতে পারবে' },
                      { key: 'logDawahForOthers' as const, label: 'অন্যের দাওয়াহ ও ফলো-আপ লগ করতে পারবে' },
                      { key: 'useVoiceUpdate' as const, label: 'AI ভয়েস নোট আপডেট ব্যবহার করতে পারবে' },
                    ].map((p) => (
                      <label key={p.key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-[#EDF4F0]/90">{p.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(editPerms[p.key])}
                          onChange={(e) => setEditPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                          className="w-4 h-4 accent-[#34D399]"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-2xl glass-2 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#B6F5D8] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        নির্ধারিত সদস্য ({editAssignedIds.size} জন)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      placeholder="সদস্যের নাম বা এলাকা দিয়ে খুঁজুন..."
                      className="w-full px-3 py-1.5 forest-input rounded-xl"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {contactsList
                        .filter(
                          (c) =>
                            !assignSearch ||
                            c.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                            (c.area || '').toLowerCase().includes(assignSearch.toLowerCase())
                        )
                        .map((c) => {
                          const checked = editAssignedIds.has(c.id);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.04] cursor-pointer"
                            >
                              <span className="truncate text-[#EDF4F0]/90">
                                {c.name} {c.area ? `(${c.area})` : ''}
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setEditAssignedIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(c.id)) next.delete(c.id);
                                    else next.add(c.id);
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 accent-[#34D399] shrink-0"
                              />
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[#8EA39A] mb-1">
                  পাসওয়ার্ড রিসেট করুন (খালি রাখলে আগের পাসওয়ার্ড থাকবে)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড (যেমন: 123456)"
                  className="w-full px-3 py-2 forest-input rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl glass-2">
                <span className="text-[#EDF4F0]">অ্যাকাউন্ট অ্যাক্টিভ রাখুন</span>
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#34D399]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl glass-2">
                <span className="text-[#EDF4F0]">পাবলিক প্রোফাইল সক্রিয় রাখুন</span>
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={e => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#34D399]"
                />
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAcc(null)}
                className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-[#EDF4F0] text-xs"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saveLoading}
                className="px-4 py-2 rounded-xl forest-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {saveLoading ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="glass-modal rounded-[22px] p-6 max-w-md w-full">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <h3 className="font-semibold text-[#EDF4F0] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#34D399]" />
                নতুন মেম্বার অ্যাকাউন্ট তৈরি
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#8EA39A] hover:text-[#EDF4F0]"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-400/35 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8EA39A] mb-1">ইউজারনেম বা ফোন নম্বর</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="যেমন: 017xxxxxxxx বা abdullah"
                  className="w-full px-3 py-2 forest-input rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8EA39A] mb-1">পাসওয়ার্ড</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 forest-input rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-[#8EA39A] mb-1">রোল (Role)</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 forest-input rounded-xl"
                >
                  <option value="member" className="bg-[#0A1210]">সাধারণ মেম্বার (Member)</option>
                  <option value="responsible" className="bg-[#0A1210]">দায়িত্বশীল (Responsible)</option>
                  <option value="admin" className="bg-[#0A1210]">অ্যাডমিন (Admin)</option>
                </select>
              </div>

              {newRole === 'responsible' && (
                <div className="p-3 rounded-xl glass-2 space-y-2">
                  <div className="text-[#F4A85E] font-medium">দায়িত্বশীল পারমিশন</div>
                  {[
                    { key: 'viewAssignedMembers' as const, label: 'নির্ধারিত সদস্য দেখতে পারবে' },
                    { key: 'logDawahForOthers' as const, label: 'অন্যের দাওয়াহ লগ করতে পারবে' },
                    { key: 'useVoiceUpdate' as const, label: 'ভয়েস নোট আপডেট ব্যবহার করতে পারবে' },
                  ].map((p) => (
                    <label key={p.key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-[#EDF4F0]/85">{p.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(newPerms[p.key])}
                        onChange={(e) => setNewPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                        className="w-4 h-4 accent-[#34D399]"
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-[#EDF4F0]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl forest-btn-primary"
                >
                  অ্যাকাউন্ট তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
