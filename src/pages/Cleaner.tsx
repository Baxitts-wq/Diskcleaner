import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ShieldAlert, Loader2, Flame, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Cleaner() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any[] | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isDeepMode, setIsDeepMode] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).autoScan) {
      startScan();
    }
  }, [location.state]);

  const startScan = async () => {
    setIsScanning(true);
    setScanResults(null);
    setSelected(new Set());
    try {
      const results = isDeepMode
        ? await window.electronAPI.scanDeepClean()
        : await window.electronAPI.scanJunk();
      setScanResults(results);
      if (results.length === 0) {
        toast.success('No junk files found!');
      } else {
        setSelected(new Set(results.map(r => r.id)));
        toast.success(`Found ${results.length} items to clean.`);
      }
    } catch (e) {
      toast.error('Failed to scan for junk.');
    } finally {
      setIsScanning(false);
    }
  };

  const startCleaning = async () => {
    if (!scanResults || selected.size === 0) return;
    setIsCleaning(true);
    try {
      const result = isDeepMode
        ? await window.electronAPI.executeDeepClean(Array.from(selected))
        : await window.electronAPI.cleanJunk(Array.from(selected));
      if (result.success) {
        const freedMB = Math.round(result.cleanedSize / 1024 / 1024);
        const freedGB = (result.cleanedSize / 1024 / 1024 / 1024).toFixed(2);
        const displaySize = result.cleanedSize > 1024 * 1024 * 1024 ? `${freedGB} GB` : `${freedMB} MB`;
        toast.success(`Cleaning completed! Freed ${displaySize}. (${result.failCount} files locked)`);
        setScanResults(null);
        setSelected(new Set());
      }
    } catch (e) {
      toast.error('Error during cleaning.');
    } finally {
      setIsCleaning(false);
    }
  };

  const totalFoundSize = scanResults ? scanResults.reduce((acc, r) => acc + (selected.has(r.id) ? r.size : 0), 0) : 0;
  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    return Math.round(bytes / 1024 / 1024) + ' MB';
  };

  // Group scan results by category
  const groupedResults = scanResults ? scanResults.reduce((acc: Record<string, any[]>, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {}) : {};

  const categoryLabels: Record<string, string> = {
    system: '🖥️ System',
    browser: '🌐 Browsers',
    apps: '📱 Applications',
    gpu: '🎮 GPU Caches',
    logs: '📋 Logs & Dumps',
    user: '👤 User Data',
    dev: '🛠️ Development',
    other: '📁 Other'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Smart Cleaner</h1>
          <p className="text-slate-400 mt-1">Safely remove temporary files to free space</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsDeepMode(false); setScanResults(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm ${
              !isDeepMode
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
                : 'bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-700'
            }`}
          >
            <Zap size={16} />
            Standard
          </button>
          <button
            onClick={() => { setIsDeepMode(true); setScanResults(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm ${
              isDeepMode
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-900/20'
                : 'bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-700'
            }`}
          >
            <Flame size={16} />
            Deep Clean
          </button>
        </div>
      </div>

      {isDeepMode && !scanResults && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
          <ShieldAlert size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-200">
            <span className="font-bold">Deep Clean Mode</span> — Scans 40+ additional locations including event logs, recycle bin, development caches, browser code caches, and more. Some items may require a restart to fully take effect.
          </p>
        </div>
      )}

      <div className="flex-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col shadow-xl min-h-0">
        <div className="flex items-center gap-2 mb-4 text-slate-300">
          {isDeepMode ? <Flame size={20} className="text-red-500" /> : <ShieldAlert size={20} className="text-primary-500" />}
          <h2 className="text-lg font-semibold">{isDeepMode ? 'Deep Clean Engine' : 'Action Center'}</h2>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center overflow-y-auto">
          {isScanning ? (
            <div className="flex flex-col items-center">
              <Loader2 size={48} className={`${isDeepMode ? 'text-red-500' : 'text-primary-500'} animate-spin mb-4`} />
              <p className="text-lg text-white font-medium">
                {isDeepMode ? 'Deep scanning all system paths...' : 'Analyzing system paths...'}
              </p>
              <p className="text-sm text-slate-400 mt-2">This may take a moment</p>
            </div>
          ) : isCleaning ? (
            <div className="flex flex-col items-center">
              <Loader2 size={48} className="text-red-500 animate-spin mb-4" />
              <p className="text-lg text-white font-medium">Cleaning in progress...</p>
            </div>
          ) : scanResults ? (
            <div className="flex flex-col items-center w-full">
              <Trash2 size={40} className="text-red-500 mb-3" />
              <p className="text-lg text-white font-medium">Found {scanResults.length} Items</p>
              <p className="text-4xl font-bold text-white mt-3 mb-4">
                {formatSize(totalFoundSize)} <span className="text-lg text-slate-400">selected</span>
              </p>
              
              <div className="w-full space-y-3 mb-6 max-h-64 overflow-y-auto custom-scrollbar text-left border border-dark-700/50 rounded-xl p-3 bg-dark-900/40">
                <div className="flex items-center justify-between pb-2 border-b border-dark-700 font-semibold text-slate-400 text-xs px-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={scanResults.length > 0 && selected.size === scanResults.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(scanResults.map(r => r.id)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                      className="w-4 h-4 accent-primary-500 rounded cursor-pointer"
                    />
                    <span>Select All ({scanResults.length})</span>
                  </label>
                  <span>Size</span>
                </div>

                {Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category}>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 pt-2 pb-1">
                      {categoryLabels[category] || category}
                    </div>
                    {(items as any[]).map((item: any) => (
                      <label key={item.id} className="flex justify-between items-center text-sm py-1.5 cursor-pointer hover:bg-dark-700/20 px-2 rounded-lg transition-colors">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => {
                              const updated = new Set(selected);
                              if (updated.has(item.id)) updated.delete(item.id);
                              else updated.add(item.id);
                              setSelected(updated);
                            }}
                            className="w-3.5 h-3.5 accent-primary-500 rounded cursor-pointer"
                          />
                          <span className="text-slate-300 text-xs">{item.name}</span>
                          {item.risk === 'medium' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">caution</span>}
                        </div>
                        <span className="text-slate-400 text-xs">{formatSize(item.size)}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 w-full">
                <button onClick={() => setScanResults(null)} className="flex-1 py-3 rounded-xl border border-dark-600 text-slate-300 hover:bg-dark-700 transition-colors font-medium">
                  Cancel
                </button>
                <button 
                  disabled={selected.size === 0}
                  onClick={startCleaning} 
                  className={`flex-1 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors font-medium shadow-lg ${
                    isDeepMode
                      ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-red-900/20'
                      : 'bg-red-600 hover:bg-red-500 shadow-red-900/20'
                  }`}
                >
                  {isDeepMode ? '🔥 Deep Clean Now' : 'Clean Now'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {isDeepMode ? <Flame size={48} className="text-slate-600 mb-4" /> : <Trash2 size={48} className="text-slate-600 mb-4" />}
              <p className="text-lg text-white font-medium mb-2">Ready to {isDeepMode ? 'Deep ' : ''}Scan</p>
              <p className="text-sm text-slate-400 mb-6 max-w-md">
                {isDeepMode
                  ? 'Scans 40+ locations including system logs, development caches, recycle bin, event logs, and more.'
                  : 'Scans common cache and temp locations for safe cleanup.'
                }
              </p>
              <button 
                onClick={startScan}
                className={`px-8 py-3 rounded-xl font-medium transition-colors shadow-lg ${
                  isDeepMode
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-red-900/20'
                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-900/20'
                }`}
              >
                {isDeepMode ? '🔥 Deep Analyze System' : 'Analyze System'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
