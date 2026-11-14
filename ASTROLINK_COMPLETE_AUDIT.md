# ASTROLINK — COMPLETE SYSTEM AUDIT (Phase 0)

Internal version: **V1.0.0** (never displayed in the public UI) · Product: **AstroLink**
Challenge: *Be An Earth System Trend Detective!* (NASA Space Apps Challenge 2026)
Audit date: 2026-11-14 · Auditor: author-run engineering acceptance (read-only discovery).

> This document is discovery only. No code was modified to produce it.

---

## 1. Repository inventory

```
AstroLink/
├── src/                         # React 19 + TypeScript 5.9 + Vite 7 frontend
│   ├── components/              # Navbar, ErrorBanner, ErrorMessage, LoadingSpinner (+test)
│   ├── hooks/                   # useRetryQuery.ts  (UNUSED — see §8)
│   ├── pages/                   # 20 routed pages + platform.test.tsx
│   ├── services/                # api.ts (+api.test.ts) — single API layer
│   ├── test/                    # vitest setup
│   ├── types/                   # index.ts, lucide-compat.d.ts
│   └── utils/                   # trendStats.ts (+test), chartHelpers.ts
├── server/                      # Express 4 backend (CommonJS)
│   ├── index.js                 # live entry point (~1020 lines)
│   ├── app.js                   # ORPHANED dead code (see §8)
│   ├── lib/                     # providers.js, ai.js, cybershield.js
│   ├── test/                    # 7 node:test files (42 tests)
│   └── __verify_failover.cjs    # manual failover harness
├── __verify_trend_stats.mjs     # manual stats harness (see §8)
├── dist/                        # production build output (git-ignored)
├── *.md                         # documentation (see §9)
└── package.json, vite.config.ts, tailwind.config.js, eslint.config.js, tsconfig*.json
```

## 2. Technology stack (verified from manifests/lockfiles)

| Layer | Stack |
|---|---|
| Frontend | React ^19.2, TypeScript ^5.9, Vite ^7.1.12, Tailwind ^3.4.1 (pinned), react-router-dom ^7.18.5, react-query ^3.39, Chart.js ^4.5, leaflet ^1.9.4 + react-leaflet ^5, framer-motion ^12, lucide-react ^0.546 |
| Backend | Express ^4.18.2 (server), helmet ^8.3, express-rate-limit ^8.7.4, axios ^1.6.2, cors ^2.8.5, dotenv ^16.3 |
| Tests | Frontend: vitest ^5.1 + jsdom + @testing-library. Backend: `node --test` (Node v24.18.1) |
| Lint | ESLint ^9.38 (flat config `eslint.config.js`) |

**Manifest note:** the root `package.json` also declares `express`, `cors`, `dotenv` which the
frontend build does not use (leftover from the original single-package layout). The backend has its
own `server/package.json`. This is a hygiene issue, not a functional defect (see §8).

## 3. Frontend routes (from `src/App.tsx`) — 20

`/` Dashboard · `/apod` · `/mars-rover` · `/neo` · `/space-weather` · `/earth-images` ·
`/natural-events` · `/image-library` · `/power-data` · `/earth-trends` · `/intelligence` ·
`/data-explorer` · `/geospatial` · `/cybershield` · `/techport` · `/exoplanets` · `/small-bodies` ·
`/earthdata-search` · `/astrophysics-data` · `/about`

Navigation: `src/components/Navbar.tsx` declares 20 items matching the routes (desktop + mobile).

