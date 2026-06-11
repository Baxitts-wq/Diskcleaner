export interface IElectronAPI {
  getSystemInfo: () => Promise<any>;
  getDiskInfo: () => Promise<any>;
  getRealtimeMetrics: () => Promise<any>;
  analyzeStorage: () => Promise<any[]>;
  scanJunk: () => Promise<any[]>;
  cleanJunk: (items: string[]) => Promise<{ success: boolean; cleanedSize: number; successCount: number; failCount: number }>;
  scanDeepClean: () => Promise<any[]>;
  executeDeepClean: (items: string[]) => Promise<{ success: boolean; cleanedSize: number; successCount: number; failCount: number }>;
  scanDuplicates: () => Promise<any[]>;
  clearRAM: () => Promise<{ success: boolean; freedBytes: number; before: number; after: number }>;
  optimizeNetwork: (mode: string) => Promise<{ success: boolean; error?: string; actions?: string[] }>;
  getBgApps: () => Promise<any[]>;
  killProcess: (pid: number) => Promise<{ success: boolean; error?: string }>;
  getStartupApps: () => Promise<any[]>;
  disableStartupApp: (name: string) => Promise<{ success: boolean; error?: string }>;
  isAdmin: () => Promise<boolean>;
  deleteFiles: (paths: string[]) => Promise<{ success: boolean; deletedCount: number; errorCount: number }>;
  scanThreats: () => Promise<{ threats: any[]; summary: { total: number; high: number; medium: number; low: number; scannedCategories: number; durationMs: number } }>;
  quarantineThreat: (threatId: string) => Promise<{ success: boolean; message: string }>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
