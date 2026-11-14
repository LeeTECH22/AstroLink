/**
 * Unit tests for the unified data-provider layer (no network required).
 * Run:  npm test   (inside server/)
 */
const { test } = require('node:test');
const assert = require('node:assert');
const {
  ProviderRegistry,
  ProviderError,
  TtlCache,
  CircuitBreaker,
  ADAPTERS,
} = require('../lib/providers');

test('TtlCache: stores, returns, expires and evicts entries', async () => {
  const cache = new TtlCache({ maxEntries: 2 });
  cache.set('a', 1, 5);
  assert.strictEqual(cache.get('a'), 1);
  await new Promise((r) => setTimeout(r, 12));
  assert.strictEqual(cache.get('a'), null, 'entry must expire');
  cache.set('b', 2, 1000);
  cache.set('c', 3, 1000);
  cache.set('d', 4, 1000); // exceeds maxEntries -> evicts 'b'
  assert.strictEqual(cache.get('b'), null, 'oldest entry evicted');
  const stats = cache.stats();
  assert.ok(stats.entries <= 2);
});

test('CircuitBreaker: opens after threshold, recovers via half-open probe', () => {
  const clock = { t: 1000 };
  const breaker = new CircuitBreaker({ failureThreshold: 3, openMs: 1000 });
  // Wrap Date.now for deterministic timing.
  const realNow = Date.now;
  Date.now = () => clock.t;
  try {
    assert.strictEqual(breaker.state, 'closed');
    breaker.onFailure(500, 'boom');
    breaker.onFailure(500, 'boom');
    assert.strictEqual(breaker.state, 'closed', 'still closed below threshold');
    breaker.onFailure(500, 'boom');
    assert.strictEqual(breaker.state, 'open');
    assert.strictEqual(breaker.canRequest(), false, 'open circuits reject requests');
    clock.t += 1200;
    assert.strictEqual(breaker.state, 'half-open');
    assert.strictEqual(breaker.canRequest(), true, 'half-open admits a single probe');
    assert.strictEqual(breaker.canRequest(), false, 'only one probe at a time');
    breaker.onSuccess(200);
    assert.strictEqual(breaker.state, 'closed');
  } finally {
    Date.now = realNow;
  }
});

test('ProviderRegistry: rejects unknown providers', async () => {
  const registry = new ProviderRegistry();
  await assert.rejects(
    () => registry.fetch('not-a-provider', {}),
    (err) => err instanceof ProviderError && err.code === 'unknown_provider'
  );
});

test('ProviderRegistry: validation errors are surfaced as code=validation', async () => {
  const registry = new ProviderRegistry();
  await assert.rejects(
    () => registry.fetch('power', { latitude: 999, longitude: 0 }),
    (err) => err instanceof ProviderError && err.code === 'validation'
  );
});

test('ProviderRegistry: a keyed provider without its key reports code=config', async () => {
  const registry = new ProviderRegistry();
  const saved = process.env.FIRMS_MAP_KEY;
  delete process.env.FIRMS_MAP_KEY;
  try {
    await assert.rejects(
      () => registry.fetch('firms', { west: 70, south: 30, east: 80, north: 35, days: 1 }),
      (err) => err instanceof ProviderError && err.code === 'config'
    );
  } finally {
    if (saved !== undefined) process.env.FIRMS_MAP_KEY = saved;
  }
});

test('ProviderRegistry: caches, redacts the source URL and records provenance', async () => {
  const registry = new ProviderRegistry();
  const original = ADAPTERS.power.request;
  let calls = 0;
  ADAPTERS.power.request = async () => {
    calls += 1;
    return { data: { ok: true }, url: 'https://power.test/point?api_key=TOPSECRET&x=1' };
  };
  try {
    const params = { latitude: 31.4, longitude: 73.0, start: '2020', end: '2021', parameters: 'T2M', temporal: 'monthly' };
    const first = await registry.fetch('power', params);
    const second = await registry.fetch('power', params);
    assert.strictEqual(calls, 1, 'second call served from cache');
    assert.strictEqual(second.cached, true);
    assert.strictEqual(first.provider, 'power');
    assert.strictEqual(first.kind, 'reanalysis');
    assert.ok(first.dataset, 'dataset provenance present');
    assert.ok(!/TOPSECRET/.test(first.sourceUrl), 'api_key must be redacted');
    assert.ok(/api_key=\*\*\*/.test(first.sourceUrl));
  } finally {
    ADAPTERS.power.request = original;
  }
});

test('ProviderRegistry: repeated upstream failures open the circuit (code=unavailable)', async () => {
  const registry = new ProviderRegistry({ maxRetries: 0 });
  const original = ADAPTERS.power.request;
  ADAPTERS.power.request = async () => {
    const err = new Error('upstream down');
    err.response = { status: 500 };
    throw err;
  };
  try {
    const params = { latitude: 31.4, longitude: 73.0, start: '2020', end: '2021', parameters: 'T2M', temporal: 'monthly' };
    await assert.rejects(() => registry.fetch('power', params), (e) => e.code === 'upstream');
    await assert.rejects(() => registry.fetch('power', params), (e) => e.code === 'upstream');
    await assert.rejects(() => registry.fetch('power', params), (e) => e.code === 'upstream');
    // After the failure threshold the breaker opens and short-circuits.
    await assert.rejects(() => registry.fetch('power', params), (e) => e.code === 'unavailable');
  } finally {
    ADAPTERS.power.request = original;
  }
});

test('ProviderRegistry: catalog and health expose no secrets', () => {
  const registry = new ProviderRegistry();
  const listed = registry.list();
  assert.ok(listed.length >= 4);
  const raw = JSON.stringify({ list: listed, health: registry.health() });
  assert.ok(!/api_key|API_KEY|SECRET/i.test(raw), 'no secret material in catalog/health');
});
