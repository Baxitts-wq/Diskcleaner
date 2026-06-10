import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, HardDrive, Trash2, Copy, Activity, Settings, X, Minus, Maximize2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import Dashboard from './pages/Dashboard';
import StorageAnalyzer from './pages/StorageAnalyzer';
import Cleaner from './pages/Cleaner';
import DuplicateFinder from './pages/DuplicateFinder';
import Performance from './pages/Performance';
import SettingsPage from './pages/SettingsPage';

function TitleBar() {
  return (
    <div className="h-8 bg-dark-900 flex justify-between items-center px-4 drag-region fixed top-0 w-full z-50 border-b border-dark-800">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        <HardDrive size={16} className="text-primary-500" />
        DiskSweep
      </div>
      <div className="flex items-center gap-4 no-drag">
        <button onClick={() => window.electronAPI.minimizeWindow()} className="text-slate-400 hover:text-white transition-colors">
          <Minus size={16} />
        </button>
        <button onClick={() => window.electronAPI.maximizeWindow()} className="text-slate-400 hover:text-white transition-colors">
          <Maximize2 size={14} />
        </button>
        <button onClick={() => window.electronAPI.closeWindow()} className="text-slate-400 hover:bg-red-500 hover:text-white transition-colors h-8 w-8 flex items-center justify-center -mr-4">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/analyzer', icon: <HardDrive size={20} />, label: 'Analyzer' },
    { path: '/cleaner', icon: <Trash2 size={20} />, label: 'Cleaner' },
    { path: '/duplicates', icon: <Copy size={20} />, label: 'Duplicates' },
    { path: '/performance', icon: <Activity size={20} />, label: 'Performance' },
  ];

  return (
    <div className="w-64 bg-dark-800/50 backdrop-blur-xl border-r border-dark-700 flex flex-col h-full pt-8 no-drag">
      <div className="flex-1 py-6 flex flex-col gap-2 px-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              location.pathname === item.path
                ? 'bg-primary-600/20 text-primary-500 font-medium'
                : 'text-slate-400 hover:bg-dark-700/50 hover:text-slate-200'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
      <div className="p-3">
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            location.pathname === '/settings'
              ? 'bg-primary-600/20 text-primary-500 font-medium'
              : 'text-slate-400 hover:bg-dark-700/50 hover:text-slate-200'
          }`}
        >
          <Settings size={20} />
          Settings
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col overflow-hidden bg-dark-900 text-slate-200 font-sans">
        <TitleBar />
        <div className="flex-1 flex overflow-hidden pt-8">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-dark-900 relative p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 h-full">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analyzer" element={<StorageAnalyzer />} />
                <Route path="/cleaner" element={<Cleaner />} />
                <Route path="/duplicates" element={<DuplicateFinder />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </main>
        </div>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' } }} />
      </div>
    </Router>
  );
}
