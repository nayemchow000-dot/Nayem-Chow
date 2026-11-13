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
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}
      <div className={cn(
        "w-64 border-r border-white/5 bg-[#0F0F12] flex flex-col h-screen fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="p-5 border-b border-white/5 flex flex-col items-center justify-center relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
          {branding?.primaryLogo ? (
            <img src={branding.primaryLogo} alt="Kotbari Dawah Movement" className="max-h-14 object-contain mb-2" />
          ) : (
            <h2 className="text-lg font-serif italic tracking-tight text-emerald-500 mt-1">Kotbari Dawah Movement</h2>
          )}
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-0.5">Dawah Tracking Portal</p>
        </div>

        {/* User Card inside Sidebar */}
        {user && (
          <div className="p-3 mx-3 mt-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {user.contact?.name ? user.contact.name.charAt(0) : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">
                  {user.contact?.name || user.username}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                    user.role === 'admin' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                  {user.isPublic && (
                    <Link
                      to={`/p/${user.shareSlug || user.username}`}
                      target="_blank"
                      className="text-[10px] text-teal-400 hover:underline flex items-center gap-0.5"
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));
            
            return (
              <Link 
                key={link.href} 
                to={link.href} 
                onClick={onClose}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors", 
                  isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 text-emerald-500/80" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Bottom Section: Settings & Logout */}
        <div className="p-3 border-t border-white/5 bg-white/[0.02] space-y-1">
          {isAdmin && (
            <Link 
              to="/settings" 
              onClick={onClose}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-colors", 
                location.pathname === '/settings' ? "text-emerald-400 bg-emerald-500/10" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">System Settings</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-colors w-full text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">লগআউট (Sign Out)</span>
          </button>
        </div>
      </div>
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
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col text-[#E5E5E7] font-sans">
      <div className="flex flex-1 relative">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

        <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
          {/* Persistent Top Header with Global Search Bar (Desktop & Mobile) */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 md:px-8 py-3 border-b border-white/5 bg-[#0F0F12]/95 backdrop-blur-md">
            <div className="flex items-center gap-3 shrink-0 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-2 text-white/80 hover:text-white rounded-md hover:bg-white/5 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-serif italic text-emerald-500 font-medium text-sm whitespace-nowrap">
                {user.contact?.name || 'দাওয়াহ মুভমেন্ট'}
              </span>
            </div>

            <div className="flex-1 flex items-center justify-start lg:justify-between gap-4 min-w-0">
              <GlobalSearchBar />

              <div className="hidden md:flex items-center gap-4 shrink-0 text-xs text-white/55">
                {isAdmin && (
                  <Link
                    to="/ai-dashboard"
                    className="whitespace-nowrap shrink-0 text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Center</span>
                  </Link>
                )}
                <span className="whitespace-nowrap shrink-0 text-white/60">
                  {user.contact?.name || user.username} · {user.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col min-w-0 overflow-x-hidden">
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
