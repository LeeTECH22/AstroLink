const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { ProviderRegistry, ProviderError } = require('./lib/providers');
const { CyberShield } = require('./lib/cybershield');
const { buildAllowlist, isAllowed } = require('./lib/origin');
const { CATEGORIES: researchCategories } = require('./lib/research');

// Load environment variables from the project root first, then the server
// directory. This makes `node server/index.js`, `cd server && node index.js`
// and `npm run dev:full` all resolve the same .env file.
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_CANDIDATES = [path.join(ROOT_DIR, '.env'), path.join(__dirname, '.env')];
ENV_CANDIDATES.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

// Load Supabase client AFTER environment variables are loaded
const { supabase } = require('./lib/supabase');

const app = express();
const PORT = process.env.PORT || 5001;

// Behind a reverse proxy (Vercel / Render / Fly / nginx) trust the first hop so
// rate limiting sees the real client IP instead of the proxy IP.
app.set('trust proxy', 1);
// Do not advertise the framework.
app.disable('x-powered-by');

// Shared service instances: unified data-provider layer and CyberShield.
const providerRegistry = new ProviderRegistry();
const cyberShield = new CyberShield();

// Collect every NASA API key so requests can automatically fail over to the
// next key when one is rate-limited or rejected.
// Supported sources: .env entries named NASA_API_KEY, NASA_API_KEY_2, ...
// and NASA_API_KEYS (comma separated), plus the matching process.env variables.
// NOTE: dotenv keeps only the first duplicate `NASA_API_KEY=` line, so we also
// scan the raw file to recover additional keys the user added with the same name.
const readNasaKeysFromFile = (envPath) => {
  try {
    return fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => !/^\s*#/.test(line))
      .map((line) => line.match(/^\s*NASA_API_KEY[A-Z0-9_]*\s*=\s*(.*)$/i))
      .filter(Boolean)
      .flatMap((match) => match[1].split(','))
      .map((value) => value.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  } catch (error) {
    return [];
  }
};

const buildNasaKeyPool = () => {
  const fromFiles = ENV_CANDIDATES.flatMap(readNasaKeysFromFile);
  const fromEnv = [
    process.env.NASA_API_KEYS,
    process.env.NASA_API_KEY,
    process.env.NASA_API_KEY_2,
    process.env.NASA_API_KEY_3,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','));

  const keys = [...fromFiles, ...fromEnv]
    .map((key) => key.trim().replace(/^["']|["']$/g, ''))
    .filter((key) => key && !/^YOUR[_-]?NASA/i.test(key));

  const unique = [...new Set(keys)];
  return unique.length > 0 ? unique : ['DEMO_KEY'];
};

const NASA_API_KEYS = buildNasaKeyPool();
// Primary key kept for backwards compatibility with the existing route URLs.
const NASA_API_KEY = NASA_API_KEYS[0];

// CORS: explicit allowlist managed by the centralized origin validator.
// Configure ALLOWED_ORIGINS as a comma-separated list of front-end origins.
// The deployed AstroLink origin and the common local dev ports (5173, 5174,
// 3000, 4173) are allowed by default so production + local development work
// even when ALLOWED_ORIGINS is not set on the host.
//
// Origins are matched by scheme + hostname + port (see server/lib/origin.js),
// which defeats substring-based bypasses such as `localhost.attacker.example`.
const ALLOWED_ORIGINS = buildAllowlist(process.env.ALLOWED_ORIGINS);

const corsOptions = {
  origin: (origin, callback) => {
    // Requests without an Origin header (curl, server-to-server, same-origin
    // proxies) are allowed by deliberate policy — browser requests always
    // carry an Origin and are validated against the allowlist.
    if (isAllowed(origin, ALLOWED_ORIGINS)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: false,
};

// ---------------------------------------------------------------------------
// Security & reliability middleware (Stage 1 hardening)
// ---------------------------------------------------------------------------

// Security headers. CSP is disabled here because this is a JSON API that also
// proxies a few third-party responses; the frontend host is responsible for CSP.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors(corsOptions));

// Reject oversized request bodies early. This API is read-only and expects no
// large payloads, which limits memory-exhaustion attempts. 64kB is small enough
// to stay safe while still allowing a research-chat request to carry bounded
// conversation history (see validateResearchBody).
app.use(express.json({ limit: '64kb' }));

// Hard cap on how long a single request may hold a connection open.
app.use((req, res, next) => {
  res.setTimeout(45000, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: 'Request timeout', details: 'The request took too long to complete.' });
    }
  });
  next();
});

// Cache headers: NASA data changes slowly, so allow a short public cache on
// successful API reads while keeping everything else non-cacheable.
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// Consistent, safe error payloads (never leak internals or secrets).
const sendError = (res, status, error, details) =>
  res.status(status).json(details ? { error, details } : { error });

// CyberShield runs on every request: records metrics and enforces temporary
// (auto-expiring, reversible) restrictions on abusive clients. Health checks
// and trusted monitoring IPs are always allowed through.
app.use(cyberShield.middleware());

// Rate limiting: a generous general limit protects every API route while a
// stricter limit guards the expensive upstream POWER queries. Returns 429.
const rateLimitHandler = (message) => (req, res) => {
  // Feed rate-limit events into CyberShield's detection + audit pipeline.
  cyberShield.recordRateLimited(req);
  res.status(429).json({ error: 'Too many requests', details: message });
};

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Rate limit exceeded. Please slow down and try again shortly.'),
});

const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.EXPENSIVE_RATE_LIMIT_MAX) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Rate limit exceeded for this operation. Please wait before retrying.'),
});

app.use('/api', apiLimiter);

// NASA API base URL
const NASA_BASE_URL = 'https://api.nasa.gov';

// Strip secrets (e.g. api_key) from URLs before logging.
const redactUrl = (url) => String(url).replace(/(api_key=)[^&]+/gi, '$1***');

// Recursively redact any `api_key=...` embedded in strings returned by upstream
// APIs. Some NASA endpoints echo the request key back inside their `links`
// objects (e.g. the NEO feed's `links.next`), so raw passthrough responses must
// be scrubbed before they reach the client.
const redactDeep = (value) => {
  if (typeof value === 'string') return redactUrl(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) out[key] = redactDeep(val);
    return out;
  }
  return value;
};

// Shared validators for query parameters.
const isValidDateParam = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isValidDateCompact = (value) => /^\d{8}$/.test(value);
const isValidLatitude = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= -90 && n <= 90;
};
const isValidLongitude = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= -180 && n <= 180;
};

