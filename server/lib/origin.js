'use strict';

/**
 * Centralized origin allowlist for the AstroLink backend.
 *
 * Every origin comparison goes through URL semantics (scheme + hostname + port)
 * so that a permitted origin is matched exactly and nothing else slips through
 * via substring tricks (e.g. `localhost.attacker.example` or
 * `astro-link-xi.vercel.app.attacker.example` are rejected automatically).
 *
 * Matching rules:
 *  - scheme, hostname (case-insensitive) and port must match exactly;
 *  - default ports are normalized (http→80, https→443);
 *  - trailing slashes, surrounding whitespace and trailing ports are stripped;
 *  - malformed / non-http(s) origins are rejected (never silently allowed);
 *  - requests WITHOUT an `Origin` header are allowed (curl, server-to-server,
 *    same-origin proxies) — this is a deliberate policy, see isAllowed().
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://astro-link-xi.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4173',
];

const DEFAULT_PORT = { 'http:': '80', 'https:': '443' };

/**
 * Parse a raw origin string into a normalized { protocol, hostname, port }
 * object, or return null when the value is not a valid http(s) origin.
 */
function parseOrigin(origin) {
  if (typeof origin !== 'string') return null;
  const trimmed = origin.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  // `new URL` sets port to '' for default ports; normalize to keep
  // `http://localhost:80` and `http://localhost` equivalent.
  const port = u.port || DEFAULT_PORT[u.protocol];
  return {
    protocol: u.protocol,
    hostname: u.hostname.toLowerCase(),
    port,
  };
}

/** Canonical origin key: `protocol//hostname:port`. */
function originKey(origin) {
  const parsed = parseOrigin(origin);
  if (!parsed) return null;
  return `${parsed.protocol}//${parsed.hostname}:${parsed.port}`;
}

/**
 * Build the allowlist Set from either a comma-separated env value or the
 * built-in defaults. Malformed entries are dropped (never converted into an
 * unrestricted policy). If ALLOWED_ORIGINS is set but every entry is malformed,
 * the allowlist is empty (deny-all for browser-origin requests) rather than
 * falling back to the defaults — an explicit misconfiguration must not become
 * "allow everything".
 */
function buildAllowlist(rawAllowedOrigins) {
  const entries =
    rawAllowedOrigins && String(rawAllowedOrigins).trim()
      ? String(rawAllowedOrigins)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : DEFAULT_ALLOWED_ORIGINS;

  const set = new Set();
  for (const entry of entries) {
    const key = originKey(entry);
    if (key) set.add(key);
  }
  return set;
}

/**
 * Decide whether a request `Origin` header value is permitted.
 *
 * A missing/null/empty Origin is allowed by deliberate policy: CORS is a
 * browser-enforced control, and non-browser callers (curl, monitoring,
 * server-to-server) never send one. The server-side check is defense-in-depth
 * against CSRF-style browser requests, which always carry an Origin header.
 */
function isAllowed(origin, allowlist) {
  if (!origin) return true;
  const key = originKey(origin);
  if (!key) return false;
  return allowlist.has(key);
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  parseOrigin,
  originKey,
  buildAllowlist,
  isAllowed,
};
