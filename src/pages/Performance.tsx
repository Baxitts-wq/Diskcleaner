import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, MemoryStick, Activity, Zap, ShieldAlert, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Performance() {
  const [apps, setApps] = useState<any[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isClearingRAM, setIsClearingRAM] = useState(false);
  const [isOptimizingNet, setIsOptimizingNet] = useState(false);

  useEffect(() => {
    loadApps();
  }, []);

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

  const optimizeNet = async (mode: string) => {
    setIsOptimizingNet(true);
    toast.loading(`Optimizing Network (${mode})...`, { id: 'net' });
    try {
      const res = await window.electronAPI.optimizeNetwork(mode);
      if (res.success) {
        toast.success('Network settings optimized (Flush DNS, Winsock Reset)', { id: 'net' });
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

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-500">
              <MemoryStick size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">RAM Optimizer</h2>
              <p className="text-sm text-slate-400">Clear standby lists and unused working sets</p>
            </div>
          </div>
          <button 
            disabled={isClearingRAM}
            onClick={clearRAM}
            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-primary-900/20"
          >
            {isClearingRAM ? 'Optimizing...' : 'Clear RAM'}
          </button>
        </div>

        <div className="bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
              <Wifi size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Network Boost</h2>
              <p className="text-sm text-slate-400">Flush DNS, reset Winsock & TCP parameters</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              disabled={isOptimizingNet}
              onClick={() => optimizeNet('gaming')}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-purple-900/20"
            >
              Gaming
            </button>
            <button 
              disabled={isOptimizingNet}
              onClick={() => optimizeNet('streaming')}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Streaming
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 flex flex-col min-h-0 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-dark-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-white">Background Process Manager</h2>
          </div>
          <button onClick={loadApps} className="text-sm text-primary-400 hover:text-primary-300">
            Refresh
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {isLoadingApps ? (
            <p className="p-4 text-slate-400">Loading heavy processes...</p>
          ) : apps.length === 0 ? (
            <p className="p-4 text-slate-400">No heavy non-system processes detected.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-dark-700 text-sm">
                  <th className="p-4 font-medium">Process Name</th>
                  <th className="p-4 font-medium">PID</th>
                  <th className="p-4 font-medium">RAM Usage</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {apps.map(app => (
                  <tr key={app.pid} className="border-b border-dark-700/50 hover:bg-dark-700/30 transition-colors">
                    <td className="p-4">
                      <div className="text-white font-medium">{app.name}</div>
                      <div className="text-slate-500 text-xs">{app.description}</div>
                    </td>
                    <td className="p-4 text-slate-400">{app.pid}</td>
                    <td className="p-4 text-slate-300">
                      {Math.round(app.memory / 1024 / 1024)} MB
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleKill(app.pid)}
                        className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-3 py-1 rounded transition-colors text-xs font-medium"
                      >
                        Force Stop
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