// Standard marker for demo/sample payloads so they are never mistaken for
// live NASA observations.
const demoMeta = (note) => ({ source: 'demo-fallback', demo: true, note });

// Normalise a NASA ADS search document into a compact, client-friendly shape.
// ADS returns titles/dois as arrays and authors as an array of "Last, First".
const normalizeAdsDoc = (doc) => ({
  bibcode: doc.bibcode,
  title: Array.isArray(doc.title) ? doc.title[0] : doc.title,
  authors: Array.isArray(doc.author) ? doc.author : [],
  year: doc.year,
  journal: doc.pub,
  abstract: doc.abstract || null,
  citations: typeof doc.citation_count === 'number' ? doc.citation_count : null,
  doi: Array.isArray(doc.doi) ? doc.doi[0] : doc.doi || null,
  doctype: doc.doctype || null,
  refereed: Array.isArray(doc.property) ? doc.property.includes('REFEREED') : false,
});

// Statuses that indicate the current key is unusable (rate limit / quota /
// auth) and that retrying with the next key is worthwhile.
const KEY_FAILOVER_STATUSES = new Set([401, 403, 429]);

// Inject or replace the api_key value in an already-built NASA URL.
const applyNasaKey = (url, key) => {
  if (/api_key=/i.test(url)) {
    return url.replace(/(api_key=)[^&]*/i, `$1${key}`);
  }
  return `${url}${url.includes('?') ? '&' : '?'}api_key=${key}`;
};

// Request a NASA endpoint with automatic key failover: if a key is rejected
// (rate limited, quota exceeded or unauthorized), the next configured key is
// tried automatically. Never logs key values.
const nasaGet = async (url, options = {}) => {
  let lastError;
  for (let i = 0; i < NASA_API_KEYS.length; i += 1) {
    const key = NASA_API_KEYS[i];
    try {
      return await axios.get(applyNasaKey(url, key), { timeout: 15000, ...options });
    } catch (error) {
      lastError = error;
      const status = error.response && error.response.status;
      const detail = (error.response && error.response.data) || {};
      const message = String((detail.error && detail.error.message) || error.message || '');
      const rateLimited = /rate limit|quota|over_rate_limit|too many requests/i.test(message);
      const hasNextKey = i < NASA_API_KEYS.length - 1;
      if (hasNextKey && (KEY_FAILOVER_STATUSES.has(status) || rateLimited)) {
        console.warn(`⚠️  NASA key #${i + 1} unavailable (${status || 'error'}); retrying with key #${i + 2}.`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

// Shared NASA POWER fetch used by both the daily and monthly (trend)
// endpoints. It now goes through the unified provider layer so POWER benefits
// from caching, per-attempt timeouts, bounded retries and a circuit breaker,
// while returning the same `{ data }` shape the existing routes expect.
const fetchPowerData = async ({ temporal = 'daily', parameters, latitude, longitude, start, end, community = 'RE' }) => {
  console.log(`Fetching POWER (${temporal}) via provider layer`);
  const envelope = await providerRegistry.fetch('power', {
    temporal,
    parameters,
    latitude,
    longitude,
    start,
    end,
    community,
  });
  return { data: envelope.data };
};

// ---------------------------------------------------------------------------
// Health check — safe, public, no secrets / paths / env contents.
// ---------------------------------------------------------------------------
const APP_STARTED_AT = Date.now();
const APP_VERSION = process.env.APP_VERSION || '1.0.0';

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'astrolink-nasa-explorer-api',
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - APP_STARTED_AT) / 1000),
    services: {
      // Report only the configuration *mode*, never key counts or values.
      nasaApiKeys: NASA_API_KEYS[0] === 'DEMO_KEY' ? 'demo-key' : 'configured',
      keyFailover: NASA_API_KEYS.length > 1,
    },
    // Safe, aggregate-only operational signals (no secrets, IPs or paths).
    security: {
      rateLimiting: 'enabled',
      temporaryRestrictions: cyberShield.listRestrictions().length,
    },
    dataProviders: providerRegistry.list().length,
  });
});

// ---------------------------------------------------------------------------
// APOD — NASA migrated APOD to the WordPress REST API; the legacy
// `api.nasa.gov/planetary/apod` endpoint is scheduled for removal on
// 2026-12-01. The WordPress `apod-basic` feed is therefore the primary source
// and the legacy endpoint is retained only as a dated-request fallback.
// ---------------------------------------------------------------------------
const APOD_WP_URL = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';
const APOD_WP_PAGE_SIZE = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The WordPress feed returns HTML in explanation/copyright fields; the UI
// renders plain text, so strip tags and decode the common entities.
const stripHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const mapApodWpItem = (item) => {
  const isImage = item.media_type === 'image';
  return {
    date: item.date,
    title: stripHtml(item.title),
    explanation: stripHtml(item.explanation),
    media_type: item.media_type,
    // For images the WordPress `hdurl` is the asset; reuse it as the display
    // URL because that feed exposes no separate standard-resolution field.
    url: isImage ? item.hdurl || item.url : item.url,
    hdurl: isImage ? item.hdurl : undefined,
    copyright: item.copyright ? stripHtml(item.copyright) : item.credit ? stripHtml(item.credit) : undefined,
    service_version: 'v1',
    _meta: { source: 'science.nasa.gov (APOD WordPress API)', live: true },
  };
};

const fetchApodFromWordPress = async (date) => {
  if (!date) {
    const response = await axios.get(`${APOD_WP_URL}?per_page=1&page=1`, { timeout: 15000 });
    const items = Array.isArray(response.data) ? response.data : [];
    if (!items.length) throw new Error('APOD WordPress feed returned no items');
    return mapApodWpItem(items[0]);
  }
  // The feed is ordered newest-first with one entry per day and ignores date
  // query filters, so locate the entry by paging from the newest item.
  const latestResponse = await axios.get(`${APOD_WP_URL}?per_page=1&page=1`, { timeout: 15000 });
  const latest = Array.isArray(latestResponse.data) ? latestResponse.data[0] : null;
  if (!latest) throw new Error('APOD WordPress feed returned no items');
  const daysBack = Math.round((Date.parse(latest.date) - Date.parse(date)) / MS_PER_DAY);
  const estimatedPage = Math.max(1, Math.floor(daysBack / APOD_WP_PAGE_SIZE) + 1);
  const candidatePages = [...new Set([estimatedPage, estimatedPage + 1, estimatedPage - 1])].filter((page) => page >= 1);
  for (const page of candidatePages) {
    const response = await axios.get(`${APOD_WP_URL}?per_page=${APOD_WP_PAGE_SIZE}&page=${page}`, { timeout: 15000 });
    const items = Array.isArray(response.data) ? response.data : [];
    const match = items.find((item) => item.date === date);
    if (match) return mapApodWpItem(match);
  }
  throw new Error(`No APOD entry found for ${date}`);
};

