import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';

const execPromise = util.promisify(exec);

// Helper to run PowerShell commands safely via EncodedCommand
async function runPowerShell(script: string) {
  const buffer = Buffer.from(script, 'utf16le');
  const base64 = buffer.toString('base64');
  return execPromise(`powershell -NoProfile -NonInteractive -EncodedCommand ${base64}`, { maxBuffer: 10 * 1024 * 1024 });
}

// ─────────────────────────────────────────────────────
// Known suspicious process names (common malware, miners, RATs, keyloggers)
// ─────────────────────────────────────────────────────
const SUSPICIOUS_PROCESS_NAMES = new Set([
  // Crypto Miners
  'xmrig', 'xmr-stak', 'minerd', 'minergate', 'cpuminer', 'cgminer', 'bfgminer',
  'nicehash', 'ethminer', 'claymore', 'phoenixminer', 'nbminer', 'trex', 't-rex',
  // RATs & Trojans
  'darkcomet', 'njrat', 'nanocore', 'quasar', 'asyncrat', 'remcos', 'orcus',
  'warzone', 'poisonivy', 'blackshades', 'netwire', 'adwind', 'luminosity',
  'havoc', 'cobalt', 'metasploit', 'msfconsole', 'meterpreter',
  // Keyloggers
  'keylogger', 'hooklogger', 'ardamax', 'revealer', 'spyrix', 'refog',
  // Adware / PUP
  'bonzi', 'ask toolbar', 'babylon', 'conduit', 'delta-homes',
  'wajam', 'superfish', 'shopperz',
  // Generic suspicious
  'payload', 'backdoor', 'rootkit', 'exploit', 'shellcode',
  'cryptolocker', 'wannacry', 'ransomware',
]);

// Suspicious file locations
const SUSPICIOUS_LOCATIONS = [
  '\\Temp\\',
  '\\tmp\\',
  '$Recycle.Bin',
  '\\ProgramData\\',
];

interface ThreatResult {
  id: string;
  type: 'process' | 'registry' | 'hosts' | 'task' | 'extension';
  severity: 'high' | 'medium' | 'low';
  name: string;
  description: string;
  details: string;
  action?: string; // what quarantine will do
}

// ─────────────────────────────────────────────────────
// 1. PROCESS SCANNER
// ─────────────────────────────────────────────────────
async function scanProcesses(): Promise<ThreatResult[]> {
  const threats: ThreatResult[] = [];

  try {
    const { stdout } = await execPromise(
      'powershell -Command "Get-Process | Select-Object Name, Id, Path, @{Name=\'CPU\';Expression={$_.CPU}}, @{Name=\'Memory\';Expression={$_.WorkingSet}} | ConvertTo-Json"',
      { maxBuffer: 10 * 1024 * 1024 }
    );
    if (!stdout || stdout.trim() === '') return threats;

    const rawData = JSON.parse(stdout);
    const procs = Array.isArray(rawData) ? rawData : [rawData];

    for (const proc of procs) {
      if (!proc.Name) continue;
      const nameLower = proc.Name.toLowerCase();
      const procPath = (proc.Path || '').toLowerCase();

      // Check against known malware process names
      if (SUSPICIOUS_PROCESS_NAMES.has(nameLower)) {
        threats.push({
          id: `proc_${proc.Id}_${nameLower}`,
          type: 'process',
          severity: 'high',
          name: proc.Name,
          description: `Known malicious process detected: ${proc.Name}`,
          details: `PID: ${proc.Id} | Path: ${proc.Path || 'Unknown'}`,
          action: `Kill process ${proc.Id}`
        });
        continue;
      }

      // Check for processes running from suspicious locations
      if (procPath) {
        for (const loc of SUSPICIOUS_LOCATIONS) {
          if (procPath.includes(loc.toLowerCase())) {
            // Only flag if it's consuming notable resources
            const memMB = (proc.Memory || 0) / 1024 / 1024;
            if (memMB > 20) {
              threats.push({
                id: `proc_${proc.Id}_suspicious_loc`,
                type: 'process',
                severity: 'medium',
                name: proc.Name,
                description: `Process running from suspicious location`,
                details: `PID: ${proc.Id} | Path: ${proc.Path} | RAM: ${Math.round(memMB)} MB`,
                action: `Kill process ${proc.Id}`
              });
            }
            break;
          }
        }
      }
    }
  } catch (e) {
    console.error('Process scan error', e);
  }

  return threats;
}

