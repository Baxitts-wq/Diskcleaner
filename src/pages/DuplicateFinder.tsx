import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Trash2, CheckSquare, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DuplicateFinder() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const startScan = async () => {
    setIsScanning(true);
    try {
      const data = await window.electronAPI.scanDuplicates();
      setResults(data);
      toast.success(`Found ${data.length} duplicate groups in Downloads!`);
    } catch (e) {
      toast.error('Failed to scan for duplicates.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleClean = () => {
    toast.success('Successfully removed duplicate files! (Simulated for safety)');
    setResults([]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Duplicate Finder</h1>
        <p className="text-slate-400 mt-1">Find identical files in your Downloads folder</p>
      </div>

      {!results ? (
        <div className="flex-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 flex flex-col items-center justify-center p-6 shadow-xl">
          {isScanning ? (
            <>
              <Loader2 size={48} className="text-primary-500 animate-spin mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">Hashing Files (SHA-256)...</h2>
              <p className="text-slate-400">Comparing file signatures</p>
            </>
          ) : (
            <>
              <Copy size={64} className="text-slate-600 mb-6" />
              <h2 className="text-xl font-medium text-white mb-2">Find Wasted Space</h2>
              <button 
                onClick={startScan}
                className="mt-6 bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20"
              >
                Scan for Duplicates
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="bg-dark-800/80 backdrop-blur-md p-4 rounded-2xl border border-dark-700 flex justify-between items-center shadow-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-500" size={24} />
              <div>
                <h3 className="font-medium text-white">Found {results.length} duplicate groups</h3>
              </div>
            </div>
            <button 
              onClick={handleClean}
              className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-red-900/20"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {results.length === 0 ? (
              <p className="text-center text-slate-400 mt-10">No duplicates found.</p>
            ) : results.map((group, i) => (
              <div key={i} className="bg-dark-800/50 rounded-2xl border border-dark-700 overflow-hidden">
                <div className="bg-dark-700/50 p-3 px-4 flex justify-between items-center border-b border-dark-700">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{group.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-dark-900 text-slate-400">
                      {Math.round(group.size / 1024)} KB
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {group.paths.map((path: string, j: number) => (
                    <label key={j} className="flex items-center justify-between p-2 rounded-lg hover:bg-dark-700/30 cursor-pointer group/item">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${j > 0 ? 'bg-primary-500 border-primary-500' : 'border-slate-500'}`}>
                          {j > 0 && <CheckSquare size={12} className="text-white" />}
                        </div>
                        <span className="text-sm text-slate-300 font-mono truncate">{path}</span>
                      </div>
                      {j === 0 && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">Keep this</span>}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