const fetchApodLegacy = async (date) => {
  const url = `${NASA_BASE_URL}/planetary/apod?api_key=${NASA_API_KEY}${date ? `&date=${date}` : ''}`;
  const response = await nasaGet(url, { timeout: 15000 });
  return response.data;
};

// APOD - Astronomy Picture of the Day
app.get('/api/apod', async (req, res) => {
  const { date } = req.query;
  if (date && !isValidDateParam(date)) {
    return sendError(res, 400, 'Invalid date parameter', 'date must be in YYYY-MM-DD format.');
  }
  try {
    const picture = await fetchApodFromWordPress(date);
    return res.json(picture);
  } catch (wpError) {
    console.warn('APOD WordPress source unavailable:', wpError.message);
  }
  try {
    const picture = await fetchApodLegacy(date);
    if (picture && picture.date) return res.json(picture);
  } catch (legacyError) {
    console.warn('APOD legacy source unavailable:', legacyError.message);
  }
  // Demo fallback — clearly marked so it is never mistaken for live NASA data.
  res.json({
    date: new Date().toISOString().split('T')[0],
    explanation: "This is a sample astronomy picture. The actual NASA APOD service may be temporarily unavailable. This demonstrates the application's fallback mechanism to ensure users always have content to explore.",
    hdurl: "https://apod.nasa.gov/apod/image/2310/M33_HubbleSubaru_3000.jpg",
    media_type: "image",
    service_version: "v1",
    title: "Sample: The Triangulum Galaxy",
    url: "https://apod.nasa.gov/apod/image/2310/M33_HubbleSubaru_960.jpg",
    _meta: demoMeta('Live APOD data unavailable; sample image shown for demonstration only.')
  });
});

// ---------------------------------------------------------------------------
// Mars Rover Photos — NASA retired the legacy
// `api.nasa.gov/mars-photos` feed on 2025-10-08. The current public source is
// the Mars raw-images feed on mars.nasa.gov (no API key required). Raw feed
// items are normalised to the legacy `photos[]` shape the UI already consumes.
// ---------------------------------------------------------------------------
const MARS_FEED_URL = 'https://mars.nasa.gov/rss/api/';
const MARS_ROVER_CATEGORIES = {
  curiosity: 'msl',
  perseverance: 'mars2020',
  opportunity: 'mer',
  spirit: 'mer',
};
const MARS_ROVER_LABELS = {
  curiosity: 'Curiosity',
  perseverance: 'Perseverance',
  opportunity: 'Opportunity',
  spirit: 'Spirit',
};
// Maps the camera codes used by the UI onto the raw-feed instrument prefixes.
const MARS_CAMERA_PREFIX = {
  FHAZ: 'FHAZ',
  RHAZ: 'RHAZ',
  MAST: 'MAST',
  MAHLI: 'MAHLI',
  MARDI: 'MARDI',
  CHEMCAM: 'CHEMCAM',
  NAVCAM: 'NAV',
  NAVCAM_LEFT: 'NAV_LEFT',
  NAVCAM_RIGHT: 'NAV_RIGHT',
  MCZ_LEFT: 'MCZ_LEFT',
  MCZ_RIGHT: 'MCZ_RIGHT',
  SUPERCAM_RMI: 'SUPERCAM_RMI',
  PANCAM: 'PANCAM',
  MINITES: 'MINITES',
};

const mapMarsImage = (image, roverKey) => {
  const files = image.image_files || {};
  const instrument = (image.camera && image.camera.instrument) || 'UNKNOWN';
  return {
    id: image.imageid,
    sol: image.sol,
    camera: { name: instrument, full_name: instrument },
    img_src: files.full_res || files.large || files.medium || files.small || '',
    earth_date: image.date_taken_utc ? String(image.date_taken_utc).slice(0, 10) : undefined,
    rover: { name: MARS_ROVER_LABELS[roverKey] || roverKey },
    _meta: { title: image.title, credit: image.credit, link: image.link },
  };
};

// Mars Rover Photos
app.get('/api/mars-photos', async (req, res) => {
  const { rover = 'curiosity', sol = '1000', camera } = req.query;
  const roverKey = String(rover).toLowerCase();
  const ALLOWED_ROVERS = ['curiosity', 'opportunity', 'spirit', 'perseverance'];
  if (!ALLOWED_ROVERS.includes(roverKey)) {
    return sendError(res, 400, 'Invalid rover', `rover must be one of: ${ALLOWED_ROVERS.join(', ')}.`);
  }
  if (!/^\d{1,6}$/.test(String(sol))) {
    return sendError(res, 400, 'Invalid sol', 'sol must be a non-negative integer (martian sol).');
  }

  const category = MARS_ROVER_CATEGORIES[roverKey];
  const feedUrl = (solParam) =>
    `${MARS_FEED_URL}?feed=raw_images&category=${category}&feedtype=json&num=60&order=sol+desc${
      solParam != null ? `&sol=${solParam}` : ''
    }`;

  try {
    let returnedSol = String(sol);
    const first = await axios.get(feedUrl(String(sol)), { timeout: 12000 });
    let images = Array.isArray(first.data && first.data.images) ? first.data.images : [];

    if (images.length === 0) {
      // Requested sol had no images — fall back to the rover's most recent sol.
      const latest = await axios.get(feedUrl(null), { timeout: 12000 });
      images = Array.isArray(latest.data && latest.data.images) ? latest.data.images : [];
      returnedSol = images.length ? String(images[0].sol) : null;
    }

    if (camera && String(camera).trim() !== '') {
      const requested = String(camera).toUpperCase();
      const prefix = MARS_CAMERA_PREFIX[requested] || requested;
      images = images.filter((image) =>
        String((image.camera && image.camera.instrument) || '').toUpperCase().startsWith(prefix)
      );
    }

    res.json({
      photos: images.map((image) => mapMarsImage(image, roverKey)),
      _meta: {
        source: 'mars.nasa.gov (raw images feed)',
        requestedSol: String(sol),
        returnedSol,
        fallbackSolUsed: returnedSol !== String(sol),
        ...(category === 'mer'
          ? { note: 'The MER raw-image feed (Spirit/Opportunity) currently publishes no images.' }
          : {}),
      },
    });
  } catch (error) {
    console.error('Mars photos error:', error.message);
    sendError(res, 502, 'Failed to fetch Mars photos', 'The NASA Mars raw-image service is currently unavailable.');
  }
});

