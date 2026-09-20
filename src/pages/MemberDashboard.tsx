import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { STAGES } from '../types';
import { 
  User, ShieldCheck, Lock, Globe, Copy, Check, ExternalLink, 
  MapPin, Phone, Calendar, Award, CheckCircle2, Circle, 
  Settings, Key, AlertCircle, RefreshCw, Eye, EyeOff, Sparkles, HeartHandshake
} from 'lucide-react';
import { Link } from 'react-router';

export default function MemberDashboard() {
  const { user, refreshUser, updatePrivacy, updateProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  // Local state for privacy form
  const [isPublic, setIsPublic] = useState(false);
  const [shareSlug, setShareSlug] = useState('');
  const [customBio, setCustomBio] = useState('');
  const [privacyProfileInfo, setPrivacyProfileInfo] = useState(true);
  const [privacyGrowthStage, setPrivacyGrowthStage] = useState(true);
  const [privacyGrowthJourney, setPrivacyGrowthJourney] = useState(true);
  const [privacySalahTracking, setPrivacySalahTracking] = useState(true);
  const [privacyActivities, setPrivacyActivities] = useState(true);
  const [privacyPhone, setPrivacyPhone] = useState(false);
  const [privacyArea, setPrivacyArea] = useState(true);

  // Salah tracker state for today
  const [todaySalah, setTodaySalah] = useState<{
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  }>({
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  });
  const [savingSalah, setSavingSalah] = useState(false);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with user context
  useEffect(() => {
    if (user) {
      setIsPublic(!!user.isPublic);
      setShareSlug(user.shareSlug || `brother-${user.id.substring(0, 8)}`);
      setCustomBio(user.customBio || '');
      setPrivacyProfileInfo(user.privacyProfileInfo ?? true);
      setPrivacyGrowthStage(user.privacyGrowthStage ?? true);
      setPrivacyGrowthJourney(user.privacyGrowthJourney ?? true);
      setPrivacySalahTracking(user.privacySalahTracking ?? true);
      setPrivacyActivities(user.privacyActivities ?? true);
      setPrivacyPhone(user.privacyPhone ?? false);
      setPrivacyArea(user.privacyArea ?? true);

      // Fetch today's salah if contactId exists
      if (user.contactId) {
        fetchTodaySalah(user.contactId);
      }
    }
  }, [user]);

  const fetchTodaySalah = async (contactId: string) => {
    try {
      const token = localStorage.getItem('kotbari_auth_token');
      const res = await fetch(`/api/contacts/${contactId}/salah`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const records = await res.json();
        const todayStr = new Date().toISOString().split('T')[0];
        const record = records.find((r: any) => r.date === todayStr);
        if (record) {
          setTodaySalah({
            fajr: !!record.fajr,
            dhuhr: !!record.dhuhr,
            asr: !!record.asr,
            maghrib: !!record.maghrib,
            isha: !!record.isha,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSalah = async (prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => {
    if (!user?.contactId) return;
    const updated = { ...todaySalah, [prayer]: !todaySalah[prayer] };
    setTodaySalah(updated);

    try {
      setSavingSalah(true);
      const token = localStorage.getItem('kotbari_auth_token');
      const todayStr = new Date().toISOString().split('T')[0];
      await fetch(`/api/contacts/${user.contactId}/salah`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: todayStr,
          ...updated
        })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSalah(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    setPrivacySuccess(false);

    const ok = await updatePrivacy({
      isPublic,
      shareSlug,
      customBio,
      privacyProfileInfo,
      privacyGrowthStage,
      privacyGrowthJourney,
      privacySalahTracking,
      privacyActivities,
      privacyPhone,
      privacyArea,
    });

    setSavingPrivacy(false);
    if (ok) {
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 3000);
    }
  };

  const publicUrl = `${window.location.origin}/p/${shareSlug || user?.shareSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'নতুন পাসওয়ার্ড দুটি মিলছে না।' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।' });
      return;
    }

    try {
      const token = localStorage.getItem('kotbari_auth_token');
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordModal(false), 1500);
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।' });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'সার্ভার সমস্যা।' });
    }
  };

  const contact = user?.contact;
  const currentStageIndex = contact ? Math.max(0, (contact.currentStage || 1) - 1) : 0;
  const stageName = STAGES[currentStageIndex] || `স্টেজ ${contact?.currentStage || 1}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner & Profile Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-emerald-950/60 flex-shrink-0">
              {contact?.name ? contact.name.charAt(0) : 'দ'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {contact?.name || user?.username || 'দাওয়াহ সদস্য'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'admin' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {user?.role === 'admin' ? 'অ্যাডমিন (Admin)' : 'সদস্য (Member)'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 ${
                  isPublic 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {isPublic ? 'পাবলিক প্রোফাইল' : 'ব্যক্তিগত / প্রাইভেট'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {contact?.area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {contact.area}
                  </span>
                )}
                {contact?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {contact.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  সংযুক্ত: {contact?.firstContactDate || '২০২৬'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <Key className="w-3.5 h-3.5 text-slate-400" />
              পাসওয়ার্ড পরিবর্তন
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <Eye className="w-3.5 h-3.5" />
              পাবলিক ভিউ দেখুন
            </a>
          </div>
        </div>
      </div>

      {/* Grid: Growth & Today's Salah */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Growth Stage Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">আমার বর্তমান গ্রোথ স্টেজ</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
              স্টেজ #{contact?.currentStage || 1}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 mb-4">
            <div className="text-sm font-medium text-emerald-300 mb-1">{stageName}</div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
              <span>গ্রোথ স্কোর (অগ্রগতি)</span>
              <span className="font-bold text-white text-sm">{contact?.growthScore || 0}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, contact?.growthScore || 0))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-400">সাপ্তাহিক পরিবর্তন</div>
              <div className="text-base font-semibold text-emerald-400 mt-0.5">
                +{contact?.weeklyChange || 0}%
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-400">মাসিক পরিবর্তন</div>
              <div className="text-base font-semibold text-teal-400 mt-0.5">
                +{contact?.monthlyChange || 0}%
              </div>
            </div>
          </div>

          {contact?.categoryTags && contact.categoryTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 mb-2 font-medium">দায়িত্ব ও ক্যাটাগরি:</div>
              <div className="flex flex-wrap gap-1.5">
                {contact.categoryTags.map((tag: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700/60">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Today's Salah Tracker */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-white">আজকের ৫ ওয়াক্ত সালাহ ট্র্যাকিং</h2>
              </div>
              {savingSalah && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> সংরক্ষণ হচ্ছে...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              ওয়াক্ত অনুযায়ী সালাহ আদায় শেষে ট্যাপ করে মার্ক করুন:
            </p>

            <div className="space-y-2">
              {[
                { key: 'fajr', label: 'ফজর (Fajr)', icon: '🌅' },
                { key: 'dhuhr', label: 'যোহর (Dhuhr)', icon: '☀️' },
                { key: 'asr', label: 'আসর (Asr)', icon: '🌤️' },
                { key: 'maghrib', label: 'মাগরিব (Maghrib)', icon: '🌇' },
                { key: 'isha', label: 'এশা (Isha)', icon: '🌙' },
              ].map(prayer => {
                const isChecked = todaySalah[prayer.key as keyof typeof todaySalah];
                return (
                  <button
                    key={prayer.key}
                    type="button"
                    onClick={() => handleToggleSalah(prayer.key as any)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-sm ${
                      isChecked
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{prayer.icon}</span>
                      <span className="font-medium">{prayer.label}</span>
                    </span>
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>আজকের সম্পন্ন: {Object.values(todaySalah).filter(Boolean).length} / ৫ ওয়াক্ত</span>
            <span className="text-emerald-400 font-medium">মাশাআল্লাহ</span>
          </div>
        </div>
      </div>

      {/* Privacy & Public Profile Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">প্রাইভেসি ও পাবলিক প্রোফাইল নিয়ন্ত্রণ</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              আপনি নিজে ঠিক করতে পারবেন অন্যরা আপনার কোন তথ্য দেখতে পারবে এবং কোন তথ্য সম্পূর্ণ গোপন থাকবে।
            </p>
          </div>

          {/* Master Public / Private Toggle */}
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-xs font-medium text-slate-300">
              {isPublic ? 'পাবলিক (সক্রিয়)' : 'প্রাইভেট (লুকানো)'}
            </span>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                isPublic ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div className="my-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            আপনার শেয়ারেবল পাবলিক প্রোফাইল লিংক:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 overflow-hidden">
              <Globe className="w-4 h-4 text-emerald-400 mr-2 flex-shrink-0" />
              <span className="truncate">{publicUrl}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-emerald-500/30"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ভিজিট করুন</span>
              </a>
            </div>
          </div>
          {!isPublic && (
            <p className="text-[11px] text-amber-400/90 mt-2 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              বর্তমানে আপনার প্রোফাইলটি প্রাইভেট রয়েছে। পাবলিক লিংকে ভিজিট করলে প্রাইভেট বার্তা দেখাবে।
            </p>
          )}
        </div>

        {/* Granular Privacy Toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">পাবলিক প্রোফাইলে কোন তথ্যগুলো দেখাবেন?</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">প্রোফাইল তথ্য (নাম ও ছবি)</div>
                <div className="text-[11px] text-slate-400">পাবলিক ভিজিটরে আপনার নাম প্রদর্শিত হবে</div>
              </div>
              <input
                type="checkbox"
                checked={privacyProfileInfo}
                onChange={e => setPrivacyProfileInfo(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </div>

            {/* Toggle 2: Phone */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">ফোন নম্বর (Phone Number)</div>
                <div className="text-[11px] text-slate-400">ডিফল্টভাবে বন্ধ থাকে নিরাপত্তার জন্য</div>
              </div>
              <input
                type="checkbox"
                checked={privacyPhone}
                onChange={e => setPrivacyPhone(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </div>

            {/* Toggle 3: Area */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">এলাকা / ঠিকানা (Area)</div>
                <div className="text-[11px] text-slate-400">আপনার বাসস্থানের এলাকা দেখাবে</div>
              </div>
              <input
                type="checkbox"
                checked={privacyArea}
                onChange={e => setPrivacyArea(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </div>

            {/* Toggle 4: Growth Stage */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">গ্রোথ স্টেজ ও অগ্রগতি স্কোর</div>
                <div className="text-[11px] text-slate-400">বর্তমানে কোন স্টেজে আছেন তা দেখাবে</div>
              </div>
              <input
                type="checkbox"
                checked={privacyGrowthStage}
                onChange={e => setPrivacyGrowthStage(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </div>

            {/* Toggle 5: Growth Journey */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">দাওয়াহ জার্নি ও দায়িত্ব সমূহ</div>
                <div className="text-[11px] text-slate-400">মুভমেন্টে যুক্ত হওয়ার তারিখ ও দায়িত্বসমূহ</div>
              </div>
              <input
                type="checkbox"
                checked={privacyGrowthJourney}
                onChange={e => setPrivacyGrowthJourney(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </div>

            {/* Toggle 6: Salah Tracking */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">সালাহ ট্র্যাকিং রেকর্ড</div>
                <div className="text-[11px] text-slate-400">সালাহ আদায়ের পরিসংখ্যান প্রকাশ্যে প্রদর্শন</div>
              </div>
              <input
                type="checkbox"
                checked={privacySalahTracking}
                onChange={e => setPrivacySalahTracking(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </div>

            {/* Toggle 7: Activities */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 sm:col-span-2">
              <div>
                <div className="text-xs font-medium text-slate-200">দাওয়াহ কার্যক্রমের রেকর্ড</div>
                <div className="text-[11px] text-slate-400">মিটিং, তালীম বা অন্য দাওয়াহ সেশনের ইতিহাস</div>
              </div>
              <input
                type="checkbox"
                checked={privacyActivities}
                onChange={e => setPrivacyActivities(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          {/* Custom Bio & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                পাবলিক লিংক কাস্টমাইজ (URL Slug)
              </label>
              <div className="flex items-center">
                <span className="bg-slate-800 px-2.5 py-2 rounded-l-xl text-xs text-slate-400 border border-r-0 border-slate-700">
                  /p/
                </span>
                <input
                  type="text"
                  value={shareSlug}
                  onChange={e => setShareSlug(e.target.value)}
                  placeholder="যেমন: brother-naim"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-r-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                ব্যক্তিগত পরিচয় / বায়ো (Custom Bio)
              </label>
              <input
                type="text"
                value={customBio}
                onChange={e => setCustomBio(e.target.value)}
                placeholder="যেমন: কোটবাড়ি দাওয়াহ মুভমেন্টের সদস্য"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex items-center justify-between">
            {privacySuccess ? (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> সেটিংস সফলভাবে সংরক্ষিত হয়েছে!
              </span>
            ) : <div />}

            <button
              type="button"
              onClick={handleSavePrivacy}
              disabled={savingPrivacy}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950/30 disabled:opacity-50"
            >
              {savingPrivacy ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>প্রাইভেসি সেটিংস সেভ করুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                পাসওয়ার্ড পরিবর্তন করুন
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {passwordMsg && (
              <div className={`p-3 rounded-xl mb-4 text-xs ${
                passwordMsg.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">বর্তমান পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="বর্তমান পাসওয়ার্ড দিন"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড দিন"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
