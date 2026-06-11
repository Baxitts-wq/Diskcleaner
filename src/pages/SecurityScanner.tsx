import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Play, Loader2, AlertTriangle, Check, Info, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Threat {
  id: string;
  type: 'process' | 'registry' | 'hosts' | 'task' | 'extension';
  severity: 'high' | 'medium' | 'low';
  name: string;
  description: string;
  details: string;
  action?: string;
}

export default function SecurityScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanSummary, setScanSummary] = useState<any | null>(null);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);

  const steps = [
    { label: 'Processes', desc: 'Scanning active memory and process paths...' },
    { label: 'Registry', desc: 'Auditing startup items and run keys...' },
    { label: 'Hosts', desc: 'Verifying DNS resolution mappings...' },
    { label: 'Tasks', desc: 'Checking scheduled background tasks...' },
    { label: 'Extensions', desc: 'Auditing browser add-ons and permissions...' }
  ];

  const runScan = async () => {
    setIsScanning(true);
    setHasScanned(false);
    setScanSummary(null);
    setThreats([]);

    try {
      // Animate through the fake/visual stages for premium feel
      for (const step of steps) {
        setScanStep(step.desc);
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const res = await window.electronAPI.scanThreats();
      setThreats(res.threats);
      setScanSummary(res.summary);
      setHasScanned(true);

      if (res.threats.length === 0) {
        toast.success('System is secure! No threats detected.');
      } else {
        toast.error(`Scan complete. Found ${res.threats.length} issues.`);
      }
    } catch (e) {
      toast.error('Scan failed to complete');
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFix = async (threatId: string) => {
    setFixingId(threatId);
    toast.loading('Applying quarantine fix...', { id: 'fix-threat' });
    try {
      const res = await window.electronAPI.quarantineThreat(threatId);
      if (res.success) {
        toast.success(res.message || 'Threat quarantined', { id: 'fix-threat' });
        // Remove from list
        setThreats(prev => prev.filter(t => t.id !== threatId));
        // Update summary
        setScanSummary((prev: any) => {
          if (!prev) return null;
          const updatedTotal = Math.max(0, prev.total - 1);
          return {
            ...prev,
            total: updatedTotal
          };
        });
      } else {
        toast.error('Failed to fix: ' + res.message, { id: 'fix-threat' });
      }
    } catch (e) {
      toast.error('Failed to fix threat', { id: 'fix-threat' });
    } finally {
      setFixingId(null);
    }
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'process': return '🖥️ Process';
      case 'registry': return '🔑 Registry Run';
      case 'hosts': return '🌐 Hosts File';
      case 'task': return '⏰ Scheduled Task';
      case 'extension': return '🧩 Extension';
      default: return type;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full gap-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Threat Scanner</h1>
        <p className="text-slate-400 mt-1">Audit startup vectors, active tasks, and process signatures for threats</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        
        {/* Left Side Control Panel */}
        <div className="w-full md:w-80 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col justify-between shadow-xl flex-shrink-0">
          <div className="flex flex-col items-center text-center">
            
            {/* Big Shield Logo States */}
            <div className="mb-6 mt-4 relative">
              {isScanning ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
                  <div className="p-8 rounded-full bg-dark-900 border border-primary-500/40 text-primary-500 relative z-10">
                    <Loader2 size={64} className="animate-spin" />
                  </div>
                </div>
              ) : hasScanned ? (
                threats.length > 0 ? (
                  <div className="p-8 rounded-full bg-red-500/10 border border-red-500/30 text-red-500">
                    <ShieldAlert size={64} />
                  </div>
                ) : (
                  <div className="p-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
                    <ShieldCheck size={64} />
                  </div>
                )
              ) : (
                <div className="p-8 rounded-full bg-slate-700/10 border border-slate-700/30 text-slate-400">
                  <Shield size={64} />
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {isScanning ? 'Scanning System...' : 
               hasScanned ? (threats.length > 0 ? 'Action Required' : 'System Secure') : 
               'Threat Audit Engine'}
            </h2>
            
            <p className="text-sm text-slate-400 max-w-[240px]">
              {isScanning ? 'Checking registry persistence, host modifications, browser extensions and running items.' : 
               hasScanned ? (threats.length > 0 ? `Found ${threats.length} potential threats that should be removed or disabled.` : 'No malicious vectors or high risk items found in startup or runtime databases.') : 
               'Run a quick security audit to ensure malware hasn\'t hijacked system files, browsers or schedule files.'}
            </p>

            {/* Quick Metrics display */}
            {hasScanned && scanSummary && (
              <div className="grid grid-cols-3 gap-2 w-full mt-6 bg-dark-900/50 p-3 rounded-xl border border-dark-700">
                <div className="text-center">
                  <div className="text-red-500 font-bold text-base">{scanSummary.high}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">High</div>
                </div>
                <div className="text-center border-x border-dark-700">
                  <div className="text-yellow-400 font-bold text-base">{scanSummary.medium}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Med</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400 font-bold text-base">{scanSummary.low}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Low</div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button
              disabled={isScanning}
              onClick={runScan}
              className={`w-full py-3 rounded-xl font-medium transition-all shadow-lg flex items-center justify-center gap-2 text-white ${
                isScanning ? 'bg-slate-700 cursor-not-allowed' : 
                hasScanned && threats.length > 0 ? 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 shadow-red-900/20' : 
                'bg-primary-600 hover:bg-primary-500 shadow-primary-900/20'
              }`}
            >
              {isScanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Auditing...
                </>
              ) : (
                <>
                  <Play size={16} />
                  {hasScanned ? 'Scan Again' : 'Start Threat Audit'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side Results Area */}
        <div className="flex-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-dark-700 p-6 flex flex-col shadow-xl min-h-0">
          <div className="flex items-center justify-between pb-4 border-b border-dark-700">
            <h3 className="text-lg font-bold text-white">Detection Report</h3>
            {hasScanned && scanSummary && (
              <span className="text-xs text-slate-400">
                Audit complete in {(scanSummary.durationMs / 1000).toFixed(2)}s ({scanSummary.scannedCategories} modules)
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar mt-4">
            {isScanning ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="text-primary-500 animate-spin" size={32} />
                <p className="text-white font-medium">{scanStep}</p>
                <div className="flex gap-1.5 mt-2">
                  {steps.map((s, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                        scanStep.includes(s.label) ? 'bg-primary-500' : 'bg-dark-900'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : hasScanned ? (
              threats.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-4">
                    <Lock size={32} />
                  </div>
                  <h4 className="text-white font-bold text-lg mb-1">Your System is Clean</h4>
                  <p className="text-slate-400 max-w-sm text-sm">
                    No registry, task, hosts file, browser or process-based anomalies were found.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pr-2">
                  {threats.map(threat => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={threat.id}
                      className="bg-dark-900/40 border border-dark-700/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-dark-600 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider ${getSeverityColor(threat.severity)}`}>
                            {threat.severity} risk
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-dark-700 text-slate-300">
                            {getTypeLabel(threat.type)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate">{threat.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{threat.description}</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-1 bg-dark-900/60 p-1.5 rounded border border-dark-800 break-all select-all">
                          {threat.details}
                        </p>
                      </div>
                      <button
                        disabled={fixingId !== null}
                        onClick={() => handleFix(threat.id)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow shadow-red-900/20 whitespace-nowrap transition-colors flex items-center justify-center gap-1.5"
                      >
                        {fixingId === threat.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Fixing...
                          </>
                        ) : (
                          <>
                            <Check size={12} />
                            Quarantine
                          </>
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <Shield size={32} className="text-slate-600 mb-4" />
                <h4 className="text-slate-300 font-bold text-lg mb-1">Audit Engine Ready</h4>
                <p className="text-slate-500 max-w-sm text-sm">
                  Run a security scan to check for background tasks, hijacking hooks, and adware.
                </p>
              </div>
            )}
          </div>

          {/* Disclaimer banner */}
          <div className="mt-4 p-3 bg-dark-900/60 rounded-xl border border-dark-700/50 flex items-start gap-2.5">
            <Info size={14} className="text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-normal">
              <span className="font-bold text-slate-300">Antivirus Disclaimer:</span> This utility is a heuristic scanner designed to detect common PUPs (Potentially Unwanted Programs), browser hijackers, and suspicious background startup configurations. It does not run real-time file-system intercepts and does not replace a robust real-time Antivirus program (like Windows Defender or malware protection suites).
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
