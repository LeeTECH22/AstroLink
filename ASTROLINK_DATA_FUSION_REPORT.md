# ASTROLINK — DATA FUSION REPORT

Internal version: V1.0.0 · Product: AstroLink

A single unified provider layer fetches every Earth-science source so frontend modules never
re-implement provider logic. Every response carries a normalized provenance envelope.

Files: `server/lib/providers.js`, `server/index.js` (`GET /api/providers`, `GET /api/data/:provider`),
`src/pages/DataExplorer.tsx`, `src/pages/Geospatial.tsx`, `src/types/index.ts` (`ProviderDataEnvelope`),
tests `server/test/providers.test.js` + `platform.test.js`.

---

## 1. Provider catalog

| id | Label | Kind | Dataset | Key required |
|---|---|---|---|---|
| `power` | NASA POWER | **reanalysis** | NASA POWER (Prediction Of Worldwide Energy Resources) | no |
| `eonet` | NASA EONET | **event** | NASA EONET v3 | no |
| `firms` | NASA FIRMS | **observation** | NASA FIRMS (VIIRS/MODIS active fire) | yes (`FIRMS_MAP_KEY`) |
| `earthdata` | NASA CMR / Earthdata Search | **catalog** | NASA Common Metadata Repository | no |
| `gibs` | NASA GIBS | **imagery** | NASA Global Imagery Browse Services (WMTS) | no |

The **kind** field encodes scientific meaning and is displayed in the UI:
- `reanalysis` — gridded model output / reanalysis (**not** a ground measurement)
- `observation` — satellite/ground-derived measurement
- `event` — catalogued natural event
- `catalog` — dataset metadata only (records describe collections, not measurements)
- `imagery` — rendered imagery service (not a numeric science product)

POWER carries an explicit note: *"Gridded/model-derived meteorological values. These are NOT direct
ground measurements."*

## 2. Normalized provenance envelope

Every successful fetch returns (see `ProviderDataEnvelope<T>`):

```
provider, label, dataset, kind, temporalResolution, spatialResolution,
sourceUrl, fetchedAt, latencyMs, cached, notes, data
```

- `sourceUrl` is redacted (`api_key=***`) before it is returned or logged.
- The originating dataset identity is preserved — incompatible products are never silently substituted.

## 3. Reliability controls

| Control | Implementation | Value |
|---|---|---|
| Cache | In-memory `TtlCache` (lightweight Redis alternative) | 250 entries; per-provider TTL (POWER 5 min, EONET/FIRMS 3 min, CMR 10 min, GIBS 30 min) |
| Timeout | Per attempt | 15 s (`DEFAULT_TIMEOUT_MS`) |
| Retries | Bounded | 1 + up to 2 retries on 429 / 5xx, linear backoff 250 ms·(n+1) |
| Circuit breaker | Per provider `CircuitBreaker` | open after 3 consecutive failures; 30 s open → half-open single probe → closed |
| Validation | Per-adapter `validate()` | see §4 |
| Health metrics | `GET /api/providers` → `health[]` | requests, successes, failures, cacheHits, lastLatencyMs, lastStatus, lastFetchAt, lastError + circuit state |
| Error typing | `ProviderError.code` | `unknown_provider` / `validation` / `config` / `unavailable` / `upstream` |

Graceful degradation: a failing provider opens its circuit and returns a typed error; other providers
and the deterministic trend engine continue to work.

## 4. Per-provider validation (input guards)

- **POWER**: lat −90..90, lon −180..180, parameters `[A-Za-z0-9_,]+`; monthly start/end = 4-digit
  years, daily = `YYYYMMDD`.
- **EONET**: status ∈ {open, closed, all}; limit 1..100; category `[A-Za-z0-9_-]{1,40}`.
- **FIRMS**: west/east −180..180, south/north −90..90; days 1..5.
- **Earthdata CMR**: keyword 1..100 chars; page_size 1..100.

## 5. Duplicate / missing-data handling

- **Duplicate detection**: the cache key is the sorted, normalized parameter set, so identical
  requests within the TTL are served from cache and never re-fetched (`cached: true`).
- **Missing-data detection**: the trend engine treats POWER `fill_value = -999`, `null` and
  non-finite values as missing and reports missing % and valid count. FIRMS rows with non-numeric
  coordinates are mapped to `null`.

## 6. Observation vs. model vs. estimate vs. forecast

The platform keeps these separate:
- **Observation** — e.g. FIRMS active-fire detections (`kind: observation`). A detection is not a
  confirmed ground fire; confidence fields must be consulted.
