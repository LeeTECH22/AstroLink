# ASTROLINK — STAGE 1 SECURITY REPORT

**Date:** 2026-11-14
**Scope:** Secrets & environment security, backend hardening, API reliability protections.
**Evidence:** static source review + live HTTP checks (recorded in `ASTROLINK_STAGE1_TEST_RESULTS.md`).

> No secrets are printed in this document. Environment file contents are never reproduced.

---

## 1. Status key
`Implemented` · `Tested-Passed` · `Tested-Failed` · `Not tested` · `Blocked` · `Requires manual action`

---

## 2. Secrets & Environment Security (TASK 2)

| # | Requirement | Status | Evidence / file |
|---|---|---|---|
| 1 | Remove hardcoded secrets from source | Implemented · Tested-Passed | `server/index.js` reads `process.env`; grep of `src/` and `server/` finds no literal key |
| 2 | Secrets read only from server-side env | Implemented · Tested-Passed | `buildNasaKeyPool()` uses `process.env` + `.env` file only |
| 3 | Secrets never bundled into frontend JS | Implemented · Tested-Passed | `dist/` scan: only the public string `DEMO_KEY`; no `NASA_API_KEY` value |
| 4 | Remove sensitive key logging | Implemented · Tested-Passed | `redactUrl()` masks `api_key=`; startup prints only counts/mode |
| 5 | Error messages do not expose secrets | Implemented · Tested-Passed | `sendError()` returns generic messages; `/health` safe payload test |
| 6 | `.gitignore` covers env files | Implemented · Verified | [`.gitignore`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/.gitignore) ignores `.env`, `.env.*.local`, `server/.env` |
| 7 | Safe `.env.example` (placeholders only) | Implemented · Verified | [`.env.example`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/.env.example) — `YOUR_NASA_API_KEY_HERE` |
| 8 | Local `.env` present but untracked | Implemented · Verified | `git status` shows `D .env` staged (local file retained) |
| 9 | Inspect tracked env files | Done · Requires manual action | only `.env.example` tracked; `.env` removal is **staged, not committed** |
| 10 | Deployment variables documented | Implemented | `.env.example` + `ASTROLINK_STAGE1_DEPLOYMENT_READINESS.md` |

### 2.1 Historical exposure (IMPORTANT)
- Git history contains **exactly one** commit touching `.env`: `bdd07b8` ("Initial commit"). That commit tracked the environment file, so any key present at that time **must be treated as compromised**.
- **Recommendation (manual, after key rotation):** rotate the NASA key first, then optionally scrub history with `git filter-repo` (or BFG). **Do NOT force-push automatically.** This Stage does not rewrite history.

### 2.2 In-bundle review (`dist/`)
- `api_key=`, `NASA_API_KEY` textual hits in `dist/assets/index-*.js` trace **only** to:
  - the comment `client-side fallbacks use NASA's public DEMO_KEY only` and
  - the public literal `DEMO_KEY` used in browser fallback calls.
