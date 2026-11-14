# ASTROLINK — DEPLOYMENT GUIDE

Internal version: V1.0.0 · Product: AstroLink

This guide preserves the **existing** deployment architecture: the React frontend on **Vercel** and
the Express backend on a separate host. No new hosting provider or URL is invented. Deployment is
**BLOCKED** until the manual steps below are completed and verified against the live environment.

---

## 1. Architecture

```
Browser ──▶ Vercel (React/Vite SPA)  ──VITE_API_URL──▶  Backend host (Express)
                                                        └─ NASA APIs (server-side keys)
```

- Frontend reads `VITE_API_URL`; if empty it falls back to same-origin `/api`.
  ([src/services/api.ts](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/services/api.ts#L25-L38))
- In local dev, Vite proxies `/api` → `http://localhost:5001`.
  ([vite.config.ts](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/vite.config.ts#L23-L32))

## 2. Backend environment variables (host settings — NEVER committed)

| Variable | Required | Purpose |
|---|---|---|
| `NASA_API_KEY` | yes | Primary NASA key (server-side only) |
| `NASA_API_KEY_2`, `NASA_API_KEY_3` (or `NASA_API_KEYS=a,b,c`) | recommended | Automatic multi-key failover on 401/403/429 |
| `ALLOWED_ORIGINS` | yes | CORS allowlist; **must include** `https://astro-link-xi.vercel.app` |
| `PORT` | no | Default 5001 |
| `ADMIN_TOKEN` | optional | Enables CyberShield admin dashboard (deny-by-default when unset) |
| `FIRMS_MAP_KEY` | optional | Enables the FIRMS fire layer / observation provider |
| `AI_PROVIDER` + `AI_PROVIDER_PRIORITY` | optional | Selects the AI provider (default order `rapidapi,openai,anthropic`); `none` disables AI |
| `RAPIDAPI_KEY`, `RAPIDAPI_HOST` | optional | RapidAPI ChatGPT provider (server-side only; key never leaves the backend) |
| `RAPIDAPI_PRIMARY_MODEL`, `RAPIDAPI_FALLBACK_MODEL`, `RAPIDAPI_CHAT_PATH` | optional | Provider-specific model/endpoint identifiers (verify against your own subscription) |
| `OPENAI_*` / `ANTHROPIC_*` + `AI_MAX_TOKENS` | optional | Alternative AI narration providers; deterministic-only when none configured |
| `TRUSTED_IPS`, `ABUSE_*`, `RATE_LIMIT_MAX`, `EXPENSIVE_RATE_LIMIT_MAX` | optional | Tuning (defaults documented in `.env.example`) |

> **RapidAPI AI provider (server-side only).** Set `RAPIDAPI_KEY` in the **backend host** environment
> only. The backend reads it from `process.env.RAPIDAPI_KEY`; it is never sent to the browser and must
> **never** be placed in a Vercel `VITE_*` variable. Usage totals and provider health are persisted to
> `server/data/ai-usage.jsonl` (git-ignored; set `AI_USAGE_DISABLED=true` on a read-only filesystem) and
> are readable at the admin-protected `GET /api/admin/ai-usage` (requires `x-admin-token`).


## 3. Frontend environment variables (Vercel project settings)

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | yes (prod) | Deployed backend base URL including `/api`, e.g. `https://<backend-host>/api` |

**Do NOT** set any `VITE_*` variable containing a private key — Vite inlines `VITE_*` into the public
bundle. The frontend only ever uses NASA's public `DEMO_KEY` for client-side fallbacks.

## 4. Deployment checklist

1. [ ] Rotate the previously exposed NASA key (commit `bdd07b8`) at https://api.nasa.gov.
2. [ ] Set backend env vars (§2) on the backend host and redeploy the backend.
3. [ ] Confirm the backend host exposes a public HTTPS URL.
4. [ ] Set `VITE_API_URL` (§3) in Vercel to `https://<backend-host>/api` and redeploy the frontend.
5. [ ] Confirm `ALLOWED_ORIGINS` contains `https://astro-link-xi.vercel.app`.
6. [ ] Verify the backend health endpoint: `GET https://<backend-host>/health` → 200.
7. [ ] Open the live site and confirm data loads (no requests to `localhost`).

## 5. Post-deployment verification

| Check | How | Expected |
|---|---|---|
| Health | `GET {backend}/health` | 200, safe JSON, no secrets |
| CORS | Browser console on the live site | No CORS errors; API calls succeed |
| No localhost | DevTools Network on the live site | No `localhost:5001` requests |
| Providers | `GET {backend}/api/providers` | 5 providers |
| Trend | UI: Earth Trends → Faisalabad, T2M 2015–2024 | Real POWER data + trend |
| AI | `GET {backend}/api/ai/status` | `deterministic-only` or `ai-assisted` |
| AI usage | `GET {backend}/api/admin/ai-usage` | 401 without `x-admin-token`; 200 with it (sanitized totals only) |
| CyberShield | `GET {backend}/api/cybershield/metrics` | 403 without token; 200 with `x-admin-token` |
| Secrets in build | Inspect deployed JS for `api_key=<value>` | None (only public `DEMO_KEY`) |

## 6. Local reproduction

```bash
npm run install:all          # install root + server deps
npm run dev:full             # frontend :5173 + backend :5001 (proxied)
# or individually:
npm run dev                  # frontend
npm --prefix server start    # backend
```

Build + serve production locally:

```bash
npm run build                # → dist/
npm run preview
```

## 7. Known deployment considerations

- `vite.config.ts` sets `sourcemap: true`; production source maps are emitted. This is not a secret
  leak but does expose source structure — consider disabling in production if desired (not changed
  here to avoid altering existing configuration).
- CyberShield state is in-process/per-instance (resets on restart); behind multiple instances the
  metrics are per-instance. This is a documented limitation, not a bug.
- Deployment is **BLOCKED** until the manual steps in §4 are executed by the user.

## 8. Manual actions required (owner)

1. Rotate the exposed NASA key and set backend env vars.
2. Set `VITE_API_URL` and `ALLOWED_ORIGINS` for the live environment.
3. Decide whether to delete the unreferenced files `server/app.js` and `__verify_trend_stats.mjs`.

The assistant must **not** commit, push, rewrite history, or expose secrets. Verification of the
resulting **behaviour** (not secret values) is permitted after the user performs these steps.

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Verified this session on Windows. **No deployment, commit, push or history rewrite was performed.**

**Local environment verified**
- Backend local port **5001**; frontend Vite dev server **5173** with proxy `/api → http://localhost:5001`; app version **1.0.0**.

**Build, audit and test evidence**
| Check | Result |
|---|---|
| `npm run build` (`tsc && vite build`) | **SUCCESS**, 973 modules transformed, source maps disabled |
| `tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors, 24 pre-existing warnings |
| Frontend `npm run test` (vitest) | 39 pass, 0 fail (4 files) |
| Backend `node --test` | 45 pass, 0 fail (7 files, 3 new regression tests) |
| Backend `npm audit` | 0 vulnerabilities |
| Frontend `npm audit` | 27 advisories (11 production-relevant), deferred |

**Live `/health` snapshot (freshly restarted backend, HTTP 200)**
- `version: "1.0.0"`, `aiNarration: "deterministic-only"`, `nasaApiKeys: "configured"`, `keyFailover: true`.

**Remaining manual owner actions**
1. Rotate the NASA API key exposed in historical commit `bdd07b8`.
2. Set Vercel env `VITE_API_URL` (no trailing slash) to the deployed backend URL.
3. Set backend `ALLOWED_ORIGINS` to the production frontend origin and `ADMIN_TOKEN` for CyberShield admin.
4. Provide `OPENAI_*` / `ANTHROPIC_*` to enable live AI narration.
5. ADS requires its own token.
6. DONKI FLR upstream returns 404 (NOAA fallback is in place).

No secrets were printed.
