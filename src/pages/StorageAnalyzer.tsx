import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, HardDrive, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StorageAnalyzer() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const startAnalysis = async () => {
    setIsScanning(true);
    try {
      const data = await window.electronAPI.analyzeStorage();
      setResults(data);
      toast.success('Analysis complete!');
    } catch (e) {
      toast.error('Failed to analyze storage.');
    } finally {
      setIsScanning(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return '0 B';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Storage Analyzer</h1>
          <p className="text-slate-400 mt-1">Deep scan of your Home directory</p>
        </div>
        {!results && !isScanning && (
          <button 
            onClick={startAnalysis}
            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20"
          >
            Start Scan
          </button>
        )}
      </div>

      {!results ? (
        <div className="flex-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 flex flex-col items-center justify-center p-6 shadow-xl">
          {isScanning ? (
            <div className="flex flex-col items-center">
              <Loader2 size={48} className="text-primary-500 animate-spin mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">Analyzing Home Folders</h2>
              <p className="text-slate-400">Scanning Documents, Downloads, etc...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <HardDrive size={64} className="text-slate-600 mb-6" />
              <h2 className="text-xl font-medium text-white mb-2">Ready to Analyze</h2>
              <p className="text-slate-400 max-w-md text-center">
                Click scan to evaluate the size of your primary user folders.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col shadow-xl">
          <h3 className="text-lg font-medium text-white mb-4">Largest User Folders</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {results.map((dir, i) => (
              <div key={i} className="bg-dark-900/50 p-4 rounded-xl border border-dark-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="text-primary-500" size={24} />
                  <div>
                    <div className="font-medium text-white">{dir.name}</div>
                    <div className="text-xs text-slate-400">{dir.path}</div>
                  </div>
                </div>
                <div className="text-xl font-bold text-white">{formatSize(dir.size)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