## 4. Backend endpoints (from `server/index.js`) — 28 registrations

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | safe status; no secrets |
| GET | `/api/apod` | date validation |
| GET | `/api/mars-photos` | rover/sol validation |
| GET | `/api/neo` | date range validation |
| GET | `/api/donki` | type validation |
| GET | `/api/donki/notifications` | — |
| GET | `/api/epic` | date validation (undefined bug fixed) |
| GET | `/api/eonet` | category/limit validation |
| GET | `/api/images` | q/media_type validation |
| GET | `/api/power` | expensive limiter; lat/lon/date/params validation |
| GET | `/api/power/trend` | expensive limiter; monthly multi-year; year/params validation |
| GET | `/api/techport` | projectId validation; **demo fallback `_meta`** |
| GET | `/api/sbdb` | sstr validation |
| GET | `/api/osdr` | studyId/page/size validation |
| GET | `/api/earthdata` | keyword validation |
| GET | `/api/ads` | q/rows validation |
| GET | `/api/exoplanets` | limit validation |
| GET | `/api/gibs` | imagery capabilities |
| GET | `/api/providers` | provider catalog + health + cache |
| GET | `/api/data/:provider` | unified provider fetch; typed 400/404/503/502 |
| GET | `/api/ai/status` | AI availability (no secrets) |
| POST | `/api/ai/explain` | grounded narration; validation |
| GET | `/api/cybershield/metrics` | admin |
| GET | `/api/cybershield/events` | admin |
| GET | `/api/cybershield/restrictions` | admin |
| POST | `/api/cybershield/restrictions` | admin |
| DELETE | `/api/cybershield/restrictions/:ip` | admin |
| use | `/api` (404) | JSON 404 |

Middleware order: helmet → cors → json(16kb) → 45 s timeout → cache headers → CyberShield → rate
limiters → routes → JSON 404 → centralized error handler. `trust proxy = 1`; `x-powered-by`
disabled.

## 5. Environment variable usage

| Variable | Where | Required | Notes |
|---|---|---|---|
| `NASA_API_KEY` (+ `_2`, `_3`, `NASA_API_KEYS`) | backend | recommended | multi-key failover; falls back to `DEMO_KEY` |
| `PORT` | backend | no | default 5001 |
| `ALLOWED_ORIGINS` | backend | recommended | default includes the Vercel origin + localhost |
| `APP_VERSION` | backend | no | default `1.0.0` (health only) |
| `ADMIN_TOKEN` | backend | optional | CyberShield admin (deny-by-default when unset) |
| `FIRMS_MAP_KEY` | backend | optional | FIRMS provider |
| `AI_PROVIDER`, `OPENAI_*`, `ANTHROPIC_*`, `AI_MAX_TOKENS` | backend | optional | AI narration |
| `TRUSTED_IPS`, `ABUSE_*`, `RATE_LIMIT_MAX`, `EXPENSIVE_RATE_LIMIT_MAX` | backend | optional | tuning |
| `VITE_API_URL` | frontend | prod | backend base URL; empty → `/api` |

`.env.example` documents all of the above. The frontend never holds a private key (uses NASA public
`DEMO_KEY` for client-side fallbacks only).

## 6. External API dependencies

NASA: POWER, APOD, Mars Rover, NeoWs, DONKI, EPIC, EONET, Image Library, TechPort, SBDB, OSDR,
CMR/Earthdata, GIBS, ADS, Exoplanet Archive. Non-NASA: JPL SSD (SBDB), Caltech Exoplanet Archive
(TAP), OpenStreetMap basemap tiles (map only; all Leaflet maps now use OpenStreetMap — no CARTO and
no credentials required), optional OpenAI/Anthropic (AI narration only).

## 7. Automated tests (existing)

- Frontend `src/**/*.test.tsx?`: `trendStats.test.ts`, `platform.test.tsx`, `api.test.ts`,
  `ErrorBanner.test.tsx`.
- Backend `server/test/`: `api`, `ratelimit`, `failover`, `providers`, `platform`, `ai`,
  `cybershield`.

## 8. Incomplete / duplicate / unused / risk findings