// ─────────────────────────────────────────────────────
// 2. STARTUP / REGISTRY AUDITOR
// ─────────────────────────────────────────────────────
async function scanStartupRegistry(): Promise<ThreatResult[]> {
  const threats: ThreatResult[] = [];

  const script = `
    $results = @()
    $runKeys = @(
      "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
      "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
      "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
      "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
      "HKLM:\\SOFTWARE\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Run"
    )
    foreach ($key in $runKeys) {
      try {
        $props = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
        if ($props) {
          $props.PSObject.Properties | Where-Object { $_.Name -notmatch "^PS" } | ForEach-Object {
            $results += @{
              Name = $_.Name
              Value = $_.Value.ToString()
              Key = $key
            }
          }
        }
      } catch {}
    }
    $results | ConvertTo-Json -Depth 3
  `;

  try {
    const { stdout } = await runPowerShell(script);
    if (!stdout || stdout.trim() === '') return threats;

    const rawData = JSON.parse(stdout);
    const entries = Array.isArray(rawData) ? rawData : [rawData];

    for (const entry of entries) {
      if (!entry.Name || !entry.Value) continue;
      const valueLower = (entry.Value || '').toLowerCase();
      const nameLower = (entry.Name || '').toLowerCase();

      // Check if executable path points to Temp or random AppData location
      const isSuspiciousPath =
        valueLower.includes('\\temp\\') ||
        valueLower.includes('\\tmp\\') ||
        (valueLower.includes('\\appdata\\') && /[a-f0-9]{8,}/i.test(valueLower));

      // Check if the target file doesn't exist (broken/orphaned entry)
      let fileExists = true;
      try {
        const exePath = entry.Value.replace(/"/g, '').split(' ')[0];
        if (exePath && !exePath.startsWith('http')) {
          fileExists = fs.existsSync(exePath);
        }
      } catch (e) {}

      // Check for known malware names
      const isMalwareName = SUSPICIOUS_PROCESS_NAMES.has(nameLower);

      if (isMalwareName) {
        threats.push({
          id: `reg_${entry.Name}_malware`,
          type: 'registry',
          severity: 'high',
          name: entry.Name,
          description: `Known malware startup entry detected`,
          details: `Key: ${entry.Key} | Command: ${entry.Value}`,
          action: `Remove registry entry "${entry.Name}"`
        });
      } else if (isSuspiciousPath) {
        threats.push({
          id: `reg_${entry.Name}_susppath`,
          type: 'registry',
          severity: 'medium',
          name: entry.Name,
          description: `Startup entry points to suspicious temp/random location`,
          details: `Key: ${entry.Key} | Command: ${entry.Value}`,
          action: `Remove registry entry "${entry.Name}"`
        });
      } else if (!fileExists) {
        threats.push({
          id: `reg_${entry.Name}_orphan`,
          type: 'registry',
          severity: 'low',
          name: entry.Name,
          description: `Orphaned startup entry (target file not found)`,
          details: `Key: ${entry.Key} | Command: ${entry.Value}`,
          action: `Remove registry entry "${entry.Name}"`
        });
      }
    }
  } catch (e) {
    console.error('Registry scan error', e);
  }

  return threats;
}

// ─────────────────────────────────────────────────────
// 3. HOSTS FILE INSPECTOR
// ─────────────────────────────────────────────────────
async function scanHostsFile(): Promise<ThreatResult[]> {
  const threats: ThreatResult[] = [];
  const hostsPath = path.join('C:', 'Windows', 'System32', 'drivers', 'etc', 'hosts');

  try {
    const content = await fs.readFile(hostsPath, 'utf-8');
    const lines = content.split('\n');
    let suspiciousCount = 0;
    const suspiciousEntries: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Skip standard localhost entries
      if (trimmed.match(/^(127\.0\.0\.1|::1)\s+(localhost|.*\.local)\s*$/i)) continue;

      // Any other entry is potentially suspicious (DNS hijacking)
      suspiciousCount++;
      if (suspiciousEntries.length < 5) {
        suspiciousEntries.push(trimmed);
      }
    }

    if (suspiciousCount > 0) {
      threats.push({
        id: `hosts_hijack_${suspiciousCount}`,
        type: 'hosts',
        severity: suspiciousCount > 10 ? 'high' : 'medium',
        name: `${suspiciousCount} suspicious hosts entries`,
        description: `Your hosts file contains ${suspiciousCount} non-standard entries that may indicate DNS hijacking or ad injection`,
        details: suspiciousEntries.join(' | ') + (suspiciousCount > 5 ? ` ... and ${suspiciousCount - 5} more` : ''),
        action: `Clean hosts file (remove non-standard entries)`
      });
    }
  } catch (e) {
    console.error('Hosts file scan error', e);
  }

  return threats;
}

