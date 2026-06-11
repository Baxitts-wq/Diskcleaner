import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, MemoryStick, Activity, Zap, ShieldAlert, Wifi, RotateCcw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Performance() {
  const [apps, setApps] = useState<any[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isClearingRAM, setIsClearingRAM] = useState(false);
  const [isOptimizingNet, setIsOptimizingNet] = useState(false);
  const [activeNetMode, setActiveNetMode] = useState<string>('default');
  const [appliedActions, setAppliedActions] = useState<string[]>([]);

  useEffect(() => {
    loadApps();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings && settings.performanceMode) {
        setActiveNetMode(settings.performanceMode);
      }
    } catch (e) {
      console.error('Failed to load performance settings', e);
    }
  };

  const loadApps = async () => {
    setIsLoadingApps(true);
    try {
      const data = await window.electronAPI.getBgApps();
      setApps(data);
    } catch (e) {
      toast.error('Failed to load background apps');
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleKill = async (pid: number) => {
    try {
      const res = await window.electronAPI.killProcess(pid);
      if (res.success) {
        toast.success('Process terminated successfully');
        setApps(apps.filter(app => app.pid !== pid));
      } else {
        toast.error('Could not terminate process: ' + res.error);
      }
    } catch (e) {
      toast.error('Failed to kill process');
    }
  };

  const clearRAM = async () => {
    setIsClearingRAM(true);
    toast.loading('Clearing Working Sets (Standby RAM)...', { id: 'ram' });
    try {
      const res = await window.electronAPI.clearRAM();
      if (res.success) {
        toast.success(`RAM Optimized! Freed ${Math.round(res.freedBytes / 1024 / 1024)} MB`, { id: 'ram' });
      } else {
        toast.error('Failed to optimize RAM', { id: 'ram' });
      }
    } catch (e) {
      toast.error('RAM optimization error', { id: 'ram' });
    } finally {
      setIsClearingRAM(false);
    }
  };

  const optimizeNet = async (mode: 'gaming' | 'streaming' | 'default') => {
    setIsOptimizingNet(true);
    const modeLabel = mode === 'gaming' ? 'Gaming' : mode === 'streaming' ? 'Streaming' : 'Default';
    toast.loading(`Optimizing Network (${modeLabel})...`, { id: 'net' });
    try {
      const res = await window.electronAPI.optimizeNetwork(mode);
      if (res.success) {
        setActiveNetMode(mode);
        setAppliedActions(res.actions || []);
        toast.success(`Network settings optimized for ${modeLabel}!`, { id: 'net' });
        // Save back to settings so it persists
        await window.electronAPI.saveSettings({ performanceMode: mode });
      } else {
        toast.error('Optimization failed: ' + res.error, { id: 'net' });
      }
    } catch (e) {
      toast.error('Network optimization error', { id: 'net' });
    } finally {
      setIsOptimizingNet(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Performance Boost</h1>
        <p className="text-slate-400 mt-1">Optimize your system resources in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RAM Optimizer */}
        <div className="bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col justify-between shadow-xl gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-500">
              <MemoryStick size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">RAM Optimizer</h2>
              <p className="text-sm text-slate-400 mt-1">
                Clears standby lists, system caches, and unused process working sets using Windows memory management APIs. Recommended before gaming or starting heavy tasks.
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button 
              disabled={isClearingRAM}
              onClick={clearRAM}
              className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20 w-full sm:w-auto"
            >
              {isClearingRAM ? 'Optimizing...' : 'Clear Standby RAM'}
            </button>
          </div>
        </div>

        {/* Network Optimizer */}
        <div className="bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col justify-between shadow-xl gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
              <Wifi size={32} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-white">Network Boost</h2>
                <span className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${
                  activeNetMode === 'gaming' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  activeNetMode === 'streaming' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                  'bg-slate-700/55 text-slate-300 border border-slate-600/30'
                }`}>
                  {activeNetMode} mode
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Tweaks TCP/IP registry, disables Nagle's algorithm, resets Winsock, and optimizes adapter power saving.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-end">
            <button 
              disabled={isOptimizingNet}
              onClick={() => optimizeNet('default')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all text-sm border ${
                activeNetMode === 'default'
                  ? 'bg-slate-700 text-white border-slate-600 shadow-lg'
                  : 'bg-dark-900 text-slate-400 border-dark-700 hover:text-slate-200'
              }`}
            >
              <RotateCcw size={14} />
              Reset Defaults
            </button>
            <button 
              disabled={isOptimizingNet}
              onClick={() => optimizeNet('gaming')}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm border ${
                activeNetMode === 'gaming'
                  ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-lg shadow-red-900/20'
                  : 'bg-dark-900 text-slate-400 border-dark-700 hover:text-slate-200'
              }`}
            >
              🚀 Gaming Mode
            </button>
            <button 
              disabled={isOptimizingNet}
              onClick={() => optimizeNet('streaming')}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm border ${
                activeNetMode === 'streaming'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-500 text-white border-transparent shadow-lg shadow-cyan-900/20'
                  : 'bg-dark-900 text-slate-400 border-dark-700 hover:text-slate-200'
              }`}
            >
              🎬 Streaming Mode
            </button>
          </div>
        </div>
      </div>

      {/* Applied Tweaks Log */}
      {appliedActions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-dark-800/60 border border-dark-700 rounded-2xl p-5 shadow-inner"
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Applied Tweaks ({appliedActions.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {appliedActions.map((action, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400 bg-dark-900/50 p-2 rounded-lg border border-dark-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Process Manager */}
      <div className="flex-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 flex flex-col min-h-0 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-dark-700 flex justify-between items-center bg-dark-900/20">
          <div className="flex items-center gap-3">
            <Cpu className="text-primary-500" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Active App & Process Manager</h2>
              <p className="text-xs text-slate-400 mt-0.5">Kills heavy, non-system applications to release RAM</p>
            </div>
          </div>
          <button 
            onClick={loadApps} 
            className="text-sm font-semibold text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 px-4 py-2 rounded-xl transition-all"
          >
            Refresh List
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoadingApps ? (
            <div className="p-8 text-center text-slate-400">
              <span className="inline-block animate-pulse">Scanning heavy processes...</span>
            </div>
          ) : apps.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No heavy third-party processes detected.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-dark-700 text-xs font-semibold uppercase tracking-wider bg-dark-900/30">
                  <th className="p-4 pl-6">Process Info</th>
                  <th className="p-4">PID</th>
                  <th className="p-4">Memory footprint</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence>
                  {apps.map(app => (
                    <motion.tr 
                      key={app.pid} 
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <div className="text-white font-medium">{app.name}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{app.description}</div>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{app.pid}</td>
                      <td className="p-4 text-slate-300 font-semibold">
                        {Math.round(app.memory / 1024 / 1024)} MB
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button 
                          onClick={() => handleKill(app.pid)}
                          className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold"
                        >
                          Terminate
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}

