import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Shield, ShieldCheck, Key, Lock, Globe, 
  Search, Plus, Check, Trash2, Edit3, ExternalLink, RefreshCw, AlertCircle 
} from 'lucide-react';

export default function AdminAccounts() {
  const { token, isAdmin } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'member'>('all');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [createError, setCreateError] = useState('');

  // Edit modal
  const [editingAcc, setEditingAcc] = useState<any | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchAccounts = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/admin/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newUsername || !newPassword) {
      setCreateError('ইউজারনেম এবং পাসওয়ার্ড দিন।');
      return;
    }

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setNewUsername('');
        setNewPassword('');
        fetchAccounts();
      } else {
        setCreateError(data.error || 'তৈরি করতে সমস্যা হয়েছে।');
      }
    } catch (err) {
      setCreateError('সার্ভার সমস্যা।');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAcc) return;
    setSaveLoading(true);

    try {
      const updatePayload: any = {
        role: editRole,
        isActive: editIsActive,
        isPublic: editIsPublic,
      };
      if (editPassword.trim()) {
        updatePayload.password = editPassword.trim();
      }

      const res = await fetch(`/api/admin/accounts/${editingAcc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (res.ok) {
        setEditingAcc(null);
        setEditPassword('');
        fetchAccounts();
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
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
  const totalPublic = accounts.filter(a => a.isPublic).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            মেম্বার অ্যাকাউন্ট ও সিকিউরিটি ম্যানেজমেন্ট
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            সকল দাওয়াহ সদস্যের অ্যাকাউন্ট, পাসওয়ার্ড রিসেট, রোল ও প্রাইভেসি নিয়ন্ত্রণ করুন
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন অ্যাকাউন্ট যোগ করুন</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">মোট মেম্বার অ্যাকাউন্ট</div>
          <div className="text-xl font-bold text-white mt-1">{accounts.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">অ্যাডমিন (Admin)</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{totalAdmins}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">সাধারণ মেম্বার</div>
          <div className="text-xl font-bold text-blue-400 mt-1">{accounts.length - totalAdmins}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">পাবলিক প্রোফাইল সক্রিয়</div>
          <div className="text-xl font-bold text-teal-400 mt-1">{totalPublic}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="নাম, ফোন বা ইউজারনেম দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'admin', 'member'] as const).map(role => (
            <button
              key={role}
              type="button"
              onClick={() => setFilterRole(role)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
                filterRole === role
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {role === 'all' ? 'সকল' : role === 'admin' ? 'অ্যাডমিন' : 'মেম্বার'}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>অ্যাকাউন্ট তালিকা লোড হচ্ছে...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            কোনো অ্যাকাউন্ট পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3 px-4">মেম্বার / ইউজারনেম</th>
                  <th className="py-3 px-4">ফোন ও এলাকা</th>
                  <th className="py-3 px-4 text-center">রোল (Role)</th>
                  <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-center">পাবলিক ভিউ</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(acc => (
                  <tr key={acc.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        {acc.contact?.name || acc.username}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        user: {acc.username}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-300">{acc.contact?.phone || '—'}</div>
                      <div className="text-[11px] text-slate-500">{acc.contact?.area || '—'}</div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        acc.role === 'admin'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {acc.role === 'admin' ? 'Admin' : 'Member'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        acc.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {acc.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <a
                        href={`/p/${acc.shareSlug || acc.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                          acc.isPublic
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {acc.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{acc.isPublic ? 'Public' : 'Private'}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAcc(acc);
                            setEditRole(acc.role);
                            setEditIsActive(acc.isActive);
                            setEditIsPublic(acc.isPublic);
                            setEditPassword('');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="সম্পাদনা ও পাসওয়ার্ড রিসেট"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {acc.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(acc.id, acc.username)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="অ্যাকাউন্ট মুছুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Password Reset Modal */}
      {editingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                অ্যাকাউন্ট সম্পাদনা: {editingAcc.contact?.name || editingAcc.username}
              </h3>
              <button
                type="button"
                onClick={() => setEditingAcc(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">রোল (Role)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('member')}
                    className={`py-2 rounded-xl border text-center font-medium ${
                      editRole === 'member'
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    সাধারণ মেম্বার
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`py-2 rounded-xl border text-center font-medium ${
                      editRole === 'admin'
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    অ্যাডমিন (Admin)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  পাসওয়ার্ড রিসেট করুন (খালি রাখলে আগের পাসওয়ার্ড থাকবে)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড (যেমন: 123456)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>অ্যাকাউন্ট অ্যাক্টিভ রাখুন</span>
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span>পাবলিক প্রোফাইল সক্রিয় রাখুন</span>
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={e => setEditIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAcc(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saveLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                {saveLoading ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                নতুন মেম্বার অ্যাকাউন্ট তৈরি
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">ইউজারনেম বা ফোন নম্বর</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="যেমন: 017xxxxxxxx বা abdullah"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">পাসওয়ার্ড</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">রোল (Role)</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="member">সাধারণ মেম্বার (Member)</option>
                  <option value="admin">অ্যাডমিন (Admin)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
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
