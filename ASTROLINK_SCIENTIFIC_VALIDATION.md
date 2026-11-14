# ASTROLINK — SCIENTIFIC VALIDATION

Internal version: V1.0.0 · Product: AstroLink · Challenge: *Be An Earth System Trend Detective!*

This document records the scientific methods, the provenance contract, and the independent
synthetic-dataset validation evidence for the Earth System Trend Intelligence Engine.

Scope: `src/utils/trendStats.ts` (calculations), `src/pages/EarthTrends.tsx` (UI),
`src/utils/trendStats.test.ts` (validation), `server/index.js` (`/api/power/trend`).

---

## 1. Data source and honesty contract

| Property | Value |
|---|---|
| Source | **NASA POWER** (Prediction Of Worldwide Energy Resources) |
| Endpoint | `https://power.larc.nasa.gov/api/temporal/monthly/point` |
| Dataset nature | **Gridded, model-derived reanalysis (MERRA-2)** — **NOT** direct ground measurements |
| Temporal resolution | Monthly |
| Default location | **Faisalabad, Pakistan — 31.418 N, 73.079 E** |
| Variables | `T2M` (°C), `PRECTOTCORR` (mm/day), `ALLSKY_SFC_SW_DWN` (kWh/m²/day) |
| Missing marker | `header.fill_value = -999` |
| Annual key | `YYYY13` is the annual average and is **excluded** from monthly analysis |

**Rules enforced in code and UI**
- NASA POWER is always labelled *"Reanalysis · gridded (not ground)"*; it is never presented as a
  ground-station measurement.
- Statistical significance is **never** presented as causation or anthropogenic attribution. Every
  result and the AI narrator carry this caveat.
- No value is invented; all figures originate from the deterministic calculations below.

## 2. Methods implemented

| Method | Implementation | Notes |
|---|---|---|
| Linear regression (OLS) | `linearRegression()` | slope, intercept, R², residual standard error, standard error of slope, t-statistic, df, two-sided p-value, 95 % CI |
| Mann-Kendall trend test | `mannKendall()` | tie-corrected S variance, continuity correction, z, two-sided p-value, Kendall's tau |
| Sen's slope | `sensSlope()` | median of pairwise slopes (robust to outliers) |
| Student-t p-values / quantiles | `studentTQuantile()` | used for p-values and CIs |
| Normal CDF | `normalCdf()` | MK p-values |
| Annual aggregation | `buildAnnualSeries()` | mean of valid months only; flags incomplete years |
| Seasonal analysis | `seasonalAnalysis()` | per-calendar-month climatology, amplitude, peak/trough months |
| Completeness / missing data | `completenessStats()` | missing %, complete years, years with gaps |
| Outlier detection | `detectOutliers()` | robust modified z-score (median + MAD); falls back to classical z when MAD = 0 |
| Seasonal decomposition | `seasonalDecompose()` | classical additive (trend + seasonal + residual) |
| Anomaly detection | `detectAnomalies()` | departure from calendar-month climatology; severity by z-score |
| Forecasting | `linearForecast()`, `seasonalDriftForecast()` | OLS trend + prediction interval |
| Forecast evaluation | `evaluateForecast()`, `backtestForecast()`, `chronologicalSplit()` | MAE, RMSE, MAPE; 80/20 chronological split; baseline = climatology |

## 3. Provenance contract (every result)

Every analysis result and UI panel exposes:

1. Location name + latitude/longitude
2. Environmental variable + unit
3. Data source + dataset/product name
4. Date range
5. Temporal resolution
6. Valid observation count
7. Missing-data percentage
8. Trend direction + magnitude
9. Statistical significance (+ p-value, CI)
10. Uncertainty + limitations
11. Plain-language interpretation

## 4. Independent synthetic-dataset validation

The test suite builds **known ground-truth series** (POWER `YYYYMM` shaped) and asserts the
analysis recovers the truth that was put in. Source: `src/utils/trendStats.test.ts`.

### 4.1 Increasing trend
- Input: 2015–2024 monthly, `value = 20 + 0.05 * i`.
- Asserts: 120 valid, 0 missing, direction `increasing`, significant, OLS slope ≈ **0.05**,
  MK trend `increasing`, Sen's slope ≈ **0.05**.
- **Result: PASS.**

### 4.2 Decreasing trend
- Input: `value = 100 - 0.2 * i` (PRECTOTCORR).
- Asserts: direction `decreasing`, significant, OLS slope ≈ **-0.2**.
- **Result: PASS.**

### 4.3 Constant series
- Input: constant 25.
- Asserts: slope ≈ 0, **not** significant, direction `no trend`, MK `no trend`.
- **Result: PASS.** (Guards against false-positive trends.)

