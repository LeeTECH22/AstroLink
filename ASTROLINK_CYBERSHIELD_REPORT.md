# ASTROLINK — CYBERSHIELD REPORT

Internal version: V1.0.0 · Product: AstroLink

CyberShield is the defensive security subsystem. It **extends** the Stage 1 foundation rather than
replacing it. It is an in-process, memory-only control (no Redis, no paid infrastructure).

Files: `server/lib/cybershield.js`, `server/index.js`, `src/pages/CyberShield.tsx`,
tests `server/test/cybershield.test.js` + `platform.test.js`.

---

## A. Application and API protection (inherited from Stage 1 + extended)

| Control | Status |
|---|---|
| Server-side secrets only (`process.env`, never `VITE_*`) | Stage 1 ✅ |
| Strict CORS allowlist (unknown origin → 403) | Stage 1 ✅ (tested) |
| Helmet + security headers, `x-powered-by` disabled | Stage 1 ✅ (tested) |
| Content-Security-Policy via Helmet | ✅ |
| Rate limiting: 120/min general, 20/min expensive | Stage 1 ✅ (tested) |
| Request-size limits (16 kB JSON body) | Stage 1 ✅ |
| Schema validation on every route (400 on bad input) | Stage 1 ✅ (tested) |
| Admin authorization (token, timing-safe compare) | ✅ new |
| Safe error responses (`sendError`, no stack leak) | Stage 1 ✅ |
| SSRF protection | External fetches are fixed-host adapters with validated params; no user-supplied URLs are fetched ✅ |
| XSS / injection prevention | React escaping + parameter regex validation; audit log sanitized ✅ |

## B. Bot and abusive traffic management

Designed to **never** permanently block on a single signal and to avoid assuming every high-volume
user is a bot.

**Signals (each independent):**
- `high-rate` — request count ≥ `ABUSE_RATE_THRESHOLD` (default 90) in the window
- `repeated-invalid` — non-429 4xx count ≥ `ABUSE_INVALID_THRESHOLD` (default 12)
- `endpoint-scan` — distinct sanitized paths ≥ `ABUSE_PATH_THRESHOLD` (default 8)

**Decision rule:** at least `ABUSE_SIGNALS_REQUIRED` (default **2**) signals must co-occur.

**Response:** a progressive, capped, **auto-expiring** temporary restriction with increasing
duration steps `ABUSE_RESTRICTION_STEPS = 15,30,60,120,300` seconds. While active the middleware
returns **429** with a `Retry-After` header; access resumes automatically when it expires.

**Trusted traffic:** `/health` and any IP in `TRUSTED_IPS` are always allowed and excluded from
abuse counting.

**Admin:** restrictions can be reviewed and **released** (reversible) by an admin with a matching
`x-admin-token`.

**Honesty:** this is a defensive control based on implemented, tested signals — it is **not** claimed
to be "advanced bot detection".

## C. Heavy-traffic and resilience

| Control | Value |
|---|---|
| Caching | In-memory TtlCache with per-provider TTL (see data fusion report) |
| Cache-control headers | Stage 1 (public/private max-age policies) |
| Request timeout | 45 s `res.setTimeout` → 503 |
| Circuit breakers | Per provider (open after 3 failures, 30 s open) |
| Bounded retries | 1 + up to 2 retries on 429/5xx |
| Concurrency / amplification | API rate limiters + CyberShield throttle bound request amplification |
| Graceful degradation | Typed provider errors; deterministic analysis continues |
| Resource monitoring | `providerFailures`, latency avg/p50/p95/max in metrics |

No Redis or paid infrastructure was added; the in-memory alternative is documented as per-instance
(resets on restart).

## D. Security monitoring dashboard

`src/pages/CyberShield.tsx` displays **only real, available metrics**:
total, successful, failed, rate-limited, suspicious, currently-restricted requests; provider
failures; request latency (avg / p50 / p95 / max); per-status counts; API health; active
restrictions; and recent sanitized security events. Admin actions (restrict/release) are available
only with a valid token.

## E. Audit log

- Ring buffer (max 250 events).
- Sanitized: `sanitizePath()` strips the query string entirely and masks any `api_key=`/`key=`/`token=`.
- Access-controlled: served only via admin endpoints.

## F. Endpoints

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/cybershield/metrics` | admin | aggregate metrics |
| `GET /api/cybershield/events` | admin | sanitized recent events |
| `GET /api/cybershield/restrictions` | admin | active restrictions |
| `POST /api/cybershield/restrictions` | admin | restrict / release a client |

Deny-by-default: if `ADMIN_TOKEN` is unset, all admin routes return **403**.

## G. Verification evidence

`server/test/cybershield.test.js` (all PASS):
- `sanitizePath strips query values that could hold secrets`
- `metrics count success, failure and rate-limited responses`
- `a single signal never triggers a restriction`
- `multiple signals apply a progressive, expiring restriction`
- `middleware returns 429 while a restriction is active, then recovers`
- `restrictions are reversible and clear the strike state`
- `admin routes are denied by default and require a matching token`
- `audit events never contain raw query secrets`
- `timing-safe token compare uses crypto (sanity)`

`server/test/platform.test.js` (all PASS):
- `CyberShield admin endpoints reject missing and wrong tokens`
- `CyberShield admin can read metrics, restrict and release a client`
- `CyberShield audit log is sanitized (no query secrets)`

Live: `GET /api/cybershield/metrics` without a token → **403**. Rate-limit test: the (N+1)th request
in the window returns **429**.

## H. Non-claims

- CyberShield does **not** provide perfect security and is not a substitute for a professional
  penetration test. All checks here are author-run automated tests in the project's own environment.
- It is **not** a "machine-learning bot detector"; detection is rule-based on signals that were
  implemented and tested.

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Verified this session on Windows (backend `:5001`, frontend `:5173`, app version 1.0.0).

**Defensive UI posture (verified)**
- The public CyberShield page renders **only a defensive overview**: **no admin token entry** and **no admin menu** in the public UI. A frontend test asserts this.
- Admin endpoints remain **server-side**, **deny-by-default**, with **timing-safe token comparison**; unauthenticated admin requests → **403**.

**Security controls verified live (freshly restarted backend)**
| Check | Result |
|---|---|
| Allowlisted CORS origin | 200 with `Access-Control-Allow-Origin` |
| Disallowed origin | **403** |
| Unknown `/api` route | JSON **404** |
| Invalid query (`latitude=999`) | **400** |
| Security headers | `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `x-powered-by` absent |

**Defect fixed this session — secret redaction**
- The NEO response previously echoed the server NASA `api_key` in `links.next`/`prev`. Fixed with a recursive `redactDeep()` helper that scrubs passthrough responses; verified `api_key=***`.

**Dependency audit**
- Backend `npm audit` → **0 vulnerabilities**.
- Frontend `npm audit` → **27 advisories (11 production-relevant)**, deferred this session.

**Test & build evidence**
- Backend `node --test` → **45 pass, 0 fail** (7 files, incl. `cybershield.test.js`, `platform.test.js`); 3 new regression tests added this session.
- Frontend `npm run test` → **39 pass, 0 fail** (4 files); `tsc --noEmit` → 0 errors; `npm run build` → SUCCESS.

CyberShield state remains in-process/per-instance. No deployment was performed this session; no secrets printed.
