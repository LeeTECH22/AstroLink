# ASTROLINK — STAGE 1 TEST RESULTS

**Date:** 2026-11-14
**Environment:** Windows, Node v24.18.1, npm.
**Status key:** `Tested-Passed` · `Tested-Failed` · `Not tested` · `Blocked` · `Requires manual action`

> No secrets appear in the captured output below.

---

## 1. Test frameworks

| Layer | Framework | Command |
|---|---|---|
| Backend | Node built-in test runner (`node --test`) | `cd server && npm test` |
| Frontend | Vitest 5.1 + jsdom + Testing Library | `npm test` |

Added in Stage 1 (none existed before):
- `server/test/api.test.js` — spawns `server/index.js` on an isolated port, asserts API behaviour.
- `server/test/ratelimit.test.js` — spawns the server with `RATE_LIMIT_MAX=3` and asserts 429.
- `server/test/failover.test.js` — runs `server/__verify_failover.cjs`, asserts automatic key rotation.
- `src/utils/trendStats.test.ts`, `src/components/ErrorBanner.test.tsx`, `src/services/api.test.ts`.

---

## 2. Backend test results — `cd server && npm test`

```
✔ GET /health returns a safe status payload (1428.626ms)
✔ security headers are present and framework is not advertised (14.4453ms)
✔ CORS: disallowed origin is rejected with 403 (23.7135ms)
✔ CORS: configured origin is allowed (14.9299ms)
✔ unknown /api route returns a JSON 404 (53.7985ms)
✔ invalid coordinates are rejected (400) (12.7537ms)
✔ invalid date range is rejected (400) (8.8703ms)
✔ invalid date format is rejected (400) (8.2467ms)
✔ invalid rover is rejected (400) (10.8332ms)
✔ non-numeric exoplanet limit is rejected (400)
✔ invalid NASA image media_type is rejected (400)
✔ failover: a rate-limited first key is skipped and the next key is used
✔ failover: the pool walks through all three keys when two are exhausted (3453.7877ms)
✔ the 4th API request within the window returns 429 (1540.8173ms)

tests 14 | pass 14 | fail 0
```

**Status: Tested-Passed (14/14).**

### 2.1 Key-failover proof (ACCEPTANCE CRITERION #12)
`server/__verify_failover.cjs` stubs `axios` so the first `FAILOVER_FAIL_COUNT` distinct NASA keys return HTTP 429 and every subsequent key returns a clearly-labelled `FAILOVER-STUB` payload. Two runs were executed against the **3-key pool**:

- **Single rotation** (`FAILOVER_FAIL_COUNT=1`, default):
  ```
  🔑 NASA key pool ready: 3 key(s) with automatic failover.
  ⚠️  NASA key #1 unavailable (429); retrying with key #2.
  FAILOVER_RESULT {"status":200,"rotated":true,"distinctKeys":2,"failCount":1,"title":"FAILOVER-STUB","ok":true}
  ```
- **Full three-key walk** (`FAILOVER_FAIL_COUNT=2`):
  ```
  🔑 NASA key pool ready: 3 key(s) with automatic failover.
  ⚠️  NASA key #1 unavailable (429); retrying with key #2.
  ⚠️  NASA key #2 unavailable (429); retrying with key #3.
  FAILOVER_RESULT {"status":200,"rotated":true,"distinctKeys":3,"failCount":2,"title":"FAILOVER-STUB","ok":true}
  ```

**Keys exercised: 3 of 3** (configured pool size = 3). The request succeeded (200) after rotating through exhausted keys #1 and #2 to key #3. No credentials are revealed (only ordinal indices are logged).

> Note: the harness child process exits with a non-zero *libuv teardown* code on Windows after `process.exit()`; the machine-readable `FAILOVER_RESULT` line is emitted first and the Jest/`node:test` assertion (which parses that line) passes. This is a Windows teardown quirk, not a failover failure.

---

## 3. Frontend test results — `npm test`

```
 Test Files  3 passed (3)
      Tests  15 passed (15)
   Duration  7.00s
```

Coverage:
- `trendStats.test.ts` (10) — `isMissingValue`, `normalCdf`, `linearRegression` (exact recovery, guards), `mannKendall` (S = n(n-1)/2), `sensSlope`, `studentTQuantile`.
- `ErrorBanner.test.tsx` (1) — renders on `api-error` event (message + status).
- `api.test.ts` (3+) — `baseURL === '/api'`, `timeout === 30000`, serialized config contains **no** `NASA_API_KEY` / `api_key=` secret.

**Status: Tested-Passed (15/15).**

---

## 4. Build / type / lint evidence

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` (`tsc && vite build`) | **PASS** — `✓ built in 20.70s`; `dist/index.html 2.05 kB`, `index-*.css 48.11 kB`, `ui 438.17 kB`, `index 365.10 kB`, `utils 56.02 kB`, `vendor 43.81 kB`, `icons 15.92 kB` |
| TypeScript | `npx tsc --noEmit` | **PASS** (exit 0, no diagnostics) |
| Lint | `npx eslint .` | **PASS** — `23 problems (0 errors, 23 warnings)`; all warnings are pre-existing unused vars/imports |
| Backend syntax | `node --check server/index.js` | **PASS** (exit 0) |
| Backend audit | `cd server && npm audit` | **PASS** — `found 0 vulnerabilities` |
| Frontend audit | `npm audit` | **27 advisories remain** (documented risk, not auto-fixed) |

---

## 5. Live runtime verification

Server started (`🔑 NASA key pool ready: 3 key(s) with automatic failover`), then:

| Check | Request | Observed |
|---|---|---|
| Health | `GET /health` | `200` · `{"status":"ok","service":"astrolink-nasa-explorer-api","version":"1.0.0","timestamp":"...","uptimeSeconds":5,"services":{"nasaApiKeys":"configured","keyFailover":true}}` |
| Prod CORS | `GET /health` + `Origin: https://astro-link-xi.vercel.app` | `Access-Control-Allow-Origin: https://astro-link-xi.vercel.app` |
| Unknown origin | `Origin: https://evil.example.com` | `403` |
| Headers | any response | `X-Powered-By` absent; `X-Content-Type-Options: nosniff`; `X-Frame-Options: SAMEORIGIN` |
| Bad latitude | `GET /api/power?latitude=999` | `400` |
| Bad date | `GET /api/neo?start_date=bad` | `400` |
| Unknown route | `GET /api/does-not-exist` | `404` (JSON) |

**Status: Tested-Passed.**

---

## 6. Not tested / Blocked

- `Not tested` — Live NASA upstream success paths (depends on external availability and key quotas; tests use deterministic stubs).
- `Not tested` — Vercel deployment runtime (no deploy performed).
- `Blocked` — Committing the `.env` untracking (no auto-commit permitted; staged only).
- `Requires manual action` — NASA key rotation in the NASA portal (user will do this).

> Passing automated checks is **not** a penetration test. No pen test was performed.