### 4.4 Seasonal series
- Input: `value = 25 - 10*cos(2π(m-1)/12)`.
- Asserts: amplitude ≈ **20**, peak month **July**, trough month **January**,
  Jan mean ≈ 15, Jul mean ≈ 35; **no spurious time trend** (|slope| < 0.05); seasonal component
  sign per slot (Jan < 0 < Jul).
- **Result: PASS.**

### 4.5 Missing values
- Input: increasing series with 3 months set to `FILL_VALUE` (-999).
- Asserts: total 120, missing 3, observations 117; completeness 2.5 %, `yearsWithGaps [2016, 2019]`,
  8 complete years; 2016 annual `validMonths 10`, `complete false`.
- **Result: PASS.**

### 4.6 Insufficient samples
- Input: 2 monthly observations.
- Asserts: regression / MK / Sen's slope all `null`, direction `no trend`, validCount 2.
- Backtest with 12 observations: `finite false`, `recommended 'insufficient-data'`.
- **Result: PASS.** (The engine declines to over-claim on thin data.)

### 4.7 Outliers
- Input: seasonal baseline + one extreme month (2020-07 = 80).
- Asserts: method `modified-z-score`, exactly 1 outlier, label `2020-07`, direction `high`,
  |score| > 3.5. Fallback case (MAD = 0) uses classical `z-score`.
- **Result: PASS.**

### 4.8 Anomalies
- Input: seasonal series + injected +25 °C at 2021-07.
- Asserts: at least one anomaly, first label `2021-07`, severity `high`, z-score > 2.
- **Result: PASS.**

### 4.9 Forecasting & leakage
- Input: 2005–2024 monthly trend series (240 obs).
- Asserts: chronological 80/20 split → train **192**, test **24**; linear RMSE **<** climatology
  RMSE; `recommended 'linear-trend'`; prediction intervals bracket the point forecast.
- Leakage guard: `chronologicalSplit()` — `max(train index) < min(test index)`.
- Metrics sanity: MAE = 2/3, RMSE = √(4/3) for a known residual set.
- **Result: PASS.**

### 4.10 Distribution sanity
- `normalCdf(0)=0.5`, `normalCdf(±1.96)≈0.975/0.025`; `studentTQuantile(0.05, 10000)≈1.96`.
- **Result: PASS.**

## 5. Real-data integration check (live)

`GET /api/power/trend?latitude=31.418&longitude=73.079&startYear=2015&endYear=2024&parameters=T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN`
returned real NASA POWER monthly data for Faisalabad (multi-key failover active). Validation
guards verified live: `latitude=999` → **400**; `parameters=T2M;DROP` → **400**.

## 6. Explicit non-claims

- AstroLink does **not** claim NASA endorsement, partnership, or hackathon selection.
- AstroLink does **not** assert climate-change attribution from any trend.
- AstroLink does **not** present gridded/model data as ground measurements.
- AstroLink does **not** present forecasts as observed measurements.

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Verified this session on Windows (backend `:5001`, frontend `:5173`, app version 1.0.0).

**Test & build evidence**
- Backend `node --test` (in `server/`) → **45 pass, 0 fail** (7 test files); 3 new regression tests were added this session.
- Frontend `npm run test` (vitest) → **39 pass, 0 fail** (4 files).
- `npm run build` (`tsc && vite build`) → **SUCCESS**, 973 modules transformed, source maps disabled.
- `tsc --noEmit` → 0 errors; `npm run lint` → 0 errors, 24 pre-existing warnings.
- Backend `npm audit` → 0 vulnerabilities.

**Live real-data source verification (freshly restarted backend, all HTTP 200)**
| Source | Result |
|---|---|
| APOD | real |
| Mars Rover `curiosity` sol=1000 | 569 real photos (mars.nasa.gov raw images feed); `perseverance` also 200 |
| NEO | real |
| EPIC | 12 images |
| EONET | 200 |
| NASA Image Library | 200 |
| TechPort | real |
| SBDB (`designation=433`) | real JPL orbit data |
| OSDR | real envelope (0 hits for default OSD-379) |
| Earthdata CMR | real feed (`feed.entry`) |
| GIBS | 200 WMTS Capabilities |

**Scientific-honesty fixes retained**
- Exoplanet Archive `/api/exoplanets` now returns **real** data (e.g. Kepler-992 b); it previously fell back to demo data (root cause documented in the Data Fusion report).
- Deterministic trend analysis, provenance labelling and the gridded-vs-ground disclaimer remain enforced and unchanged.

**Non-claims:** no deployment was performed this session; no secrets printed; no git commit, push, or history rewrite.
