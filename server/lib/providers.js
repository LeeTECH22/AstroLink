'use strict';

/**
 * AstroLink unified data-provider layer.
 *
 * A single place that every Earth-science source is fetched through, so the
 * frontend never re-implements provider logic. Provides:
 *   - provider adapters with a normalized response envelope
 *   - an in-memory TTL cache (lightweight Redis alternative; no external service)
 *   - bounded retries with per-attempt timeouts
 *   - a per-provider circuit breaker
 *   - per-provider health metrics and a dataset catalog
 *
 * Provenance is preserved: every envelope records the originating provider and
 * dataset, and the product "kind" so gridded/model output is never presented as
 * a direct ground measurement.
 */

const axios = require('axios');

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2; // bounded: 1 initial attempt + up to 2 retries

// Strip api keys / tokens before anything is logged or returned to the client.
const redactUrl = (url) => String(url).replace(/(api_key=|[?&]key=)[^&]+/gi, '$1***');

// ---------------------------------------------------------------------------
// In-memory TTL cache.
// ---------------------------------------------------------------------------
class TtlCache {
  constructor({ maxEntries = 250, defaultTtlMs = 5 * 60 * 1000 } = {}) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  delete(key) {
    return this.store.delete(key);
  }

  get size() {
    return this.store.size;
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      entries: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 1000) / 1000 : 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Per-provider circuit breaker. Closed -> Open (after N consecutive failures)
// -> Half-open (single probe) -> Closed on success. Bounds repeated calls to a
// provider that is currently failing so one bad upstream cannot cascade.
// ---------------------------------------------------------------------------
class CircuitBreaker {
  constructor({ failureThreshold = 3, openMs = 30000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.openMs = openMs;
    this.failures = 0;
    this.openedAt = 0;
    this.probeInFlight = false;
    this.totalSuccesses = 0;
    this.totalFailures = 0;
    this.lastStatus = null;
    this.lastError = null;
  }

  get state() {
    if (this.openedAt === 0) return 'closed';
    return Date.now() - this.openedAt >= this.openMs ? 'half-open' : 'open';
  }

  canRequest() {
    if (this.state === 'closed') return true;
    if (this.state === 'half-open') {
      if (this.probeInFlight) return false;
      this.probeInFlight = true;
      return true;
    }
    return false; // open
  }

  onSuccess(status = 200) {
    this.totalSuccesses += 1;
    this.failures = 0;
    this.openedAt = 0;
    this.probeInFlight = false;
    this.lastStatus = status;
  }

  onFailure(status, message) {
    this.totalFailures += 1;
    this.failures += 1;
    this.probeInFlight = false;
    this.lastStatus = status || 0;
    this.lastError = message || 'error';
    if (this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
    }
  }

  snapshot() {
    return {
      state: this.state,
      consecutiveFailures: this.failures,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      lastStatus: this.lastStatus,
      retryInMs: this.state === 'open' ? Math.max(0, this.openMs - (Date.now() - this.openedAt)) : 0,
    };
  }

  reset() {
    this.failures = 0;
    this.openedAt = 0;
    this.probeInFlight = false;
  }
}

// ---------------------------------------------------------------------------
// Provider definitions. `kind` is scientifically important:
//   reanalysis  -> gridded model output / reanalysis (NOT a ground measurement)
//   observation -> satellite or ground-derived measurement
//   event       -> catalogued natural event
//   catalog     -> dataset metadata
//   imagery     -> map tile / imagery service
// ---------------------------------------------------------------------------
const PROVIDER_DEFS = [
  {
    id: 'power',
    label: 'NASA POWER',
    kind: 'reanalysis',
    dataset: 'NASA POWER (Prediction Of Worldwide Energy Resources)',
    temporalResolution: 'daily, monthly',
    spatialResolution: '~0.5° x 0.625° grid (MERRA-2 based)',
    notes:
      'Gridded/model-derived meteorological values. These are NOT direct ground measurements and should not be described as observed station data.',
    cacheTtlMs: 5 * 60 * 1000,
    variables: [
      { id: 'T2M', label: 'Temperature at 2 m', units: '°C', category: 'temperature' },
      { id: 'PRECTOTCORR', label: 'Bias-corrected precipitation', units: 'mm/day', category: 'precipitation' },
      { id: 'ALLSKY_SFC_SW_DWN', label: 'All-sky surface shortwave downward irradiance', units: 'kWh/m²/day', category: 'solar' },
    ],
  },
  {
    id: 'eonet',
    label: 'NASA EONET',
    kind: 'event',
    dataset: 'NASA Earth Observatory Natural Event Tracker (EONET v3)',
    temporalResolution: 'event-based',
    spatialResolution: 'point / polygon',
    notes: 'Curated catalog of natural events (wildfires, storms, volcanoes) with source attribution.',
    cacheTtlMs: 3 * 60 * 1000,
  },
  {
    id: 'firms',
    label: 'NASA FIRMS',
    kind: 'observation',
    dataset: 'NASA Fire Information for Resource Management System (FIRMS)',
    temporalResolution: 'near real-time / daily',
    spatialResolution: '~375 m (VIIRS) / 1 km (MODIS)',
    notes:
      'Satellite-derived active-fire/thermal-anomaly detections. A detection is not a confirmed ground fire; confidence fields must be consulted.',
    cacheTtlMs: 3 * 60 * 1000,
    requiresKey: true,
    keyEnv: 'FIRMS_MAP_KEY',
  },
  {
    id: 'earthdata',
    label: 'NASA CMR / Earthdata Search',
    kind: 'catalog',
    dataset: 'NASA Common Metadata Repository (CMR)',
    temporalResolution: 'dataset metadata',
    spatialResolution: 'dataset dependent',
    notes: 'Dataset discovery only. Returned records describe collections, not measurements.',
    cacheTtlMs: 10 * 60 * 1000,
  },
  {
    id: 'gibs',
    label: 'NASA GIBS',
    kind: 'imagery',
    dataset: 'NASA Global Imagery Browse Services (GIBS / WMTS)',
    temporalResolution: 'daily / multi-day imagery',
    spatialResolution: 'tiled imagery',
    notes: 'Rendered imagery service for visualization; not a numeric science product.',
    cacheTtlMs: 30 * 60 * 1000,
  },
];

// ---------------------------------------------------------------------------
// Adapters. Each has async request(params, { timeout }) -> { data, url }.
// ---------------------------------------------------------------------------
const num = (value) => Number(value);
const isLat = (v) => Number.isFinite(num(v)) && num(v) >= -90 && num(v) <= 90;
const isLon = (v) => Number.isFinite(num(v)) && num(v) >= -180 && num(v) <= 180;
const isYear = (v) => /^\d{4}$/.test(String(v)) && num(v) >= 1981 && num(v) <= 2100;

const ADAPTERS = {
  power: {
    validate(params) {
      const { latitude, longitude, temporal = 'monthly', start, end } = params;
      if (!isLat(latitude) || !isLon(longitude)) return 'latitude must be -90..90 and longitude -180..180.';
      if (!/^[A-Za-z0-9_,]+$/.test(String(params.parameters || ''))) return 'parameters must be a comma-separated list.';
      if (temporal === 'monthly') {
        if (!isYear(start) || !isYear(end)) return 'start and end must be four-digit years.';
      } else if (!/^\d{8}$/.test(String(start)) || !/^\d{8}$/.test(String(end))) {
        return 'start and end must be YYYYMMDD dates.';
      }
      return null;
    },
    async request(params, { timeout }) {
      const {
        temporal = 'monthly',
        parameters,
        latitude,
        longitude,
        start,
        end,
        community = 'RE',
      } = params;
      const url =
        `https://power.larc.nasa.gov/api/temporal/${temporal}/point` +
        `?parameters=${parameters}&latitude=${latitude}&longitude=${longitude}` +
        `&start=${start}&end=${end}&community=${community}&format=JSON`;
      const res = await axios.get(url, { timeout });
      return { data: res.data, url };
    },
  },

  eonet: {
    validate(params) {
      const status = String(params.status || 'open');
      if (!['open', 'closed', 'all'].includes(status)) return 'status must be open, closed or all.';
      const limit = Number(params.limit ?? 20);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) return 'limit must be 1..100.';
      if (params.category && !/^[A-Za-z0-9_-]{1,40}$/.test(String(params.category))) return 'invalid category.';
      return null;
    },
    async request(params, { timeout }) {
      const status = String(params.status || 'open');
      const limit = Number(params.limit ?? 20);
      let url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=${status}&limit=${limit}`;
      if (params.category) url += `&category=${params.category}`;
      const res = await axios.get(url, { timeout, headers: { 'User-Agent': 'AstroLink/1.0' } });
      return { data: res.data, url };
    },
  },

  firms: {
    validate(params) {
      if (!isLon(params.west) || !isLon(params.east) || !isLat(params.south) || !isLat(params.north)) {
        return 'west/east must be -180..180 and south/north -90..90.';
      }
      const days = Number(params.days ?? 1);
      if (!Number.isInteger(days) || days < 1 || days > 5) return 'days must be 1..5.';
      return null;
    },
    async request(params, { timeout, apiKey }) {
      const days = Number(params.days ?? 1);
      const area = `${params.west},${params.south},${params.east},${params.north}`;
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${area}/${days}`;
      const res = await axios.get(url, { timeout, responseType: 'text', transformResponse: [(d) => d] });
      return { data: parseCsv(res.data), url };
    },
  },

