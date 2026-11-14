# AstroLink V1.0.0 — Repair Report

**Scope:** Defects and hygiene issues found during the Complete System Audit (Phase 0–8) and their disposition.
**Rules honored:** No redesign, no mock-data substitution, no history rewrite, no commit/push, no deploy, no unnecessary upgrades, no `npm audit fix --force`, no file deleted merely for appearing unused.

**Disposition legend**
- **REPAIRED** — code change applied and re-verified in this audit cycle.
- **DEFERRED** — real issue, intentionally not changed (risk / out of scope / needs owner decision).
- **BLOCKED** — cannot be completed without owner action or external infrastructure.
- **NON-ISSUE** — investigated, confirmed intentional or inert.

---

## 1. Repairs applied in this cycle

| # | Finding | Severity | File | Change | Re-verification |
|---|---------|----------|------|--------|-----------------|
| R1 | `start.bat` printed wrong ports (`3000`/`5000`) while the app actually runs on `5173`/`5001` | Low (UX / docs) | [start.bat](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/start.bat) | Corrected banner to `http://localhost:5173` (frontend) and `http://localhost:5001` (backend API) to match `vite.config.ts` (`server.port 5173`, proxy target `5001`) and `server/index.js` (`PORT` default `5001`) | Static review of both config files; no test depends on the banner. `tsc`/`vitest`/`node --test` unaffected and re-run green. |

**Net code change in this audit cycle:** 1 file, 2 lines (non-functional banner text). No application logic, route, component, dependency, or test was modified.

---

## 2. Findings investigated and intentionally not changed

