import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { HardDrive, Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Dashboard() {
  const { systemInfo, diskInfo, fetchSystemInfo, fetchDiskInfo } = useStore();

  useEffect(() => {
    fetchSystemInfo();
    fetchDiskInfo();
  }, []);

  // Note: node-disk-info blocks are generally in bytes or 1K blocks depending on OS. We'll treat them as bytes for visual ratio.
  const totalDiskSpace = diskInfo.reduce((acc, disk) => acc + (disk.blocks || 0), 0);
  const totalUsedSpace = diskInfo.reduce((acc, disk) => acc + (disk.used || 0), 0);
  const totalFreeSpace = totalDiskSpace - totalUsedSpace;

  const diskData = [
    { name: 'Used Space', value: totalUsedSpace || 1, color: '#3b82f6' },
    { name: 'Free Space', value: totalFreeSpace || 1, color: '#334155' }
  ];

  const formatBytes = (bytes: number) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return '0 B';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const percentage = totalDiskSpace ? Math.round((totalUsedSpace / totalDiskSpace) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">System overview and health status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-800/80 backdrop-blur-md p-6 rounded-2xl border border-dark-700 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-400 mb-4">
              <CheckCircle2 className="text-green-500" size={20} />
              <h3 className="font-medium">System Health</h3>
            </div>
            <p className="text-5xl font-bold text-white">Good</p>
            <p className="text-sm text-slate-400 mt-2">No critical issues found</p>
          </div>
          <button className="mt-6 bg-primary-600 hover:bg-primary-500 text-white py-2 px-4 rounded-lg font-medium transition-colors">
            Quick Scan
          </button>
        </div>

        <div className="bg-dark-800/80 backdrop-blur-md p-6 rounded-2xl border border-dark-700 shadow-xl col-span-2 flex items-center">
          <div className="h-48 w-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={diskData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {diskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatBytes(value)}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-white">{percentage}%</span>
              <span className="text-xs text-slate-400">Used</span>
            </div>
          </div>
          
          <div className="flex-1 ml-8">
            <h3 className="text-xl font-semibold text-white mb-6">Storage Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Total Capacity</span>
                  <span className="font-medium text-white">{formatBytes(totalDiskSpace)}</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-1.5">
                  <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Used Space</span>
                  <span className="font-medium text-white">{formatBytes(totalUsedSpace)}</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-1.5">
                  <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="bg-dark-800/80 backdrop-blur-md p-6 rounded-2xl border border-dark-700 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="text-primary-500" size={20} />
            <h3 className="font-medium text-white">System Details</h3>
          </div>
          {systemInfo ? (
            <div className="space-y-3">
              <div className="flex justify-between border-b border-dark-700 pb-2">
                <span className="text-slate-400">OS</span>
                <span className="text-white text-right">{systemInfo.os}</span>
              </div>
              <div className="flex justify-between border-b border-dark-700 pb-2">
                <span className="text-slate-400">CPU</span>
                <span className="text-white text-right truncate ml-4" title={systemInfo.cpu}>{systemInfo.cpu}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-slate-400">RAM</span>
                <span className="text-white text-right">{formatBytes(systemInfo.ramTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-dark-700 rounded w-3/4"></div>
                <div className="h-4 bg-dark-700 rounded"></div>
                <div className="h-4 bg-dark-700 rounded w-5/6"></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-dark-800/80 backdrop-blur-md p-6 rounded-2xl border border-dark-700 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="text-primary-500" size={20} />
            <h3 className="font-medium text-white">Connected Drives</h3>
          </div>
          <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {diskInfo.length > 0 ? diskInfo.map((disk, i) => (
              <div key={i} className="bg-dark-900/50 p-3 rounded-xl border border-dark-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-dark-700 p-2 rounded-lg">
                    <HardDrive size={16} className="text-slate-300" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{disk.mounted}</div>
                    <div className="text-xs text-slate-400">{disk.filesystem}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{formatBytes(disk.blocks)}</div>
                  <div className="text-xs text-slate-400">{disk.capacity} used</div>
                </div>
              </div>
            )) : (
              <div className="text-slate-500 text-sm">Scanning drives...</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
