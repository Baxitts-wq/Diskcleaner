import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';

// Import new handlers
import { clearRAMCache, optimizeNetwork, getBackgroundProcesses, killProcess, getStartupApps, disableStartupApp } from './handlers/system';
import { scanJunkExtended, cleanJunkExtended, getDirectorySize } from './handlers/cleaner';
import { initSettings, getSettings, saveSettings } from './handlers/settings';

const execPromise = util.promisify(exec);
let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
    icon: path.join(process.env.VITE_PUBLIC || '', 'icon.ico')
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });
};

app.whenReady().then(async () => {
  // Initialize user settings directory
  await initSettings();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Native OS info
ipcMain.handle('get-system-info', async () => {
  try {
    const osType = os.type();
    const release = os.release();
    const cpus = os.cpus();
    const cpuName = cpus.length > 0 ? cpus[0].model : 'Unknown CPU';
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    return {
      cpu: cpuName,
      ramTotal: totalMem,
      ramUsed: totalMem - freeMem,
      os: `${osType} ${release}`
    };
  } catch (error) {
    return null;
  }
});

// Disk Info via CIM
ipcMain.handle('get-disk-info', async () => {
  try {
    const { stdout } = await execPromise('powershell -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, FileSystem, Size, FreeSpace | ConvertTo-Json"');
    if (!stdout || stdout.trim() === "") return [];
    
    const rawData = JSON.parse(stdout);
    const disks = Array.isArray(rawData) ? rawData : [rawData];
    
    return disks
      .filter(disk => disk && disk.DeviceID)
      .map(disk => {
        const size = parseInt(disk.Size) || 0;
        const free = parseInt(disk.FreeSpace) || 0;
        const used = size - free;
        const pct = size ? Math.round((used / size) * 100) : 0;
        return {
          mounted: disk.DeviceID,
          filesystem: disk.FileSystem || 'NTFS',
          blocks: size,
          used: used,
          available: free,
          capacity: `${pct}%`
        };
      });
  } catch (error) {
    return [];
  }
});

// Realtime metrics
ipcMain.handle('get-realtime-metrics', async () => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ramUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    const cpus = os.cpus();
    let totalMs = 0;
    let idleMs = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalMs += (cpu.times as any)[type];
      }
      idleMs += cpu.times.idle;
    });
    
    const cpuLoad = 100 - (idleMs / totalMs) * 100;
    
    return {
      cpuLoad: isNaN(cpuLoad) ? 0 : cpuLoad,
      ramUsage: ramUsage,
    };
  } catch (error) {
    return { cpuLoad: 0, ramUsage: 0 };
  }
});

// Advanced Storage Analyzer
ipcMain.handle('analyze-storage', async () => {
  try {
    const userDir = os.homedir();
    const targetDirs = ['Documents', 'Downloads', 'Pictures', 'Videos', 'Music', 'Desktop', 'AppData\\Local\\Temp'];
    
    let analysis = [];
    for (const dir of targetDirs) {
      const fullPath = path.join(userDir, dir);
      if (fs.existsSync(fullPath)) {
        const size = await getDirectorySize(fullPath);
        analysis.push({
          name: dir.includes('\\') ? dir.split('\\').pop() : dir,
          path: fullPath,
          size: size,
          type: 'folder'
        });
      }
    }
    return analysis.sort((a, b) => b.size - a.size);
  } catch (error) {
    return [];
  }
});

// Extended Cleaner
ipcMain.handle('scan-junk', async () => {
  return await scanJunkExtended();
});

ipcMain.handle('clean-junk', async (_, itemsToClean: string[]) => {
  return await cleanJunkExtended(itemsToClean);
});

// Extended System Operations
ipcMain.handle('clear-ram', async () => await clearRAMCache());
ipcMain.handle('optimize-network', async (_, mode) => await optimizeNetwork(mode));
ipcMain.handle('get-bg-apps', async () => await getBackgroundProcesses());
ipcMain.handle('kill-process', async (_, pid) => await killProcess(pid));
ipcMain.handle('get-startup-apps', async () => await getStartupApps());
ipcMain.handle('disable-startup-app', async (_, name) => await disableStartupApp(name));
ipcMain.handle('is-admin', async () => {
  try {
    await execPromise('net session');
    return true;
  } catch (e) {
    return false;
  }
});
ipcMain.handle('delete-files', async (_, filePaths: string[]) => {
  let deletedCount = 0;
  let errorCount = 0;
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.remove(filePath);
        deletedCount++;
      }
    } catch (e) {
      errorCount++;
    }
  }
  return { success: true, deletedCount, errorCount };
});

// Settings IPC
ipcMain.handle('get-settings', async () => await getSettings());
ipcMain.handle('save-settings', async (_, settings) => await saveSettings(settings));

// Duplicate Finder (Kept local to main.ts for now)
ipcMain.handle('scan-duplicates', async () => {
  const targetDir = path.join(os.homedir(), 'Downloads');
  const fileHashMap = new Map<string, any[]>();

  async function hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  async function scanDir(dirPath: string) {
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && stats.size > 1024 * 10) {
            const hash = await hashFile(filePath);
            if (!fileHashMap.has(hash)) {
              fileHashMap.set(hash, []);
            }
            fileHashMap.get(hash)!.push({
              name: file,
              path: filePath,
              size: stats.size
            });
          } else if (stats.isDirectory() && !file.startsWith('.')) {
            await scanDir(filePath);
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  await scanDir(targetDir);

  const duplicates = [];
  for (const [hash, files] of fileHashMap.entries()) {
    if (files.length > 1) {
      duplicates.push({
        hash,
        name: files[0].name,
        size: files[0].size,
        paths: files.map(f => f.path)
      });
    }
  }
  
  return duplicates;
});

// Window Controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());
