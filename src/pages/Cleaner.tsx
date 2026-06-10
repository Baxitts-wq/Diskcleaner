import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Cleaner() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any[] | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

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
      const results = await window.electronAPI.scanJunk();
      setScanResults(results);
      if (results.length === 0) {
        toast.success('No junk files found!');
      } else {
        setSelected(new Set(results.map(r => r.id)));
        toast.success(`Found ${results.length} folders to clean.`);
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
      const result = await window.electronAPI.cleanJunk(Array.from(selected));
      if (result.success) {
        toast.success(`Cleaning completed! Freed ${Math.round(result.cleanedSize / 1024 / 1024)} MB.`);
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Smart Cleaner</h1>
        <p className="text-slate-400 mt-1">Safely remove temporary files to free space</p>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        <div className="w-full max-w-xl bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col shadow-xl">
          <div className="flex items-center gap-2 mb-6 text-slate-300">
            <ShieldAlert size={20} className="text-primary-500" />
            <h2 className="text-lg font-semibold">Action Center</h2>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {isScanning ? (
              <div className="flex flex-col items-center">
                <Loader2 size={48} className="text-primary-500 animate-spin mb-4" />
                <p className="text-lg text-white font-medium">Analyzing system paths...</p>
              </div>
            ) : isCleaning ? (
              <div className="flex flex-col items-center">
                <Loader2 size={48} className="text-red-500 animate-spin mb-4" />
                <p className="text-lg text-white font-medium">Cleaning in progress...</p>
              </div>
            ) : scanResults ? (
              <div className="flex flex-col items-center w-full">
                <Trash2 size={48} className="text-red-500 mb-4" />
                <p className="text-lg text-white font-medium">Found Junk Files</p>
                <p className="text-5xl font-bold text-white mt-4 mb-6">
                  {(totalFoundSize / 1024 / 1024).toFixed(2)} <span className="text-2xl text-slate-400">MB</span>
                </p>
                
                <div className="w-full space-y-2 mb-8 max-h-52 overflow-y-auto custom-scrollbar text-left border border-dark-700/50 rounded-xl p-3 bg-dark-900/40">
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
                      <span>Select All</span>
                    </label>
                    <span>Size</span>
                  </div>
                  {scanResults.map((item: any) => (
                    <label key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-dark-700/30 cursor-pointer hover:bg-dark-700/20 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={selected.has(item.id)}
                          onChange={() => {
                            const updated = new Set(selected);
                            if (updated.has(item.id)) {
                              updated.delete(item.id);
                            } else {
                              updated.add(item.id);
                            }
                            setSelected(updated);
                          }}
                          className="w-4 h-4 accent-primary-500 rounded cursor-pointer"
                        />
                        <span className="text-slate-300">{item.name}</span>
                      </div>
                      <span className="text-slate-400">{Math.round(item.size / 1024 / 1024)} MB</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-4 w-full">
                  <button onClick={() => setScanResults(null)} className="flex-1 py-3 rounded-xl border border-dark-600 text-slate-300 hover:bg-dark-700 transition-colors font-medium">
                    Cancel
                  </button>
                  <button 
                    disabled={selected.size === 0}
                    onClick={startCleaning} 
                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors font-medium shadow-lg shadow-red-900/20"
                  >
                    Clean Now
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Trash2 size={48} className="text-slate-600 mb-4" />
                <p className="text-lg text-white font-medium mb-2">Ready to Scan</p>
                <button 
                  onClick={startScan}
                  className="mt-6 bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20"
                >
                  Analyze System
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