- These are **not secrets** (NASA's public demo key; documented `.env.example` warning: never put a private key in a `VITE_*` variable).

---

## 3. Backend Hardening (TASK 3)

| Control | Status | Implementation |
|---|---|---|
| Security headers (Helmet) | Implemented · Tested-Passed | `helmet({ contentSecurityPolicy:false, crossOriginResourcePolicy:{policy:'cross-origin'} })` |
| Framework banner removed | Implemented · Tested-Passed | `app.disable('x-powered-by')`; live `X-Powered-By` absent |
| Strict CORS allowlist | Implemented · Tested-Passed | explicit list; unknown origin → 403 |
| Rate limiting (general) | Implemented · Tested-Passed | `apiLimiter` 120/min, `draft-7` headers, 429 body |
| Rate limiting (expensive) | Implemented | `expensiveLimiter` 20/min on `/api/power`, `/api/power/trend` |
| Request-size limit | Implemented | `express.json({ limit: '16kb' })` |
| Request timeout | Implemented | `res.setTimeout(45000)` → 503 JSON |
| Schema/type input validation | Implemented · Tested-Passed | lat/lon/date/format/limit checks on every route → 400 |
| Safe error handling | Implemented · Tested-Passed | `sendError()`, generic messages, JSON 404 |
| Secure HTTP methods | Implemented | CORS `methods: ['GET','POST','OPTIONS']`; routes are GET |
| Cache headers | Implemented | `public, max-age=60, stale-while-revalidate=300` for GET `/api/*`, else `no-store` |
| Safe logging | Implemented | redacted URLs; no body/key logging |
| Dependency review | Implemented | backend `npm audit` → **0 vulnerabilities** after `npm audit fix` |

**New dependencies introduced in Stage 1 (justification):** `helmet` and `express-rate-limit` are the standard, audited Express controls for headers and throttling; both are widely used and add no transitive risk (backend audit clean).

**Deliberately NOT added:** authentication / JWT. This is a public read-only data explorer and does not require them.

---

## 4. API & NASA Reliability / SSRF (TASK 4)

| Concern | Status | Notes |
|---|---|---|
| Excessive repeated requests | Mitigated | both rate limiters |
| Uncontrolled external URL fetching | Not applicable · Verified | all upstream URLs are hardcoded constants |
| SSRF | Not applicable · Verified | **no endpoint accepts a caller-supplied URL**; users pass only coordinates/dates/ids which are validated and never used as a URL host |
| Key exposure via query strings / logs | Mitigated · Tested-Passed | `redactUrl()`; no key values logged |
| Consistent error format | Implemented | `{ error, details? }` |
| Retry where appropriate | Implemented · Tested-Passed | `nasaGet` key failover |
| Response validation | Implemented | defensive handling (e.g. EPIC date shape) |
| Demo data labelling | Implemented · Verified | `_meta.demo = true`; never presented as observations |
| Scientific metadata preserved | Implemented | POWER params/units + retrieval metadata retained |

---

## 5. Remaining security risks (documented, not fixed in Stage 1)

| Risk | Severity | Reason not fixed |
|---|---|---|
| Frontend `npm audit`: 27 advisories (rollup, shell-quote, vite, zod, etc.) | Medium | Fixing requires major/breaking upgrades — out of Stage 1 scope (see §6) |
| `axios` advisory range (dev/build transitive) | Low | Pulls in major upgrades of `vite`/toolchain |
| `server/app.js` dead code left in tree | Low | Removal is destructive; needs user approval |
| Git history still contains the old `.env` blob | High (until rotated) | Requires key rotation first; history rewrite is manual |
| React 19 + `react-query@3` peer conflict | Low | Installed with `--legacy-peer-deps`; functional |

**These are NOT claimed as resolved.** No penetration test was performed; passing automated checks is not equivalent to a pen test.

---

## 6. Frontend dependency advisory analysis (27 advisories)

Source: `npm audit --json` (all) and `npm audit --omit=dev --json` (production-only), run 2026-11-14.

### 6.1 Severity totals
| Scope | Total | Low | Moderate | High | Critical |
|---|---|---|---|---|---|
| All (incl. dev/build) | **27** | 1 | 5 | 18 | 3 |
| Production-only (`--omit=dev`) | **11** | 0 | 2 | 8 | 1 |

### 6.2 Direct (first-party) dependencies affected
| Package | Installed | Severity | Scope | Notes |
|---|---|---|---|---|
| `axios` | 1.12.2 | high | production (used in `src/services/api.ts`) | HTTP client; advisory range `1.0.0 – 1.19.0` |
| `react-router-dom` | 7.9.4 | high | production | runtime routing |
| `postcss` | 8.5.6 | high | build/dev | toolchain only |
| `vite` | 7.1.12 | high | build/dev | dev server/build only |
| `concurrently` | 9.2.1 | critical (via `shell-quote`) | dev | dev script runner only |

### 6.3 Transitive dependencies (by dependency path)
| Package | Severity | Pulled in by | Prod relevance |
|---|---|---|---|
| `shell-quote` | critical | `concurrently` (dev) | dev only |
| `proxy-addr` | critical | `express` (unused in browser bundle) | server-side pkg, not run by the SPA |
| `body-parser`, `path-to-regexp`, `qs` | high/moderate | `express` (unused in browser bundle) | server-side pkg |
| `react-router` | high | `react-router-dom` | production |
| `rollup`, `source-map-js`, `nanoid`, `js-yaml`, `browserslist`, `baseline-browser-mapping`, `@babel/core`, `ajv`, `minimatch`, `brace-expansion`, `zod`, `@humanfs/node` | high/moderate/low | Vite/PostCSS/Babel toolchain | build/dev only |
| `form-data`, `follow-redirects` | high/moderate | `axios` | production (node transport) |

> `express`, `cors`, `dotenv` are listed in the **frontend** `package.json` `dependencies` but are never used by the browser bundle (pre-existing). This is why server-side advisories (`body-parser`, `qs`, `proxy-addr`, `path-to-regexp`) appear in the production-only audit. Removing them from frontend deps would reduce the production-only count without any code change to the SPA — **recommended, not performed** (avoids dependency churn in Stage 1).

### 6.4 Fix availability & breaking-change risk (RECOMMENDATIONS ONLY — nothing auto-upgraded)
- `npm audit` reports `fixAvailable: true` (semver-compatible) for **all** listed packages, so a non-breaking `npm audit fix` path exists.
- **Recommended safe actions (manual, review first):**
  1. `npm audit fix` (no `--force`) — resolves the semver-compatible subset.
  2. Remove unused `express`, `cors`, `dotenv` from the frontend `package.json` `dependencies` (they belong only in `server/`).
  3. Bump `concurrently` (dev-only) to clear the `shell-quote` critical.
  4. Verify with `npm run build` + `npm test` + `npm audit` after any bump.
- **Breaking-change risk:** any advisory whose only fix requires a *major* bump (e.g. a `vite`/`rollup` major) is **out of Stage 1 scope** and was intentionally not applied. `--force` was **not** used.
- **Do not blindly `npm audit fix --force`** — it can silently jump majors and break the Vite 7 / React 19 / Tailwind 3 build.
