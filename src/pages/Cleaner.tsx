import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Cleaner() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['temp']));
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any[] | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const startScan = async () => {
    setIsScanning(true);
    setScanResults(null);
    try {
      const results = await window.electronAPI.scanJunk();
      setScanResults(results);
      if (results.length === 0) {
        toast.success('No junk files found!');
      } else {
        toast.success(`Found ${results.length} folders to clean.`);
      }
    } catch (e) {
      toast.error('Failed to scan for junk.');
    } finally {
      setIsScanning(false);
    }
  };

  const startCleaning = async () => {
    if (!scanResults) return;
    setIsCleaning(true);
    try {
      const result = await window.electronAPI.cleanJunk(Array.from(selected));
      if (result.success) {
        toast.success(`Cleaning completed! Freed ${Math.round(result.cleanedSize / 1024 / 1024)} MB.`);
        setScanResults(null);
      }
    } catch (e) {
      toast.error('Error during cleaning.');
    } finally {
      setIsCleaning(false);
    }
  };

  const totalFoundSize = scanResults ? scanResults.reduce((acc, r) => acc + r.size, 0) : 0;

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
        <div className="w-1/2 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col shadow-xl">
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
                <p className="text-5xl font-bold text-white mt-4 mb-2">{(totalFoundSize / 1024 / 1024).toFixed(2)} <span className="text-2xl text-slate-400">MB</span></p>
                
                <div className="w-full space-y-2 mb-8 max-h-32 overflow-y-auto custom-scrollbar">
                  {scanResults.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm py-2 border-b border-dark-700/50">
                      <span className="text-slate-300">{item.name}</span>
                      <span className="text-slate-400">{Math.round(item.size / 1024 / 1024)} MB</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 w-full">
                  <button onClick={() => setScanResults(null)} className="flex-1 py-3 rounded-xl border border-dark-600 text-slate-300 hover:bg-dark-700 transition-colors font-medium">
                    Cancel
                  </button>
                  <button onClick={startCleaning} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors font-medium shadow-lg shadow-red-900/20">
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
