# ASTROLINK — ML / FORECASTING VALIDATION

Internal version: V1.0.0 · Product: AstroLink

The predictive subsystem is deliberately built on **explainable, reliable** statistical methods
rather than opaque models. No complex ML model was added for appearance; methods were chosen where
they are justified by the data.

Files: `src/utils/trendStats.ts`, `src/pages/EarthTrends.tsx`, `src/utils/trendStats.test.ts`.

---

## 1. Method selection and justification

| Task | Method | Why |
|---|---|---|
| Anomaly detection | Robust modified z-score (median + MAD) vs calendar-month climatology | Robust to outliers; interpretable; no training data required |
| Fallback | Classical z-score when MAD = 0 | Avoids divide-by-zero on flat series |
| Seasonal pattern | Classical additive decomposition (trend + seasonal + residual) with 12-month window | Standard, transparent |
| Forecasting | OLS linear trend with prediction interval; seasonal-drift variant | Explainable; degrades safely |
| Baseline comparison | Calendar-month climatology persistence | Simplest defensible baseline |

Note: Isolation Forest was **considered** but not adopted — with the available monthly POWER series
the seasonal baseline + robust z-score is more reliable and fully explainable. Adopting a heavy
model only for appearance was explicitly avoided.

## 2. Leakage prevention

- `chronologicalSplit(observations, ratio)` splits by time order — **no shuffling**.
- Test invariant asserted in tests: `max(train index) < min(test index)`.
- The forecaster is fit only on the train window; the test window is never seen during fitting.

## 3. Evaluation metrics

- **MAE** (mean absolute error), **RMSE** (root mean squared error), **MAPE**, plus `n`.
- `backtestForecast()` runs the model over a chronological hold-out and compares against the
  climatology baseline.

## 4. Verified scenarios (`trendStats.test.ts`)

| Scenario | Assertion | Result |
|---|---|---|
| Trend series backtest | 240 obs → 80/20 split → train **192**, test **24**; linear RMSE **<** climatology RMSE; `recommended 'linear-trend'` | PASS |
| Prediction intervals | Every point forecast bracketed by `[lower, upper]` | PASS |
| Metric correctness | MAE = 2/3, RMSE = √(4/3) for residuals [0,0,2] | PASS |
| Chronological split / leakage | 8 train + 2 test, train indices all < test indices | PASS |
| Insufficient data | 12 obs → `finite false`, `recommended 'insufficient-data'` (refuses to forecast) | PASS |
| Anomaly detection | Injected +25 °C at 2021-07 detected, severity `high`, z > 2 | PASS |
| Outlier detection | Modified z-score finds the single injected extreme; z fallback when MAD = 0 | PASS |
| Seasonal decomposition | Seasonal component sign is correct per month slot (Jan < 0 < Jul) | PASS |

## 5. Reported outputs (per forecast)

- Forecast horizon (months).
- Point forecast **and** prediction interval (uncertainty).
- Model used and the reason it was recommended.
- Backtest MAE / RMSE vs. the climatology baseline.
- Explicit refusal (`insufficient-data`) when < 24 monthly observations are available.

## 6. Separation guarantees (UI)

The interface visibly separates four categories and never blends them:
1. **HISTORICAL MEASUREMENTS** (retrieved NASA data)
2. **DETECTED ANOMALIES** (computed departures)
3. **MODEL OUTPUTS** (fitted trend / decomposition)
4. **FUTURE FORECASTS** (with horizon + interval)

Predictions are never displayed as observed NASA measurements.

## 7. Model assumptions & limitations

- Linear/seasonal methods assume the historical pattern persists; structural breaks are not modelled.
- Prediction intervals assume approximately normal, homoscedastic residuals.
- Long horizons carry wider (and less reliable) intervals.
- These are statistical projections, not guarantees.

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Verified this session on Windows (backend `:5001`, frontend `:5173`, app version 1.0.0).

**Test & build evidence (statistics / forecasting suite)**
- Frontend `npm run test` (vitest) → **39 pass, 0 fail** (4 files), including `trendStats.test.ts`.
- `tsc --noEmit` → **0 errors**; `npm run lint` → **0 errors, 24 pre-existing warnings**.
- `npm run build` (`tsc && vite build`) → **SUCCESS**, 973 modules transformed, **source maps disabled**.
- Backend `node --test` → **45 pass, 0 fail** (7 files); 3 new regression tests added this session.
- Backend `npm audit` → 0 vulnerabilities.

**Retained robustness fixes (still in place)**
- Exoplanets Chart.js **LogarithmicScale registration** fixed.
- Guarded date formatting in SpaceWeather / EarthImages / PowerData (no crash on malformed dates).
- Crash guards: NaturalEvents EONET polygon geometry guarded by `toLatLng()` (previously blanked the page); SmallBodies SBDB string numerics render `"N/A"` via `fmt()`; DataExplorer added a catalog error state with **Retry**.

No deployment was performed this session; no secrets printed.
