import fs from 'fs-extra';
import path from 'path';
import os from 'os';

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

export function getExtendedCachePaths() {
  const localAppData = path.join(os.homedir(), 'AppData', 'Local');
  const roamingAppData = path.join(os.homedir(), 'AppData', 'Roaming');
  const programData = 'C:\\ProgramData';
  const windowsDir = 'C:\\Windows';

  return [
    { id: 'temp', path: process.env.TEMP || path.join(localAppData, 'Temp'), name: 'Windows Temp Files', risk: 'safe' },
    { id: 'prefetch', path: path.join(windowsDir, 'Prefetch'), name: 'Windows Prefetch', risk: 'safe' },
    { id: 'winupdate', path: path.join(windowsDir, 'SoftwareDistribution', 'Download'), name: 'Windows Update Cache', risk: 'safe' },
    { id: 'deliveryopt', path: path.join(windowsDir, 'ServiceProfiles', 'NetworkService', 'AppData', 'Local', 'Microsoft', 'Windows', 'DeliveryOptimization', 'Cache'), name: 'Delivery Optimization', risk: 'medium' },
    
    // Browsers
    { id: 'chrome', path: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'), name: 'Google Chrome Cache', risk: 'safe' },
    { id: 'edge', path: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'), name: 'Microsoft Edge Cache', risk: 'safe' },
    { id: 'brave', path: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache'), name: 'Brave Browser Cache', risk: 'safe' },
    
    // Gaming / Social
    { id: 'discord', path: path.join(roamingAppData, 'discord', 'Cache'), name: 'Discord Cache', risk: 'safe' },
    { id: 'steam', path: path.join(programData, 'Steam', 'htmlcache'), name: 'Steam HTML Cache', risk: 'safe' },
    { id: 'epic', path: path.join(localAppData, 'EpicGamesLauncher', 'Saved', 'webcache'), name: 'Epic Games Cache', risk: 'safe' },
    
    // GPU Caches
    { id: 'nvidiadx', path: path.join(localAppData, 'NVIDIA', 'DXCache'), name: 'NVIDIA DirectX Cache', risk: 'medium' },
    { id: 'nvidiasgl', path: path.join(localAppData, 'NVIDIA', 'GLCache'), name: 'NVIDIA OpenGL Cache', risk: 'medium' },
    { id: 'amddx', path: path.join(localAppData, 'AMD', 'DxCache'), name: 'AMD DirectX Cache', risk: 'medium' },
    
    // Logs & Crash Dumps
    { id: 'crashdumps', path: path.join(localAppData, 'CrashDumps'), name: 'Application Crash Dumps', risk: 'safe' },
    { id: 'wer', path: path.join(programData, 'Microsoft', 'Windows', 'WER', 'ReportArchive'), name: 'Windows Error Reports', risk: 'safe' },
  ];
}

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
            risk: item.risk
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
            await fs.remove(filePath);
            cleanedSize += stats.size;
            successCount++;
          } catch (e) {
            failCount++; // Usually locked files like in-use discord cache
          }
        }
      } catch (e) {}
    }
  }
  return { success: true, cleanedSize, successCount, failCount };
}
