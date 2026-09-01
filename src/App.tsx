import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactProfile from './pages/ContactProfile';
import Analytics from './pages/Analytics';
import Activities from './pages/Activities';
import Categories from './pages/Categories';
import SettingsPage from './pages/Settings';
import { LayoutDashboard, Users, UserPlus, Settings, Activity, CalendarHeart, Tags, Menu, X } from 'lucide-react';
import { cn } from './lib/utils';
import { useBranding } from './contexts/BrandingContext';

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const { branding } = useBranding();
  
  const links = [
    { href: '/', label: 'My Dawah Priority', icon: LayoutDashboard },
    { href: '/contacts', label: 'Dawah Members', icon: Users },
    { href: '/categories', label: 'Brother Categories', icon: Tags },
    { href: '/activities', label: 'Regular Dawah Activity', icon: CalendarHeart },
    { href: '/analytics', label: 'Growth Analytics', icon: Activity },
  ];

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
        <div className="p-6 border-b border-white/5 flex flex-col items-center justify-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
          {branding?.primaryLogo ? (
            <img src={branding.primaryLogo} alt="Kotbari Dawah Circle" className="max-h-16 object-contain mb-2" />
          ) : (
            <h2 className="text-xl font-serif italic tracking-tight text-emerald-500 mt-2">Kotbari Dawah Circle</h2>
          )}
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Dawah Chart</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));
            
            return (
              <Link 
                key={link.href} 
                to={link.href} 
                onClick={onClose}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors", 
                  isActive ? "bg-emerald-500/10 text-emerald-400" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 mt-auto border-t border-white/5 bg-white/[0.02]">
          <Link 
            to="/settings" 
            onClick={onClose}
            className={cn(
              "flex items-center space-x-3 transition-colors w-full p-3 -mx-3 rounded-lg", 
              location.pathname === '/settings' ? "text-emerald-400 bg-emerald-500/10" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </>
  );
}

function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col text-[#E5E5E7] font-sans">
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0F0F12] sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-white/80 hover:text-white rounded-md hover:bg-white/5 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-serif italic text-emerald-500 font-medium">Dawah Circle</span>
        </div>
      </header>

      <div className="flex flex-1 relative">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 md:p-8 flex flex-col min-w-0 overflow-x-hidden">
          <div className="flex-1 w-full max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactProfile />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
