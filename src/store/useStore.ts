import { create } from 'zustand';

interface SystemState {
  systemInfo: any;
  diskInfo: any[];
  realtimeMetrics: { cpuLoad: number; ramUsage: number };
  fetchSystemInfo: () => Promise<void>;
  fetchDiskInfo: () => Promise<void>;
  fetchRealtimeMetrics: () => Promise<void>;
}

export const useStore = create<SystemState>((set) => ({
  systemInfo: null,
  diskInfo: [],
  realtimeMetrics: { cpuLoad: 0, ramUsage: 0 },
  fetchSystemInfo: async () => {
    if (window.electronAPI) {
      const info = await window.electronAPI.getSystemInfo();
      set({ systemInfo: info });
    }
  },
  fetchDiskInfo: async () => {
    if (window.electronAPI) {
      const info = await window.electronAPI.getDiskInfo();
      set({ diskInfo: info });
    }
  },
  fetchRealtimeMetrics: async () => {
    if (window.electronAPI) {
      const metrics = await window.electronAPI.getRealtimeMetrics();
      set({ realtimeMetrics: metrics });
    }
  }
}));
