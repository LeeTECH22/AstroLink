# ASTROLINK — AI AGENT REPORT (AstroLink Intelligence)

Internal version: V1.0.0 · Product: AstroLink

The AI research agent is named **AstroLink Intelligence**. It is a **grounded narration layer**:
the numbers are always produced by deterministic analysis of real NASA data, and the model is only
allowed to explain those numbers.

Files: `server/lib/ai.js` (provider adapter), `server/index.js` (`/api/ai/status`, `/api/ai/explain`),
`src/pages/Intelligence.tsx` (UI), `server/test/ai.test.js` + `platform.test.js` (tests).

---

## 1. Grounding contract (the model is never the source of truth)

- The frontend first runs the **deterministic** trend/anomaly computations locally.
- Those computed results are passed to the backend as a `facts` JSON object.
- The system prompt (`SYSTEM_PROMPT` in `server/lib/ai.js`) forbids the model from inventing
  measurements, statistics, dates, citations or API responses, and forbids causal/attribution
  claims. The model must use only numbers present in `facts` and must state units and data source.
- If `facts` are insufficient, the model must say so rather than guess.

## 2. Agent workflow (as implemented)

| Step | Where |
|---|---|
| 1. Understand the question | `Intelligence.tsx` |
| 2. Identify location, variable, period | `Intelligence.tsx` (location controls + presets) |
| 3. Discover suitable datasets | `GET /api/providers` catalog |
| 4. Retrieve data via trusted backend | `nasaApi.getPowerTrend(...)` |
| 5. Validate data + metadata | `buildMonthlySeries()` / `analyzeTrend()` |
| 6. Deterministic statistical analysis | `trendStats.ts` |
| 7. Visualisations | Chart.js series + regression overlay |
| 8. Explain the actual results | `POST /api/ai/explain` (or deterministic fallback) |
| 9. Provenance + limitations | provenance panel |
| 10. Exportable report | Markdown Blob download |

## 3. Provider configuration (server-side only)

Configured entirely from backend environment variables. No credentials are hardcoded and no paid
service is required — the platform is fully functional with **no** AI provider configured.

```
AI_PROVIDER = openai | anthropic | none      (default none)
OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL
ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_BASE_URL
AI_MAX_TOKENS                                 (default 700)
```

## 4. Graceful degradation

- `explain()` **never throws**. On missing configuration it returns `mode: 'deterministic-only'`.
- On provider errors it returns `available: true, answer: null, error: true` with a note that the
  deterministic results are unaffected.
- It retries once only on retryable upstream statuses (429 / 5xx).
- The frontend shows the deterministic explanation and a clear "AI unavailable" indicator.

## 5. Privacy controls

- No conversation history is stored server-side; the request is stateless.
- Only the question text (max 1000 chars) and the computed `facts` (max 12000 chars) are sent.
- Public status (`GET /api/ai/status`) exposes provider name + model + mode, **never** the key.

## 6. Verification evidence

`server/test/ai.test.js`:
- `AI: reports deterministic-only and never throws when unconfigured` — **PASS**
- `AI: status reflects configuration without leaking the key` — **PASS**
- `AI: the system prompt forbids inventing data and causal claims` — **PASS**

`server/test/platform.test.js`:
- `GET /api/ai/status reports AI availability without secrets` — **PASS**
- `POST /api/ai/explain validates input and stays deterministic when unconfigured` — **PASS**

Live check: `GET /api/ai/status` → `{"available":false,"provider":"none","model":null,"mode":"deterministic-only",...}`.

## 7. Non-claims

- The agent does **not** "know" NASA values; it narrates values computed elsewhere.
- The agent does **not** perform advanced reasoning beyond the supplied facts.
- No claim is made that AI narration is always correct; the deterministic numbers remain the
  authoritative output.

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Verified this session on Windows (backend `:5001`, frontend `:5173`, app version 1.0.0).

- Live `GET /api/ai/status` → `available:false`, `provider:'none'`, `mode:'deterministic-only'`.
- **Deterministic-only confirmed.** No AI provider credentials (`OPENAI_*` / `ANTHROPIC_*`) are configured in this environment, so **provider-backed generation is BLOCKED on external credentials**.
- The deterministic fallback remains honest: it never claims to be a live model output.
- Backend `GET /health` reports `aiNarration: "deterministic-only"`.

**Test & build evidence**
- Backend `node --test` (in `server/`) → **45 pass, 0 fail** (7 test files); includes the AI tests (`ai.test.js`, `platform.test.js`); 3 new regression tests added this session.
- Frontend `npm run test` (vitest) → **39 pass, 0 fail** (4 files).
- `tsc --noEmit` → 0 errors; `npm run lint` → 0 errors, 24 pre-existing warnings; `npm run build` → SUCCESS.

**Remaining owner action:** provide `OPENAI_*` / `ANTHROPIC_*` credentials to enable live AI narration (see Deployment Guide). No deployment was performed this session; no secrets printed.
