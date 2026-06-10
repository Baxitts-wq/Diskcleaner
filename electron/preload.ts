import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getDiskInfo: () => ipcRenderer.invoke('get-disk-info'),
  getRealtimeMetrics: () => ipcRenderer.invoke('get-realtime-metrics'),
  analyzeStorage: () => ipcRenderer.invoke('analyze-storage'),
  scanJunk: () => ipcRenderer.invoke('scan-junk'),
  cleanJunk: (items: string[]) => ipcRenderer.invoke('clean-junk', items),
  scanDuplicates: () => ipcRenderer.invoke('scan-duplicates'),
  clearRAM: () => ipcRenderer.invoke('clear-ram'),
  optimizeNetwork: (mode: string) => ipcRenderer.invoke('optimize-network', mode),
  getBgApps: () => ipcRenderer.invoke('get-bg-apps'),
  killProcess: (pid: number) => ipcRenderer.invoke('kill-process', pid),
  getStartupApps: () => ipcRenderer.invoke('get-startup-apps'),
  disableStartupApp: (name: string) => ipcRenderer.invoke('disable-startup-app', name),
  isAdmin: () => ipcRenderer.invoke('is-admin'),
  deleteFiles: (paths: string[]) => ipcRenderer.invoke('delete-files', paths),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close')
});
