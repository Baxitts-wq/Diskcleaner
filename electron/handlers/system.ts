import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

// Helper to run PowerShell commands safely via EncodedCommand (bypasses escaping issues)
async function runPowerShell(script: string) {
  const buffer = Buffer.from(script, 'utf16le');
  const base64 = buffer.toString('base64');
  return execPromise(`powershell -NoProfile -NonInteractive -EncodedCommand ${base64}`);
}

// ---------------------------------------------------------
// RAM Cleaner
// ---------------------------------------------------------
export async function clearRAMCache() {
  const memBefore = os.freemem();

  const script = `
    $code = @"
    using System;
    using System.Runtime.InteropServices;
    using System.Diagnostics;
    public class RAMCleaner {
        [DllImport("psapi.dll", SetLastError = true)]
        public static extern bool EmptyWorkingSet(IntPtr hProcess);
        public static void Clear() {
            foreach (Process p in Process.GetProcesses()) {
                try {
                    EmptyWorkingSet(p.Handle);
                } catch {}
            }
        }
    }
    "@
    try {
        Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
    } catch {}
    [RAMCleaner]::Clear()
  `;

  try {
    await runPowerShell(script);
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
    const wmiRes = await execPromise('powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | ConvertTo-Json"');
    if (!wmiRes.stdout || wmiRes.stdout.trim() === "") return [];

    const rawData = JSON.parse(wmiRes.stdout);
    const apps = Array.isArray(rawData) ? rawData : [rawData];

    return apps.map(app => ({
      name: app.Name,
      command: app.Command,
      location: app.Location,
      user: app.User,
      enabled: true
    }));
  } catch (e) {
    console.error('Startup apps error', e);
    return [];
  }
}

export async function disableStartupApp(name: string) {
  try {
    const script = `
      Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${name}" -ErrorAction SilentlyContinue
      Remove-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${name}" -ErrorAction SilentlyContinue
      Remove-ItemProperty -Path "HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${name}" -ErrorAction SilentlyContinue
      $startupFolder = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs\\Startup"
      $lnkFile = Join-Path $startupFolder "${name}.lnk"
      if (Test-Path $lnkFile) { Remove-Item $lnkFile -Force }
    `;
    await runPowerShell(script);
    return { success: true };
  } catch (e: any) {
    console.error('Failed to disable startup app', e);
    return { success: false, error: e.message };
  }
}