// ─────────────────────────────────────────────────────
// 4. SCHEDULED TASKS AUDITOR
// ─────────────────────────────────────────────────────
async function scanScheduledTasks(): Promise<ThreatResult[]> {
  const threats: ThreatResult[] = [];

  try {
    const script = `
      Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {
        $_.Author -notmatch "Microsoft" -and
        $_.TaskPath -notmatch "\\\\Microsoft\\\\" -and
        $_.State -eq "Ready"
      } | ForEach-Object {
        $actions = $_.Actions | ForEach-Object { $_.Execute + " " + $_.Arguments }
        [PSCustomObject]@{
          Name = $_.TaskName
          Path = $_.TaskPath
          Author = $_.Author
          Actions = ($actions -join "; ")
        }
      } | ConvertTo-Json -Depth 3
    `;

    const { stdout } = await runPowerShell(script);
    if (!stdout || stdout.trim() === '') return threats;

    const rawData = JSON.parse(stdout);
    const tasks = Array.isArray(rawData) ? rawData : [rawData];

    for (const task of tasks) {
      if (!task.Name) continue;
      const actionsLower = (task.Actions || '').toLowerCase();
      const nameLower = task.Name.toLowerCase();

      // Check for tasks running from suspicious locations
      const isSuspicious =
        actionsLower.includes('\\temp\\') ||
        actionsLower.includes('\\tmp\\') ||
        actionsLower.includes('powershell') && actionsLower.includes('-enc') ||
        actionsLower.includes('cmd.exe') && actionsLower.includes('/c') && actionsLower.includes('http') ||
        /[a-f0-9]{16,}/i.test(nameLower); // Random hex names

      if (isSuspicious) {
        threats.push({
          id: `task_${task.Name}`,
          type: 'task',
          severity: actionsLower.includes('-enc') ? 'high' : 'medium',
          name: task.Name,
          description: `Suspicious scheduled task detected`,
          details: `Author: ${task.Author || 'Unknown'} | Actions: ${task.Actions || 'N/A'}`,
          action: `Disable scheduled task "${task.Name}"`
        });
      }
    }
  } catch (e) {
    console.error('Scheduled tasks scan error', e);
  }

  return threats;
}

