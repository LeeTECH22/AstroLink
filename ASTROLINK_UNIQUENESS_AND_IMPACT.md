# AstroLink V1.0.0 — Uniqueness & NASA Space Apps Impact

**Challenge:** *Be An Earth System Trend Detective!* (NASA Space Apps Challenge 2026)
**Claim policy:** This document does **not** claim global uniqueness or a guaranteed win. It states, per differentiator, what is actually implemented and what evidence exists.

---

## 1. The strongest user problem AstroLink addresses

Most people can see a single satellite image or a single day's temperature, but they cannot answer a harder question: **"Has this place's climate measurably changed over the last decade, and how confident should I be in that claim?"** Raw data portals (GES DISC, POWER web UI, Earthdata Search) are scientifically authoritative yet fragmented, un-summarized, and require expert tooling.

**AstroLink's answer:** a single workflow that (1) pulls real NASA Earth-system data for a chosen location and period, (2) computes defensible trend statistics itself (Mann-Kendall, Sen's slope, OLS with confidence intervals), (3) states the data's provenance and limitations, and (4) narrates the result in plain language **without inventing numbers** — while degrading to a deterministic (non-AI) mode if no AI provider is configured. It turns "here is a dataset" into "here is a defensible, traceable finding."

---

## 2. Differentiator assessment

### D1 — Multi-year Earth-system trend analysis
- **Implemented?** Yes — Earth Trend Detective (`/earth-trends`) + `GET /api/power/trend`.
- **Genuinely functional?** Yes — verified live with **real NASA POWER monthly data** (Faisalabad, T2M, 2015–2024; `sources:["MERRA2"]`, `v2.10.0`, `fill_value:-999`).
- **Scientifically defensible?** Yes — OLS regression, tie-corrected Mann-Kendall, Sen's slope, Student-t p-values; annual + per-calendar-month aggregation; completeness/missing-data reporting.
- **Clearly communicated?** Yes — trend direction, magnitude, p-value, and a data-transparency panel.
- **Evidence:** live POWER response + **28 synthetic-dataset math tests** (`trendStats.test.ts`).
- **Limitation:** driven primarily by POWER gridded **reanalysis (MERRA-2)**, labelled as such — **not** ground-station observations; monthly/annual resolution.

### D2 — Transparent scientific methodology and data provenance
- **Implemented?** Yes — every provider response carries a provenance envelope (source URL redacted, provider kind, cache flag, timestamp).
- **Genuinely functional?** Yes — verified in `/api/data/*` and `/api/power/trend` responses.
- **Scientifically defensible?** Yes — provider kinds (`reanalysis`/`observation`/`event`/`catalog`/`imagery`) prevent conflating model output with measurement.
- **Communicated?** Yes — in-app panels and reports.
- **Evidence:** live envelopes; `providers.test.js` asserts provenance + URL redaction.
- **Limitation:** some upstream providers (APOD/Mars/DONKI) were unavailable at test time; those paths return labelled fallbacks or typed 502s rather than live data.

### D3 — AI research assistant grounded in deterministic calculations
- **Implemented?** Yes — AstroLink Intelligence (`/intelligence`) + `/api/ai/explain`.
- **Genuinely functional?** Yes — **deterministic-only mode verified live** (`/api/ai/status` → `deterministic-only`); AI narration path unit-tested with mocks.
- **Scientifically defensible?** Yes — the system prompt forbids inventing measurements/results/sources/endorsements; the LLM only narrates precomputed facts.
- **Communicated?** Yes — the UI states when AI is off and results are deterministic.
- **Evidence:** `ai.test.js` (never throws; status leaks no key; prompt forbids invention).
- **Limitation:** the live AI generation path is **BLOCKED** without an `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`; only the deterministic path was exercised end-to-end.

### D4 — Multi-provider Earth-data fusion
- **Implemented?** Yes — `ProviderRegistry` + `GET /api/providers` + `GET /api/data/:provider` (POWER, EONET, FIRMS, Earthdata/CMR, GIBS).
- **Genuinely functional?** Yes — 4 of 5 live (FIRMS requires `FIRMS_MAP_KEY`); verified `eonet`/`power`/`earthdata`/`gibs`.
- **Scientifically defensible?** Yes — typed envelopes, unit/provider kinds, validation.
- **Communicated?** Yes — `/data-explorer` and `/api/providers`.
- **Evidence:** live catalog (5 providers with mode/provenance); `providers.test.js` (8 tests).
- **Limitation:** FIRMS live layer hidden until its key is configured (by design — never faked).

