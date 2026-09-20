import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { 
  ShieldCheck, Lock, Globe, MapPin, Phone, Calendar, 
  Award, CheckCircle2, HeartHandshake, ArrowLeft, LogIn 
} from 'lucide-react';
import { STAGES } from '../types';

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
        const res = await fetch(`/api/public/profile/${slug}`);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>প্রোফাইল লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">প্রোফাইল পাওয়া যায়নি</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          এই লিংকের কোনো দাওয়াহ সদস্য একাউন্ট খুঁজে পাওয়া যায়নি অথবা লিংকটি পরিবর্তিত হয়েছে।
        </p>
        <Link
          to="/login"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors inline-flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          লগইন পোর্টালে যান
        </Link>
      </div>
    );
  }

  // Profile is PRIVATE
  if (!profile.isPublic) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
        <div className="absolute top-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">এই প্রোফাইলটি ব্যক্তিগত (Private)</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {profile.message || 'এই সদস্যের বিস্তারিত প্রোফাইল সাধারণ ভিজিটরদের জন্য গোপন রাখা হয়েছে। শুধুমাত্র অথরাইজড মেম্বাররা একাউন্টে লগইন করে তথ্য দেখতে পারবেন।'}
          </p>

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Navbar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">কোটবাড়ি দাওয়াহ মুভমেন্ট</div>
              <div className="text-[10px] text-slate-400">ভেরিফাইড মেম্বার প্রোফাইল</div>
            </div>
          </div>

          <Link
            to="/login"
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>লগইন</span>
          </Link>
        </div>

        {/* Hero Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-emerald-950/60 flex-shrink-0">
              {profile.name ? profile.name.charAt(0) : 'দ'}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {profile.name || 'দাওয়াহ সদস্য'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> মুভমেন্ট সদস্য
                </span>
              </div>

              {profile.customBio && (
                <p className="text-xs sm:text-sm text-slate-300 mb-3 italic">
                  "{profile.customBio}"
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
                {profile.area && (
                  <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    {profile.area}
                  </span>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  মুভমেন্টে যুক্ত: {profile.firstContactDate || '২০২৬'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Stage Section (if enabled by member) */}
        {settings.showGrowthStage && profile.currentStage && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-white text-sm">দাওয়াহ গ্রোথ স্টেজ</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                স্টেজ #{profile.currentStage}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-sm font-medium text-emerald-300 mb-2">{stageName}</div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>গ্রোথ অগ্রগতি স্কোর</span>
                <span className="font-bold text-white">{profile.growthScore || 0}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, profile.growthScore || 0))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Categories / Responsibility Journey (if enabled by member) */}
        {settings.showGrowthJourney && profile.categoryTags && profile.categoryTags.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-white text-sm mb-3">মুভমেন্টের দায়িত্ব ও কার্যক্রমসমূহ</h2>
            <div className="flex flex-wrap gap-2">
              {profile.categoryTags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Salah Tracking Overview (if enabled by member) */}
        {settings.showSalahTracking && profile.salahRecords && profile.salahRecords.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HeartHandshake className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white text-sm">সাম্প্রতিক সালাহ ট্র্যাকিং রেকর্ড</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-2">তারিখ</th>
                    <th className="py-2 px-2 text-center">ফজর</th>
                    <th className="py-2 px-2 text-center">যোহর</th>
                    <th className="py-2 px-2 text-center">আসর</th>
                    <th className="py-2 px-2 text-center">মাগরিব</th>
                    <th className="py-2 px-2 text-center">এশা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {profile.salahRecords.slice(0, 5).map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-950/40">
                      <td className="py-2.5 px-2 text-slate-300 font-mono">{r.date}</td>
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
        <div className="text-center py-6 text-xs text-slate-500 border-t border-slate-800/60">
          <p>© ২০২৬ কোটবাড়ি দাওয়াহ মুভমেন্ট ট্র্যাকিং সিস্টেম</p>
          <p className="mt-1">সকল সদস্যের ব্যক্তিগত তথ্যের গোপনীয়তা রক্ষা করা হয়</p>
        </div>
      </div>
    </div>
  );
}
