import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Helper to run PowerShell commands safely via EncodedCommand
async function runPowerShell(script: string) {
  const buffer = Buffer.from(script, 'utf16le');
  const base64 = buffer.toString('base64');
  return execPromise(`powershell -NoProfile -NonInteractive -EncodedCommand ${base64}`, { maxBuffer: 10 * 1024 * 1024 });
}

// Helper to get directory size recursively
export async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          totalSize += await getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return totalSize;
}

// ─────────────────────────────────────────────────────
//  STANDARD SCAN PATHS
// ─────────────────────────────────────────────────────
export function getExtendedCachePaths() {
  const localAppData = path.join(os.homedir(), 'AppData', 'Local');
  const roamingAppData = path.join(os.homedir(), 'AppData', 'Roaming');
  const programData = 'C:\\ProgramData';
  const windowsDir = 'C:\\Windows';

  return [
    { id: 'temp', path: process.env.TEMP || path.join(localAppData, 'Temp'), name: 'Windows Temp Files', risk: 'safe', category: 'system' },
    { id: 'prefetch', path: path.join(windowsDir, 'Prefetch'), name: 'Windows Prefetch', risk: 'safe', category: 'system' },
    { id: 'winupdate', path: path.join(windowsDir, 'SoftwareDistribution', 'Download'), name: 'Windows Update Cache', risk: 'safe', category: 'system' },
    { id: 'deliveryopt', path: path.join(windowsDir, 'ServiceProfiles', 'NetworkService', 'AppData', 'Local', 'Microsoft', 'Windows', 'DeliveryOptimization', 'Cache'), name: 'Delivery Optimization', risk: 'medium', category: 'system' },
    
    // Browsers
    { id: 'chrome', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'), name: 'Google Chrome Cache', risk: 'safe', category: 'browser' },
    { id: 'edge', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'), name: 'Microsoft Edge Cache', risk: 'safe', category: 'browser' },
    { id: 'brave', path: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache'), name: 'Brave Browser Cache', risk: 'safe', category: 'browser' },
    
    // Gaming / Social
    { id: 'discord', path: path.join(roamingAppData, 'discord', 'Cache'), name: 'Discord Cache', risk: 'safe', category: 'apps' },
    { id: 'steam', path: path.join(programData, 'Steam', 'htmlcache'), name: 'Steam HTML Cache', risk: 'safe', category: 'apps' },
    { id: 'epic', path: path.join(localAppData, 'EpicGamesLauncher', 'Saved', 'webcache'), name: 'Epic Games Cache', risk: 'safe', category: 'apps' },
    
    // GPU Caches
    { id: 'nvidiadx', path: path.join(localAppData, 'NVIDIA', 'DXCache'), name: 'NVIDIA DirectX Cache', risk: 'medium', category: 'gpu' },
    { id: 'nvidiasgl', path: path.join(localAppData, 'NVIDIA', 'GLCache'), name: 'NVIDIA OpenGL Cache', risk: 'medium', category: 'gpu' },
    { id: 'amddx', path: path.join(localAppData, 'AMD', 'DxCache'), name: 'AMD DirectX Cache', risk: 'medium', category: 'gpu' },
    
    // Logs & Crash Dumps
    { id: 'crashdumps', path: path.join(localAppData, 'CrashDumps'), name: 'Application Crash Dumps', risk: 'safe', category: 'logs' },
    { id: 'wer', path: path.join(programData, 'Microsoft', 'Windows', 'WER', 'ReportArchive'), name: 'Windows Error Reports', risk: 'safe', category: 'logs' },
  ];
}

// ─────────────────────────────────────────────────────
//  DEEP CLEAN PATHS (aggressive mode)
// ─────────────────────────────────────────────────────
export function getDeepCleanPaths() {
  const localAppData = path.join(os.homedir(), 'AppData', 'Local');
  const roamingAppData = path.join(os.homedir(), 'AppData', 'Roaming');
  const windowsDir = 'C:\\Windows';

  return [
    // ── Windows System Deep ──
    { id: 'deep_cbslogs', path: path.join(windowsDir, 'Logs', 'CBS'), name: 'CBS Logs', risk: 'safe', category: 'system' },
    { id: 'deep_dpxlogs', path: path.join(windowsDir, 'Logs', 'DISM'), name: 'DISM Logs', risk: 'safe', category: 'system' },
    { id: 'deep_setuplog', path: path.join(windowsDir, 'Panther'), name: 'Windows Setup Logs', risk: 'safe', category: 'system' },
    { id: 'deep_thumbcache', path: path.join(localAppData, 'Microsoft', 'Windows', 'Explorer'), name: 'Thumbnail Cache', risk: 'safe', category: 'system' },
    { id: 'deep_iconcache', path: path.join(localAppData, 'IconCache.db'), name: 'Icon Cache', risk: 'safe', category: 'system' },
    { id: 'deep_fontcache', path: path.join(windowsDir, 'ServiceProfiles', 'LocalService', 'AppData', 'Local', 'FontCache'), name: 'Font Cache', risk: 'medium', category: 'system' },
    { id: 'deep_installerpatch', path: path.join(windowsDir, 'Installer', '$PatchCache$'), name: 'Windows Installer Patch Cache', risk: 'medium', category: 'system' },
    { id: 'deep_memorydump', path: path.join(windowsDir, 'Minidump'), name: 'Memory Dump Files', risk: 'safe', category: 'system' },
    { id: 'deep_wdi', path: path.join(windowsDir, 'System32', 'WDI', 'LogFiles'), name: 'WDI Diagnostic Logs', risk: 'safe', category: 'system' },
    { id: 'deep_sru', path: path.join(windowsDir, 'System32', 'sru'), name: 'System Resource Usage Logs', risk: 'medium', category: 'system' },

    // ── User Data ──
    { id: 'deep_recent', path: path.join(roamingAppData, 'Microsoft', 'Windows', 'Recent'), name: 'Recent Files History', risk: 'safe', category: 'user' },
    { id: 'deep_tempinet', path: path.join(localAppData, 'Microsoft', 'Windows', 'INetCache'), name: 'Internet Cache (IE/Edge Legacy)', risk: 'safe', category: 'user' },
    { id: 'deep_cortana', path: path.join(localAppData, 'Packages', 'Microsoft.Windows.Cortana_cw5n1h2txyewy', 'LocalState'), name: 'Cortana Cache', risk: 'safe', category: 'user' },

    // ── Additional Browsers ──
    { id: 'deep_firefox', path: path.join(localAppData, 'Mozilla', 'Firefox', 'Profiles'), name: 'Firefox Cache & Profiles', risk: 'medium', category: 'browser' },
    { id: 'deep_opera', path: path.join(roamingAppData, 'Opera Software', 'Opera GX Stable', 'Cache'), name: 'Opera GX Cache', risk: 'safe', category: 'browser' },
    { id: 'deep_vivaldi', path: path.join(localAppData, 'Vivaldi', 'User Data', 'Default', 'Cache'), name: 'Vivaldi Cache', risk: 'safe', category: 'browser' },
    { id: 'deep_chromecr', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'), name: 'Chrome Code Cache', risk: 'safe', category: 'browser' },
    { id: 'deep_edgecr', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'), name: 'Edge Code Cache', risk: 'safe', category: 'browser' },

    // ── Development Caches ──
    { id: 'deep_npm', path: path.join(roamingAppData, 'npm-cache'), name: 'NPM Cache', risk: 'safe', category: 'dev' },
    { id: 'deep_pip', path: path.join(localAppData, 'pip', 'cache'), name: 'Python Pip Cache', risk: 'safe', category: 'dev' },
    { id: 'deep_nuget', path: path.join(localAppData, 'NuGet', 'v3-cache'), name: 'NuGet Cache', risk: 'safe', category: 'dev' },
    { id: 'deep_gradle', path: path.join(os.homedir(), '.gradle', 'caches'), name: 'Gradle Cache', risk: 'safe', category: 'dev' },
    { id: 'deep_vscode', path: path.join(roamingAppData, 'Code', 'Cache'), name: 'VS Code Cache', risk: 'safe', category: 'dev' },
    { id: 'deep_vscodecr', path: path.join(roamingAppData, 'Code', 'CachedData'), name: 'VS Code Cached Data', risk: 'safe', category: 'dev' },

    // ── Additional Gaming / Apps ──
    { id: 'deep_riotlogs', path: path.join(localAppData, 'Riot Games', 'Riot Client', 'Logs'), name: 'Riot Games Logs', risk: 'safe', category: 'apps' },
    { id: 'deep_origin', path: path.join(localAppData, 'Origin', 'ThinSetup'), name: 'EA / Origin Cache', risk: 'safe', category: 'apps' },
    { id: 'deep_spotify', path: path.join(localAppData, 'Spotify', 'Storage'), name: 'Spotify Cache', risk: 'safe', category: 'apps' },
    { id: 'deep_teams', path: path.join(roamingAppData, 'Microsoft', 'Teams', 'Cache'), name: 'Microsoft Teams Cache', risk: 'safe', category: 'apps' },
    { id: 'deep_zoom', path: path.join(roamingAppData, 'Zoom', 'data'), name: 'Zoom Cache & Data', risk: 'safe', category: 'apps' },
    { id: 'deep_discord_cs', path: path.join(roamingAppData, 'discord', 'Code Cache'), name: 'Discord Code Cache', risk: 'safe', category: 'apps' },
    { id: 'deep_steambrowser', path: path.join(localAppData, 'Steam', 'htmlcache'), name: 'Steam Local Cache', risk: 'safe', category: 'apps' },
  ];
}

// ─────────────────────────────────────────────────────
//  STANDARD SCAN / CLEAN
// ─────────────────────────────────────────────────────
export async function scanJunkExtended() {
  let junkFiles: any[] = [];
  const paths = getExtendedCachePaths();
  
  for (const item of paths) {
    try {
      if (fs.existsSync(item.path)) {
        const size = await getDirectorySize(item.path);
        if (size > 0) {
          junkFiles.push({
            id: item.id,
            name: item.name,
            path: item.path,
            size: size,
            risk: item.risk,
            category: item.category
          });
        }
      }
    } catch(e) {}
  }
  return junkFiles.sort((a, b) => b.size - a.size);
}

export async function cleanJunkExtended(itemsToClean: string[]) {
  const paths = getExtendedCachePaths();
  let cleanedSize = 0;
  let successCount = 0;
  let failCount = 0;

  for (const item of paths) {
    if (itemsToClean.includes(item.id)) {
      try {
        if (!fs.existsSync(item.path)) continue;
        
        const files = await fs.readdir(item.path);
        for (const file of files) {
          const filePath = path.join(item.path, file);
          try {
            const stats = await fs.stat(filePath);
            let itemSize = stats.size;
            if (stats.isDirectory()) {
              itemSize = await getDirectorySize(filePath);
            }
            await fs.remove(filePath);
            cleanedSize += itemSize;
            successCount++;
          } catch (e) {
            failCount++;
          }
        }
      } catch (e) {}
    }
  }
  return { success: true, cleanedSize, successCount, failCount };
}

// ─────────────────────────────────────────────────────
//  DEEP CLEAN SCAN / EXECUTE
// ─────────────────────────────────────────────────────
export async function scanDeepClean() {
  let junkFiles: any[] = [];
  
  // Scan standard paths first
  const standardPaths = getExtendedCachePaths();
  for (const item of standardPaths) {
    try {
      if (fs.existsSync(item.path)) {
        const size = await getDirectorySize(item.path);
        if (size > 0) {
          junkFiles.push({
            id: item.id, name: item.name, path: item.path,
            size, risk: item.risk, category: item.category
          });
        }
      }
    } catch(e) {}
  }

  // Scan deep clean paths
  const deepPaths = getDeepCleanPaths();
  for (const item of deepPaths) {
    try {
      if (fs.existsSync(item.path)) {
        const stats = await fs.stat(item.path);
        let size = 0;
        if (stats.isDirectory()) {
          size = await getDirectorySize(item.path);
        } else {
          size = stats.size;
        }
        if (size > 0) {
          junkFiles.push({
            id: item.id, name: item.name, path: item.path,
            size, risk: item.risk, category: item.category
          });
        }
      }
    } catch(e) {}
  }

  // ── System-level items (estimated sizes via PowerShell) ──
  // Recycle Bin
  try {
    const { stdout } = await execPromise('powershell -Command "(New-Object -ComObject Shell.Application).NameSpace(10).Items() | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum"');
    const rbSize = parseInt(stdout.trim()) || 0;
    if (rbSize > 0) {
      junkFiles.push({
        id: 'deep_recyclebin', name: 'Recycle Bin (All Drives)', path: '$Recycle.Bin',
        size: rbSize, risk: 'medium', category: 'system'
      });
    }
  } catch (e) {}

  // Windows Event Logs
  try {
    const { stdout } = await execPromise('powershell -Command "Get-ChildItem C:\\Windows\\System32\\winevt\\Logs -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum"');
    const evtSize = parseInt(stdout.trim()) || 0;
    if (evtSize > 1024 * 100) { // Only show if > 100 KB
      junkFiles.push({
        id: 'deep_eventlogs', name: 'Windows Event Logs', path: 'C:\\Windows\\System32\\winevt\\Logs',
        size: evtSize, risk: 'medium', category: 'system'
      });
    }
  } catch (e) {}

  return junkFiles.sort((a, b) => b.size - a.size);
}

export async function executeDeepClean(itemsToClean: string[]) {
  let cleanedSize = 0;
  let successCount = 0;
  let failCount = 0;

  // Handle system-level special items
  if (itemsToClean.includes('deep_recyclebin')) {
    try {
      await runPowerShell('Clear-RecycleBin -Force -ErrorAction SilentlyContinue');
      successCount++;
    } catch (e) { failCount++; }
  }

  if (itemsToClean.includes('deep_eventlogs')) {
    try {
      await runPowerShell('wevtutil el | ForEach-Object { wevtutil cl $_ 2>$null }');
      successCount++;
    } catch (e) { failCount++; }
  }

  // Handle all file-system based items (standard + deep paths merged)
  const allPaths = [...getExtendedCachePaths(), ...getDeepCleanPaths()];

  for (const item of allPaths) {
    if (itemsToClean.includes(item.id)) {
      try {
        if (!fs.existsSync(item.path)) continue;

        const stats = await fs.stat(item.path);
        if (stats.isFile()) {
          // Single file (e.g. IconCache.db)
          const size = stats.size;
          await fs.remove(item.path);
          cleanedSize += size;
          successCount++;
        } else if (stats.isDirectory()) {
          const files = await fs.readdir(item.path);
          for (const file of files) {
            const filePath = path.join(item.path, file);
            try {
              const fStats = await fs.stat(filePath);
              let itemSize = fStats.size;
              if (fStats.isDirectory()) {
                itemSize = await getDirectorySize(filePath);
              }
              await fs.remove(filePath);
              cleanedSize += itemSize;
              successCount++;
            } catch (e) {
              failCount++;
            }
          }
        }
      } catch (e) { failCount++; }
    }
  }

  return { success: true, cleanedSize, successCount, failCount };
}
