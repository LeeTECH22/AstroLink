# ASTROLINK — HACKATHON DEMONSTRATION

Internal version: V1.0.0 · Product: AstroLink
Challenge: **Be An Earth System Trend Detective!** (NASA Space Apps Challenge 2026)

This is a reproducible walkthrough of the official challenge narrative: select a region, retrieve
real NASA data, inspect provenance, compute a multi-year trend, view statistics and uncertainty,
identify an anomaly, ask the AI agent to explain it, generate a report, and show the defensive
security and reliability capabilities.

Live (frontend): https://astro-link-xi.vercel.app/
Source: https://github.com/LeeTECH22/AstroLink

---

## 1. Demo flow (~6–8 minutes)

### Step 1 — Select a region
Open **Earth Trends** (`/earth-trends`). The default location is **Faisalabad (31.418 N, 73.079 E)**.
Select a variable and a multi-year range (e.g. **T2M, 2015–2024**).

### Step 2 — Retrieve actual NASA data
Click analyse. The backend fetches **real NASA POWER monthly** data (multi-key failover active).
The chart shows the monthly series with a fitted regression line.

### Step 3 — Inspect dataset provenance
Show the provenance panel: location + coordinates, variable + unit, **dataset = NASA POWER
(reanalysis / gridded — not ground measurements)**, date range, monthly resolution, valid count,
missing %, plus limitations.

### Step 4 — Calculate the multi-year trend
Show the statistics: OLS slope, **Mann-Kendall** trend + p-value, **Sen's slope**, 95 % CI,
significance, direction. Point out the seasonal panel and the missing-data/completeness panel.

### Step 5 — Identify an anomaly (if supported)
Show the anomaly/outlier panel (robust z-score / climatology departure) and the annual aggregation.

### Step 6 — Compare two locations
Use the comparison control to compare Faisalabad against another city for the same variable/period.

### Step 7 — Ask the AI agent
Open **Intelligence** (`/intelligence`). Ask, e.g.:
- *"What environmental changes occurred in Faisalabad?"*
- *"Compare Faisalabad and Lahore over ten years."*
- *"Find unusual temperature trends."*
- *"Explain this statistical result."*
Show that the answer cites the deterministic numbers and dataset, and states limitations. If no AI
provider is configured, show the deterministic explanation and the clear AI-unavailable indicator.

### Step 8 — Generate a scientific report
Use **Export report** in Intelligence to download a Markdown scientific report of the region.

### Step 9 — Show reliability and defensive security
Open **CyberShield** (`/cybershield`) and show real metrics (requests, success/failed/rate-limited/
suspicious, latency, provider failures, active restrictions, sanitized events). Note the admin
deny-by-default behaviour. Optionally show the **Data Explorer** (`/data-explorer`) provenance and
the **Geospatial** (`/geospatial`) map with real EONET/FIRMS layers.

## 2. Suggested talking points

- The whole pipeline is **grounded**: numbers come from deterministic statistics of real NASA data;
  the AI only narrates.
- Scientific honesty: **significance ≠ causation**, and POWER is **gridded, not ground** — both are
  stated in the UI.
- Reliability: automatic **multi-key NASA failover**, per-provider **circuit breakers**, caching and
  bounded retries.
- Security: **CyberShield** with multi-signal abuse detection, progressive auto-expiring
  restrictions, an admin token, and a sanitized audit log.

## 3. Fallback / edge cases to mention

- If AI is unavailable, deterministic analysis and explanations still work (deterministic-only mode).
- If FIRMS has no key configured, the fire layer is hidden with an explanatory message (no fake layer).
- If a NASA provider fails, its circuit opens and the platform degrades gracefully.

## 4. Optional commands for a live repeat

```bash
npm run install:all
npm run dev:full          # frontend :5173, backend :5001
# open http://localhost:5173/earth-trends
```

```bash
# verify provider catalog & health
curl http://localhost:5001/api/providers
curl http://localhost:5001/health
```

## 5. Honest disclaimers (state these)

- AstroLink is **not** endorsed by NASA and has **no** official partnership.
- AstroLink makes **no** claim of hackathon selection or victory.
- Statistical results are analyses of NASA data, not climate-change attribution.
- Forecasts are statistical projections with uncertainty, not guarantees.
- Test results are author-run automated checks, not a professional penetration test.

## 6. Deliverable documents

- `ASTROLINK_FINAL_PROGRESS.md` — progress + status
- `ASTROLINK_SCIENTIFIC_VALIDATION.md` — methods + synthetic validation
- `ASTROLINK_AI_AGENT_REPORT.md` — grounded AI agent
- `ASTROLINK_DATA_FUSION_REPORT.md` — unified provider layer
- `ASTROLINK_ML_VALIDATION.md` — anomaly/forecast validation
- `ASTROLINK_CYBERSHIELD_REPORT.md` — defensive security
- `ASTROLINK_FINAL_TEST_RESULTS.md` — exact test evidence
- `ASTROLINK_DEPLOYMENT_GUIDE.md` — deployment + manual steps
- `ASTROLINK_HACKATHON_DEMO.md` — this file
- `README.md` — updated project overview

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Verified this session on Windows (backend `:5001`, frontend `:5173`, app version 1.0.0).

**Demo-flow endpoints verified live (freshly restarted backend, all HTTP 200)**
- Core data: APOD (real), Mars Rover `curiosity` sol=1000 → 569 real photos (`perseverance` also 200), NEO (real), EPIC (12 images), EONET, NASA Image Library, TechPort, SBDB (`designation=433`, real JPL orbit data), OSDR (real envelope, 0 hits for default OSD-379), Earthdata CMR (real `feed.entry`), GIBS (WMTS Capabilities), Exoplanet Archive (real data, e.g. Kepler-992 b).
- Space Weather: DONKI `type=all`/`flr`/`cme` → 200 (CME 20 real records; FLR via NOAA SWPC GOES fallback because upstream FLR returns 404; GST 0 events in the 7-day window).
- Platform: `GET /api/providers` → 200; `GET /api/ai/status` → 200 (`available:false`, `provider:'none'`, `mode:'deterministic-only'`).
- ADS → 200 but demo-fallback, honestly flagged (requires its own token).

**Defects fixed (improve demo reliability)**
- Space Weather 502 (`/api/donki` for `type=cme`/`all`) — circular-JSON serialization fixed; products now fetched via `Promise.all`.
- Exoplanets demo fallback — ADQL `select top n` (SQL `LIMIT` was rejected by the TAP backend).
- NEO response secret echo — `redactDeep()` scrubs `api_key` from passthrough links.
- Contrast / layout: dark `.btn-secondary`, dark Navbar (xl breakpoint, no horizontal overflow), fixed CTA card / ErrorBanner / leftover light scrollbar + leaflet colors.
- Crash guards: EONET polygon `toLatLng()`, SBDB string numerics → `"N/A"`, DataExplorer catalog error state with Retry.

**Test & build evidence**
- Backend `node --test` → **45 pass, 0 fail** (7 files); **3 new regression tests** added this session.
- Frontend `npm run test` → **39 pass, 0 fail** (4 files); `tsc --noEmit` → 0 errors; `npm run lint` → 0 errors, 24 pre-existing warnings; `npm run build` → SUCCESS (973 modules).
- Backend `npm audit` → 0 vulnerabilities.

**AI / disclaimers unchanged**
- AI is **deterministic-only** in this environment; no provider credentials configured, so live model narration is blocked on external credentials.
- CyberShield public page exposes no admin token entry or admin menu (a frontend test asserts this).
- No deployment was performed this session; no secrets printed. All existing honest disclaimers still apply.
