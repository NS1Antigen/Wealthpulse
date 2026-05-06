const KEYS = {
  ASSETS: "wp_assets_v2",
  SNAPSHOT: "wp_snapshot_v2",
  TIMELINE: "wp_timeline_v2",
  PIN_HASH: "wp_pin_hash_v2",
  THEME: "wp_theme_v2",
  CURRENCY: "wp_currency_v2"
};

export function getAssets() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.ASSETS) || "[]");
  } catch {
    return [];
  }
}

export function saveAssets(assets) {
  localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
}

export function createAsset(data) {
  const assets = getAssets();
  const asset = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  assets.push(asset);
  saveAssets(assets);
  return asset;
}

export function updateAsset(id, data) {
  saveAssets(getAssets().map((a) => (a.id === id ? { ...a, ...data } : a)));
}

export function deleteAsset(id) {
  saveAssets(getAssets().filter((a) => a.id !== id));
}

export function saveSnapshot(prices, usdToThb) {
  localStorage.setItem(KEYS.SNAPSHOT, JSON.stringify({
    prices,
    usdToThb,
    timestamp: new Date().toISOString()
  }));
}

export function loadSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.SNAPSHOT) || "null");
  } catch {
    return null;
  }
}

export function getTimeline() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.TIMELINE) || "[]");
  } catch {
    return [];
  }
}

export function addTimelineEntry(totalThb, totalUsd, breakdown) {
  const date = new Date().toISOString().slice(0, 10);
  const timeline = getTimeline();
  const entry = { date, totalThb, totalUsd, breakdown, timestamp: new Date().toISOString() };
  const i = timeline.findIndex((t) => t.date === date);
  if (i >= 0) timeline[i] = entry;
  else timeline.push(entry);
  localStorage.setItem(KEYS.TIMELINE, JSON.stringify(timeline.slice(-365)));
}

async function hashPin(pin) {
  const buf = new TextEncoder().encode(pin + "wealthpulse_salt_v2");
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function setPin(pin) {
  localStorage.setItem(KEYS.PIN_HASH, await hashPin(pin));
}

export async function verifyPin(pin) {
  const saved = localStorage.getItem(KEYS.PIN_HASH);
  if (!saved) return true;
  return saved === await hashPin(pin);
}

export function hasPinSet() {
  return !!localStorage.getItem(KEYS.PIN_HASH);
}

export function removePin() {
  localStorage.removeItem(KEYS.PIN_HASH);
}

export function getTheme() {
  return localStorage.getItem(KEYS.THEME) || "dark";
}

export function saveTheme(theme) {
  localStorage.setItem(KEYS.THEME, theme);
}

export function getCurrency() {
  return localStorage.getItem(KEYS.CURRENCY) || "THB";
}

export function saveCurrency(currency) {
  localStorage.setItem(KEYS.CURRENCY, currency);
}

export function exportBackup() {
  return {
    app: "WealthPulse",
    version: 2,
    exportedAt: new Date().toISOString(),
    assets: getAssets(),
    snapshot: loadSnapshot(),
    timeline: getTimeline(),
    currency: getCurrency(),
    theme: getTheme()
  };
}

export function importBackup(data) {
  if (Array.isArray(data.assets)) saveAssets(data.assets);
  if (data.snapshot) localStorage.setItem(KEYS.SNAPSHOT, JSON.stringify(data.snapshot));
  if (Array.isArray(data.timeline)) localStorage.setItem(KEYS.TIMELINE, JSON.stringify(data.timeline));
  if (data.currency) saveCurrency(data.currency);
  if (data.theme) saveTheme(data.theme);
}

export function clearAllData() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
