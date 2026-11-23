import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, KeyRound, ShieldCheck, CheckCircle2, ArrowRight, Eye, EyeOff, UserPlus, MapPin, Phone } from 'lucide-react';

export default function Login() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regArea, setRegArea] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('অনুগ্রহ করে ইউজারনেম/ফোন নম্বর এবং পাসওয়ার্ড দিন।');
      return;
    }

    setError('');
    setIsSubmitting(true);
    const result = await login(username.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করুন।');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim() || !regPassword) {
      setError('অনুগ্রহ করে নাম, মোবাইল নম্বর এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }
    if (regPassword.length < 4) {
      setError('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }

    setError('');
    setIsSubmitting(true);
    const result = await register(
      regName.trim(),
      regPhone.trim(),
      regArea.trim(),
      regPassword,
      regUsername.trim() || undefined
    );
    setIsSubmitting(false);

    if (result.success) {
      navigate('/my-dashboard', { replace: true });
    } else {
      setError(result.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। অন্য ইউজার আইডি বা নম্বর দিয়ে চেষ্টা করুন।');
    }
  };

  return (
    <div className="min-h-screen text-[#EDF4F0] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Midnight Forest Ambient Orbs & Ridge Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 -left-32 w-[460px] h-[460px] rounded-full bg-[#34D399]/16 blur-[120px]" />
        <div className="absolute top-1/4 -right-28 w-[380px] h-[380px] rounded-full bg-[#1C4A3F]/35 blur-[120px]" />
        <div className="absolute -bottom-36 right-12 w-[420px] h-[420px] rounded-full bg-[#DD7B3C]/14 blur-[130px]" />
        <div className="absolute inset-0 forest-noise" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#34D399]/25 to-[#0E9F6E]/10 border border-[#34D399]/35 text-[#B6F5D8] mb-3.5 shadow-[0_0_28px_rgba(52,211,153,0.22)]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="eyebrow mb-1.5 text-[#34D399]">DAWAH TRACKING PORTAL</div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight text-[#EDF4F0] mb-1.5 leading-snug">
            কোটবাড়ি দাওয়াহ মুভমেন্ট
          </h1>
          <p className="text-xs sm:text-sm text-[#8EA39A] leading-relaxed">
            সদস্য ব্যক্তিগত ড্যাশবোর্ড ও ট্র্যাকিং পোর্টাল
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl glass-2 p-1 mb-4">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'forest-btn-primary'
                : 'text-[#8EA39A] hover:text-[#EDF4F0]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>লগইন</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'forest-btn-primary'
                : 'text-[#8EA39A] hover:text-[#EDF4F0]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>নতুন সদস্য একাউন্ট</span>
          </button>
        </div>

        {/* Main Glass Card */}
        <div className="glass rounded-[22px] p-6 sm:p-7">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/12 border border-rose-400/30 text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <span className="text-base leading-none">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#EDF4F0]/90 mb-1.5">
                  ইউজারনেম বা মোবাইল নম্বর
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA39A]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="যেমন: admin বা 01869090345"
                    className="w-full pl-10 pr-4 py-2.5 forest-input rounded-xl text-xs text-[#EDF4F0] placeholder-[#5D726A] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#EDF4F0]/90 mb-1.5">
                  পাসওয়ার্ড
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA39A]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন"
                    className="w-full pl-10 pr-10 py-2.5 forest-input rounded-xl text-xs text-[#EDF4F0] placeholder-[#5D726A] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8EA39A] hover:text-[#EDF4F0] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl forest-btn-primary text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>লগইন হচ্ছে...</span>
                ) : (
                  <>
                    <span>লগইন করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#EDF4F0]/90 mb-1">
                  আপনার পূর্ণ নাম <span className="text-[#34D399]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA39A]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="যেমন: তানভীর হাসান ভাই"
                    className="w-full pl-10 pr-4 py-2 forest-input rounded-xl text-xs text-[#EDF4F0] placeholder-[#5D726A]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#EDF4F0]/90 mb-1">
                  মোবাইল নম্বর (ইউজার আইডি হবে) <span className="text-[#34D399]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA39A]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="যেমন: 01712345678"
                    className="w-full pl-10 pr-4 py-2 forest-input rounded-xl text-xs text-[#EDF4F0] placeholder-[#5D726A]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#EDF4F0]/90 mb-1">
                  পছন্দের ইউজার আইডি (ঐচ্ছিক - খালি রাখলে মোবাইল নম্বর হবে)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA39A]">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="যেমন: tanvir_kotbari (খালিও রাখতে পারেন)"
                    className="w-full pl-10 pr-4 py-2 forest-input rounded-xl text-xs text-[#EDF4F0] placeholder-[#5D726A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#EDF4F0]/90 mb-1">
                  এলাকা / মহল্লা
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA39A]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regArea}
                    onChange={(e) => setRegArea(e.target.value)}
                    placeholder="যেমন: কোটবাড়ি / মণিপুর"
                    className="w-full pl-10 pr-4 py-2 forest-input rounded-xl text-xs text-[#EDF4F0] placeholder-[#5D726A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#EDF4F0]/90 mb-1">
                  নতুন পাসওয়ার্ড <span className="text-[#34D399]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8EA39A]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                    className="w-full pl-10 pr-10 py-2 forest-input rounded-xl text-xs text-[#EDF4F0] placeholder-[#5D726A]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8EA39A] hover:text-[#EDF4F0] transition-colors"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl forest-btn-primary text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>একাউন্ট তৈরি হচ্ছে...</span>
                ) : (
                  <>
                    <span>রেজিস্ট্রেশন করুন ও প্রবেশ করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center mt-5 text-xs text-[#8EA39A] flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#34D399]" />
          <span>প্রতিটি সদস্যের ব্যক্তিগত ডাটা এনক্রিপ্টেড এবং সম্পূর্ণ নিরাপদ</span>
        </div>
      </div>
    </div>
  );
}
