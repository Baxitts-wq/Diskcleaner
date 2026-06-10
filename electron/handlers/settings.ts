import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.disksweep');
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  theme: 'dark',
  language: 'fr',
  autoScan: false,
  autoClean: false,
  performanceMode: 'gaming',
  notifications: true,
  exclusions: [
    '*.ini',
    'desktop.ini'
  ]
};

export async function initSettings() {
  try {
    await fs.ensureDir(CONFIG_DIR);
    if (!fs.existsSync(CONFIG_FILE)) {
      await fs.writeJson(CONFIG_FILE, DEFAULT_SETTINGS, { spaces: 2 });
    }
  } catch (e) {
    console.error('Failed to init settings', e);
  }
}

export async function getSettings() {
  try {
    await initSettings();
    const config = await fs.readJson(CONFIG_FILE);
    return { ...DEFAULT_SETTINGS, ...config };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: any) {
  try {
    await initSettings();
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await fs.writeJson(CONFIG_FILE, updated, { spaces: 2 });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
