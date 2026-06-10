import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Power, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    theme: 'dark',
    language: 'fr',
    autoScan: false,
    autoClean: false,
    performanceMode: 'gaming',
    notifications: true,
  });
  
  const [startupApps, setStartupApps] = useState<any[]>([]);
  const [isLoadingStartup, setIsLoadingStartup] = useState(false);

  useEffect(() => {
    loadSettings();
    loadStartupApps();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await window.electronAPI.getSettings();
      setSettings(data);
    } catch (e) {
      toast.error('Failed to load settings');
    }
  };

  const loadStartupApps = async () => {
    setIsLoadingStartup(true);
    try {
      const apps = await window.electronAPI.getStartupApps();
      setStartupApps(apps);
    } catch (e) {
      toast.error('Failed to load startup items');
    } finally {
      setIsLoadingStartup(false);
    }
  };

  const handleSave = async (updated: any) => {
    setSettings(updated);
    try {
      const res = await window.electronAPI.saveSettings(updated);
      if (res.success) {
        toast.success('Settings updated!');
      } else {
        toast.error('Failed to save settings: ' + res.error);
      }
    } catch (e) {
      toast.error('Save error');
    }
  };

  const handleDisableStartup = async (name: string) => {
    toast.loading('Disabling startup item...', { id: 'startup' });
    try {
      const res = await window.electronAPI.disableStartupApp(name);
      if (res.success) {
        toast.success(`Disabled ${name} from startup!`, { id: 'startup' });
        loadStartupApps();
      } else {
        toast.error('Failed to disable startup app: ' + res.error, { id: 'startup' });
      }
    } catch (e) {
      toast.error('Error disabling startup app', { id: 'startup' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6 overflow-y-auto pr-2 custom-scrollbar"
    >
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings & Startup</h1>
        <p className="text-slate-400 mt-1">Configure profile preferences and startup applications</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Profile Settings */}
        <div className="bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col gap-6 shadow-xl">
          <div className="flex items-center gap-2 text-slate-300 border-b border-dark-700 pb-3">
            <Settings size={20} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-white">General Preferences</h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-white font-medium">Language</label>
                <p className="text-xs text-slate-400">Select application interface language</p>
              </div>
              <select 
                value={settings.language} 
                onChange={(e) => handleSave({ ...settings, language: e.target.value })}
                className="bg-dark-900 border border-dark-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label className="text-white font-medium">Performance Profile</label>
                <p className="text-xs text-slate-400">Default optimization profile for network</p>
              </div>
              <select 
                value={settings.performanceMode} 
                onChange={(e) => handleSave({ ...settings, performanceMode: e.target.value })}
                className="bg-dark-900 border border-dark-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="gaming">Gaming Boost</option>
                <option value="streaming">Streaming Max</option>
                <option value="default">Default Safe</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label className="text-white font-medium">Real-time Notifications</label>
                <p className="text-xs text-slate-400">Enable OS alerts after scans & cleaning</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.notifications} 
                onChange={(e) => handleSave({ ...settings, notifications: e.target.checked })}
                className="w-5 h-5 accent-primary-500 cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label className="text-white font-medium">Automatic Scanning</label>
                <p className="text-xs text-slate-400">Run safe storage analysis on background startup</p>
              </div>
              <input 
                type="checkbox" 
                checked={settings.autoScan} 
                onChange={(e) => handleSave({ ...settings, autoScan: e.target.checked })}
                className="w-5 h-5 accent-primary-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Windows Startup Manager */}
        <div className="bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-dark-700 pb-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Power size={20} className="text-purple-500" />
              <h2 className="text-lg font-semibold text-white">Startup Programs</h2>
            </div>
            <button onClick={loadStartupApps} className="text-sm text-primary-400 hover:text-primary-300">
              Refresh
            </button>
          </div>

          <div className="flex-1 max-h-96 overflow-y-auto custom-scrollbar space-y-2">
            {isLoadingStartup ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-primary-500" size={32} />
              </div>
            ) : startupApps.length === 0 ? (
              <p className="text-center text-slate-400 py-10">No third-party startup apps found.</p>
            ) : (
              startupApps.map((app, index) => (
                <div key={index} className="bg-dark-900/50 border border-dark-700/50 rounded-xl p-3 flex justify-between items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate text-sm">{app.name}</div>
                    <div className="text-xs text-slate-500 truncate font-mono mt-0.5">{app.command}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 font-medium">
                      Active
                    </span>
                    <button 
                      onClick={() => handleDisableStartup(app.name)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition-colors font-medium border border-red-500/20"
                    >
                      Disable
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