  earthdata: {
    validate(params) {
      const keyword = String(params.keyword || '');
      if (keyword.length < 1 || keyword.length > 100) return 'keyword must be 1..100 characters.';
      const size = Number(params.page_size ?? 10);
      if (!Number.isInteger(size) || size < 1 || size > 100) return 'page_size must be 1..100.';
      return null;
    },
    async request(params, { timeout }) {
      const size = Number(params.page_size ?? 10);
      const url = `https://cmr.earthdata.nasa.gov/search/collections.json?keyword=${encodeURIComponent(
        params.keyword
      )}&page_size=${size}`;
      const res = await axios.get(url, { timeout });
      return { data: res.data, url };
    },
  },

  gibs: {
    validate() {
      return null;
    },
    async request(_params, { timeout }) {
      const url = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';
      const res = await axios.get(url, { timeout });
      return { data: res.data, url };
    },
  },
};

// Minimal CSV table parser for the FIRMS text response.
function parseCsv(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i];
    });
    const lat = Number(row.latitude);
    const lon = Number(row.longitude);
    return {
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lon) ? lon : null,
      brightness: row.bright_ti4 ? Number(row.bright_ti4) : null,
      confidence: row.confidence || null,
      acqDate: row.acq_date || null,
      acqTime: row.acq_time || null,
      satellite: row.satellite || null,
      instrument: row.instrument || null,
      frp: row.frp ? Number(row.frp) : null,
      daynight: row.daynight || null,
    };
  });
}