- **Reanalysis / model output** — POWER (`kind: reanalysis`), clearly labelled gridded.
- **Catalog metadata** — CMR (`kind: catalog`).
- **Forecasts** — produced only by the anomaly/forecast subsystem and labelled `FUTURE FORECASTS`
  in the UI; never shown as NASA measurements.

## 7. Verification evidence

`server/test/providers.test.js` (all PASS):
- `TtlCache: stores, returns, expires and evicts entries`
- `CircuitBreaker: opens after threshold, recovers via half-open probe`
- `ProviderRegistry: rejects unknown providers`
- `ProviderRegistry: validation errors are surfaced as code=validation`
- `ProviderRegistry: a keyed provider without its key reports code=config`
- `ProviderRegistry: caches, redacts the source URL and records provenance`
- `ProviderRegistry: repeated upstream failures open the circuit (code=unavailable)`
- `ProviderRegistry: catalog and health expose no secrets`

`server/test/platform.test.js` (all PASS):
- `GET /api/providers returns a catalog with provenance metadata`
- `GET /api/data/:provider validates input (400) and rejects unknown providers (404)`
- `a keyed provider without its key is reported as not configured (503)`

Live checks: `GET /api/providers` → 5 providers
(`power:reanalysis, eonet:event, firms:observation, earthdata:catalog, gibs:imagery`);
`GET /api/data/doesnotexist` → **404**; `GET /api/data/eonet?limit=2` → real EONET data with the flat
provenance envelope matching `ProviderDataEnvelope`.

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Verified this session on Windows (backend `:5001`, frontend `:5173`, app version 1.0.0).

**Live provider / integration verification (freshly restarted backend, all HTTP 200)**
| Endpoint / source | Result |
|---|---|
| `GET /api/providers` | 200 |
| APOD | real |
| Mars Rover `curiosity` sol=1000 | 569 real photos; `perseverance` also 200 |
| NEO | real (now secret-redacted, see below) |
| EPIC | 12 images |
| EONET | 200 |
| NASA Image Library | 200 |
| TechPort | real |
| SBDB (`designation=433`) | real JPL orbit data |
| OSDR | real envelope (0 hits for default OSD-379) |
| Earthdata CMR | real feed (`feed.entry`) |
| GIBS | 200 WMTS Capabilities |
| Exoplanet Archive `/api/exoplanets` | **real** data (e.g. Kepler-992 b) |

**Defects fixed this session (with root cause)**
| # | Defect | Root cause | Fix | Verification |
|---|---|---|---|---|
| 1 | `GET /api/donki` 502 for `type=cme`/`all` | Internal helper `nasaGet()` resolved with the **full axios response object** (circular `req`/`res`/`config` refs); the DONKI route passed that whole object into `res.json()` → "Converting circular structure to JSON" | `fetchDonkiProduct` returns `response.data`; CME/GST/FLR fetched concurrently via `Promise.all` | 200 for `type=all`/`flr`/`cme` |
| 2 | Exoplanets demo fallback | TAP query used SQL `LIMIT n`, rejected by the Exoplanet Archive Oracle/ADQL backend (ORA-00933, HTTP 400) | ADQL `select top n` | real data returned |
| 3 | NEO response echoed the server NASA `api_key` in `links.next`/`prev` | Passthrough response was not scrubbed | Recursive `redactDeep()` helper scrubs passthrough responses | `api_key=***` verified |

**DONKI / ADS upstream notes**
- `type=all`/`flr`/`cme` → 200. CME → 20 real CME records. FLR → upstream DONKI FLR returns **404**, so 121 flares come from the **NOAA SWPC GOES X-ray fallback** (`meta.flareSource` flags this). GST → 0 events in the 7-day window.
- ADS → 200 but **demo-fallback**, honestly flagged in `_meta`; ADS requires its **own** token (external blocker).
- Map tiles: all Leaflet maps (NaturalEvents, Geospatial, EarthTrends) use **OpenStreetMap** tiles with attribution; no CARTO, no credentials needed.

**Security controls verified live**
- Allowlisted CORS origin → 200 with `Access-Control-Allow-Origin`; disallowed origin → **403**; unknown `/api` route → JSON **404**; invalid query (`latitude=999`) → **400**; headers present (`x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`, `x-powered-by` absent).

**Test & build evidence**
- Backend `node --test` → **45 pass, 0 fail** (7 files, incl. `providers.test.js`, `platform.test.js`); 3 new regression tests added this session.
- Frontend `npm run test` → **39 pass, 0 fail** (4 files); `tsc --noEmit` → 0 errors; `npm run build` → SUCCESS.
- Backend `npm audit` → **0 vulnerabilities**.

No deployment was performed this session; no secrets printed.
