import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

// ---------------------------------------------------------
// RAM Cleaner
// ---------------------------------------------------------
export async function clearRAMCache() {
  const csharpCode = `
    using System;
    using System.Runtime.InteropServices;
    public class RAMCleaner {
      [DllImport("psapi.dll")]
      static extern int EmptyWorkingSet(IntPtr hwProc);
      
      public static void Clear() {
        try {
          var procs = System.Diagnostics.Process.GetProcesses();
          foreach (var p in procs) {
            try {
               EmptyWorkingSet(p.Handle);
            } catch {}
          }
        } catch {}
      }
    }
    RAMCleaner.Clear();
  `;

  // Measure before
  const memBefore = os.freemem();

  try {
    // Empty working sets using PowerShell inline C#
    await execPromise(`powershell -Command "Add-Type -TypeDefinition '${csharpCode}'"`);
  } catch (e) {
    console.error('Failed to clear RAM via C# / PowerShell', e);
  }

  // Allow some time for GC/OS to reflect changes
  await new Promise(r => setTimeout(r, 1000));
  
  const memAfter = os.freemem();
  const freed = memAfter - memBefore;

  return {
    success: true,
    freedBytes: freed > 0 ? freed : 0,
    before: memBefore,
    after: memAfter
  };
}

// ---------------------------------------------------------
// Network Optimizer
// ---------------------------------------------------------
export async function optimizeNetwork(mode: 'gaming' | 'streaming' | 'default') {
  try {
    // Basic flushes
    await execPromise('ipconfig /flushdns');
    await execPromise('netsh winsock reset');
    await execPromise('netsh int ip reset');

    if (mode === 'gaming') {
      // Disable network throttling for gaming
      await execPromise('powershell -Command "Set-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\' -Name \'NetworkThrottlingIndex\' -Value 4294967295 -ErrorAction SilentlyContinue"');
      await execPromise('powershell -Command "Set-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\' -Name \'SystemResponsiveness\' -Value 0 -ErrorAction SilentlyContinue"');
    } else if (mode === 'streaming') {
      // Optimize for throughput
      await execPromise('powershell -Command "Set-NetTCPSetting -SettingName InternetCustom -AutoTuningLevelLocal Normal -ErrorAction SilentlyContinue"');
    } else {
      // Default
      await execPromise('powershell -Command "Set-NetTCPSetting -SettingName InternetCustom -AutoTuningLevelLocal Normal -ErrorAction SilentlyContinue"');
    }

    return { success: true };
  } catch (e: any) {
    console.error('Network optimization error', e);
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------
// Background Apps Manager
// ---------------------------------------------------------
export async function getBackgroundProcesses() {
  try {
    const { stdout } = await execPromise('powershell -Command "Get-Process | Where-Object {$_.MainWindowHandle -eq 0 -and $_.Company -notmatch \'Microsoft\' -and $_.WorkingSet -gt 10MB} | Select-Object Name, Id, @{Name=\'Memory\';Expression={$_.WorkingSet}}, Description | ConvertTo-Json"');
    if (!stdout || stdout.trim() === "") return [];
    
    const rawData = JSON.parse(stdout);
    const procs = Array.isArray(rawData) ? rawData : [rawData];
    
    return procs.map(p => ({
      name: p.Name,
      pid: p.Id,
      memory: p.Memory, // bytes
      description: p.Description || p.Name
    })).sort((a, b) => b.memory - a.memory);
  } catch (e) {
    console.error('Failed to list background apps', e);
    return [];
  }
}

export async function killProcess(pid: number) {
  try {
    await execPromise(`taskkill /PID ${pid} /F`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------
// Startup Manager
// ---------------------------------------------------------
export async function getStartupApps() {
  try {
    // HKCU Run
    const { stdout } = await execPromise('powershell -Command "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Run, HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run -ErrorAction SilentlyContinue | Select-Object -Property * | ConvertTo-Json"');
    
    // We do a simplified parsing. A real robust version would parse deeply.
    if (!stdout || stdout.trim() === "") return [];
    
    // In PowerShell, ConvertTo-Json on Get-ItemProperty can be messy. 
    // Alternative: WMI for Startup items
    const wmiRes = await execPromise('powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | ConvertTo-Json"');
    if (!wmiRes.stdout || wmiRes.stdout.trim() === "") return [];

    const rawData = JSON.parse(wmiRes.stdout);
    const apps = Array.isArray(rawData) ? rawData : [rawData];

    return apps.map(app => ({
      name: app.Name,
      command: app.Command,
      location: app.Location,
      user: app.User,
      enabled: true // Detecting enabled/disabled from registry is complex, simplified for now
    }));
  } catch (e) {
    console.error('Startup apps error', e);
    return [];
  }
}
