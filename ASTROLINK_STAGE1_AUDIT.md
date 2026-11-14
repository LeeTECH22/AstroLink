# ASTROLINK — STAGE 1 AUDIT (Implementation Verification Report)

**Scope:** Verify the work from the previous three development prompts before Stage 2.
**Method:** Static inspection of the actual repository files + live runtime checks. No code was rewritten blindly.
**Date:** 2026-11-14
**Verdict legend:** `CORRECT` · `INCORRECT` · `INCOMPLETE` · `WEAK` · `BROKEN` · `DUPLICATE` · `MISSING TEST`

> No secrets are reproduced in this document. `.env` contents are never printed.

---

## 1. Verified Architecture (as-is)

### Frontend
- React 19.2 + TypeScript 5.9 + Vite 7.1 SPA, Tailwind CSS **3.4.1 (pinned)**, `postcss.config.cjs` (v3 plugin style).
- Routing: `react-router-dom` v7 — `src/App.tsx` defines the app routes (existing pages preserved).
- Data layer: `react-query` v3 + `axios` (`src/services/api.ts`).
- Charts/maps: `chart.js` 4 + `react-chartjs-2`, `leaflet` + `react-leaflet`.
- Animation/icons: `framer-motion`, `lucide-react` (deep ESM icon imports).
- TypeScript config: `tsconfig.json` (strict, `noUnusedLocals: false`), `src/vite-env.d.ts` declares `VITE_API_URL`.

### Backend
- Express **4.21.2**, CommonJS, entry point [`server/index.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/index.js) — **the live server**.
- [`server/app.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/app.js) — **DUPLICATE / dead code**: not `require`d by anything (verified with a repo-wide search). It declares a wildcard `cors()` and mock routes. **Not executed.** Left in place to avoid destructive change (see "Requires manual action").

---

## 2. NASA API Integrations Inventory (`server/index.js`)

| Endpoint | Upstream | Key required | Uses `nasaGet` failover | Timeout | Input validation |
|---|---|---|---|---|---|
| `/api/apod` | `api.nasa.gov/planetary/apod` | yes | yes | 15 s | date format |
| `/api/mars-photos` | `api.nasa.gov/mars-photos` | yes | yes | 10–15 s | rover allowlist + sol digits |
| `/api/neo` | `api.nasa.gov/neo/rest/v1` | yes | yes | 15 s | date format/range |
| `/api/donki` | `api.nasa.gov/DONKI` | yes | yes | 15 s | date format |
| `/api/donki/notifications` | `api.nasa.gov/DONKI` | yes | yes | default | — |
| `/api/epic` | `api.nasa.gov/EPIC` | yes | yes | 10–15 s | date handling fixed |
| `/api/power` | `power.larc.nasa.gov` | no | n/a (no key) | 30 s | lat/lon/date/params |
| `/api/power/trend` | `power.larc.nasa.gov` | no | n/a (no key) | 30 s | lat/lon/date/params |
| `/api/eonet` | `eonet.gsfc.nasa.gov` | no | n/a | 15 s | status/limit/category |
| `/api/images` | `images-api.nasa.gov` | no | n/a | 15 s | q / media_type |
| `/api/techport` | `api.nasa.gov/techport` | yes | yes | 15 s | projectId |
| `/api/sbdb` | `ssd-api.jpl.nasa.gov` | no | n/a | 15 s | sstr |
| `/api/osdr` | `osdr.nasa.gov` | no | n/a | 15 s | studyId/page/size |
| `/api/earthdata` | `cmr.earthdata.nasa.gov` | no | n/a | 15 s | keyword/page_size |
| `/api/ads` | (none) | mock only | n/a | — | demo-labelled |
| `/api/exoplanets` | `exoplanetarchive.ipac.caltech.edu` | no | n/a | 20 s | limit |
| `/api/gibs` | `gibs.earthdata.nasa.gov` | no | n/a | 20 s | — |

**Result:** every **keyed** NASA endpoint now routes through the shared `nasaGet()` failover helper. All outbound calls have a timeout. The plain `axios.get` calls that remain are non-keyed public services (EONET, images, SBDB, OSDR, Earthdata CMR, Exoplanet Archive, GIBS) — correct.

---

## 3. Findings

