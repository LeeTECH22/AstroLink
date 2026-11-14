/**
 * Rate limiting test (Node built-in test runner).
 *
 * Spawns its own server instance with a very low limit so the 429 path can be
 * verified without sending hundreds of requests. Uses a validation error route
 * so no upstream NASA call is made.
 *
 * Run:  npm test        (inside the server/ directory)
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = process.env.RATE_LIMIT_TEST_PORT || '5098';
const BASE = `http://127.0.0.1:${PORT}`;
const MAX = 3;

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
    env: { ...process.env, PORT, RATE_LIMIT_MAX: String(MAX) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  await waitForHealth();
});

after(() => {
  if (child && !child.killed) child.kill();
});

test(`the ${MAX + 1}th API request within the window returns 429`, async () => {
  const statuses = [];
  for (let i = 0; i < MAX + 2; i += 1) {
    // Validation-error route: cheap and never calls an upstream service.
    const res = await fetch(`${BASE}/api/exoplanets?limit=abc`);
    statuses.push(res.status);
  }
  assert.ok(
    statuses.includes(429),
    `expected a 429 within ${MAX + 2} requests, got: ${statuses.join(',')}`
  );
  // The first MAX requests must NOT be rate limited.
  assert.ok(statuses.slice(0, MAX).every((s) => s !== 429), 'early requests should not be limited');

  const limited = await fetch(`${BASE}/api/exoplanets?limit=abc`);
  assert.strictEqual(limited.status, 429);
  const body = await limited.json();
  assert.match(body.error, /too many requests/i);
});
