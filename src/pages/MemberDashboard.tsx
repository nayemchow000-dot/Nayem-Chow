import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { STAGES } from '../types';
import { 
  User, ShieldCheck, Lock, Globe, Copy, Check, ExternalLink, 
  MapPin, Phone, Calendar, Award, CheckCircle2, Circle, 
  Settings, Key, AlertCircle, RefreshCw, Eye, EyeOff, Sparkles, HeartHandshake, Mic
} from 'lucide-react';
import { Link } from 'react-router';
import { apiFetch } from '../lib/api';
import VoiceDawahModal from '../components/VoiceDawahModal';
import { getDhakaDateStr, formatMinutesBn } from '../lib/dhakaTime';

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
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [assignedResponsibles, setAssignedResponsibles] = useState<Array<{ id: string; name: string; phone?: string | null }>>([]);
  const [homeStats, setHomeStats] = useState<{ productiveMinutes: number; screenMinutes: number | null } | null>(null);
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
      apiFetch('/api/my-home/overview')
        .then((r) => (r.ok ? r.json() : null))
        .then((ov) => {
          if (ov) {
            setAssignedResponsibles(Array.isArray(ov.assignedResponsibles) ? ov.assignedResponsibles : []);
            setHomeStats({
              productiveMinutes: ov.todayProductiveMinutes || 0,
              screenMinutes: ov.todayScreenTime?.minutes ?? null,
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const fetchTodaySalah = async (contactId: string) => {
    try {
      const res = await apiFetch(`/api/contacts/${contactId}/salah`);
      if (res.ok) {
        const records = await res.json();
        const todayStr = getDhakaDateStr(0);
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
      const todayStr = getDhakaDateStr(0);
      await apiFetch(`/api/contacts/${user.contactId}/salah`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
      <div className="glass rounded-[24px] p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-[#34D399]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34D399] to-[#0E9F6E] flex items-center justify-center text-[#04140D] text-2xl font-bold shadow-[0_12px_28px_rgba(52,211,153,0.28)] flex-shrink-0">
              {contact?.name ? contact.name.charAt(0) : 'দ'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-xl sm:text-2xl font-serif italic text-[#EDF4F0]">
                  {contact?.name || user?.username || 'দাওয়াহ সদস্য'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'admin' 
                    ? 'bg-[#34D399]/15 text-[#B6F5D8] border border-[#34D399]/35' 
                    : 'bg-white/[0.08] text-[#EDF4F0] border border-white/15'
                }`}>
                  {user?.role === 'admin' ? 'অ্যাডমিন (Admin)' : 'সদস্য (Member)'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 ${
                  isPublic 
                    ? 'bg-[#34D399]/15 text-[#B6F5D8] border border-[#34D399]/30' 
                    : 'bg-[#F4A85E]/15 text-[#F4A85E] border border-[#F4A85E]/35'
                }`}>
                  {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {isPublic ? 'পাবলিক প্রোফাইল' : 'ব্যক্তিগত / প্রাইভেট'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#8EA39A]">
                {contact?.area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#34D399]" />
                    {contact.area}
                  </span>
                )}
                {contact?.phone && (
                  <span className="flex items-center gap-1 font-mono tabular-nums">
                    <Phone className="w-3.5 h-3.5 text-[#34D399]" />
                    {contact.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-[#34D399]" />
                  সংযুক্ত: {contact?.firstContactDate || '২০২৬'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {contact && (
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-[#34D399]/35 bg-[#34D399]/15 hover:bg-[#34D399]/25 text-[#B6F5D8] text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5 text-[#34D399]" />
                AI ভয়েস আপডেট
              </button>
            )}
            <Link
              to="/my-track?voice=1"
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-[#EDF4F0] text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
              ট্র্যাক ভয়েস
            </Link>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-[#EDF4F0] text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-[#8EA39A]" />
              পাসওয়ার্ড পরিবর্তন
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl forest-btn-primary text-xs transition-all flex items-center gap-1.5"
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
        <div className="glass rounded-[22px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#34D399]" />
              <h2 className="font-semibold text-[#EDF4F0]">আমার বর্তমান গ্রোথ স্টেজ</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#B6F5D8] font-semibold tabular-nums">
              স্টেজ #{contact?.currentStage || 1}
            </span>
          </div>

          <div className="p-4 rounded-2xl glass-2 mb-4">
            <div className="text-sm font-medium text-[#B6F5D8] mb-1">{stageName}</div>
            <div className="flex items-center justify-between text-xs text-[#8EA39A] mt-3">
              <span>গ্রোথ স্কোর (অগ্রগতি)</span>
              <span className="font-bold text-[#EDF4F0] text-sm tabular-nums">{contact?.growthScore || 0}%</span>
            </div>
            <div className="w-full bg-white/[0.08] h-2.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-gradient-to-r from-[#34D399] to-[#B6F5D8] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, contact?.growthScore || 0))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl glass-2">
              <div className="text-[#8EA39A]">সাপ্তাহিক পরিবর্তন</div>
              <div className="text-base font-semibold text-[#34D399] mt-0.5 tabular-nums">
                +{contact?.weeklyChange || 0}%
              </div>
            </div>
            <div className="p-3.5 rounded-2xl glass-2">
              <div className="text-[#8EA39A]">মাসিক পরিবর্তন</div>
              <div className="text-base font-semibold text-[#B6F5D8] mt-0.5 tabular-nums">
                +{contact?.monthlyChange || 0}%
              </div>
            </div>
          </div>

          {contact?.categoryTags && contact.categoryTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <div className="text-xs text-[#8EA39A] mb-2 font-medium">দায়িত্ব ও ক্যাটাগরি:</div>
              <div className="flex flex-wrap gap-1.5">
                {contact.categoryTags.map((tag: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[#EDF4F0] text-xs border border-white/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-2 text-xs">
            <div className="text-[#8EA39A] font-medium">নির্ধারিত দাওয়াহ কর্মী / দায়িত্বশীল:</div>
            {assignedResponsibles.length === 0 ? (
              <div className="text-[#8EA39A]">কোটবাড়ি অ্যাডমিন টিম</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignedResponsibles.map((r) => (
                  <span key={r.id} className="px-2.5 py-1 rounded-xl glass-2 text-[#B6F5D8]">
                    {r.name} {r.phone ? `· ${r.phone}` : ''}
                  </span>
                ))}
              </div>
            )}
            {homeStats && (
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-[#8EA39A] tabular-nums">
                <span>আজ Productive: <strong className="text-[#34D399]">{formatMinutesBn(homeStats.productiveMinutes)}</strong></span>
                <span>আজ Screen Time: <strong className="text-[#F4A85E]">{homeStats.screenMinutes !== null ? formatMinutesBn(homeStats.screenMinutes) : 'লগ বাকি'}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Today's Salah Tracker */}
        <div className="glass rounded-[22px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#34D399]" />
                <h2 className="font-semibold text-[#EDF4F0]">আজকের ৫ ওয়াক্ত সালাহ ট্র্যাকিং</h2>
              </div>
              {savingSalah && (
                <span className="text-[11px] text-[#34D399] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> সংরক্ষণ হচ্ছে...
                </span>
              )}
            </div>
            <p className="text-xs text-[#8EA39A] mb-4">
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
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-sm ${
                      isChecked
                        ? 'bg-[#34D399]/12 border-[#34D399]/40 text-[#B6F5D8]'
                        : 'glass-2 text-[#EDF4F0]/85 hover:border-white/25'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{prayer.icon}</span>
                      <span className="font-medium">{prayer.label}</span>
                    </span>
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-[#34D399] text-[#04140D]' : 'bg-white/[0.08] text-[#8EA39A]'
                    }`}>
                      {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.08] text-[11px] text-[#8EA39A] flex items-center justify-between tabular-nums">
            <span>আজকের সম্পন্ন: {Object.values(todaySalah).filter(Boolean).length} / ৫ ওয়াক্ত</span>
            <span className="text-[#34D399] font-medium">মাশাআল্লাহ</span>
          </div>
        </div>
      </div>

      {/* Privacy & Public Profile Settings */}
      <div className="glass rounded-[24px] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-[#34D399]" />
              <h2 className="text-lg sm:text-xl font-bold text-[#EDF4F0]">প্রাইভেসি ও পাবলিক প্রোফাইল নিয়ন্ত্রণ</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#8EA39A]">
              আপনি নিজে ঠিক করতে পারবেন অন্যরা আপনার কোন তথ্য দেখতে পারবে এবং কোন তথ্য সম্পূর্ণ গোপন থাকবে।
            </p>
          </div>

          {/* Master Public / Private Toggle */}
          <div className="flex items-center gap-3 glass-2 px-3 py-2 rounded-2xl">
            <span className="text-xs font-medium text-[#EDF4F0]">
              {isPublic ? 'পাবলিক (সক্রিয়)' : 'প্রাইভেট (লুকানো)'}
            </span>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                isPublic ? 'bg-[#34D399]' : 'bg-white/15'
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
        <div className="my-6 p-4 rounded-2xl glass-2">
          <label className="block text-xs font-semibold text-[#EDF4F0] mb-2">
            আপনার শেয়ারেবল পাবলিক প্রোফাইল লিংক:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center forest-input rounded-xl px-3 py-2 text-xs text-[#EDF4F0] overflow-hidden">
              <Globe className="w-4 h-4 text-[#34D399] mr-2 flex-shrink-0" />
              <span className="truncate font-mono">{publicUrl}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] text-[#EDF4F0] text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-[#34D399]/15 hover:bg-[#34D399]/25 text-[#B6F5D8] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-[#34D399]/35"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ভিজিট করুন</span>
              </a>
            </div>
          </div>
          {!isPublic && (
            <p className="text-[11px] text-[#F4A85E] mt-2 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              বর্তমানে আপনার প্রোফাইলটি প্রাইভেট রয়েছে। পাবলিক লিংকে ভিজিট করলে প্রাইভেট বার্তা দেখাবে।
            </p>
          )}
        </div>

        {/* Granular Privacy Toggles */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#EDF4F0]">পাবলিক প্রোফাইলে কোন তথ্যগুলো দেখাবেন?</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl glass-2">
              <div>
                <div className="text-xs font-medium text-[#EDF4F0]">প্রোফাইল তথ্য (নাম ও ছবি)</div>
                <div className="text-[11px] text-[#8EA39A]">পাবলিক ভিজিটরে আপনার নাম প্রদর্শিত হবে</div>
              </div>
              <input
                type="checkbox"
                checked={privacyProfileInfo}
                onChange={e => setPrivacyProfileInfo(e.target.checked)}
                className="w-4 h-4 rounded accent-[#34D399]"
              />
            </div>

            {/* Toggle 2: Phone */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl glass-2">
              <div>
                <div className="text-xs font-medium text-[#EDF4F0]">ফোন নম্বর (Phone Number)</div>
                <div className="text-[11px] text-[#8EA39A]">ডিফল্টভাবে বন্ধ থাকে নিরাপত্তার জন্য</div>
              </div>
              <input
                type="checkbox"
                checked={privacyPhone}
                onChange={e => setPrivacyPhone(e.target.checked)}
                className="w-4 h-4 rounded accent-[#34D399]"
              />
            </div>

            {/* Toggle 3: Area */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl glass-2">
              <div>
                <div className="text-xs font-medium text-[#EDF4F0]">এলাকা / ঠিকানা (Area)</div>
                <div className="text-[11px] text-[#8EA39A]">আপনার বাসস্থানের এলাকা দেখাবে</div>
              </div>
              <input
                type="checkbox"
                checked={privacyArea}
                onChange={e => setPrivacyArea(e.target.checked)}
                className="w-4 h-4 rounded accent-[#34D399]"
              />
            </div>

            {/* Toggle 4: Growth Stage */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl glass-2">
              <div>
                <div className="text-xs font-medium text-[#EDF4F0]">গ্রোথ স্টেজ ও অগ্রগতি স্কোর</div>
                <div className="text-[11px] text-[#8EA39A]">বর্তমানে কোন স্টেজে আছেন তা দেখাবে</div>
              </div>
              <input
                type="checkbox"
                checked={privacyGrowthStage}
                onChange={e => setPrivacyGrowthStage(e.target.checked)}
                className="w-4 h-4 rounded accent-[#34D399]"
              />
            </div>

            {/* Toggle 5: Growth Journey */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl glass-2">
              <div>
                <div className="text-xs font-medium text-[#EDF4F0]">দাওয়াহ জার্নি ও দায়িত্ব সমূহ</div>
                <div className="text-[11px] text-[#8EA39A]">মুভমেন্টে যুক্ত হওয়ার তারিখ ও দায়িত্বসমূহ</div>
              </div>
              <input
                type="checkbox"
                checked={privacyGrowthJourney}
                onChange={e => setPrivacyGrowthJourney(e.target.checked)}
                className="w-4 h-4 rounded accent-[#34D399]"
              />
            </div>

            {/* Toggle 6: Salah Tracking */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl glass-2">
              <div>
                <div className="text-xs font-medium text-[#EDF4F0]">সালাহ ট্র্যাকিং রেকর্ড</div>
                <div className="text-[11px] text-[#8EA39A]">সালাহ আদায়ের পরিসংখ্যান প্রকাশ্যে প্রদর্শন</div>
              </div>
              <input
                type="checkbox"
                checked={privacySalahTracking}
                onChange={e => setPrivacySalahTracking(e.target.checked)}
                className="w-4 h-4 rounded accent-[#34D399]"
              />
            </div>

            {/* Toggle 7: Activities */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl glass-2 sm:col-span-2">
              <div>
                <div className="text-xs font-medium text-[#EDF4F0]">দাওয়াহ কার্যক্রমের রেকর্ড</div>
                <div className="text-[11px] text-[#8EA39A]">মিটিং, তালীম বা অন্য দাওয়াহ সেশনের ইতিহাস</div>
              </div>
              <input
                type="checkbox"
                checked={privacyActivities}
                onChange={e => setPrivacyActivities(e.target.checked)}
                className="w-4 h-4 rounded accent-[#34D399]"
              />
            </div>
          </div>

          {/* Custom Bio & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-[#EDF4F0] mb-1">
                পাবলিক লিংক কাস্টমাইজ (URL Slug)
              </label>
              <div className="flex items-center">
                <span className="bg-white/[0.06] px-2.5 py-2 rounded-l-xl text-xs text-[#8EA39A] border border-r-0 border-white/12 font-mono">
                  /p/
                </span>
                <input
                  type="text"
                  value={shareSlug}
                  onChange={e => setShareSlug(e.target.value)}
                  placeholder="যেমন: brother-naim"
                  className="w-full px-3 py-2 forest-input rounded-r-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#EDF4F0] mb-1">
                ব্যক্তিগত পরিচয় / বায়ো (Custom Bio)
              </label>
              <input
                type="text"
                value={customBio}
                onChange={e => setCustomBio(e.target.value)}
                placeholder="যেমন: কোটবাড়ি দাওয়াহ মুভমেন্টের সদস্য"
                className="w-full px-3 py-2 forest-input rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex items-center justify-between">
            {privacySuccess ? (
              <span className="text-xs text-[#34D399] font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> সেটিংস সফলভাবে সংরক্ষিত হয়েছে!
              </span>
            ) : <div />}

            <button
              type="button"
              onClick={handleSavePrivacy}
              disabled={savingPrivacy}
              className="px-5 py-2.5 rounded-xl forest-btn-primary text-xs transition-all flex items-center gap-2 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="glass-modal rounded-[22px] p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h3 className="font-semibold text-[#EDF4F0] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#34D399]" />
                পাসওয়ার্ড পরিবর্তন করুন
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-[#8EA39A] hover:text-[#EDF4F0] text-sm"
              >
                ✕
              </button>
            </div>

            {passwordMsg && (
              <div className={`p-3 rounded-xl mb-4 text-xs ${
                passwordMsg.type === 'success' 
                  ? 'bg-[#34D399]/15 border border-[#34D399]/35 text-[#B6F5D8]' 
                  : 'bg-rose-500/15 border border-rose-400/35 text-rose-300'
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8EA39A] mb-1">বর্তমান পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="বর্তমান পাসওয়ার্ড দিন"
                  className="w-full px-3 py-2 forest-input rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8EA39A] mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                  className="w-full px-3 py-2 forest-input rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8EA39A] mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড দিন"
                  className="w-full px-3 py-2 forest-input rounded-xl text-xs"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-[#EDF4F0] text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl forest-btn-primary text-xs"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contact && (
        <VoiceDawahModal
          open={voiceModalOpen}
          onOpenChange={setVoiceModalOpen}
          member={{
            id: contact.id,
            name: contact.name,
            currentStage: contact.currentStage,
            priorityLevel: contact.priorityLevel,
            categoryTags: contact.categoryTags,
          }}
          onApproved={() => {
            refreshUser();
          }}
        />
      )}
    </div>
  );
}