// ---------------------------------------------------------------------------
// Provider registry.
// ---------------------------------------------------------------------------
class ProviderRegistry {
  constructor({ timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = MAX_RETRIES, cache } = {}) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.cache = cache || new TtlCache();
    this.breakers = new Map();
    this.metrics = new Map();
    this.defs = new Map();
    PROVIDER_DEFS.forEach((def) => {
      this.defs.set(def.id, def);
      this.breakers.set(def.id, new CircuitBreaker());
      this.metrics.set(def.id, {
        requests: 0,
        successes: 0,
        failures: 0,
        cacheHits: 0,
        lastLatencyMs: null,
        lastStatus: null,
        lastFetchAt: null,
        lastError: null,
      });
    });
  }

  list() {
    return PROVIDER_DEFS.map((def) => ({
      id: def.id,
      label: def.label,
      kind: def.kind,
      dataset: def.dataset,
      temporalResolution: def.temporalResolution,
      spatialResolution: def.spatialResolution,
      notes: def.notes,
      variables: def.variables || [],
      requiresKey: Boolean(def.requiresKey),
      configured: !def.requiresKey || Boolean(process.env[def.keyEnv]),
    }));
  }

  health() {
    return PROVIDER_DEFS.map((def) => ({
      id: def.id,
      label: def.label,
      kind: def.kind,
      configured: !def.requiresKey || Boolean(process.env[def.keyEnv]),
      circuit: this.breakers.get(def.id).snapshot(),
      metrics: this.metrics.get(def.id),
    }));
  }

  breakerFor(id) {
    if (!this.breakers.has(id)) this.breakers.set(id, new CircuitBreaker());
    return this.breakers.get(id);
  }

  static get isRetryableStatus() {
    return (status) => status === 429 || (status >= 500 && status <= 599);
  }

  cacheKeyFor(id, params) {
    const normalized = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return `${id}?${normalized}`;
  }

  /**
   * Fetch through the unified layer.
   * @returns {Promise<object>} normalized envelope.
   * @throws {ProviderError} with a `.code` of validation|config|unavailable|upstream.
   */
  async fetch(id, params = {}) {
    const def = this.defs.get(id);
    const adapter = ADAPTERS[id];
    if (!def || !adapter) {
      throw new ProviderError('unknown_provider', `Unknown provider "${id}".`);
    }

    const validationError = adapter.validate(params);
    if (validationError) throw new ProviderError('validation', validationError);

    if (def.requiresKey && !process.env[def.keyEnv]) {
      throw new ProviderError(
        'config',
        `${def.label} is not configured. Set ${def.keyEnv} on the backend to enable this provider.`
      );
    }

    const metrics = this.metrics.get(id);
    const cacheKey = this.cacheKeyFor(id, params);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      metrics.cacheHits += 1;
      return { ...cached, cached: true };
    }

    const breaker = this.breakerFor(id);
    if (!breaker.canRequest()) {
      throw new ProviderError('unavailable', `${def.label} is temporarily unavailable (circuit open).`);
    }

    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const startedAt = Date.now();
      metrics.requests += 1;
      try {
        const { data, url } = await adapter.request(params, {
          timeout: this.timeoutMs,
          apiKey: def.keyEnv ? process.env[def.keyEnv] : undefined,
        });
        const latency = Date.now() - startedAt;
        metrics.successes += 1;
        metrics.lastLatencyMs = latency;
        metrics.lastStatus = 200;
        metrics.lastFetchAt = new Date().toISOString();
        metrics.lastError = null;
        breaker.onSuccess(200);

        const envelope = {
          provider: def.id,
          label: def.label,
          dataset: def.dataset,
          kind: def.kind,
          temporalResolution: def.temporalResolution,
          spatialResolution: def.spatialResolution,
          sourceUrl: redactUrl(url),
          fetchedAt: new Date().toISOString(),
          latencyMs: latency,
          cached: false,
          notes: def.notes,
          data,
        };
        this.cache.set(cacheKey, envelope, def.cacheTtlMs);
        return envelope;
      } catch (error) {
        const status = (error.response && error.response.status) || 0;
        lastError = error;
        metrics.failures += 1;
        metrics.lastStatus = status;
        metrics.lastFetchAt = new Date().toISOString();
        metrics.lastError = error.message;
        breaker.onFailure(status, error.message);

        const retryable = ProviderRegistry.isRetryableStatus(status);
        if (retryable && attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }
        break;
      }
    }

    throw new ProviderError('upstream', `${def.label} request failed.`, lastError);
  }
}

class ProviderError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

module.exports = {
  ProviderRegistry,
  ProviderError,
  TtlCache,
  CircuitBreaker,
  PROVIDER_DEFS,
  ADAPTERS,
  parseCsv,
  redactUrl,
};