| # | Finding | Severity | Reason for DEFERRED / NON-ISSUE |
|---|---------|----------|--------------------------------|
| D1 | `server/app.js` appears unused | Low | Per Rule 9, references were investigated before any action. It is **not required** by the live entry `server/index.js` (`node --index.js` is the start script). It is dead code but its removal is not required for correctness and is left in place pending an explicit owner decision. |
| D2 | `__verify_trend_stats.mjs` (repo root) unreferenced by any script | Low | Standalone verification script; inert. Deletion is an owner decision, not a correctness fix. |
| D3 | `server/__verify_failover.cjs` referenced only by a manual test note | Low | Documented manual failover probe; retained. |
| D4 | `src/hooks/useRetryQuery.ts` unused (only referenced in docs) | Low | Investigated: no runtime import. Retained per Rule 9 (do not delete merely for appearing unused). |
| D5 | Root `package.json` declares `express`, `cors`, `dotenv` — unused by the frontend | Low (hygiene) | Removing them is a dependency-surface change. Not required for correctness; deferred to avoid unnecessary churn. The backend has its own pinned deps in `server/package.json`. |
| D6 | Root `package.json` declares `express ^5.3.0` while the running backend uses `server/package.json` `express ^4.18.2` | Low (confusion risk) | The frontend never loads Express; the effective backend version is the pinned v4 in `server/package.json`. No runtime conflict. Documented; not changed to avoid touching lockfiles. |
| D7 | `vite.config.ts` sets `build.sourcemap: true` | Low–Medium (info disclosure) | Sourcemaps aid debugging and contain no secrets (a secret scan of the build output found none). Recommend `false` for public production builds; left unchanged pending owner decision so the build output is not altered mid-audit. |
| D8 | Helmet Content-Security-Policy disabled (default Helmet CSP conflicts with the app's inline/map resources) | Medium (hardening) | Deliberately left as-is; enabling CSP requires per-directive testing against Leaflet/Chart.js and is a separate hardening task. Tracked, not weakened. |
| D9 | 7 dev-only `npm audit` advisories (ESLint toolchain chain) | Low (dev-only) | Not present in the production dependency graph (`--omit=dev` audits = 0). Per Rule 11, no `--force` upgrade attempted. |
| D10 | `/api/techport` returns a demo `_meta` fallback when the upstream TechPort API is unavailable | Low (honesty) | The fallback is explicitly labelled via `_meta` and is never presented as a live measurement. Behavior is correct and documented; no change. |
| D11 | Memory-only server state (CyberShield metrics/restrictions, provider cache/circuit state reset on restart) | Medium (ops) | Architectural; changing persistence is a redesign. Documented in the Production Readiness report as a known limitation. |
| D12 | Free-tier cold starts (Render/Railway) | Medium (ops) | Hosting limitation, not code. Documented. |

---

## 3. Findings carried from prior stages — status

| Finding | Status |
|---------|--------|
| Hardcoded NASA API key in source | **REPAIRED (prior stage)** — moved to `process.env.NASA_API_KEY` server-side; client uses public `DEMO_KEY` only. |
| `.env` tracked by Git | **REPAIRED (prior stage)** — untracked via `git rm --cached` (staged, **not committed**). Local file preserved. |
| Exposed key in history commit `bdd07b8` | **BLOCKED (owner action)** — history was **not** rewritten (Rule 12). The exposed key must be rotated by the owner at `https://api.nasa.gov`. |
| NEO scope / date-range bug | **REPAIRED (prior stage)** — validated. |
| Tailwind v3/v4 conflict blocking build | **REPAIRED (prior stage)** — pinned `tailwindcss ^3.4.1`. |
| `/date/undefined` EPIC bug | **REPAIRED (prior stage)** — validated. |
| Backend CORS / Helmet / rate-limit / body-limit hardening | **REPAIRED (prior stage)** — validated live. |
| Multi-key NASA failover | **REPAIRED (prior stage)** — validated live (3 keys) and by test. |

---

## 4. Repair acceptance criteria

- No application functionality was weakened to obtain a passing result.
- No test was deleted, skipped, or loosened.
- Repairs were limited to confirmed, low-severity correctness issues; all higher-risk items were deferred or left BLOCKED with rationale.
- Post-change verification: `tsc --noEmit` = 0 errors; frontend Vitest **40/40**; backend `node --test` **42/42, 0 fail**; `npm run build` PASS; `npm run lint` 0 errors / 23 warnings.

---

## 5. Remaining owner actions (not repairable by code)

1. **Rotate the NASA API key** exposed in historical commit `bdd07b8` (mandatory).
2. Decide on removal of inert files `server/app.js`, `__verify_trend_stats.mjs`, `src/hooks/useRetryQuery.ts` (optional).
3. Decide whether to set `build.sourcemap: false` for public production builds (recommended).
4. Decide whether to enable a tested Content-Security-Policy (recommended, separate task).
5. Configure production secrets/origins on the hosting providers (see Production Readiness report).

---

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Additional repairs applied and re-verified this session (root cause → fix documented; no prior content altered).

| # | Finding | Severity | Change | Re-verification |
|---|---------|----------|--------|-----------------|
| R2 | `/api/donki` returned HTTP 502 for `type=cme`/`all` | High (functional) | `nasaGet()` resolves the **full** axios response (circular `req`/`res`/`config` refs); the DONKI route passed that object to `res.json()` → "Converting circular structure to JSON" → 502. `fetchDonkiProduct` now returns `response.data`; CME/GST/FLR fetched concurrently via `Promise.all` | all DONKI types → 200; CME 20 real records |
| R3 | Exoplanets returned demo fallback | Medium (honesty/data) | TAP query used SQL `LIMIT`; the Archive's Oracle/ADQL backend rejects it (ORA-00933 → HTTP 400 → fallback). Switched to ADQL `select top n` | real data (e.g. Kepler-992 b) |
| R4 | NEO response echoed the server NASA key | High (security) | Added recursive `redactDeep()` and scrubbed the passthrough response | `api_key=***` |
| R5 | `.btn-secondary` invisible (contrast) | Medium (UX) | A global `!important` rule forced `.text-gray-700` to a light `#e5e7eb`. Restyled `.btn-secondary` in `src/index.css` (dark translucent: bg-white/10, text-white, border-white/20). Also fixed Navbar light-on-light + horizontal overflow (desktop nav moved to `xl`, dark bar), Dashboard CTA card, ErrorBanner colors, and leftover light scrollbar/leaflet colors | visual |
| R6 | Page-blanking crash on EONET polygon events | Medium (stability) | `coordinates[1].toFixed()` threw. Added a `toLatLng()` guard used in both map and list views | guarded |
| R7 | SBDB string numerics rendered "NaN" | Low (UX) | Added a `fmt()` helper → "N/A" | fixed |
| R8 | DataExplorer lacked a catalog error state | Low (UX) | Added a provider-catalog error state with a Retry button | fixed |

**D7 status update:** production `build.sourcemap` is now **disabled** (`npm run build` succeeded; 973 modules transformed).

**Post-change verification:** backend `node --test` **45 / 45, 0 fail** (7 files, 3 new regression tests added this session); frontend vitest **39 / 39** (4 files); `tsc --noEmit` 0 errors; `npm run build` SUCCESS; `npm run lint` 0 errors / 24 pre-existing warnings; backend `npm audit` 0 vulnerabilities; frontend `npm audit` 27 advisories (11 production-relevant), deferred (no forced upgrades).

**Retained prior-stage fixes:** Exoplanets Chart.js `LogarithmicScale` registration (log x-axis); guarded date formatting (`safeFormat`/`safeTime`/`toDateInputValue`) in SpaceWeather/EarthImages/PowerData.

**Map tiles:** all Leaflet maps use OpenStreetMap tiles with attribution; no CARTO and no credentials required.

**Owner actions unchanged** (key rotation, env vars) — see §5 above.