| Finding | Severity | Detail |
|---|---|---|
| `server/app.js` orphaned | Low | Not imported by any code (only docs). Preserved per rules. |
| `__verify_trend_stats.mjs` | Low | Manual harness; unreferenced by app/tests. Preserved. |
| `server/__verify_failover.cjs` | Low | Manual failover harness used by a test/verification. |
| `src/hooks/useRetryQuery.ts` unused | Low | Defined but not imported anywhere. Preserved. |
| Root `package.json` declares unused `express/cors/dotenv` | Low | Hygiene; not used by frontend build. |
| `start.bat` prints wrong ports (3000/5000) | Low | Should read 5173/5001. |
| TechPort demo fallback | Medium | Returns labelled `_meta` demo data when upstream is empty/errors — must never be shown as live NASA data. |
| Exposed NASA key in git history (`bdd07b8`) | **High** | Owner must rotate; not rewritten here. |
| 7 dev-only npm advisories (ESLint chain) | Low | Documented; require breaking upgrade. |
| CSP disabled in backend helmet | Low | Intended for a JSON API; frontend host owns CSP. |
| `sourcemap: true` in production build | Low | Emits source maps; consider disabling. |
| Memory-only state (cache/limits/CyberShield) | Low | Per-instance; resets on restart. |

No duplicate implementations of the trend statistics were found (single `trendStats.ts`). No mock
data replaces working functionality (fallbacks are labelled and only used when the backend/proxy is
unreachable).

## 9. Documentation present

`README.md`, `SETUP.md`, `GITHUB_SETUP.md`, `ASTROLINK_STAGE1_*.md` (6), `ASTROLINK_FINAL_*` +
scientific/AI/fusion/ML/CyberShield/deployment/hackathon docs (10).

## 10. Git status (at audit time)

Branch `main`. `.env` staged for deletion (`D`), many modifications staged/unstaged, no new commit.
Nothing pushed. Head: `4db7c3d`.

## 11. Can frontend and backend run independently?

- Frontend alone: yes (`npm run dev`) → uses `/api` proxy; if backend is down, client-side `DEMO_KEY`
  fallbacks keep read-only pages functional.
- Backend alone: yes (`cd server && npm start`) → serves JSON on `:5001`; `/health` works with no
  frontend.
They are also designed to run together (`npm run dev:full`).

## 12. Exact commands to run locally

```bash
# 1) install everything
npm run install:all

# 2) run both (frontend :5173, backend :5001, Vite proxies /api)
npm run dev:full

# or run separately
npm run dev                 # frontend  → http://localhost:5173
npm --prefix server start   # backend   → http://localhost:5001

# checks
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
npm --prefix server test
npm audit --omit=dev
```

Health check: `http://localhost:5001/health`.

---

**Phase 0 outcome:** repository mapped; no blockers to proceeding with verification. Findings in §8
are carried into the repair and readiness phases. No files were modified during discovery.

---

# AUDIT COMPLETION — Phases 0→8 (2026-11-14)

All phases of the acceptance task were executed. Companion documents hold the detailed evidence:

| Report | Contents |
|--------|----------|
| [ASTROLINK_REPAIR_REPORT.md](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/ASTROLINK_REPAIR_REPORT.md) | Findings disposition (repaired / deferred / blocked / non-issue) |
| [ASTROLINK_LOCAL_ACCEPTANCE.md](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/ASTROLINK_LOCAL_ACCEPTANCE.md) | Test battery + live HTTP evidence (localhost scope) |
| [ASTROLINK_PRODUCTION_READINESS.md](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/ASTROLINK_PRODUCTION_READINESS.md) | Render/Vercel settings + required env vars |
| [ASTROLINK_UNIQUENESS_AND_IMPACT.md](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/ASTROLINK_UNIQUENESS_AND_IMPACT.md) | 8 differentiators + strongest user problem |

## Verification results (Phase 1–7)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| Frontend tests (`vitest run`) | **40 / 40 pass** (4 files) |
| Backend tests (`node --test`) | **42 / 42 pass, 0 fail** (7 files) |
| Production build (`npm run build`) | PASS |
| Lint (`npm run lint`) | 0 errors / 23 pre-existing warnings |
| Root prod audit (`npm audit --omit=dev`) | 0 vulnerabilities |
| Backend audit (`npm audit`, server) | 0 vulnerabilities |
| Live HTTP battery (backend :5001) | 26 routes/checks — real NASA data on POWER, EONET, NEO, EPIC, Earthdata, GIBS, TechPort, SBDB, OSDR, ADS, Exoplanets, Images |
| Secrets in build/logs | none (request logs redact `api_key=***`) |

