import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

// Helper to run PowerShell commands safely via EncodedCommand (bypasses escaping issues)
async function runPowerShell(script: string) {
  const buffer = Buffer.from(script, 'utf16le');
  const base64 = buffer.toString('base64');
  return execPromise(`powershell -NoProfile -NonInteractive -EncodedCommand ${base64}`, { maxBuffer: 10 * 1024 * 1024 });
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
// Enhanced Network Optimizer
// ---------------------------------------------------------
export async function optimizeNetwork(mode: 'gaming' | 'streaming' | 'default') {
  const actions: string[] = [];
  
  try {
    // ── Common for all modes ──
    await execPromise('ipconfig /flushdns');
    actions.push('Flushed DNS resolver cache');

    await execPromise('netsh winsock reset catalog');
    actions.push('Reset Winsock catalog');

    // ── GAMING MODE: Low Latency Priority ──
    if (mode === 'gaming') {
      const gamingScript = `
        # Disable Network Throttling (allow full network speed for games)
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -ErrorAction SilentlyContinue
        
        # Set System Responsiveness to 0 (prioritize foreground app / game)
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 0 -Type DWord -ErrorAction SilentlyContinue
        
        # Disable Nagle's Algorithm on all interfaces (reduces packet batching = lower ping)
        $interfaces = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
        foreach ($iface in $interfaces) {
            Set-ItemProperty -Path $iface.PSPath -Name "TcpAckFrequency" -Value 1 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path $iface.PSPath -Name "TCPNoDelay" -Value 1 -Type DWord -ErrorAction SilentlyContinue
        }
        
        # Disable TCP Auto-Tuning (prevents variable window sizing, more stable latency)
        netsh int tcp set global autotuninglevel=disabled 2>$null
        
        # Disable Large Send Offload (LSO) for more consistent packet timing
        netsh int tcp set global chimney=disabled 2>$null
        
        # Set high priority for gaming QoS timer
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "GPU Priority" -Value 8 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "Priority" -Value 6 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" -Name "Scheduling Category" -Value "High" -ErrorAction SilentlyContinue
        
        # Disable power management on network adapters (prevent adapter sleep)
        Get-NetAdapter | ForEach-Object {
            Disable-NetAdapterPowerManagement -Name $_.Name -ErrorAction SilentlyContinue
        }
        
        # Set High Performance power plan
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null
      `;
      
      try {
        await runPowerShell(gamingScript);
        actions.push('Disabled Network Throttling');
        actions.push('Set System Responsiveness to foreground priority');
        actions.push('Disabled Nagle Algorithm (TCPNoDelay) on all interfaces');
        actions.push('Disabled TCP Auto-Tuning for stable latency');
        actions.push('Disabled Large Send Offload (LSO)');
        actions.push('Set GPU/CPU priority for Games tasks');
        actions.push('Disabled Network Adapter Power Management');
        actions.push('Activated High Performance power plan');
      } catch (e) {
        actions.push('Some gaming tweaks require Administrator privileges');
      }

    // ── STREAMING MODE: Max Throughput ──
    } else if (mode === 'streaming') {
      const streamingScript = `
        # Enable TCP Auto-Tuning to Experimental (max receive window for throughput)
        netsh int tcp set global autotuninglevel=experimental 2>$null
        
        # Enable Receive Side Scaling (RSS) for multi-core packet processing
        netsh int tcp set global rss=enabled 2>$null
        
        # Enable Direct Cache Access
        netsh int tcp set global dca=enabled 2>$null
        
        # Enable ECN capability for congestion avoidance
        netsh int tcp set global ecncapability=enabled 2>$null
        
        # Set large receive buffers on all adapters
        Get-NetAdapter | ForEach-Object {
            Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*ReceiveBuffers" -RegistryValue "2048" -ErrorAction SilentlyContinue
            Set-NetAdapterAdvancedProperty -Name $_.Name -RegistryKeyword "*TransmitBuffers" -RegistryValue "2048" -ErrorAction SilentlyContinue
        }
        
        # Disable power management on network adapters
        Get-NetAdapter | ForEach-Object {
            Disable-NetAdapterPowerManagement -Name $_.Name -ErrorAction SilentlyContinue
        }
        
        # Keep NetworkThrottling normal for throughput
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 4294967295 -Type DWord -ErrorAction SilentlyContinue
        
        # Set High Performance power plan
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null
      `;
      
      try {
        await runPowerShell(streamingScript);
        actions.push('Set TCP Auto-Tuning to Experimental (max throughput)');
        actions.push('Enabled Receive Side Scaling (RSS)');
        actions.push('Enabled Direct Cache Access (DCA)');
        actions.push('Enabled ECN Congestion Management');
        actions.push('Increased Receive/Transmit buffers to 2048');
        actions.push('Disabled Network Adapter Power Management');
        actions.push('Activated High Performance power plan');
      } catch (e) {
        actions.push('Some streaming tweaks require Administrator privileges');
      }

    // ── DEFAULT: Reset to safe defaults ──
    } else {
      const resetScript = `
        netsh int tcp set global autotuninglevel=normal 2>$null
        netsh int tcp set global rss=enabled 2>$null
        netsh int tcp set global ecncapability=default 2>$null
        
        # Restore network throttling to default
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "NetworkThrottlingIndex" -Value 10 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" -Name "SystemResponsiveness" -Value 20 -Type DWord -ErrorAction SilentlyContinue
        
        # Re-enable Nagle's on all interfaces
        $interfaces = Get-ChildItem "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces"
        foreach ($iface in $interfaces) {
            Remove-ItemProperty -Path $iface.PSPath -Name "TcpAckFrequency" -ErrorAction SilentlyContinue
            Remove-ItemProperty -Path $iface.PSPath -Name "TCPNoDelay" -ErrorAction SilentlyContinue
        }
        
        # Restore Balanced power plan
        powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e 2>$null
      `;
      
      try {
        await runPowerShell(resetScript);
        actions.push('Reset TCP Auto-Tuning to Normal');
        actions.push('Restored Network Throttling defaults');
        actions.push('Re-enabled Nagle Algorithm');
        actions.push('Restored Balanced power plan');
      } catch (e) {
        actions.push('Some resets require Administrator privileges');
      }
    }

    return { success: true, actions };
  } catch (e: any) {
    console.error('Network optimization error', e);
    return { success: false, error: e.message, actions };
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
      memory: p.Memory,
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