// Near Earth Objects
app.get('/api/neo', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const startDate = req.query.start_date || today;
  const endDate = req.query.end_date || today;

  if (!isValidDateParam(startDate) || !isValidDateParam(endDate)) {
    return res.status(400).json({
      error: 'Invalid date parameter',
      details: 'start_date and end_date must be valid dates in YYYY-MM-DD format.',
    });
  }
  if (startDate > endDate) {
    return res.status(400).json({
      error: 'Invalid date range',
      details: 'start_date must be on or before end_date.',
    });
  }

  try {
    const url = `${NASA_BASE_URL}/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${NASA_API_KEY}`;
    console.log(`Fetching NEO: ${redactUrl(url)}`);
    const response = await nasaGet(url, { timeout: 15000 });
    // NASA echoes the request api_key inside `links.next/prev/self`; scrub it.
    res.json(redactDeep(response.data));
  } catch (error) {
    console.error('NEO API Error:', error.message);
    // Demo fallback — clearly marked so it is never mistaken for live NASA data.
    res.json({
      links: { self: "demo-fallback" },
      element_count: 1,
      near_earth_objects: {
        [startDate]: [
          {
            id: "54016849",
            name: "(2020 SO)",
            absolute_magnitude_h: 28.1,
            estimated_diameter: {
              kilometers: { estimated_diameter_min: 0.004, estimated_diameter_max: 0.009 },
              meters: { estimated_diameter_min: 4.2, estimated_diameter_max: 9.4 }
            },
            is_potentially_hazardous_asteroid: false,
            close_approach_data: [{
              close_approach_date: startDate,
              relative_velocity: { kilometers_per_hour: "27000" },
              miss_distance: { kilometers: "450000" }
            }]
          }
        ]
      },
      _meta: demoMeta('Live NEO data unavailable; sample asteroid shown for demonstration only.')
    });
  }
});

// ---------------------------------------------------------------------------
// Space weather. The DONKI `FLR` (solar flare) path is currently broken on the
// api.nasa.gov gateway (every request returns HTTP 404), so solar-flare data is
// sourced from the live NOAA SWPC GOES X-ray feed instead. CMEs and
// geomagnetic storms still come from DONKI. Each response is labelled with the
// actual upstream source so nothing is ever presented as something it is not.
// ---------------------------------------------------------------------------
const NOAA_FLARES_URL = 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json';

const mapNoaaFlare = (flare) => ({
  flrID: `NOAA-${flare.begin_time}`,
  beginTime: flare.begin_time,
  peakTime: flare.max_time,
  endTime: flare.end_time,
  classType: flare.max_class,
  note: 'Source region not reported by this feed.',
  _meta: { source: 'NOAA SWPC GOES X-ray' },
});

const fetchNoaaFlares = async () => {
  const response = await axios.get(NOAA_FLARES_URL, { timeout: 12000 });
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(mapNoaaFlare);
};

// Returns the DONKI product payload array (not the raw axios response) so the
// route can serialize it directly. `nasaGet` resolves with the full axios
// response object, whose `config`/`request` fields are circular and would make
// `res.json` throw "Converting circular structure to JSON".
const fetchDonkiProduct = async (product, startDate, endDate) => {
  const response = await nasaGet(
    `${NASA_BASE_URL}/DONKI/${product}?startDate=${startDate}&endDate=${endDate}&api_key=${NASA_API_KEY}`,
    { timeout: 15000 }
  );
  return Array.isArray(response.data) ? response.data : [];
};

// DONKI - Space Weather
app.get('/api/donki', async (req, res) => {
  const { type = 'all' } = req.query;
  if (!['all', 'flr', 'cme'].includes(String(type))) {
    return sendError(res, 400, 'Invalid type', 'type must be one of: all, flr, cme.');
  }
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Each product is fetched independently so one broken upstream path never
  // fails the whole response.
  const safe = async (promise, label) => {
    try {
      return { ok: true, data: await promise };
    } catch (error) {
      console.warn(`Space weather ${label} unavailable:`, error.message);
      return { ok: false, data: [] };
    }
  };

  try {
    // Fetch the three DONKI products concurrently. Running them in parallel
    // keeps the worst case near one upstream timeout instead of three, so a
    // single slow path cannot exhaust the 45s request budget.
    const [cmes, gst, donkiFlares] = await Promise.all([
      safe(fetchDonkiProduct('CME', startDate, endDate), 'CME'),
      safe(fetchDonkiProduct('GST', startDate, endDate), 'GST'),
      safe(fetchDonkiProduct('FLR', startDate, endDate), 'FLR'),
    ]);

    let solarFlares = donkiFlares.ok ? donkiFlares.data : [];
    let flareSource = donkiFlares.ok && solarFlares.length ? 'DONKI (NASA)' : null;
    if (!solarFlares.length) {
      const noaa = await safe(fetchNoaaFlares(), 'NOAA flares');
      if (noaa.ok && noaa.data.length) {
        solarFlares = noaa.data;
        flareSource = 'NOAA SWPC GOES X-ray (DONKI FLR unavailable)';
      }
    }

    const meta = {
      windowStart: startDate,
      windowEnd: endDate,
      flareSource: flareSource || 'unavailable',
      cmeSource: cmes.ok ? 'DONKI (NASA)' : 'unavailable',
      gstSource: gst.ok ? 'DONKI (NASA)' : 'unavailable',
    };

    if (type === 'flr') return res.json({ solarFlares, cmes: [], geomagneticStorms: [], _meta: meta });
    if (type === 'cme') return res.json({ solarFlares: [], cmes: cmes.data, geomagneticStorms: [], _meta: meta });

    return res.json({ solarFlares, cmes: cmes.data, geomagneticStorms: gst.data, _meta: meta });
  } catch (error) {
    console.error('Space weather error:', error.message);
    sendError(res, 502, 'Failed to fetch space weather data', 'The NASA DONKI service is currently unavailable.');
  }
});

