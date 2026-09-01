import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '../components/ui';
import { Settings as SettingsIcon, Download, Save, Shield, Moon, Bell } from 'lucide-react';
import { Contact } from '../types';

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Dummy state for preferences
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState(true);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/contacts');
      const data = await res.json();
      
      // Convert to CSV
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
        
        // Trigger download
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-emerald-500" />
            System Settings
          </h1>
          <p className="text-white/60 mt-1">Manage your application preferences and data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
