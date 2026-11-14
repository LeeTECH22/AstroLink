'use strict';

/**
 * Unit tests for the centralized origin validator (server/lib/origin.js).
 *
 * Covers: default allowlist, URL-semantic matching (scheme+host+port),
 * anti-subdomain-deception, malformed-origin rejection, env parsing with
 * whitespace/trailing-slash normalization, and the missing-Origin policy.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  DEFAULT_ALLOWED_ORIGINS,
  parseOrigin,
  originKey,
  buildAllowlist,
  isAllowed,
} = require('../lib/origin');

describe('parseOrigin', () => {
  test('normalizes http origin with explicit port', () => {
    assert.deepStrictEqual(parseOrigin('http://localhost:5174'), {
      protocol: 'http:',
      hostname: 'localhost',
      port: '5174',
    });
  });

  test('normalizes https origin with default port to 443', () => {
    assert.deepStrictEqual(parseOrigin('https://astro-link-xi.vercel.app'), {
      protocol: 'https:',
      hostname: 'astro-link-xi.vercel.app',
      port: '443',
    });
  });

  test('strips trailing slashes', () => {
    assert.deepStrictEqual(parseOrigin('http://localhost:5173////'), {
      protocol: 'http:',
      hostname: 'localhost',
      port: '5173',
    });
  });

  test('lowercases the hostname', () => {
    assert.strictEqual(parseOrigin('HTTPS://ASTRO-LINK-XI.VERCEL.APP').hostname, 'astro-link-xi.vercel.app');
  });

  test('rejects empty / whitespace values', () => {
    assert.strictEqual(parseOrigin(''), null);
    assert.strictEqual(parseOrigin('   '), null);
    assert.strictEqual(parseOrigin(null), null);
    assert.strictEqual(parseOrigin(undefined), null);
  });

  test('rejects non-http(s) schemes', () => {
    assert.strictEqual(parseOrigin('ftp://localhost:5173'), null);
    assert.strictEqual(parseOrigin('javascript:alert(1)'), null);
  });

  test('rejects malformed origins', () => {
    assert.strictEqual(parseOrigin('not-a-url'), null);
    assert.strictEqual(parseOrigin('http://'), null);
  });
});

describe('originKey', () => {
  test('produces a stable scheme//host:port key', () => {
    assert.strictEqual(originKey('http://localhost:5173'), 'http://localhost:5173');
    assert.strictEqual(originKey('http://localhost:5173/'), 'http://localhost:5173');
  });

  test('returns null for malformed input', () => {
    assert.strictEqual(originKey('garbage'), null);
  });
});

describe('buildAllowlist', () => {
  test('uses defaults when env is unset', () => {
    const list = buildAllowlist(undefined);
    for (const o of DEFAULT_ALLOWED_ORIGINS) {
      assert.ok(list.has(originKey(o)), `default origin ${o} present`);
    }
  });

  test('uses defaults when env is empty string', () => {
    const list = buildAllowlist('');
    assert.ok(list.has(originKey('http://localhost:5174')));
  });

  test('parses comma-separated values with whitespace', () => {
    const list = buildAllowlist(' http://localhost:5173 , https://astro-link-xi.vercel.app ');
    assert.ok(list.has(originKey('http://localhost:5173')));
    assert.ok(list.has(originKey('https://astro-link-xi.vercel.app')));
  });

  test('drops malformed entries instead of failing open', () => {
    const list = buildAllowlist('http://localhost:5174,not-a-url,https://example.com');
    assert.ok(list.has(originKey('http://localhost:5174')));
    assert.ok(list.has(originKey('https://example.com')));
    assert.strictEqual(list.size, 2);
  });

  test('does NOT fall back to defaults when env is set but empty of valid entries', () => {
    // An explicit ALLOWED_ORIGINS that contains only garbage must NOT become
    // "allow the defaults" — that would silently widen the allowlist.
    const list = buildAllowlist('garbage,also-garbage');
    assert.strictEqual(list.size, 0);
  });
});

describe('isAllowed', () => {
  const allowlist = buildAllowlist('http://localhost:5173,http://localhost:5174,https://astro-link-xi.vercel.app');

  test('allows requests with no Origin header (deliberate policy)', () => {
    assert.strictEqual(isAllowed(undefined, allowlist), true);
    assert.strictEqual(isAllowed('', allowlist), true);
    assert.strictEqual(isAllowed(null, allowlist), true);
  });

  test('accepts localhost:5173', () => {
    assert.strictEqual(isAllowed('http://localhost:5173', allowlist), true);
  });

  test('accepts localhost:5174 (the observed local dev port)', () => {
    assert.strictEqual(isAllowed('http://localhost:5174', allowlist), true);
  });

  test('accepts the exact production origin', () => {
    assert.strictEqual(isAllowed('https://astro-link-xi.vercel.app', allowlist), true);
  });

  test('accepts the production origin with a trailing slash', () => {
    assert.strictEqual(isAllowed('https://astro-link-xi.vercel.app/', allowlist), true);
  });

  test('rejects an unauthorized external origin', () => {
    assert.strictEqual(isAllowed('https://evil.example.com', allowlist), false);
  });

  test('rejects a deceptive localhost subdomain', () => {
    // Substring match would let this through; exact host match rejects it.
    assert.strictEqual(isAllowed('http://localhost.attacker.example', allowlist), false);
  });

  test('rejects a deceptive production subdomain', () => {
    assert.strictEqual(
      isAllowed('https://astro-link-xi.vercel.app.attacker.example', allowlist),
      false
    );
  });

  test('rejects a port that is not in the allowlist', () => {
    assert.strictEqual(isAllowed('http://localhost:9999', allowlist), false);
  });

  test('rejects a scheme mismatch (https vs http on same host)', () => {
    // localhost:5173 is allowed over http but not https.
    assert.strictEqual(isAllowed('https://localhost:5173', allowlist), false);
  });

  test('rejects malformed origins', () => {
    assert.strictEqual(isAllowed('not-a-url', allowlist), false);
  });
});