### 3.1 Correctly implemented (do not redo)
- `CORRECT` Multi-key failover: [`nasaGet()`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/index.js#L197-L218) rotates on `401/403/429` + rate-limit message; proven deterministically by `server/test/failover.test.js`.
- `CORRECT` Key pool builder supports `NASA_API_KEY`, `NASA_API_KEY_2/3`, `NASA_API_KEYS` (comma list) and duplicate `NASA_API_KEY=` lines in `.env`.
- `CORRECT` Secret redaction in logs via `redactUrl()` (strips `api_key=`).
- `CORRECT` CORS explicit allowlist with rejection of unknown origins.
- `CORRECT` Demo/fallback payloads clearly labelled (`_meta.demo`, `source: 'demo-fallback'`).
- `CORRECT` `trendStats.ts` statistics (OLS, Mann-Kendall, Sen's slope, Student-t) implemented with no fabricated values (returns `null` when data is insufficient).

### 3.2 Incorrect implementations (fixed during Stage 1 / earlier prompts)
- `BROKEN → FIXED` EPIC endpoint built `/date/undefined` when NASA returned an unexpected shape. Now resolves the latest date defensively and returns a safe 502 when unavailable.
- `WEAK → FIXED` NEO `startDate`/`endDate` were declared inside `try`, causing `ReferenceError` in `catch` (earlier prompt).
- `WEAK → FIXED` `/api/mars-photos` and `/api/donki` bypassed the failover helper (direct `axios`). Now use `nasaGet`.
- `BROKEN → FIXED` Build failed: `tailwindcss@4` + v3-style `postcss.config.cjs`. Pinned to `^3.4.1`.

### 3.3 Incomplete implementations (addressed in Stage 1)
- `INCOMPLETE → DONE` No security headers, no rate limiting, no request-size cap, no cache headers → added (Helmet, `express-rate-limit`, `express.json({limit:'16kb'})`, timeouts, cache-control).
- `INCOMPLETE → DONE` Inconsistent error payloads → unified `sendError()` + JSON 404 + centralized handler.
- `INCOMPLETE → DONE` Invalid query input reached upstream → schema validation on every route.
- `INCOMPLETE → DONE` No health endpoint → added safe `GET /health`.

### 3.4 Security weaknesses
- `WEAK → FIXED` Hardcoded NASA key present in source (earlier prompt). Removed; key read only from `process.env`.
- `WEAK → FIXED` Sensitive key logging removed; only redacted URLs logged.
- `WEAK → FIXED` `.env` was **tracked in Git** (historical exposure). Now untracked (`git rm --cached`, local file preserved).
- `WEAK → MITIGATED` `src/services/api.ts` names "API key" strings in comments; verified these are **not secrets** (`NASA_DEMO_KEY = 'DEMO_KEY'` only).

### 3.5 Broken functionality
- `BROKEN → FIXED` Production build (see 3.2). Current build succeeds.
- `BROKEN → FIXED` `npm run lint` was non-functional under ESLint 9 (no flat config existed). Added `eslint.config.js`.

### 3.6 Duplicate code
- `DUPLICATE` [`server/app.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/app.js) duplicates route/mock logic and is never loaded. **Reference check (2026-11-14):** a repo-wide content search for `app.js` finds **no** importer — safe to delete, but **not removed** (destructive; needs user approval).
- `DUPLICATE` `__verify_trend_stats.mjs` (repo root) is a leftover harness. **Reference check:** no file references it — safe to delete, but **not removed** (needs user approval).
- `DUPLICATE` `express`, `cors`, `dotenv` appear in the **frontend** `dependencies` although only the backend uses them. Pre-existing; left unchanged to avoid dependency churn.

### 3.7 Missing tests (now added)
- `MISSING TEST → ADDED` Backend: `server/test/api.test.js`, `ratelimit.test.js`, `failover.test.js`.
- `MISSING TEST → ADDED` Frontend: `src/utils/trendStats.test.ts`, `src/components/ErrorBanner.test.tsx`, `src/services/api.test.ts`.

---

## 4. Unverifiable in this environment
- `NOT TESTED` Live 3rd-party NASA API success paths depend on external availability + valid keys; tests use local stubs to keep results deterministic.
- `NOT TESTED` Vercel deployment runtime (no deployment performed; see deployment-readiness report).

---

## 5. Summary Counts

| Category | Count |
|---|---|
| Correctly implemented | 6 areas |
| Fixed (incorrect/broken) | 4 |
| Completed (incomplete) | 4 |
| Security weaknesses fixed | 4 |
| Duplicate/dead code identified | 2 (1 left intentionally) |
| Test suites added | 6 files (13 backend + 15 frontend tests) |
