import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactProfile from './pages/ContactProfile';
import Analytics from './pages/Analytics';
import Activities from './pages/Activities';
import Categories from './pages/Categories';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import MemberDashboard from './pages/MemberDashboard';
import PublicProfile from './pages/PublicProfile';
import AdminAccounts from './pages/AdminAccounts';
import AIDashboard from './pages/AIDashboard';
import GlobalSearchBar from './components/GlobalSearchBar';
import DawahChatbot from './components/DawahChatbot';
import { 
  LayoutDashboard, Users, Settings, Activity, CalendarHeart, 
  Tags, Menu, X, Shield, ShieldCheck, LogOut, Globe, User, 
  Key, Sparkles 
} from 'lucide-react';
import { cn } from './lib/utils';
import { useBranding } from './contexts/BrandingContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ForestBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Ambient glowing forest orbs */}
      <div className="absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full bg-[#34D399]/12 blur-[120px]" />
      <div className="absolute top-12 -right-24 w-[420px] h-[420px] rounded-full bg-[#1C4A3F]/30 blur-[130px]" />
      <div className="absolute -bottom-32 right-10 w-[440px] h-[440px] rounded-full bg-[#DD7B3C]/12 blur-[130px]" />

      {/* Distant misty mountain ridge silhouette */}
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-56 opacity-40"
      >
        <path
          d="M0,256L96,218.7C192,181,384,107,576,117.3C768,128,960,224,1152,234.7C1344,245,1440,171,1440,171L1440,320L0,320Z"
          fill="rgba(14, 34, 28, 0.55)"
        />
        <path
          d="M0,288L120,245.3C240,203,480,117,720,138.7C960,160,1200,288,1320,298.7L1440,309L1440,320L0,320Z"
          fill="rgba(8, 19, 15, 0.72)"
        />
      </svg>

      {/* Subtle grain texture */}
      <div className="absolute inset-0 forest-noise opacity-90" />
    </div>
  );
}

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { branding } = useBranding();
  const { user, logout, isAdmin } = useAuth();

  // Navigation Links based on role
  const adminLinks = [
    { href: '/', label: 'My Dawah Priority', icon: LayoutDashboard },
    { href: '/ai-dashboard', label: 'AI Dawah Center', icon: Sparkles },
    { href: '/my-dashboard', label: 'আমার ড্যাশবোর্ড', icon: User },
    { href: '/contacts', label: 'Dawah Members', icon: Users },
    { href: '/categories', label: 'Brother Categories', icon: Tags },
    { href: '/activities', label: 'Regular Dawah Activity', icon: CalendarHeart },
    { href: '/analytics', label: 'Growth Analytics', icon: Activity },
    { href: '/admin/accounts', label: 'মেম্বার অ্যাকাউন্টস', icon: ShieldCheck },
  ];

  const memberLinks = [
    { href: '/my-dashboard', label: 'আমার ড্যাশবোর্ড', icon: User },
    { href: '/contacts', label: 'আমার মুভমেন্ট প্রোফাইল', icon: Users },
    { href: '/activities', label: 'দাওয়া কার্যক্রম', icon: CalendarHeart },
  ];

  const links = isAdmin ? adminLinks : memberLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/65 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "w-64 glass flex flex-col fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 lg:top-4 lg:left-4 lg:h-[calc(100vh-2rem)] lg:rounded-[24px] overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex flex-col items-center justify-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#8EA39A] hover:text-[#EDF4F0] lg:hidden rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
          {branding?.primaryLogo ? (
            <img src={branding.primaryLogo} alt="Kotbari Dawah Movement" className="max-h-14 object-contain mb-2" />
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34D399]/25 to-[#0E9F6E]/10 border border-[#34D399]/35 flex items-center justify-center text-[#B6F5D8] shadow-[0_0_24px_rgba(52,211,153,0.22)] mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif italic tracking-tight text-[#EDF4F0] leading-tight">
                Kotbari Dawah Movement
              </h2>
            </div>
          )}
          <p className="eyebrow mt-1.5 text-[9px] text-[#8EA39A]">Dawah Tracking Portal</p>
        </div>

        {/* User Card inside Sidebar */}
        {user && (
          <div className="p-3 mx-3 mt-3 rounded-2xl glass-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34D399]/30 to-[#0E9F6E]/10 border border-[#34D399]/35 flex items-center justify-center text-[#B6F5D8] font-bold text-sm shrink-0">
                {user.contact?.name ? user.contact.name.charAt(0) : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#EDF4F0] truncate">
                  {user.contact?.name || user.username}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                      user.role === 'admin'
                        ? 'bg-[#34D399]/15 text-[#B6F5D8] border-[#34D399]/30'
                        : 'bg-teal-500/15 text-teal-200 border-teal-400/25'
                    }`}
                  >
                    {user.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                  {user.isPublic && (
                    <Link
                      to={`/p/${user.shareSlug || user.username}`}
                      target="_blank"
                      className="text-[10px] text-[#34D399] hover:underline flex items-center gap-0.5"
                      title="পাবলিক প্রোফাইল প্রিভিউ"
                    >
                      <Globe className="w-2.5 h-2.5" />
                      Public
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive =
              location.pathname === link.href ||
              (link.href !== '/' && location.pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-[#34D399]/18 to-[#34D399]/5 text-[#EDF4F0] border border-[#34D399]/30 shadow-[0_6px_18px_rgba(52,211,153,0.12)]"
                    : "text-[#8EA39A] hover:bg-white/[0.05] hover:text-[#EDF4F0] border border-transparent"
                )}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#34D399] shadow-[0_0_10px_#34D399]"
                    aria-hidden="true"
                  />
                )}
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#34D399]" : "text-[#8EA39A]")} />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Settings & Logout */}
        <div className="p-3 border-t border-white/10 bg-black/20 space-y-1">
          {isAdmin && (
            <Link
              to="/settings"
              onClick={onClose}
              className={cn(
                "relative flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs transition-all",
                location.pathname === '/settings'
                  ? "text-[#EDF4F0] bg-[#34D399]/15 border border-[#34D399]/30"
                  : "text-[#8EA39A] hover:text-[#EDF4F0] hover:bg-white/[0.05] border border-transparent"
              )}
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">System Settings</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs transition-all w-full text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/12 border border-transparent hover:border-rose-400/25"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">লগআউট (Sign Out)</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function ProtectedLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050807] flex items-center justify-center text-[#8EA39A] relative">
        <ForestBackdrop />
        <div className="glass px-5 py-3.5 rounded-2xl flex items-center gap-3 relative z-10">
          <div className="w-4 h-4 border-2 border-[#34D399] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-[#EDF4F0]">লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col text-[#EDF4F0] font-sans relative">
      <ForestBackdrop />

      <div className="flex flex-1 relative z-10">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        <div className="flex-1 lg:pl-[280px] flex flex-col min-w-0">
          {/* Floating Glass Top Header with Global Search Bar */}
          <div className="sticky top-0 z-30 px-4 sm:px-6 md:px-8 pt-3 sm:pt-4">
            <header className="glass rounded-[20px] flex items-center justify-between gap-4 px-3.5 sm:px-5 py-2.5 max-w-6xl mx-auto">
              <div className="flex items-center gap-2.5 shrink-0 lg:hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 -ml-1 text-[#EDF4F0] rounded-xl hover:bg-white/10 transition-colors"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-serif italic text-[#B6F5D8] font-medium text-base whitespace-nowrap">
                  {user.contact?.name || 'দাওয়াহ মুভমেন্ট'}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-start lg:justify-between gap-4 min-w-0">
                <GlobalSearchBar />

                <div className="hidden md:flex items-center gap-3 shrink-0 text-xs">
                  {isAdmin && (
                    <Link
                      to="/ai-dashboard"
                      className="whitespace-nowrap shrink-0 px-3 py-1.5 rounded-full bg-[#34D399]/14 hover:bg-[#34D399]/22 border border-[#34D399]/35 text-[#B6F5D8] font-medium flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
                      <span>AI Center</span>
                    </Link>
                  )}
                  <span className="whitespace-nowrap shrink-0 text-[#8EA39A] font-medium">
                    {user.contact?.name || user.username} · {user.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
              </div>
            </header>
          </div>

          <main className="flex-1 px-4 sm:px-6 md:px-8 py-5 sm:py-6 flex flex-col min-w-0 overflow-x-hidden">
            <div className="flex-1 w-full max-w-6xl mx-auto">
              <Routes>
                {/* Member Landing defaults to MemberDashboard; Admin gets Circle Priority Dashboard */}
                <Route path="/" element={isAdmin ? <Dashboard /> : <MemberDashboard />} />
                <Route path="/ai-dashboard" element={isAdmin ? <AIDashboard /> : <Navigate to="/my-dashboard" replace />} />
                <Route path="/my-dashboard" element={<MemberDashboard />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/contacts/:id" element={<ContactProfile />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/admin/accounts" element={isAdmin ? <AdminAccounts /> : <Navigate to="/my-dashboard" replace />} />
                <Route path="/settings" element={isAdmin ? <SettingsPage /> : <Navigate to="/my-dashboard" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>

      {/* Multi-turn Gemini Dawah Assistant */}
      <DawahChatbot />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes (No Auth Required) */}
          <Route path="/login" element={<Login />} />
          <Route path="/p/:slug" element={<PublicProfile />} />
          <Route path="/public/member/:slug" element={<PublicProfile />} />

          {/* All other routes protected */}
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
