/**
 * Backend API tests (Node built-in test runner — no extra dependencies).
 *
 * These are integration tests: they spawn the real Express server on an
 * isolated port, wait for it to become healthy, then exercise the HTTP surface.
 *
 * Run:  npm test        (inside the server/ directory)
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = process.env.TEST_PORT || '5099';
const BASE = `http://127.0.0.1:${PORT}`;
const ALLOWED_ORIGIN = 'http://localhost:5173';

let child;

const waitForHealth = async (timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* server not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server did not become healthy in time');
};

before(async () => {
  child = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: { ...process.env, PORT, RATE_LIMIT_MAX: '120' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Drain output so the child never blocks on a full pipe.
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  await waitForHealth();
});

after(() => {
  if (child && !child.killed) child.kill();
});

test('GET /health returns a safe status payload', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(body.service, 'astrolink-nasa-explorer-api');
  assert.ok(body.version, 'version present');
  assert.ok(body.timestamp, 'timestamp present');

  // Must not leak secrets, env contents or filesystem paths.
  const raw = JSON.stringify(body);
  assert.ok(!/NASA_API_KEY|api_key/i.test(raw), 'no api_key field');
  assert.ok(!/[A-Za-z]:\\\\/.test(raw), 'no windows filesystem path');
  assert.ok(!raw.includes('node_modules'), 'no node_modules path');
});

test('security headers are present and framework is not advertised', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.strictEqual(res.headers.get('x-powered-by'), null, 'x-powered-by must be absent');
});

test('CORS: disallowed origin is rejected with 403', async () => {
  const res = await fetch(`${BASE}/api/eonet?limit=1`, {
    headers: { Origin: 'https://evil.example.com' },
  });
  assert.strictEqual(res.status, 403);
});

test('CORS: configured origin is allowed', async () => {
  const res = await fetch(`${BASE}/health`, { headers: { Origin: ALLOWED_ORIGIN } });
  assert.strictEqual(res.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
});

test('CORS: localhost:5174 (observed local dev port) is allowed', async () => {
  const res = await fetch(`${BASE}/health`, { headers: { Origin: 'http://localhost:5174' } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('access-control-allow-origin'), 'http://localhost:5174');
});

test('CORS: deceptive subdomains are rejected (no substring matching)', async () => {
  const res = await fetch(`${BASE}/api/eonet?limit=1`, {
    headers: { Origin: 'http://localhost.attacker.example' },
  });
  assert.strictEqual(res.status, 403);
});

test('CORS: OPTIONS preflight returns 204 for an allowed origin', async () => {
  const res = await fetch(`${BASE}/api/ai/research`, {
    method: 'OPTIONS',
    headers: {
      Origin: ALLOWED_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.strictEqual(res.status, 204);
  assert.strictEqual(res.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
  assert.ok(res.headers.get('access-control-allow-methods').includes('POST'));
});

test('CORS: requests without an Origin header are allowed (server-to-server)', async () => {
  const res = await fetch(`${BASE}/health`);
  assert.strictEqual(res.status, 200);
});

test('NASA AI Research endpoint accepts an authorized origin', async () => {
  const res = await fetch(`${BASE}/api/ai/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
    body: JSON.stringify({ question: 'Is this request allowed by origin?', history: [] }),
  });
  // The request must reach the handler (200/422/503) rather than be blocked
  // at the CORS layer (403). An unconfigured provider returns 503.
  assert.notStrictEqual(res.status, 403, 'origin must not be rejected');
  assert.strictEqual(res.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
});

test('unknown /api route returns a JSON 404', async () => {
  const res = await fetch(`${BASE}/api/does-not-exist`);
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.ok(body.error, 'has error field');
});

test('invalid coordinates are rejected (400)', async () => {
  const res = await fetch(`${BASE}/api/power?latitude=999&longitude=0`);
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /coordinate/i);
});

test('invalid date range is rejected (400)', async () => {
  const res = await fetch(`${BASE}/api/power?start=20240110&end=20240101`);
  assert.strictEqual(res.status, 400);
});

test('invalid date format is rejected (400)', async () => {
  const res = await fetch(`${BASE}/api/neo?start_date=not-a-date`);
  assert.strictEqual(res.status, 400);
});

test('invalid rover is rejected (400)', async () => {
  const res = await fetch(`${BASE}/api/mars-photos?rover=falcon9`);
  assert.strictEqual(res.status, 400);
});

test('non-numeric exoplanet limit is rejected (400)', async () => {
  const res = await fetch(`${BASE}/api/exoplanets?limit=abc`);
  assert.strictEqual(res.status, 400);
});

test('invalid NASA image media_type is rejected (400)', async () => {
  const res = await fetch(`${BASE}/api/images?q=earth&media_type=hologram`);
  assert.strictEqual(res.status, 400);
});

// --- Regression tests for defects found during the engineering audit ---------

test('NEO response never exposes the server API key (links are redacted)', async () => {
  const res = await fetch(`${BASE}/api/neo`);
  assert.strictEqual(res.status, 200);
  const raw = await res.text();
  // NASA echoes the request key in `links.next/prev`; it must be scrubbed.
  assert.ok(!/api_key=(?!\*\*\*)/.test(raw), 'no unredacted api_key value');
});

test('DONKI returns a JSON envelope for every type (regression: circular-JSON 502)', async () => {
  for (const type of ['all', 'flr', 'cme']) {
    const res = await fetch(`${BASE}/api/donki?type=${type}`);
    assert.strictEqual(res.status, 200, `type=${type} should be 200`);
    const body = await res.json();
    assert.ok(Array.isArray(body.solarFlares), 'solarFlares is an array');
    assert.ok(Array.isArray(body.cmes), 'cmes is an array');
    assert.ok(Array.isArray(body.geomagneticStorms), 'geomagneticStorms is an array');
    assert.ok(body._meta && body._meta.windowStart, 'carries provenance metadata');
  }
});

test('Exoplanet Archive returns a JSON array payload (regression: LIMIT vs TOP)', async () => {
  const res = await fetch(`${BASE}/api/exoplanets?limit=5`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body), 'payload is an array');
});
