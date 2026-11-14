/**
 * Integration tests for the new platform endpoints (data fusion, AI, CyberShield).
 * Spawns the real server with an ADMIN_TOKEN so authorization can be verified.
 * Run:  npm test   (inside server/)
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

// 5095 is free: 5099/5098 are used by api/ratelimit tests and 5097/5096 by the
// failover harness. Avoid collisions so the suites can run together.
const PORT = process.env.PLATFORM_TEST_PORT || '5095';
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_TOKEN = 'integration-admin-token';

let child;

const waitForHealth = async (timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server did not become healthy in time');
};

before(async () => {
  child = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
    env: { ...process.env, PORT, ADMIN_TOKEN, AI_PROVIDER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  await waitForHealth();
});

after(() => {
  if (child && !child.killed) child.kill();
});

test('GET /api/providers returns a catalog with provenance metadata', async () => {
  const res = await fetch(`${BASE}/api/providers`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.providers) && body.providers.length >= 4);
  const power = body.providers.find((p) => p.id === 'power');
  assert.ok(power, 'power provider listed');
  assert.strictEqual(power.kind, 'reanalysis', 'POWER must be labelled as gridded/model output');
  assert.ok(power.dataset);
  assert.ok(Array.isArray(body.health));
});

test('GET /api/data/:provider validates input (400) and rejects unknown providers (404)', async () => {
  const bad = await fetch(`${BASE}/api/data/power?latitude=999&longitude=0`);
  assert.strictEqual(bad.status, 400);
  const unknown = await fetch(`${BASE}/api/data/nope`);
  assert.strictEqual(unknown.status, 404);
});

test('a keyed provider without its key is reported as not configured (503)', async () => {
  const res = await fetch(`${BASE}/api/data/firms?west=70&south=30&east=80&north=35&days=1`);
  // Only assert 503 when FIRMS_MAP_KEY is genuinely absent from the environment.
  if (!process.env.FIRMS_MAP_KEY) {
    assert.strictEqual(res.status, 503);
    const body = await res.json();
    assert.match(body.error, /not configured/i);
  }
});

test('GET /api/ai/status reports AI availability without secrets', async () => {
  const res = await fetch(`${BASE}/api/ai/status`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(typeof body.available, 'boolean');
  assert.ok(['deterministic-only', 'ai-assisted'].includes(body.mode));
  assert.ok(!/api_key|secret/i.test(JSON.stringify(body)));
});

test('POST /api/ai/explain validates input and stays deterministic when unconfigured', async () => {
  const invalid = await fetch(`${BASE}/api/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '' }),
  });
  assert.strictEqual(invalid.status, 400);

  const ok = await fetch(`${BASE}/api/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Explain this trend', facts: { slopePerDecade: 0.42 } }),
  });
  assert.strictEqual(ok.status, 200);
  const body = await ok.json();
  assert.strictEqual(body.mode, 'deterministic-only');
  assert.strictEqual(body.answer, null);
});

test('GET /api/research/categories returns the 21-category NASA scope (340 questions)', async () => {
  const res = await fetch(`${BASE}/api/research/categories`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.categories.length, 21);
  assert.strictEqual(body.categories.reduce((sum, c) => sum + c.count, 0), 340);
  assert.strictEqual(body.categories[0].startQuestion, 1);
  assert.strictEqual(body.categories[20].endQuestion, 340);
});

test('POST /api/ai/research validates input and reports unavailable when no provider', async () => {
  const bad = await fetch(`${BASE}/api/ai/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'ab' }),
  });
  assert.strictEqual(bad.status, 400);

  const badHistory = await fetch(`${BASE}/api/ai/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Who founded NASA?', history: 'not-an-array' }),
  });
  assert.strictEqual(badHistory.status, 400);

  // The harness runs with AI_PROVIDER=none, so this must degrade safely.
  const ok = await fetch(`${BASE}/api/ai/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Who founded NASA and when?', history: [] }),
  });
  assert.strictEqual(ok.status, 200);
  const body = await ok.json();
  assert.strictEqual(body.available, false);
  assert.strictEqual(body.answer, null);
  assert.ok(!/sk-[A-Za-z0-9_-]{10,}/.test(JSON.stringify(body)));
});

test('CyberShield admin endpoints reject missing and wrong tokens', async () => {
  const anon = await fetch(`${BASE}/api/cybershield/metrics`);
  assert.strictEqual(anon.status, 401);

  const wrong = await fetch(`${BASE}/api/cybershield/metrics`, {
    headers: { 'x-admin-token': 'not-the-token' },
  });
  assert.strictEqual(wrong.status, 401);
});

test('CyberShield admin can read metrics, restrict and release a client', async () => {
  const auth = { 'x-admin-token': ADMIN_TOKEN };

  const metrics = await fetch(`${BASE}/api/cybershield/metrics`, { headers: auth });
  assert.strictEqual(metrics.status, 200);
  const mBody = await metrics.json();
  assert.ok(mBody.metrics.total > 0, 'requests have been counted');
  assert.ok(Array.isArray(mBody.providers));

  const created = await fetch(`${BASE}/api/cybershield/restrictions`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: '203.0.113.7', seconds: 60, reason: 'integration-test' }),
  });
  assert.strictEqual(created.status, 200);
  assert.strictEqual((await created.json()).ok, true);

  const listed = await fetch(`${BASE}/api/cybershield/restrictions`, { headers: auth });
  const list = await listed.json();
  assert.ok(list.restrictions.some((r) => r.ip === '203.0.113.7'));

  const released = await fetch(`${BASE}/api/cybershield/restrictions/203.0.113.7`, {
    method: 'DELETE',
    headers: auth,
  });
  assert.strictEqual(released.status, 200);
  assert.strictEqual((await released.json()).released, true);
});

test('CyberShield audit log is sanitized (no query secrets)', async () => {
  // Trigger a 404 with a secret-looking query, then read the audit log.
  await fetch(`${BASE}/api/does-not-exist?api_key=SUPERSECRETVALUE`);
  const res = await fetch(`${BASE}/api/cybershield/events?limit=50`, {
    headers: { 'x-admin-token': ADMIN_TOKEN },
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.events));
  assert.ok(!/SUPERSECRETVALUE/.test(JSON.stringify(body.events)), 'secret must not appear in audit log');
});

test('admin AI usage endpoint is protected and exposes only sanitized statistics', async () => {
  const anon = await fetch(`${BASE}/api/admin/ai-usage`);
  assert.strictEqual(anon.status, 401, 'unauthenticated access is denied');

  const wrong = await fetch(`${BASE}/api/admin/ai-usage`, { headers: { 'x-admin-token': 'nope' } });
  assert.strictEqual(wrong.status, 401);

  const res = await fetch(`${BASE}/api/admin/ai-usage`, { headers: { 'x-admin-token': ADMIN_TOKEN } });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.usage && typeof body.usage.totalRequests === 'number');
  assert.ok(body.health && Array.isArray(body.health.states));
  assert.ok(Array.isArray(body.recent));
  // Never exposes provider credentials.
  assert.ok(!/RAPIDAPI_KEY|sk-[A-Za-z0-9_-]{10,}/.test(JSON.stringify(body)));
});