// ─────────────────────────────────────────────────────
// 5. BROWSER EXTENSION AUDITOR
// ─────────────────────────────────────────────────────
async function scanBrowserExtensions(): Promise<ThreatResult[]> {
  const threats: ThreatResult[] = [];
  const localAppData = path.join(os.homedir(), 'AppData', 'Local');
  
  const browserExtDirs = [
    { browser: 'Chrome', dir: path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Extensions') },
    { browser: 'Edge', dir: path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Extensions') },
    { browser: 'Brave', dir: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Extensions') },
  ];

  for (const { browser, dir } of browserExtDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const extFolders = await fs.readdir(dir);

      for (const extId of extFolders) {
        const extPath = path.join(dir, extId);
        const stats = await fs.stat(extPath);
        if (!stats.isDirectory()) continue;

        // Try to read the manifest to get extension name
        const versions = await fs.readdir(extPath);
        for (const version of versions) {
          const manifestPath = path.join(extPath, version, 'manifest.json');
          try {
            if (fs.existsSync(manifestPath)) {
              const manifest = await fs.readJson(manifestPath);
              const extName = (manifest.name || '').toLowerCase();
              const permissions = (manifest.permissions || []).join(', ').toLowerCase();

              // Flag extensions with overly broad permissions + suspicious names
              const hasBroadPerms = permissions.includes('<all_urls>') || permissions.includes('*://*/*');
              const isSuspiciousName = /free.*vpn|ad.*inject|coupon|shop.*helper|download.*manager|search.*bar/i.test(extName);

              if (isSuspiciousName && hasBroadPerms) {
                threats.push({
                  id: `ext_${browser}_${extId}`,
                  type: 'extension',
                  severity: 'medium',
                  name: `${manifest.name || extId} (${browser})`,
                  description: `Potentially unwanted browser extension with broad permissions`,
                  details: `ID: ${extId} | Permissions: ${permissions.substring(0, 100)}...`,
                  action: `Remove extension from ${browser}`
                });
              }
            }
          } catch (e) {}
          break; // Only check first version
        }
      }
    } catch (e) {}
  }

  return threats;
}

// ─────────────────────────────────────────────────────
// MASTER SCAN FUNCTION
// ─────────────────────────────────────────────────────
export async function scanThreats() {
  const startTime = Date.now();

  const [processThreats, registryThreats, hostsThreats, taskThreats, extensionThreats] = await Promise.all([
    scanProcesses(),
    scanStartupRegistry(),
    scanHostsFile(),
    scanScheduledTasks(),
    scanBrowserExtensions()
  ]);

  const allThreats = [
    ...processThreats,
    ...registryThreats,
    ...hostsThreats,
    ...taskThreats,
    ...extensionThreats
  ];

  const duration = Date.now() - startTime;

  return {
    threats: allThreats,
    summary: {
      total: allThreats.length,
      high: allThreats.filter(t => t.severity === 'high').length,
      medium: allThreats.filter(t => t.severity === 'medium').length,
      low: allThreats.filter(t => t.severity === 'low').length,
      scannedCategories: 5,
      durationMs: duration
    }
  };
}

// ─────────────────────────────────────────────────────
// QUARANTINE / REMEDIATE
// ─────────────────────────────────────────────────────
export async function quarantineThreat(threatId: string) {
  try {
    // Process kill
    if (threatId.startsWith('proc_')) {
      const pidMatch = threatId.match(/proc_(\d+)/);
      if (pidMatch) {
        await execPromise(`taskkill /PID ${pidMatch[1]} /F`);
        return { success: true, message: `Killed process PID ${pidMatch[1]}` };
      }
    }

    // Registry removal
    if (threatId.startsWith('reg_')) {
      const nameMatch = threatId.match(/reg_(.+?)_(malware|susppath|orphan)$/);
      if (nameMatch) {
        const entryName = nameMatch[1];
        const script = `
          Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${entryName}" -ErrorAction SilentlyContinue
          Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce" -Name "${entryName}" -ErrorAction SilentlyContinue
          Remove-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${entryName}" -ErrorAction SilentlyContinue
          Remove-ItemProperty -Path "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce" -Name "${entryName}" -ErrorAction SilentlyContinue
          Remove-ItemProperty -Path "HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "${entryName}" -ErrorAction SilentlyContinue
        `;
        await runPowerShell(script);
        return { success: true, message: `Removed startup entry "${entryName}"` };
      }
    }

    // Hosts file cleanup
    if (threatId.startsWith('hosts_')) {
      const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
      const content = await fs.readFile(hostsPath, 'utf-8');
      const lines = content.split('\n');
      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return true;
        if (trimmed.match(/^(127\.0\.0\.1|::1)\s+(localhost|.*\.local)\s*$/i)) return true;
        return false; // Remove non-standard entries
      });
      await fs.writeFile(hostsPath, cleanedLines.join('\n'), 'utf-8');
      return { success: true, message: 'Cleaned hosts file' };
    }

    // Scheduled task disable
    if (threatId.startsWith('task_')) {
      const taskName = threatId.replace('task_', '');
      await runPowerShell(`Disable-ScheduledTask -TaskName "${taskName}" -ErrorAction SilentlyContinue`);
      return { success: true, message: `Disabled scheduled task "${taskName}"` };
    }

    return { success: false, message: 'Unknown threat type' };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}
