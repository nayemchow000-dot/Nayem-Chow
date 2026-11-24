import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '../components/ui';
import {
  Settings as SettingsIcon,
  Download,
  Save,
  Shield,
  Moon,
  Bell,
  Image as ImageIcon,
  LayoutTemplate,
  Sliders,
  ListChecks,
  Plus,
  Trash2,
  BookOpen,
  Printer,
} from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { DEFAULT_LOGO_URL } from '../components/BrandLogo';
import { PortalSettings, TrackerItem } from '../types';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const { refreshFeatureFlags } = useAuth();

  // Existing Preferences State
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  // Branding State
  const { branding, refreshBranding } = useBranding();
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingForm, setBrandingForm] = useState({
    primaryLogo: '',
    mobileLogo: '',
    favicon: '',
    heroBackground: '',
    cornerImage: ''
  });

  // Portal Settings & Care Radar Thresholds
  const [portalForm, setPortalForm] = useState<PortalSettings>({
    featureMyDawahTrack: true,
    featureCareRadar: true,
    careNoContactSoonDays: 7,
    careNoContactUrgentDays: 14,
    careStalledStageDays: 30,
  });
  const [savingPortal, setSavingPortal] = useState(false);
  const [portalSaved, setPortalSaved] = useState(false);

  // Tracker Items Manager
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemGroup, setNewItemGroup] = useState<'amal' | 'dawah'>('amal');

  const fetchPortalAndTracker = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        apiFetch('/api/portal/settings'),
        apiFetch('/api/admin/tracker-items'),
      ]);
      if (pRes.ok) {
        setPortalForm(await pRes.json());
      }
      if (tRes.ok) {
        const items = await tRes.json();
        setTrackerItems(Array.isArray(items) ? items : []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPortalAndTracker();
  }, []);

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        primaryLogo: branding.primaryLogo || DEFAULT_LOGO_URL,
        mobileLogo: branding.mobileLogo || DEFAULT_LOGO_URL,
        favicon: branding.favicon || DEFAULT_LOGO_URL,
        heroBackground: branding.heroBackground || '',
        cornerImage: branding.cornerImage || ''
      });
    }
  }, [branding]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await apiFetch('/api/contacts');
      const data = await res.json();

      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const csvRows = data.map((row: any) => {
          return Object.values(row).map(val => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          }).join(',');
        });

        const csvContent = [headers, ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `dawah_contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to export data:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveBranding = async () => {
    try {
      setSavingBranding(true);
      const res = await apiFetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandingForm)
      });
      if (res.ok) {
        setBrandingSaved(true);
        refreshBranding();
        setTimeout(() => setBrandingSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save branding:", error);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSavePortalSettings = async () => {
    try {
      setSavingPortal(true);
      const res = await apiFetch('/api/portal/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portalForm),
      });
      if (res.ok) {
        setPortalSaved(true);
        refreshFeatureFlags();
        setTimeout(() => setPortalSaved(false), 3000);
      }
    } finally {
      setSavingPortal(false);
    }
  };

  const handleAddTrackerItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim()) return;
    const res = await apiFetch('/api/admin/tracker-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        banglaLabel: newItemLabel.trim(),
        group: newItemGroup,
        displayOrder: trackerItems.length + 1,
      }),
    });
    if (res.ok) {
      setNewItemLabel('');
      fetchPortalAndTracker();
    }
  };

  const handleToggleTrackerItem = async (item: TrackerItem) => {
    const res = await apiFetch(`/api/admin/tracker-items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (res.ok) fetchPortalAndTracker();
  };

  const handleDeleteTrackerItem = async (id: string) => {
    await apiFetch(`/api/admin/tracker-items/${id}`, { method: 'DELETE' });
    fetchPortalAndTracker();
  };

  const renderImagePreview = (url: string, label: string, isLogo = false) => {
    if (!url) return (
      <div className="h-16 w-16 flex-shrink-0 rounded-xl glass-2 flex items-center justify-center text-[10px] text-[#5D726A] text-center p-1">
        No Image
      </div>
    );
    return (
      <div className={`h-16 w-16 flex-shrink-0 rounded-xl p-1 flex items-center justify-center ${isLogo ? 'bg-white/95 border border-white/25' : 'glass-2'}`}>
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="eyebrow">PREFERENCES, TRACKER & BRANDING</span>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-[#EDF4F0] flex items-center gap-3 mt-1">
            <SettingsIcon className="w-6 h-6 text-[#34D399]" />
            System Settings
          </h1>
          <p className="text-[#8EA39A] mt-1 text-sm">Manage portal feature flags, tracker items, Care Radar thresholds, and branding</p>
        </div>

        <Link
          to="/monitoring"
          className="px-4 py-2 rounded-xl glass-2 hover:border-[#34D399]/40 text-xs text-[#B6F5D8] flex items-center gap-2 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-[#34D399]" />
          <span>প্রিন্টযোগ্য মনিটরিং সারাংশ</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Feature Flags & Care Radar Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#34D399]" />
              Portal Features & Care Radar Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between p-3.5 rounded-2xl glass-2 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-[#EDF4F0]">My Dawah Track সক্রিয় রাখুন</div>
                <div className="text-xs text-[#8EA39A]">সদস্যদের দৈনিক আমল ও দাওয়াহ ট্র্যাকার পেজ</div>
              </div>
              <input
                type="checkbox"
                checked={portalForm.featureMyDawahTrack}
                onChange={(e) => setPortalForm((p) => ({ ...p, featureMyDawahTrack: e.target.checked }))}
                className="w-4 h-4 accent-[#34D399]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl glass-2 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-[#EDF4F0]">Care Radar সক্রিয় রাখুন</div>
                <div className="text-xs text-[#8EA39A]">অ্যাডমিন ও দায়িত্বশীলদের জন্য কেয়ার সতর্কতা ও করণীয়</div>
              </div>
              <input
                type="checkbox"
                checked={portalForm.featureCareRadar}
                onChange={(e) => setPortalForm((p) => ({ ...p, featureCareRadar: e.target.checked }))}
                className="w-4 h-4 accent-[#34D399]"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] text-[#8EA39A] mb-1">যোগাযোগ নেই (শীঘ্রই - দিন)</label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={portalForm.careNoContactSoonDays}
                  onChange={(e) => setPortalForm((p) => ({ ...p, careNoContactSoonDays: Number(e.target.value) || 7 }))}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8EA39A] mb-1">যোগাযোগ নেই (জরুরি - দিন)</label>
                <Input
                  type="number"
                  min={2}
                  max={90}
                  value={portalForm.careNoContactUrgentDays}
                  onChange={(e) => setPortalForm((p) => ({ ...p, careNoContactUrgentDays: Number(e.target.value) || 14 }))}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#8EA39A] mb-1">একই ধাপে স্থির (দিন)</label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={portalForm.careStalledStageDays}
                  onChange={(e) => setPortalForm((p) => ({ ...p, careStalledStageDays: Number(e.target.value) || 30 }))}
                />
              </div>
            </div>

            <Button onClick={handleSavePortalSettings} disabled={savingPortal} className="w-full gap-2">
              <Save className="w-4 h-4" />
              {portalSaved ? 'সংরক্ষিত হয়েছে!' : savingPortal ? 'সংরক্ষণ হচ্ছে...' : 'ফিচার ও থ্রেশহোল্ড সেভ করুন'}
            </Button>
          </CardContent>
        </Card>

        {/* Tracker Items Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-[#34D399]" />
              My Dawah Track আইটেম তালিকা
            </CardTitle>
            <p className="text-xs text-[#F4A85E]">
              নমুনা তালিকা — চূড়ান্ত তালিকা অ্যাডমিন নির্ধারণ করবেন
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddTrackerItem} className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder="নতুন আমল বা দাওয়াহ আইটেম লিখুন..."
                className="flex-1"
              />
              <select
                value={newItemGroup}
                onChange={(e) => setNewItemGroup(e.target.value as 'amal' | 'dawah')}
                className="h-10 rounded-xl forest-input px-3 text-xs text-[#EDF4F0]"
              >
                <option value="amal" className="bg-[#0A1210]">ব্যক্তিগত আমল</option>
                <option value="dawah" className="bg-[#0A1210]">দাওয়াহ ও জামাআত</option>
              </select>
              <Button type="submit" size="sm" className="gap-1 shrink-0 h-10 px-4">
                <Plus className="w-4 h-4" />
                যোগ
              </Button>
            </form>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {trackerItems.map((it) => (
                <div key={it.id} className="p-3 rounded-xl glass-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className={`font-medium truncate ${it.isActive ? 'text-[#EDF4F0]' : 'text-[#5D726A] line-through'}`}>
                      {it.banglaLabel}
                    </div>
                    <div className="text-[10px] text-[#8EA39A]">
                      {it.group === 'amal' ? 'ব্যক্তিগত আমল' : 'দাওয়াহ ও জামাআত'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTrackerItem(it)}
                      className={`px-2.5 py-1 rounded-full text-[10px] border ${
                        it.isActive
                          ? 'bg-[#34D399]/15 border-[#34D399]/35 text-[#B6F5D8]'
                          : 'glass-2 text-[#8EA39A]'
                      }`}
                    >
                      {it.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrackerItem(it.id)}
                      className="p-1.5 rounded-lg text-rose-300/75 hover:text-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Website Branding Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-[#34D399]" />
              Website Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8EA39A] mb-4">
              Upload your logos directly from your device.
            </p>

            {['primaryLogo', 'mobileLogo', 'favicon'].map((field) => (
              <div key={field} className="flex gap-4 items-start">
                {renderImagePreview(brandingForm[field as keyof typeof brandingForm], field, true)}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#8EA39A] mb-1 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setBrandingForm(prev => ({ ...prev, [field]: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full forest-input rounded-xl text-sm px-3 py-2 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#34D399]/15 file:text-[#B6F5D8] hover:file:bg-[#34D399]/25"
                  />
                </div>
              </div>
            ))}

            <Button
              onClick={handleSaveBranding}
              disabled={savingBranding}
              className="w-full mt-4 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {brandingSaved ? 'Saved!' : 'Save Branding'}
            </Button>
          </CardContent>
        </Card>

        {/* Visual Assets Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#34D399]" />
              Visual Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8EA39A] mb-4">
              Upload decorative images for backgrounds and corners across the app.
            </p>

            {['heroBackground', 'cornerImage'].map((field) => (
              <div key={field} className="flex gap-4 items-start">
                {renderImagePreview(brandingForm[field as keyof typeof brandingForm], field)}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#8EA39A] mb-1 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setBrandingForm(prev => ({ ...prev, [field]: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full forest-input rounded-xl text-sm px-3 py-2 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#34D399]/15 file:text-[#B6F5D8] hover:file:bg-[#34D399]/25"
                  />
                </div>
              </div>
            ))}

            <Button
              onClick={handleSaveBranding}
              disabled={savingBranding}
              className="w-full mt-4 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {brandingSaved ? 'Saved!' : 'Save Visual Assets'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#34D399]" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8EA39A] mb-4">
              Export your Dawah members data for backup or offline analysis.
            </p>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 border-[#34D399]/30 text-[#B6F5D8] hover:bg-[#34D399]/15"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export Contacts (CSV)'}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#34D399]" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-[#8EA39A]" />
                <div>
                  <div className="text-sm font-medium text-[#EDF4F0]">Theme</div>
                  <div className="text-xs text-[#8EA39A]">Application appearance</div>
                </div>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="forest-input rounded-xl text-sm px-3 py-1.5"
              >
                <option value="dark" className="bg-[#0A1210]">Dark Theme</option>
                <option value="light" disabled className="bg-[#0A1210]">Light Theme (Coming Soon)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#8EA39A]" />
                <div>
                  <div className="text-sm font-medium text-[#EDF4F0]">Notifications</div>
                  <div className="text-xs text-[#8EA39A]">In-app alerts and reminders</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <div className="w-11 h-6 bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34D399]"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-white/[0.08]">
              <Button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saved ? 'Saved!' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bengali Admin Guide Card ("নির্দেশিকা") */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#34D399]" />
              নির্দেশিকা (Admin & Coordinator Quick Guide)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#EDF4F0]/85 leading-relaxed">
            <div className="p-4 rounded-2xl glass-2 space-y-1.5">
              <div className="font-semibold text-[#B6F5D8]">১. Self Report ও সম্মতি নীতি</div>
              <p className="text-[#8EA39A]">
                প্রতিটি সদস্যের My Dawah Track রিপোর্ট ডিফল্টভাবে ব্যক্তিগত। সদস্য Privacy ট্যাব থেকে মনিটরিং চালু না করলে অ্যাডমিন বা দায়িত্বশীল তা দেখতে পাবেন না।
              </p>
            </div>
            <div className="p-4 rounded-2xl glass-2 space-y-1.5">
              <div className="font-semibold text-[#F4A85E]">২. Care Radar ও চক্রাকার ফলো-আপ</div>
              <p className="text-[#8EA39A]">
                সদস্য তালিকায় লাল/হলুদ বেল আইকনে ক্লিক করলে কেয়ার প্ল্যান ড্রয়ার খুলবে। “করেছি — আপডেট দিন” চাপলে ফলাফল সেভ হয়ে স্বয়ংক্রিয়ভাবে পরবর্তী ধাপ তৈরি হবে।
              </p>
            </div>
            <div className="p-4 rounded-2xl glass-2 space-y-1.5">
              <div className="font-semibold text-[#34D399]">৩. দায়িত্বশীল ও ভয়েস আপডেট</div>
              <p className="text-[#8EA39A]">
                মেম্বার অ্যাকাউন্টস পেজ থেকে যেকোনো সদস্যকে “দায়িত্বশীল” রোল এবং নির্দিষ্ট ভাইদের দায়িত্ব দেওয়া যায়। ভয়েস নোট অ্যাডমিনের অনুমোদন ছাড়া সংরক্ষিত হয় না।
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