### D5 — Anomaly detection and evaluated forecasting
- **Implemented?** Yes — robust modified z-score (median+MAD), classical additive seasonal decomposition, OLS forecast with prediction intervals, climatology baseline.
- **Genuinely functional?** Yes — evaluated with **chronological train/test splits**.
- **Scientifically defensible?** Yes — no data leakage; MAE/RMSE/MAPE; backtest vs climatology baseline; minimum-data guards.
- **Communicated?** Yes — observations, anomalies, and forecasts are visually and textually distinguished; forecasts are never shown as confirmed future events.
- **Evidence:** `trendStats.test.ts` + `ASTROLINK_ML_VALIDATION.md`.
- **Limitation:** demo-scale evaluation on the POWER grid series; not an operational forecast service.

### D6 — Interactive geospatial exploration
- **Implemented?** Yes — Geospatial Explorer (`/geospatial`) using Leaflet + GIBS layers.
- **Genuinely functional?** Yes — verified live GIBS imagery (~5.3 MB for a VIIRS true-color tile/date).
- **Scientifically defensible?** Yes — imagery is attributed; point-based trend can be inspected alongside.
- **Communicated?** Yes — layer/date controls and attribution.
- **Evidence:** live GIBS 200 response; `/api/gibs` route + `gibs` provider.
- **Limitation:** GIBS is imagery (visual), not a derived quantitative product; geospatial analysis is exploratory, not a full GIS.

### D7 — CyberShield defensive reliability and abuse protection
- **Implemented?** Yes — `server/lib/cybershield.js` (multi-signal abuse detection, progressive auto-expiring restrictions, sanitized audit, timing-safe admin compare).
- **Genuinely functional?** Yes — admin routes **deny-by-default** verified live (403); restriction/expiry/recovery unit-tested.
- **Scientifically defensible?** N/A (security) — but engineering-sound: ≥2 signals required before any restriction; restrictions are progressive, temporary, and admin-reversible.
- **Communicated?** Yes — `/cybershield` dashboard reads real backend metrics.
- **Evidence:** `cybershield.test.js` (9 tests) + live 403 + rate-limit 429 test.
- **Limitation:** state is in-memory (resets on restart); no third-party penetration test was performed, and none is claimed.

### D8 — Reproducible scientific reports
- **Implemented?** Yes — report generation/export in the trend workflow.
- **Genuinely functional?** Yes — reports embed location, variable, unit, source, period, valid-observation count, and missing-data %, so the same inputs reproduce the same numbers.
- **Scientifically defensible?** Yes — deterministic stats are computed in code, not by the LLM.
- **Communicated?** Yes — export action in the trend UI.
- **Evidence:** deterministic `trendStats` outputs covered by 28 tests.
- **Limitation:** reports are single-run artifacts; no persistent run history (in-memory).

---

## 3. What genuinely sets AstroLink apart (thesis)

AstroLink is **not** a flat collection of NASA API wrappers. Its distinctive combination is:

> *A location-and-period-driven Earth-system trend engine whose statistics are computed deterministically in code, whose data carries explicit provenance and gridded-reanalysis labelling, and whose AI layer is strictly a narrator of those verified numbers — with a full deterministic fallback when no AI provider is available.*

That "AI narrates, code computes" separation — plus the refusal to display mock data as real — is the element most aligned with the challenge's emphasis on **evidence-based Earth-system trend detection**.

---

## 4. Recommended improvements (only those with material impact)

1. **Rotate the exposed NASA key** and configure the production key pool — prerequisite for any public demo (highest priority).
2. **Enable `ADMIN_TOKEN`** on the host so CyberShield admin tooling is usable (deny-by-default is already safe).
3. **Optionally enable live FIRMS** (`FIRMS_MAP_KEY`) to add a genuine observation layer next to the reanalysis trend.
4. **Optionally configure an AI provider** so the narration path (already built and tested) runs live during judging.
5. **Disable production sourcemaps** (`build.sourcemap: false`) — minor info-disclosure reduction.
6. **Demo script:** open with the single strongest user question ("Has Faisalabad warmed over 10 years?"), show the real POWER-backed trend + confidence, then the provenance panel, then the deterministic vs AI narration toggle — a coherent scientific story, not a page tour.

---

## 5. Scope honesty

- No claim of global uniqueness, novelty, or victory is made.
- Every quantitative claim above is traceable to a live response or an automated test cited in this and the accompanying reports.
- Where evidence was unavailable (FIRMS key, live AI key, production host), the item is marked **BLOCKED**, not passed.
