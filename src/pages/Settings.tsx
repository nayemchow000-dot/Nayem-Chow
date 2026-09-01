import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../components/ui';
import { Settings as SettingsIcon, Download, Save, Shield, Moon, Bell, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  
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

  useEffect(() => {
    if (branding) {
      setBrandingForm({
        primaryLogo: branding.primaryLogo || '',
        mobileLogo: branding.mobileLogo || '',
        favicon: branding.favicon || '',
        heroBackground: branding.heroBackground || '',
        cornerImage: branding.cornerImage || ''
      });
    }
  }, [branding]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/contacts');
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
      } else {
        alert("No data available to export.");
      }
    } catch (err) {
      console.error("Failed to export data:", err);
      alert("Failed to export data.");
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
      const res = await fetch('/api/branding', {
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

  const renderImagePreview = (url: string, label: string) => {
    if (!url) return (
      <div className="h-16 w-16 flex-shrink-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/40 text-center p-1">
        No Image
      </div>
    );
    return (
      <div className="h-16 w-16 flex-shrink-0 rounded-md border border-white/10 bg-white/5 p-1 flex items-center justify-center">
        <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-emerald-500" />
            System Settings
          </h1>
          <p className="text-white/60 mt-1">Manage your application preferences and visual identity</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Website Branding Card */}
        <Card className="bg-[#121214] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-emerald-400" />
              Website Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/60 mb-4">
              Upload your logos to Cloudinary (or any image host) and paste the URLs below.
            </p>
            
            {['primaryLogo', 'mobileLogo', 'favicon'].map((field) => (
              <div key={field} className="flex gap-4 items-start">
                {renderImagePreview(brandingForm[field as keyof typeof brandingForm], field)}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/60 mb-1 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()} URL
                  </label>
                  <input 
                    type="text" 
                    value={brandingForm[field as keyof typeof brandingForm]} 
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#0F0F12] border border-white/10 rounded-md text-sm text-white px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            ))}
            
            <Button 
              onClick={handleSaveBranding} 
              disabled={savingBranding}
              className="bg-emerald-500 text-white hover:bg-emerald-600 w-full mt-4 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {brandingSaved ? 'Saved!' : 'Save Branding'}
            </Button>
          </CardContent>
        </Card>

        {/* Visual Assets Card */}
        <Card className="bg-[#121214] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
              Visual Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/60 mb-4">
              Manage decorative images for backgrounds and corners across the app.
            </p>

            {['heroBackground', 'cornerImage'].map((field) => (
              <div key={field} className="flex gap-4 items-start">
                {renderImagePreview(brandingForm[field as keyof typeof brandingForm], field)}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-white/60 mb-1 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()} URL
                  </label>
                  <input 
                    type="text" 
                    value={brandingForm[field as keyof typeof brandingForm]} 
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#0F0F12] border border-white/10 rounded-md text-sm text-white px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            ))}

            <Button 
              onClick={handleSaveBranding} 
              disabled={savingBranding}
              className="bg-emerald-500 text-white hover:bg-emerald-600 w-full mt-4 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {brandingSaved ? 'Saved!' : 'Save Visual Assets'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Management Card */}
        <Card className="bg-[#121214] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/60 mb-4">
              Export your Dawah members data for backup or offline analysis.
            </p>
            <Button 
              onClick={handleExport} 
              disabled={exporting}
              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 w-full flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export Contacts (CSV)'}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="bg-[#121214] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-emerald-400" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-white/40" />
                <div>
                  <div className="text-sm font-medium text-white">Theme</div>
                  <div className="text-xs text-white/40">Application appearance</div>
                </div>
              </div>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="bg-[#0F0F12] border border-white/10 rounded-md text-sm text-white px-3 py-1.5 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="dark">Dark Theme</option>
                <option value="light" disabled>Light Theme (Coming Soon)</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-white/40" />
                <div>
                  <div className="text-sm font-medium text-white">Notifications</div>
                  <div className="text-xs text-white/40">In-app alerts and reminders</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-white/5">
              <Button 
                onClick={handleSave} 
                className="bg-emerald-500 text-white hover:bg-emerald-600 w-full flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saved ? 'Saved!' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