// EPIC - Earth Images
app.get('/api/epic', async (req, res) => {
  const { date } = req.query;
  if (date && !isValidDateParam(String(date).split(' ')[0])) {
    return sendError(res, 400, 'Invalid date parameter', 'date must be in YYYY-MM-DD format.');
  }
  try {
    let url = `${NASA_BASE_URL}/EPIC/api/natural`;
    if (date) {
      url += `/date/${encodeURIComponent(String(date).split(' ')[0])}`;
    } else {
      // Get available dates first, then fetch images for the most recent date.
      const datesUrl = `${NASA_BASE_URL}/EPIC/api/natural/available?api_key=${NASA_API_KEY}`;
      const datesResponse = await nasaGet(datesUrl, { timeout: 10000 });
      const available = Array.isArray(datesResponse.data) ? datesResponse.data : [];
      const latest = available[available.length - 1];
      const latestDate = typeof latest === 'string' ? latest : latest && latest.date;
      if (!latestDate) {
        // Do not build a malformed `/date/undefined` URL; report the upstream gap.
        return sendError(res, 502, 'No EPIC images available', 'NASA EPIC reported no available image dates.');
      }
      url += `/date/${encodeURIComponent(String(latestDate).split(' ')[0])}`;
    }
    url += `?api_key=${NASA_API_KEY}`;

    console.log(`Fetching EPIC images: ${redactUrl(url)}`);
    const response = await nasaGet(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('EPIC API Error:', error.message);
    sendError(res, 502, 'Failed to fetch EPIC data', 'The NASA EPIC service is currently unavailable.');
  }
});

// EONET - Natural Events
app.get('/api/eonet', async (req, res) => {
  const { category, status = 'open', limit = 20 } = req.query;
  if (!['open', 'closed', 'all'].includes(String(status))) {
    return sendError(res, 400, 'Invalid status', 'status must be one of: open, closed, all.');
  }
  const limitNum = Number(limit);
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
    return sendError(res, 400, 'Invalid limit', 'limit must be an integer between 1 and 100.');
  }
  if (category && !/^[A-Za-z0-9_-]{1,40}$/.test(String(category))) {
    return sendError(res, 400, 'Invalid category', 'category must be a short alphanumeric identifier.');
  }
  try {
    let url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=${status}&limit=${limitNum}`;
    if (category) url += `&category=${category}`;

    console.log(`Fetching EONET: ${redactUrl(url)}`);
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'AstroLink-NASA-Explorer/1.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('EONET API Error:', error.message);
    // Return mock natural events data
    res.json({
      title: "EONET Events",
      description: "Natural events from EONET",
      events: [
        {
          id: "EONET_6195",
          title: "Wildfire - California, United States",
          description: "Sample wildfire event for demonstration",
          categories: [{ id: "wildfires", title: "Wildfires" }],
          sources: [{ id: "InciWeb", url: "https://inciweb.nwcg.gov/" }],
          geometry: [{
            magnitudeValue: null,
            magnitudeUnit: null,
            date: new Date().toISOString(),
            type: "Point",
            coordinates: [-120.5, 37.5]
          }]
        },
        {
          id: "EONET_6196",
          title: "Volcano - Mount Etna, Italy",
          description: "Sample volcanic activity",
          categories: [{ id: "volcanoes", title: "Volcanoes" }],
          sources: [{ id: "SIVolcano", url: "https://volcano.si.edu/" }],
          geometry: [{
            magnitudeValue: 3.2,
            magnitudeUnit: "VEI",
            date: new Date().toISOString(),
            type: "Point",
            coordinates: [14.999, 37.748]
          }]
        }
      ],
      _meta: demoMeta('Live EONET data unavailable; sample events shown for demonstration only.')
    });
  }
});

// NASA Image Library Search
app.get('/api/images', async (req, res) => {
  const { q = 'earth', media_type = 'image' } = req.query;
  if (typeof q !== 'string' || q.length < 1 || q.length > 100) {
    return sendError(res, 400, 'Invalid query', 'q must be between 1 and 100 characters.');
  }
  if (!['image', 'video', 'audio'].includes(String(media_type))) {
    return sendError(res, 400, 'Invalid media_type', 'media_type must be one of: image, video, audio.');
  }
  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=${media_type}`;

    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('NASA Images API Error:', error.message);
    sendError(res, 502, 'Failed to fetch NASA images', 'The NASA Image Library service is currently unavailable.');
  }
});

// POWER API - Climate and Solar Energy Data
app.get('/api/power', expensiveLimiter, async (req, res) => {
  const {
    latitude = '33.69',
    longitude = '73.05',
    start = '20240101',
    end = '20240110',
    parameters = 'T2M,ALLSKY_SFC_SW_DWN'
  } = req.query;

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return res.status(400).json({
      error: 'Invalid coordinates',
      details: 'latitude must be between -90 and 90 and longitude between -180 and 180.',
    });
  }
  if (!isValidDateCompact(start) || !isValidDateCompact(end)) {
    return res.status(400).json({
      error: 'Invalid date parameter',
      details: 'start and end must be valid dates in YYYYMMDD format.',
    });
  }
  if (start > end) {
    return res.status(400).json({
      error: 'Invalid date range',
      details: 'start must be on or before end.',
    });
  }
  if (!/^[A-Za-z0-9_,]+$/.test(parameters)) {
    return res.status(400).json({
      error: 'Invalid parameters',
      details: 'parameters must be a comma-separated list of POWER parameter names.',
    });
  }

  try {
    const response = await fetchPowerData({ temporal: 'daily', parameters, latitude, longitude, start, end });
    res.json(response.data);
  } catch (error) {
    console.error('POWER API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch POWER data' });
  }
});

// POWER monthly data for multi-year trend analysis (Earth Trend Detective).
// Reuses the shared POWER integration above; only the temporal resolution and
// the (year-based) date parameters differ from the daily endpoint.
app.get('/api/power/trend', expensiveLimiter, async (req, res) => {
  const {
    latitude = '31.418',
    longitude = '73.079',
    startYear = '2015',
    endYear = '2024',
    parameters = 'T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN'
  } = req.query;

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return res.status(400).json({
      error: 'Invalid coordinates',
      details: 'latitude must be between -90 and 90 and longitude between -180 and 180.',
    });
  }
  const isYear = (value) => /^\d{4}$/.test(value) && Number(value) >= 1981 && Number(value) <= 2100;
  if (!isYear(startYear) || !isYear(endYear)) {
    return res.status(400).json({
      error: 'Invalid year parameter',
      details: 'startYear and endYear must be four-digit years in YYYY format.',
    });
  }
  if (Number(startYear) > Number(endYear)) {
    return res.status(400).json({
      error: 'Invalid date range',
      details: 'startYear must be on or before endYear.',
    });
  }
  if (!/^[A-Za-z0-9_,]+$/.test(parameters)) {
    return res.status(400).json({
      error: 'Invalid parameters',
      details: 'parameters must be a comma-separated list of POWER parameter names.',
    });
  }

  try {
    const response = await fetchPowerData({
      temporal: 'monthly',
      parameters,
      latitude,
      longitude,
      start: startYear,
      end: endYear,
    });
    res.json(response.data);
  } catch (error) {
    console.error('POWER trend API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch POWER trend data' });
  }
});

