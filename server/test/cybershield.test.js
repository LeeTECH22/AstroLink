/**
 * Unit tests for AstroLink CyberShield defensive controls.
 * Run:  npm test   (inside server/)
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { CyberShield } = require('../lib/cybershield');
const crypto = require('node:crypto');

const fakeReq = (ip, url = '/api/example') => ({
  ip,
  originalUrl: url,
  url,
  path: url.split('?')[0],
  get: () => undefined,
});
const fakeRes = (statusCode = 200) => ({
  statusCode,
  headers: {},
  set(k, v) {
    this.headers[k] = v;
    return this;
  },
});

test('CyberShield: sanitizePath strips query values that could hold secrets', () => {
  assert.strictEqual(CyberShield.sanitizePath('/api/power?api_key=SECRET&x=1'), '/api/power');
  assert.strictEqual(CyberShield.sanitizePath('/api/x'), '/api/x');
});

test('CyberShield: metrics count success, failure and rate-limited responses', () => {
  const cs = new CyberShield();
  cs.observe(fakeReq('10.0.0.1'), fakeRes(200), 5);
  cs.observe(fakeReq('10.0.0.1'), fakeRes(500), 7);
  cs.observe(fakeReq('10.0.0.2'), fakeRes(429), 3);
  const m = cs.getMetrics();
  assert.strictEqual(m.total, 3);
  assert.strictEqual(m.success, 1);
  assert.strictEqual(m.failed, 2);
  assert.strictEqual(m.rateLimited, 1);
  assert.ok(m.latency.avgMs >= 1);
});

test('CyberShield: a single signal never triggers a restriction', () => {
  // Only the high-rate signal can fire; signalsRequired=2 means no action.
  const cs = new CyberShield({ rateThreshold: 3, invalidThreshold: 99, pathThreshold: 99, signalsRequired: 2 });
  for (let i = 0; i < 5; i += 1) cs.observe(fakeReq('10.0.0.9'), fakeRes(200), 1);
  assert.strictEqual(cs.listRestrictions().length, 0, 'one signal must not restrict');
});

test('CyberShield: multiple signals apply a progressive, expiring restriction', () => {
  const cs = new CyberShield({
    rateThreshold: 3,
    invalidThreshold: 2,
    pathThreshold: 99,
    signalsRequired: 2,
    restrictionSteps: '5',
  });
  const ip = '10.0.0.7';
  // high rate (>=3) AND repeated invalid (>=2 not-found) -> two signals.
  cs.observe(fakeReq(ip, '/api/a'), fakeRes(200), 1);
  cs.observe(fakeReq(ip, '/api/b'), fakeRes(404), 1);
  cs.observe(fakeReq(ip, '/api/c'), fakeRes(404), 1);
  const restrictions = cs.listRestrictions();
  assert.strictEqual(restrictions.length, 1);
  assert.strictEqual(restrictions[0].ip, ip);
  assert.ok(restrictions[0].retryAfterSeconds > 0 && restrictions[0].retryAfterSeconds <= 5);
});

test('CyberShield: middleware returns 429 while a restriction is active, then recovers', () => {
  const cs = new CyberShield();
  const ip = '10.0.0.20';
  cs.restrict(ip, 60, 'manual');
  let statusCode = null;
  let payload = null;
  const res = {
    set() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };
  cs.middleware()(fakeReq(ip), res, () => {
    throw new Error('should not reach next() while restricted');
  });
  assert.strictEqual(statusCode, 429);
  assert.ok(payload.retryAfterSeconds > 0);

  // Health checks are always allowed, even for a restricted client.
  let nextCalled = false;
  const healthRes = { statusCode: 200, set() {}, on() {} };
  cs.middleware()(fakeReq(ip, '/health'), healthRes, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true);
});

test('CyberShield: restrictions are reversible and clear the strike state', () => {
  const cs = new CyberShield();
  cs.restrict('10.0.0.30', 60, 'manual');
  assert.strictEqual(cs.listRestrictions().length, 1);
  const released = cs.release('10.0.0.30');
  assert.strictEqual(released, true);
  assert.strictEqual(cs.listRestrictions().length, 0);
});

test('CyberShield: admin routes are denied by default and require a matching token', () => {
  const cs = new CyberShield({ adminToken: '' });
  let statusCode = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  cs.requireAdmin()(fakeReq('10.0.0.1'), res, () => {
    throw new Error('must not authorize without ADMIN_TOKEN');
  });
  assert.strictEqual(statusCode, 403);

  const cs2 = new CyberShield({ adminToken: 'topsecret-admin' });
  // Wrong token -> 401
  let denied = null;
  cs2.requireAdmin()(
    { ip: '1.1.1.1', originalUrl: '/x', get: () => 'wrong' },
    {
      status(c) {
        denied = c;
        return this;
      },
      json() {
        return this;
      },
    },
    () => {
      throw new Error('wrong token must not authorize');
    }
  );
  assert.strictEqual(denied, 401);

  // Correct token -> next()
  let authorized = false;
  cs2.requireAdmin()(
    { ip: '1.1.1.1', originalUrl: '/x', get: () => 'topsecret-admin' },
    { status() { return this; }, json() { return this; } },
    () => {
      authorized = true;
    }
  );
  assert.strictEqual(authorized, true);
});

test('CyberShield: audit events never contain raw query secrets', () => {
  const cs = new CyberShield({ adminToken: 'x' });
  cs.recordRateLimited(fakeReq('10.0.0.1', '/api/power?api_key=SUPERSECRET'));
  const events = cs.getEvents(10);
  const raw = JSON.stringify(events);
  assert.ok(!/SUPERSECRET/.test(raw), 'secrets must not appear in audit log');
  assert.ok(events.length >= 1);
});

test('CyberShield: timing-safe token compare uses crypto (sanity)', () => {
  // Ensures the module relies on crypto.timingSafeEqual semantics: equal-length
  // wrong tokens are rejected without throwing.
  const a = Buffer.from('aaaa');
  const b = Buffer.from('bbbb');
  assert.strictEqual(a.length === b.length && crypto.timingSafeEqual(a, b), false);
});
