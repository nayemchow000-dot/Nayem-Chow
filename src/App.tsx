import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactProfile from './pages/ContactProfile';
import Analytics from './pages/Analytics';
import Activities from './pages/Activities';
import Categories from './pages/Categories';
import { LayoutDashboard, Users, UserPlus, Settings, Activity, CalendarHeart, Tags } from 'lucide-react';
import { cn } from './lib/utils';

function Sidebar() {
  const location = useLocation();
  const links = [
    { href: '/', label: 'My Dawah Priority', icon: LayoutDashboard },
    { href: '/contacts', label: 'Dawah Members', icon: Users },
    { href: '/categories', label: 'Brother Categories', icon: Tags },
    { href: '/activities', label: 'Regular Dawah Activity', icon: CalendarHeart },
    { href: '/analytics', label: 'Growth Analytics', icon: Activity },
  ];

  return (
    <div className="w-64 border-r border-white/5 bg-[#0F0F12] flex flex-col h-screen fixed top-0 left-0">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-serif italic tracking-tight text-emerald-500">Kotbari Dawah Circle</h2>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Dawah Chart</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));
          return (
            <Link key={link.href} to={link.href} className={cn("flex items-center space-x-3 p-3 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-emerald-500/10 text-emerald-400" : "text-white/60 hover:bg-white/5")}>
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-6 mt-auto border-t border-white/5 bg-white/[0.02]">
        <button className="flex items-center space-x-3 text-white/60 hover:text-white transition-colors w-full">
          <Settings className="w-4 h-4" />
          <span className="text-sm">Settings</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0A0A0B] flex text-[#E5E5E7] font-sans">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 flex flex-col">
          <div className="flex-1 w-full max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/:id" element={<ContactProfile />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