// TechPort API - NASA Technology Projects
app.get('/api/techport', async (req, res) => {
  const { projectId } = req.query;
  if (projectId !== undefined && !/^\d{1,10}$/.test(String(projectId))) {
    return sendError(res, 400, 'Invalid projectId', 'projectId must be a numeric identifier.');
  }
  try {
    let url;

    if (projectId) {
      url = `${NASA_BASE_URL}/techport/api/projects/${projectId}?api_key=${NASA_API_KEY}`;
    } else {
      url = `${NASA_BASE_URL}/techport/api/projects?api_key=${NASA_API_KEY}`;
    }

    console.log(`Fetching TechPort data: ${redactUrl(url)}`);
    const response = await nasaGet(url, { timeout: 15000 });

    // Handle the response structure
    if (response.data && response.data.projects) {
      res.json(response.data);
    } else if (response.data && response.data.project) {
      res.json(response.data);
    } else {
      // If no data, return mock data for demonstration
      res.json({
        projects: [
          {
            projectId: 17792,
            title: "Advanced Propulsion Systems",
            description: "Development of next-generation propulsion technologies for deep space missions.",
            status: "Active",
            startDate: "2023-01-01",
            benefits: "Enables faster and more efficient space travel for future missions to Mars and beyond."
          }
        ],
        _meta: demoMeta('TechPort returned no projects; sample project shown for demonstration only.')
      });
    }
  } catch (error) {
    console.error('TechPort API Error:', error.message);
    // Return mock data on error
    res.json({
      projects: [
        {
          projectId: 17792,
          title: "Advanced Propulsion Systems",
          description: "Development of next-generation propulsion technologies for deep space missions.",
          status: "Active",
          startDate: "2023-01-01",
          benefits: "Enables faster and more efficient space travel for future missions to Mars and beyond."
        },
        {
          projectId: 17793,
          title: "Mars Sample Return Mission",
          description: "Technology development for returning samples from Mars to Earth.",
          status: "Active",
          startDate: "2022-06-01",
          benefits: "Will provide unprecedented scientific insights into Mars geology and potential for past life."
        }
      ],
      _meta: demoMeta('Live TechPort data unavailable; sample projects shown for demonstration only.')
    });
  }
});

// JPL Small-Body Database API
app.get('/api/sbdb', async (req, res) => {
  const { sstr = '433' } = req.query; // Default to asteroid Eros
  if (!/^[A-Za-z0-9 ._-]{1,60}$/.test(String(sstr))) {
    return sendError(res, 400, 'Invalid sstr', 'sstr must be a short search string (object name or designation).');
  }
  try {
    const url = `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(sstr)}`;

    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('SBDB API Error:', error.message);
    sendError(res, 502, 'Failed to fetch Small Body Database data', 'The JPL Small-Body Database service is currently unavailable.');
  }
});

// OSDR API - Open Science Data Repository
app.get('/api/osdr', async (req, res) => {
  const { studyId = 'OSD-379', page = 1, size = 10 } = req.query;
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(studyId))) {
    return sendError(res, 400, 'Invalid studyId', 'studyId must be a short alphanumeric identifier.');
  }
  const pageNum = Number(page);
  const sizeNum = Number(size);
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000) {
    return sendError(res, 400, 'Invalid page', 'page must be an integer between 1 and 1000.');
  }
  if (!Number.isInteger(sizeNum) || sizeNum < 1 || sizeNum > 100) {
    return sendError(res, 400, 'Invalid size', 'size must be an integer between 1 and 100.');
  }
  try {
    const url = `https://osdr.nasa.gov/osdr/data/osd/files/${studyId}?page=${pageNum}&size=${sizeNum}&all_files=true`;

    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('OSDR API Error:', error.message);
    sendError(res, 502, 'Failed to fetch OSDR data', 'The NASA OSDR service is currently unavailable.');
  }
});

// Earthdata Search API
app.get('/api/earthdata', async (req, res) => {
  const { keyword = 'MODIS', page_size = 10 } = req.query;
  if (typeof keyword !== 'string' || keyword.length < 1 || keyword.length > 100) {
    return sendError(res, 400, 'Invalid keyword', 'keyword must be between 1 and 100 characters.');
  }
  const pageSizeNum = Number(page_size);
  if (!Number.isInteger(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    return sendError(res, 400, 'Invalid page_size', 'page_size must be an integer between 1 and 100.');
  }
  try {
    const url = `https://cmr.earthdata.nasa.gov/search/collections.json?keyword=${encodeURIComponent(keyword)}&page_size=${pageSizeNum}`;

    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    console.error('Earthdata API Error:', error.message);
    sendError(res, 502, 'Failed to fetch Earthdata collections', 'The NASA CMR Earthdata service is currently unavailable.');
  }
});

// ADS API - Astrophysics Data System.
// ADS requires its OWN API token (separate from the api.nasa.gov key). Set
// ADS_API_KEY (or NASA_ADS_TOKEN) in the backend environment. When the token is
// missing the endpoint returns an honest "not configured" response and NEVER
// fabricates sample papers.
app.get('/api/ads', async (req, res) => {
  const { q = 'black hole', rows = 10, page = 1 } = req.query;
  const rowsNum = Number(rows);
  const pageNum = Number(page);
  if (!Number.isInteger(rowsNum) || rowsNum < 1 || rowsNum > 100) {
    return sendError(res, 400, 'Invalid rows', 'rows must be an integer between 1 and 100.');
  }
  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000) {
    return sendError(res, 400, 'Invalid page', 'page must be an integer between 1 and 1000.');
  }
  const query = String(q).trim();
  if (!query || query.length > 300) {
    return sendError(res, 400, 'Invalid query', 'Provide a search query of 1-300 characters.');
  }

  const token = process.env.ADS_API_KEY || process.env.NASA_ADS_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: 'ADS API is not configured',
      details:
        'The NASA Astrophysics Data System requires its own API token (separate from the NASA api.nasa.gov key) and none is set on the server.',
      requiresKey: true,
      tokenSetting: 'ADS_API_KEY',
      registerAt: 'https://ui.adsabs.harvard.edu/',
    });
  }

  const start = (pageNum - 1) * rowsNum;
  const fields = 'bibcode,title,author,year,pub,abstract,citation_count,doi,doctype,property';
  const url = `https://api.adsabs.harvard.edu/v1/search/query?q=${encodeURIComponent(
    query
  )}&fl=${encodeURIComponent(fields)}&rows=${rowsNum}&start=${start}`;
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: { Authorization: `Bearer ${token}` },
    });
    const responseBody = (response.data && response.data.response) || {};
    const docs = Array.isArray(responseBody.docs) ? responseBody.docs : [];
    res.json({
      source: 'NASA ADS (Harvard)',
      query,
      page: pageNum,
      rows: rowsNum,
      numFound: typeof responseBody.numFound === 'number' ? responseBody.numFound : docs.length,
      papers: docs.map(normalizeAdsDoc),
    });
  } catch (error) {
    const status = error.response && error.response.status;
    console.error('ADS API Error:', status || error.message);
    if (status === 401 || status === 403) {
      return sendError(
        res,
        502,
        'ADS authentication failed',
        'The configured ADS API token was rejected. Verify ADS_API_KEY.'
      );
    }
    if (status === 429) {
      return sendError(
        res,
        429,
        'ADS rate limit reached',
        'The ADS service is rate limiting requests. Please try again shortly.'
      );
    }
    sendError(res, 502, 'Failed to fetch ADS data', 'The NASA ADS service is currently unavailable.');
  }
});