## Repairs applied this cycle
- `start.bat` banner corrected from `:3000`/`:5000` to the real `:5173`/`:5001`.

## Honest limitations (BLOCKED, not passed)
- Exposed key in history `bdd07b8` → **must be rotated by owner** (no history rewrite performed).
- FIRMS live data → needs `FIRMS_MAP_KEY`.
- AI generation path → needs an AI provider key (deterministic path verified).
- Production deployment → not performed (Rule 13).
- Upstream NASA outages observed: APOD (500, labelled fallback), Mars Photos (404 → 502), DONKI flares (404 → 502).

**Stopped before GitHub publication and deployment, per the Final Execution Rule.**

---

## Session Update — 2026-11-14 (Engineering Repair & Verification)

This section supersedes the relevant counts in §7/§8 above with this session's re-verified results. Prior content is retained unchanged (the §6 dependency correction above was applied in place).

**Verification results (this session)**

| Check | Result |
|---|---|
| Backend `node --test` (in `server/`) | **45 / 45 pass, 0 fail** (7 files) — 3 new regression tests added |
| Frontend `npm run test` (vitest) | **39 / 39 pass** across 4 files, 0 fail |
| `npm run build` (`tsc && vite build`) | **SUCCESS** — 973 modules transformed; source maps **disabled** (addresses the §8 `sourcemap: true` finding) |
| `npx tsc --noEmit` | **0 errors** |
| `npm run lint` (ESLint 9) | **0 errors / 24 warnings** (all pre-existing `@typescript-eslint/no-unused-vars`) |
| Backend `npm audit` | **0 vulnerabilities** |
| Frontend `npm audit` | **27 advisories (11 production-relevant)** — deferred, no forced upgrades |

**Defects fixed this session (root cause → fix)**

| # | Defect | Root cause | Fix |
|---|---|---|---|
| 1 | `/api/donki` returned **HTTP 502** for `type=cme`/`all` | `nasaGet()` resolves the **full** axios response (circular `req`/`res`/`config`); the DONKI route passed that object into `res.json()` → "Converting circular structure to JSON" → 502 | `fetchDonkiProduct` now returns `response.data`; CME/GST/FLR fetched concurrently via `Promise.all` |
| 2 | Exoplanets fell back to demo data | TAP query used SQL `LIMIT n`; the Archive's Oracle/ADQL backend rejects it (ORA-00933 → HTTP 400 → demo fallback) | switched to ADQL `select top n` |
| 3 | NEO response leaked the server NASA key in `links.next/prev` | upstream response passed through unmodified | added recursive `redactDeep()` and scrubbed the passthrough |
| 4 | `.btn-secondary` was invisible | global `!important` rule forced `.text-gray-700` to a light `#e5e7eb` over a white button | restyled `.btn-secondary` in `src/index.css` (bg-white/10, text-white, border-white/20); also fixed Navbar light-on-light + horizontal overflow (desktop nav moved to `xl`, bar darkened), Dashboard CTA card, ErrorBanner colors, and leftover light scrollbar/leaflet colors |
| 5 | Crash guards | EONET polygon `coordinates[1].toFixed()` threw and blanked the page; SBDB string numerics rendered "NaN"; DataExplorer lacked a catalog error state | `toLatLng()` helper in NaturalEvents (map + list); `fmt()` helper in SmallBodies → "N/A"; DataExplorer provider-catalog error state with Retry button |

**Map tiles (correction):** all Leaflet maps (NaturalEvents, Geospatial, EarthTrends) use **OpenStreetMap** tiles with attribution; **no CARTO and no credentials required**.

**Security controls verified live:** allowlisted CORS origin → 200 with `Access-Control-Allow-Origin`; disallowed origin → 403; unknown `/api` route → JSON 404; invalid query (`latitude=999`) → 400; headers present (`x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `x-powered-by` absent).

**AI:** deterministic-only mode confirmed; no provider credentials configured in this environment, so provider-backed generation is **BLOCKED** on external credentials. The deterministic fallback is honest and never claims to be a live model.

**Git:** no commit, push, deploy, or history rewrite was performed; no secrets printed.
