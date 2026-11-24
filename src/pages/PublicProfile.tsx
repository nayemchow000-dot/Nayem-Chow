import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { 
  ShieldCheck, Lock, Globe, MapPin, Phone, Calendar, 
  Award, CheckCircle2, HeartHandshake, ArrowLeft, LogIn 
} from 'lucide-react';
import { STAGES } from '../types';
import { apiFetch } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/public/profile/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8EA39A] relative overflow-hidden">
        <div className="flex items-center gap-3 glass px-5 py-3 rounded-2xl relative z-10">
          <div className="w-5 h-5 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin" />
          <span>প্রোফাইল লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="max-w-md w-full glass rounded-[24px] p-8 relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl glass-2 flex items-center justify-center text-[#8EA39A] mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-[#EDF4F0] mb-2">প্রোফাইল পাওয়া যায়নি</h1>
          <p className="text-sm text-[#8EA39A] max-w-sm mb-6">
            এই লিংকের কোনো দাওয়াহ সদস্য একাউন্ট খুঁজে পাওয়া যায়নি অথবা লিংকটি পরিবর্তিত হয়েছে।
          </p>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl forest-btn-primary text-xs transition-all inline-flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            লগইন পোর্টালে যান
          </Link>
        </div>
      </div>
    );
  }

  // Profile is PRIVATE
  if (!profile.isPublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="absolute top-1/4 w-96 h-96 bg-[#34D399]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full glass rounded-[24px] p-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl glass-hot flex items-center justify-center text-[#F4A85E] mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-bold text-[#EDF4F0] mb-2">এই প্রোফাইলটি ব্যক্তিগত (Private)</h1>
          <p className="text-xs text-[#8EA39A] mb-6 leading-relaxed">
            {profile.message || 'এই সদস্যের বিস্তারিত প্রোফাইল সাধারণ ভিজিটরদের জন্য গোপন রাখা হয়েছে। শুধুমাত্র অথরাইজড মেম্বাররা একাউন্টে লগইন করে তথ্য দেখতে পারবেন।'}
          </p>

          <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full py-2.5 rounded-xl forest-btn-primary text-xs transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              কোটবাড়ি মুভমেন্টে লগইন করুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Profile is PUBLIC
  const settings = profile.settings || {};
  const stageIndex = profile.currentStage ? Math.max(0, profile.currentStage - 1) : 0;
  const stageName = STAGES[stageIndex] || `স্টেজ ${profile.currentStage || 1}`;

  return (
    <div className="min-h-screen text-[#EDF4F0] py-10 px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-28 -left-24 w-[420px] h-[420px] rounded-full bg-[#34D399]/12 blur-[110px]" />
        <div className="absolute -bottom-24 right-0 w-[360px] h-[360px] rounded-full bg-[#DD7B3C]/10 blur-[110px]" />
      </div>

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Top Navbar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" />
            <div>
              <div className="text-xs font-bold text-[#EDF4F0]">কোটবাড়ি দাওয়াহ মুভমেন্ট</div>
              <div className="text-[10px] text-[#8EA39A]">ভেরিফাইড মেম্বার প্রোফাইল</div>
            </div>
          </div>

          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded-xl glass-2 text-[#EDF4F0] hover:border-white/25 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5 text-[#34D399]" />
            <span>লগইন</span>
          </Link>
        </div>

        {/* Hero Card */}
        <div className="glass rounded-[24px] p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#34D399]/12 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#34D399] to-[#0E9F6E] flex items-center justify-center text-[#04140D] text-3xl font-bold shadow-[0_12px_28px_rgba(52,211,153,0.28)] flex-shrink-0">
              {profile.name ? profile.name.charAt(0) : 'দ'}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-serif italic text-[#EDF4F0]">
                  {profile.name || 'দাওয়াহ সদস্য'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#B6F5D8] text-xs font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> মুভমেন্ট সদস্য
                </span>
              </div>

              {profile.customBio && (
                <p className="text-xs sm:text-sm text-[#EDF4F0]/85 mb-3 italic">
                  "{profile.customBio}"
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-[#8EA39A]">
                {profile.area && (
                  <span className="flex items-center gap-1 glass-2 px-2.5 py-1 rounded-xl">
                    <MapPin className="w-3 h-3 text-[#34D399]" />
                    {profile.area}
                  </span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1 glass-2 px-2.5 py-1 rounded-xl font-mono tabular-nums">
                    <Phone className="w-3 h-3 text-[#34D399]" />
                    {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 glass-2 px-2.5 py-1 rounded-xl tabular-nums">
                  <Calendar className="w-3 h-3 text-[#34D399]" />
                  মুভমেন্টে যুক্ত: {profile.firstContactDate || '২০২৬'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Stage Section (if enabled by member) */}
        {settings.showGrowthStage && profile.currentStage && (
          <div className="glass rounded-[22px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#34D399]" />
                <h2 className="font-semibold text-[#EDF4F0] text-sm">দাওয়াহ গ্রোথ স্টেজ</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#B6F5D8] font-semibold tabular-nums">
                স্টেজ #{profile.currentStage}
              </span>
            </div>

            <div className="p-4 rounded-2xl glass-2">
              <div className="text-sm font-medium text-[#B6F5D8] mb-2">{stageName}</div>
              <div className="flex items-center justify-between text-xs text-[#8EA39A] mb-1.5">
                <span>গ্রোথ অগ্রগতি স্কোর</span>
                <span className="font-bold text-[#EDF4F0] tabular-nums">{profile.growthScore || 0}%</span>
              </div>
              <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#34D399] to-[#B6F5D8] h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, profile.growthScore || 0))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Categories / Responsibility Journey (if enabled by member) */}
        {settings.showGrowthJourney && profile.categoryTags && profile.categoryTags.length > 0 && (
          <div className="glass rounded-[22px] p-6">
            <h2 className="font-semibold text-[#EDF4F0] text-sm mb-3">মুভমেন্টের দায়িত্ব ও কার্যক্রমসমূহ</h2>
            <div className="flex flex-wrap gap-2">
              {profile.categoryTags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full glass-2 text-[#EDF4F0] text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Salah Tracking Overview (if enabled by member) */}
        {settings.showSalahTracking && profile.salahRecords && profile.salahRecords.length > 0 && (
          <div className="glass rounded-[22px] p-6">
            <div className="flex items-center gap-2 mb-3">
              <HeartHandshake className="w-5 h-5 text-[#34D399]" />
              <h2 className="font-semibold text-[#EDF4F0] text-sm">সাম্প্রতিক সালাহ ট্র্যাকিং রেকর্ড</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#8EA39A]">
                    <th className="py-2.5 px-2">তারিখ</th>
                    <th className="py-2.5 px-2 text-center">ফজর</th>
                    <th className="py-2.5 px-2 text-center">যোহর</th>
                    <th className="py-2.5 px-2 text-center">আসর</th>
                    <th className="py-2.5 px-2 text-center">মাগরিব</th>
                    <th className="py-2.5 px-2 text-center">এশা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {profile.salahRecords.slice(0, 5).map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.03]">
                      <td className="py-2.5 px-2 text-[#EDF4F0] font-mono tabular-nums">{r.date}</td>
                      <td className="py-2.5 px-2 text-center">{r.fajr ? '✅' : '—'}</td>
                      <td className="py-2.5 px-2 text-center">{r.dhuhr ? '✅' : '—'}</td>
                      <td className="py-2.5 px-2 text-center">{r.asr ? '✅' : '—'}</td>
                      <td className="py-2.5 px-2 text-center">{r.maghrib ? '✅' : '—'}</td>
                      <td className="py-2.5 px-2 text-center">{r.isha ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-xs text-[#5D726A] border-t border-white/[0.08]">
          <p>© ২০২৬ কোটবাড়ি দাওয়াহ মুভমেন্ট ট্র্যাকিং সিস্টেম</p>
          <p className="mt-1">সকল সদস্যের ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষা করা হয়</p>
        </div>
      </div>
    </div>
  );
}