// Exoplanet Archive API
app.get('/api/exoplanets', async (req, res) => {
  const { limit = 100 } = req.query;
  const limitNum = Number(limit);
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 500) {
    return sendError(res, 400, 'Invalid limit', 'limit must be an integer between 1 and 500.');
  }
  try {
    // The Exoplanet Archive TAP service is backed by Oracle/ADQL and rejects
    // the SQL `LIMIT` clause (ORA-00933); the correct row cap is `TOP n`.
    const query = `select top ${limitNum} pl_name,hostname,pl_orbper,pl_rade,disc_year,discoverymethod from ps where pl_name is not null and pl_orbper is not null and pl_rade is not null`;
    const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=json`;

    console.log(`Fetching Exoplanets: ${redactUrl(url)}`);
    const response = await axios.get(url, { timeout: 20000 });
    res.json(response.data);
  } catch (error) {
    console.error('Exoplanet API Error:', error.message);
    // Demo fallback — each record is flagged so it is never mistaken for live
    // NASA Exoplanet Archive data.
    res.json([
      {
        pl_name: "Kepler-452 b",
        hostname: "Kepler-452",
        pl_orbper: 384.843,
        pl_rade: 1.63,
        disc_year: 2015,
        discoverymethod: "Transit",
        source: "demo-fallback",
        demo: true
      },
      {
        pl_name: "TRAPPIST-1 e",
        hostname: "TRAPPIST-1",
        pl_orbper: 6.099615,
        pl_rade: 0.92,
        disc_year: 2016,
        discoverymethod: "Transit",
        source: "demo-fallback",
        demo: true
      },
      {
        pl_name: "Proxima Centauri b",
        hostname: "Proxima Centauri",
        pl_orbper: 11.186,
        pl_rade: 1.17,
        disc_year: 2016,
        discoverymethod: "Radial Velocity",
        source: "demo-fallback",
        demo: true
      }
    ]);
  }
});

// GIBS API - Global Imagery Browse Services
app.get('/api/gibs', async (req, res) => {
  try {
    // GIBS capabilities endpoint
    const url = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';

    const response = await axios.get(url, { timeout: 20000 });
    res.set('Content-Type', 'application/xml');
    res.send(response.data);
  } catch (error) {
    console.error('GIBS API Error:', error.message);
    sendError(res, 502, 'Failed to fetch GIBS capabilities', 'The NASA GIBS service is currently unavailable.');
  }
});

// DONKI Notifications endpoint
app.get('/api/donki/notifications', async (req, res) => {
  try {
    const url = `${NASA_BASE_URL}/DONKI/notifications?api_key=${NASA_API_KEY}`;

    const response = await nasaGet(url);
    res.json(response.data);
  } catch (error) {
    console.error('DONKI Notifications API Error:', error.message);
    sendError(res, 502, 'Failed to fetch DONKI notifications', 'The NASA DONKI service is currently unavailable.');
  }
});

// ---------------------------------------------------------------------------
// Multi-source data fusion (§4)
// ---------------------------------------------------------------------------

// Dataset catalog + provider health. Public and safe (no keys, no internals).
app.get('/api/providers', (req, res) => {
  res.json({
    providers: providerRegistry.list(),
    health: providerRegistry.health(),
    cache: providerRegistry.cache.stats(),
  });
});

// Unified data fetch. Every provider is reached through the same layer so
// provenance, caching, timeouts, retries and circuit breaking are consistent.
app.get('/api/data/:provider', expensiveLimiter, async (req, res) => {
  const { provider } = req.params;
  try {
    const envelope = await providerRegistry.fetch(provider, req.query);
    res.json(envelope);
  } catch (error) {
    if (error instanceof ProviderError) {
      if (error.code === 'validation') return sendError(res, 400, 'Invalid request', error.message);
      if (error.code === 'config') return sendError(res, 503, 'Provider not configured', error.message);
      if (error.code === 'unavailable') return sendError(res, 503, 'Provider unavailable', error.message);
      if (error.code === 'unknown_provider') return sendError(res, 404, 'Unknown provider', error.message);
      cyberShield.recordProviderFailure(provider);
      return sendError(res, 502, 'Provider request failed', error.message);
    }
    cyberShield.recordProviderFailure(provider);
    console.error('Provider layer error:', error.message);
    return sendError(res, 500, 'Internal server error');
  }
});

// ---------------------------------------------------------------------------
// NASA Research Questions from Supabase
// ---------------------------------------------------------------------------

app.get('/api/research/categories', (req, res) => res.json({ categories: researchCategories }));

// Fetch all research questions with pagination and optional category filter
app.get('/api/research/questions', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      error: 'Supabase not configured',
      details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment.',
    });
  }

  const { page = 1, limit = 50, category } = req.query;
  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000) {
    return sendError(res, 400, 'Invalid page', 'page must be an integer between 1 and 1000.');
  }
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 340) {
    return sendError(res, 400, 'Invalid limit', 'limit must be an integer between 1 and 340.');
  }

  try {
    let query = supabase
      .from('nasa_research_questions')
      .select('*', { count: 'exact' })
      .range((pageNum - 1) * limitNum, pageNum * limitNum - 1)
      .order('question_id', { ascending: true });

    if (category) {
      // Category can be a number (1-21) or a string (category title)
      const categoryNum = Number(category);
      if (!isNaN(categoryNum) && categoryNum >= 1 && categoryNum <= 21) {
        // Map category number to title using researchCategories
        const catTitle = researchCategories.find(c => c.number === categoryNum)?.title;
        if (catTitle) {
          query = query.eq('category', catTitle);
        }
      } else {
        // Treat as string category title
        query = query.eq('category', String(category));
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error.message);
      return sendError(res, 502, 'Database query failed', error.message);
    }

    res.json({
      questions: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Research questions error:', error.message);
    sendError(res, 500, 'Internal server error', 'Failed to fetch research questions.');
  }
});

// Full-text search for research questions (MUST be before /:id route)
app.get('/api/research/questions/search', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      error: 'Supabase not configured',
      details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment.',
    });
  }

  const { q, category, page = 1, limit = 50 } = req.query;
  const query = String(q || '').trim();

  if (!query || query.length < 2 || query.length > 200) {
    return sendError(res, 400, 'Invalid search query', 'q must be between 2 and 200 characters.');
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);

  if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000) {
    return sendError(res, 400, 'Invalid page', 'page must be an integer between 1 and 1000.');
  }
  if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 340) {
    return sendError(res, 400, 'Invalid limit', 'limit must be an integer between 1 and 340.');
  }

  try {
    let dbQuery = supabase
      .from('nasa_research_questions')
      .select('*', { count: 'exact' })
      .or(`question.ilike.%${query}%,answer_material.ilike.%${query}%,scientific_background.ilike.%${query}%`)
      .range((pageNum - 1) * limitNum, pageNum * limitNum - 1)
      .order('question_id', { ascending: true });

    if (category) {
      // Category can be a number (1-21) or a string (category title)
      const categoryNum = Number(category);
      if (!isNaN(categoryNum) && categoryNum >= 1 && categoryNum <= 21) {
        const catTitle = researchCategories.find(c => c.number === categoryNum)?.title;
        if (catTitle) {
          dbQuery = dbQuery.eq('category', catTitle);
        }
      } else {
        dbQuery = dbQuery.eq('category', String(category));
      }
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Supabase search error:', error.message);
      return sendError(res, 502, 'Database search failed', error.message);
    }

    res.json({
      questions: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
      searchQuery: query,
    });
  } catch (error) {
    console.error('Research search error:', error.message);
    sendError(res, 500, 'Internal server error', 'Failed to search research questions.');
  }
});

// Fetch a single research question by ID
app.get('/api/research/questions/:id', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      error: 'Supabase not configured',
      details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be set in the environment.',
    });
  }

  const { id } = req.params;
  const questionId = Number(id);

  if (isNaN(questionId) || questionId < 1 || questionId > 340) {
    return sendError(res, 400, 'Invalid question ID', 'question_id must be between 1 and 340.');
  }

  try {
    const { data, error } = await supabase
      .from('nasa_research_questions')
      .select('*')
      .eq('question_id', questionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return sendError(res, 404, 'Question not found', `Question ${questionId} does not exist.`);
      }
      console.error('Supabase query error:', error.message);
      return sendError(res, 502, 'Database query failed', error.message);
    }

    res.json({ question: data });
  } catch (error) {
    console.error('Research question error:', error.message);
    sendError(res, 500, 'Internal server error', 'Failed to fetch research question.');
  }
});

// ---------------------------------------------------------------------------
// CyberShield monitoring (§6) — administrative, access-controlled endpoints.
// ---------------------------------------------------------------------------

app.get('/api/cybershield/metrics', cyberShield.requireAdmin(), (req, res) => {
  res.json({
    metrics: cyberShield.getMetrics(),
    providers: providerRegistry.health(),
  });
});

app.get('/api/cybershield/events', cyberShield.requireAdmin(), (req, res) => {
  res.json({ events: cyberShield.getEvents(req.query.limit) });
});

app.get('/api/cybershield/restrictions', cyberShield.requireAdmin(), (req, res) => {
  res.json({ restrictions: cyberShield.listRestrictions() });
});

app.post('/api/cybershield/restrictions', cyberShield.requireAdmin(), (req, res) => {
  const { ip, seconds, reason } = req.body || {};
  if (typeof ip !== 'string' || ip.length < 1 || ip.length > 64) {
    return sendError(res, 400, 'Invalid ip', 'ip is required.');
  }
  const secondsNum = Number(seconds);
  if (!Number.isFinite(secondsNum) || secondsNum < 1 || secondsNum > 86400) {
    return sendError(res, 400, 'Invalid seconds', 'seconds must be between 1 and 86400.');
  }
  cyberShield.restrict(ip, secondsNum, typeof reason === 'string' ? reason.slice(0, 120) : 'manual');
  res.json({ ok: true, restriction: cyberShield.activeRestriction(ip) });
});

app.delete('/api/cybershield/restrictions/:ip', cyberShield.requireAdmin(), (req, res) => {
  const released = cyberShield.release(req.params.ip);
  res.json({ ok: true, released });
});

// Unknown API routes: return a consistent JSON 404 instead of the HTML default.
app.use('/api', (req, res) => {
  sendError(res, 404, 'Not found', 'The requested API endpoint does not exist.');
});

// Centralized error handler (handles CORS rejections and unexpected errors).
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return sendError(res, 403, 'Origin not allowed');
  }
  console.error('Unhandled server error:', err && err.message);
  return sendError(res, 500, 'Internal server error');
});

app.listen(PORT, () => {
  console.log(`🚀 NASA Data Explorer Server running on port ${PORT}`);
  console.log('🌌 NASA API endpoints integrated and ready!');
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 CORS allowlist: ${[...ALLOWED_ORIGINS].join(', ')}`);
  if (NASA_API_KEYS.length === 1 && NASA_API_KEYS[0] === 'DEMO_KEY') {
    console.warn('⚠️  NASA_API_KEY not set — falling back to the public DEMO_KEY (rate limited).');
  } else {
    console.log(`🔑 NASA key pool ready: ${NASA_API_KEYS.length} key(s) with automatic failover.`);
  }
});

// Never let an unhandled rejection or exception silently kill the server.
// Log a safe message only (no secrets) and keep serving.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error && error.message ? error.message : error);
});
