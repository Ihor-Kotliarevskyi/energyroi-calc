import fs from 'node:fs/promises';
import path from 'node:path';

const ENERGY_MAP_BASE = 'https://energy-map.info';
const DEFAULT_TTL_HOURS = 24;
const SNAPSHOT_KEY = 'tariffs-snapshot-v1';
const SNAPSHOT_NETLIFY_STORE = 'energy-roi-calc';
const SNAPSHOT_VERCEL_PATH = `snapshots/${SNAPSHOT_KEY}.json`;

let memoryCache = null;
let lastSyncAt = 0;
let syncInFlight = null;
let persistenceDriverPromise = null;

function toNumber(value) {
  if (value == null) return null;
  const raw = String(value)
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out.map((v) => v.trim());
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  return lines.map((line) => splitCsvLine(line, delimiter));
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function parseFilterColumn(prefix, key) {
  const raw = process.env[`${prefix}_${key}_COLUMN`];
  if (raw == null || String(raw).trim() === '') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function parseFilters(prefix) {
  const filters = [];
  const keys = ['FILTER', 'FILTER2'];
  for (const key of keys) {
    const column = parseFilterColumn(prefix, key);
    const value = process.env[`${prefix}_${key}_VALUE`];
    if (column == null || value == null || String(value).trim() === '') continue;
    filters.push({ column, value: normalizeText(value) });
  }
  return filters;
}

function rowMatchesFilters(row, filters) {
  if (!filters.length) return true;
  return filters.every(({ column, value }) => normalizeText(row[column]).includes(value));
}

function latestNumberFromCsv(text, valueColumnIndex = 1, filters = []) {
  const rows = parseCsv(text);
  for (let i = rows.length - 1; i >= 1; i -= 1) {
    const row = rows[i];
    if (!rowMatchesFilters(row, filters)) continue;
    const value = toNumber(row[valueColumnIndex]);
    if (value != null) return value;
  }
  return null;
}

async function readLocalSnapshot() {
  const localPath = path.resolve(process.cwd(), 'public', 'market-data.json');
  const raw = await fs.readFile(localPath, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

async function createVercelBlobDriver() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const { list, put } = await import('@vercel/blob');
    return {
      name: 'vercel-blob',
      async read() {
        try {
          const { blobs } = await list({
            prefix: SNAPSHOT_VERCEL_PATH,
            limit: 10,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          const blob = blobs.find((item) => item.pathname === SNAPSHOT_VERCEL_PATH);
          if (!blob) return null;

          const res = await fetch(blob.url, { cache: 'no-store' });
          if (!res.ok) return null;

          const data = await res.json();
          return data && typeof data === 'object' ? data : null;
        } catch {
          return null;
        }
      },
      async write(snapshot) {
        try {
          await put(SNAPSHOT_VERCEL_PATH, JSON.stringify(snapshot), {
            access: 'public',
            allowOverwrite: true,
            addRandomSuffix: false,
            contentType: 'application/json; charset=utf-8',
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          return true;
        } catch {
          return false;
        }
      },
    };
  } catch {
    return null;
  }
}

async function createNetlifyBlobDriver() {
  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore(SNAPSHOT_NETLIFY_STORE);

    return {
      name: 'netlify-blob',
      async read() {
        try {
          const data = await store.get(SNAPSHOT_KEY, { type: 'json' });
          return data && typeof data === 'object' ? data : null;
        } catch {
          return null;
        }
      },
      async write(snapshot) {
        try {
          await store.set(SNAPSHOT_KEY, JSON.stringify(snapshot), {
            metadata: { updatedAt: new Date().toISOString() },
          });
          return true;
        } catch {
          return false;
        }
      },
    };
  } catch {
    return null;
  }
}

async function getPersistenceDriver() {
  if (persistenceDriverPromise) return persistenceDriverPromise;

  persistenceDriverPromise = (async () => {
    const vercelDriver = await createVercelBlobDriver();
    if (vercelDriver) return vercelDriver;

    const netlifyDriver = await createNetlifyBlobDriver();
    if (netlifyDriver) return netlifyDriver;

    return null;
  })();

  return persistenceDriverPromise;
}

async function readPersistedSnapshot() {
  const driver = await getPersistenceDriver();
  if (!driver) return { snapshot: null, storage: null };

  const snapshot = await driver.read();
  return {
    snapshot,
    storage: snapshot ? driver.name : null,
  };
}

async function writePersistedSnapshot(snapshot) {
  const driver = await getPersistenceDriver();
  if (!driver) return null;

  const persisted = await driver.write(snapshot);
  return persisted ? driver.name : null;
}

async function fetchEnergyMapCsv({ token, uuid, format = 'csv', language = 'uk' }) {
  const url = `${ENERGY_MAP_BASE}/api/v1/resources/${uuid}/download/?format=${format}&language=${language}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`EnergyMap download failed for ${uuid}: HTTP ${res.status}`);
  return res.text();
}

function shouldAutoSync(nowMs) {
  if (String(process.env.ENERGYMAP_AUTO_SYNC || '').toLowerCase() !== 'true') return false;
  const ttlHours = Number(process.env.ENERGYMAP_CACHE_TTL_HOURS || DEFAULT_TTL_HOURS);
  const ttlMs = Math.max(1, ttlHours) * 3600 * 1000;
  return nowMs - lastSyncAt >= ttlMs;
}

function buildMerged(localSnapshot, patch) {
  return {
    ...localSnapshot,
    ...patch,
    defaults: {
      ...(localSnapshot.defaults || {}),
      ...(patch.defaults || {}),
    },
  };
}

async function syncFromEnergyMap(localSnapshot) {
  const token = process.env.ENERGYMAP_API_KEY;
  const gasUuid = process.env.ENERGYMAP_GAS_UUID;
  const rdnUuid = process.env.ENERGYMAP_RDN_UUID;
  const heatUuid = process.env.ENERGYMAP_HEAT_UUID;
  const greenUuid = process.env.ENERGYMAP_GREEN_TARIFF_UUID;
  const heatManual = toNumber(process.env.ENERGYMAP_HEAT_MANUAL_TARIFF);

  if (!token || !gasUuid || !rdnUuid) {
    return {
      snapshot: localSnapshot,
      meta: { stale: true, reason: 'EnergyMap env is not fully configured' },
    };
  }

  const gasColumn = Number(process.env.ENERGYMAP_GAS_VALUE_COLUMN || 1);
  const rdnColumn = Number(process.env.ENERGYMAP_RDN_VALUE_COLUMN || 1);
  const heatColumn = Number(process.env.ENERGYMAP_HEAT_VALUE_COLUMN || 1);
  const greenColumn = Number(process.env.ENERGYMAP_GREEN_TARIFF_VALUE_COLUMN || 1);
  const rdnFilters = parseFilters('ENERGYMAP_RDN');
  const heatFilters = parseFilters('ENERGYMAP_HEAT');
  const greenFilters = parseFilters('ENERGYMAP_GREEN_TARIFF');

  const [gasCsv, rdnCsv, heatCsv, greenCsv] = await Promise.all([
    fetchEnergyMapCsv({ token, uuid: gasUuid }),
    fetchEnergyMapCsv({ token, uuid: rdnUuid }),
    heatUuid && heatManual == null ? fetchEnergyMapCsv({ token, uuid: heatUuid }) : Promise.resolve(null),
    greenUuid ? fetchEnergyMapCsv({ token, uuid: greenUuid }) : Promise.resolve(null),
  ]);

  const gp = latestNumberFromCsv(gasCsv, gasColumn);
  const rdm = latestNumberFromCsv(rdnCsv, rdnColumn, rdnFilters);
  const hp = heatManual ?? (heatCsv ? latestNumberFromCsv(heatCsv, heatColumn, heatFilters) : null);
  const greenTariff = greenCsv ? latestNumberFromCsv(greenCsv, greenColumn, greenFilters) : null;

  const defaultsPatch = {};
  if (gp != null) defaultsPatch.gp = gp;
  if (rdm != null) defaultsPatch.rdm = rdm;
  if (hp != null) defaultsPatch.hp = hp;
  if (greenTariff != null) {
    defaultsPatch.solar = {
      ...(localSnapshot.defaults?.solar || {}),
      feedInTariff: greenTariff,
    };
  }

  const updated = new Date().toISOString().slice(0, 10);
  const sources = {
    ...(localSnapshot.sources || {}),
    gp: 'Energy Map API',
    rdm: 'Energy Map API',
    ...(hp != null ? { hp: heatManual != null ? 'Manual env override' : 'Energy Map API' } : {}),
    ...(greenTariff != null
      ? {
          solar: {
            ...(localSnapshot.sources?.solar || {}),
            feedInTariff: 'Energy Map API',
          },
        }
      : {}),
  };

  const snapshot = buildMerged(localSnapshot, {
    updated,
    sources,
    defaults: defaultsPatch,
  });

  return {
    snapshot,
    meta: {
      stale: false,
      source: 'energy-map-api',
      updated,
      applied: Object.keys(defaultsPatch),
    },
  };
}

async function syncWithFallback(localSnapshot) {
  try {
    return await syncFromEnergyMap(localSnapshot);
  } catch (err) {
    const message = err?.message || 'Energy Map sync failed';
    const statusMatch = /HTTP\s+(\d{3})/.exec(message);
    const status = statusMatch ? Number(statusMatch[1]) : null;

    return {
      snapshot: localSnapshot,
      meta: {
        stale: true,
        source: 'local-snapshot',
        fallback: true,
        reason: status === 429 ? 'rate_limited' : 'sync_error',
        errorStatus: status,
        errorMessage: message,
      },
    };
  }
}

async function getSnapshotInternal({ forceSync = false } = {}) {
  const now = Date.now();
  const localSnapshot = await readLocalSnapshot();
  const { snapshot: persistedSnapshot, storage: persistedStorage } = await readPersistedSnapshot();
  const baseSnapshot = persistedSnapshot || localSnapshot;

  if (!forceSync && memoryCache && !shouldAutoSync(now)) {
    return { ...memoryCache, meta: { ...(memoryCache.meta || {}), cache: 'memory' } };
  }

  if (!forceSync && !shouldAutoSync(now)) {
    const response = {
      snapshot: baseSnapshot,
      meta: {
        stale: false,
        source: persistedSnapshot ? 'persisted-snapshot' : 'local-snapshot',
        cache: persistedSnapshot ? persistedStorage : 'file',
      },
    };
    memoryCache = response;
    return response;
  }

  const synced = await syncWithFallback(baseSnapshot);
  if (!synced?.meta?.fallback && synced?.meta?.source === 'energy-map-api') {
    const persistedStorageName = await writePersistedSnapshot(synced.snapshot);
    synced.meta = { ...(synced.meta || {}), persisted: persistedStorageName || 'none' };
  }

  lastSyncAt = now;
  memoryCache = synced;
  return synced;
}

export async function getTariffSnapshot({ forceSync = false } = {}) {
  if (!syncInFlight) {
    syncInFlight = getSnapshotInternal({ forceSync }).finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}
