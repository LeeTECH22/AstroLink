# AstroLink V1.0.0 — Production Readiness Report

**Architecture (preserved, not redesigned):**
- **Frontend:** static Vite SPA → **Vercel**
- **Backend:** standalone Express/Node service → **Render / Railway** (Node hosting)

> **Status: BLOCKED for live production.** No deployment was performed (Rule 13). This document specifies exactly how to deploy; values below are derived from the actual repository configuration, not assumed.

---

## 1. Backend hosting (Render — primary recommendation)

| Setting | Exact value | Source |
|---------|-------------|--------|
| **Root Directory** | `server` | Backend has its own [package.json](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/package.json) with `start: node index.js` |
| **Build Command** | `npm install` | No build step for the CommonJS backend |
| **Start Command** | `npm start` (equivalent to `node index.js`) | `server/package.json` scripts |
| **Health Check Path** | `/health` | `app.get('/health', ...)` in [server/index.js](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/index.js) |
| **Instance Port** | Bind to `process.env.PORT` (Render injects it); local default `5001` | `const PORT = process.env.PORT || 5001` |
| **Node.js version** | 18+ (developed/verified on **v24.18.1**); set `engines.node` or Render's `NODE_VERSION` to `>=18` | — |
| **Lockfile** | `server/package-lock.json` (committed) — use `npm install` (not `npm ci`) only if the lockfile drifts; `npm ci` is preferred for reproducibility | — |

> Railway is equivalent: set the same Root Directory / Start / health path; it also injects `PORT`.

### 1.1 Required backend environment variables

**Required**

| Variable | Purpose | Example |
|----------|---------|---------|
| `NASA_API_KEY` | Primary NASA key (server-side only) | `<rotated key>` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist | `https://astro-link-xi.vercel.app` |

**Recommended / optional**

| Variable | Purpose | Default |
|----------|---------|---------|
| `NASA_API_KEY_2`, `NASA_API_KEY_3` (or `NASA_API_KEYS` comma list) | Failover key pool on 401/403/429 | falls back to `DEMO_KEY` |
| `ADMIN_TOKEN` | Protects CyberShield admin endpoints (timing-safe compare). **Deny-by-default when unset** | unset → all admin routes 403 |
| `FIRMS_MAP_KEY` | Enables live FIRMS fire data | unset → FIRMS `configured:false` |
| `AI_PROVIDER` | `openai` \| `anthropic` \| `none` | `none` (deterministic-only) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | AI narration provider | unset |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL`, `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL`, `AI_MAX_TOKENS` | AI tuning | model defaults, 700 tokens |
| `RATE_LIMIT_MAX`, `EXPENSIVE_RATE_LIMIT_MAX` | Rate-limit tuning | 120 / 20 per min |
| `ABUSE_WINDOW_MS`, `ABUSE_RATE_THRESHOLD`, `ABUSE_INVALID_THRESHOLD`, `ABUSE_PATH_THRESHOLD`, `ABUSE_SIGNALS_REQUIRED`, `ABUSE_RESTRICTION_STEPS`, `TRUSTED_IPS` | CyberShield tuning | 300000 / 90 / 12 / 8 / 2 / `15,30,60,120,300` / empty |
| `APP_VERSION` | Internal version reported by `/health` | `1.0.0` |

**Never** place any of these in a `VITE_*` variable (they would be inlined into the client bundle).

### 1.2 Backend persistence & scaling limitations (must be disclosed)

| Limitation | Impact | Mitigation |
|------------|--------|-----------|
| **In-memory state** | CyberShield metrics/restrictions, provider TTL cache, and circuit-breaker state live in process memory and **reset on restart/redeploy** | Acceptable for the demo; a durable store (Redis) is a future enhancement, not required for judging |
| **Single instance assumption** | In-memory rate limiting and CyberShield are per-instance | Keep to a single instance for the demo |
| **Free-tier cold start** | Render/Railway free instances sleep; first request after idle is slow | Warm the `/health` endpoint before the demo; note the cold-start delay |
| **No Node cluster** | Single process | Fine at demo scale |
| **`trust proxy = 1`** | Required so rate limiting sees the real client IP behind the host's proxy | Already set |

---

## 2. Frontend hosting (Vercel)

| Setting | Exact value |
|---------|-------------|
| **Framework preset** | Vite |
| **Root Directory** | repository root (frontend project) |
| **Build Command** | `npm run build` (→ `tsc && vite build`) |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **SPA routing** | `vercel.json` rewrite: all routes → `/index.html` (present) |

### 2.1 Required frontend environment variable (Vercel → Project → Settings → Environment Variables)

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Absolute backend base URL, **no trailing slash** | `https://astro-link-api.onrender.com/api` |

- If unset, the client uses the same-origin `/api` (which only works with the Vite dev proxy). **Production requires `VITE_API_URL`.**
- After changing it, **redeploy** (Vite inlines `VITE_*` at build time).
- Must **exactly match** one entry in the backend `ALLOWED_ORIGINS` (CORS would otherwise return 403).

### 2.2 Production CORS origin pairing

| Frontend origin | Backend CORS must include |
|-----------------|---------------------------|
| `https://astro-link-xi.vercel.app` | Already in `DEFAULT_ALLOWED_ORIGINS` |

If a custom Vercel domain is added, append it to backend `ALLOWED_ORIGINS`.

---

## 3. Deployment order (when the owner is ready)

1. **Rotate** the NASA key exposed in history `bdd07b8` (mandatory, before anything public).
2. Create the backend service on Render/Railway from the repo, Root Directory `server`, Start `npm start`, health `/health`.
3. Set backend env: `NASA_API_KEY` (+ `_2`/`_3`), `ALLOWED_ORIGINS`, and optionally `ADMIN_TOKEN`, `FIRMS_MAP_KEY`, `AI_*`.
4. Verify `GET https://<backend-host>/health` returns 200 with a safe body.
5. On Vercel, set `VITE_API_URL=https://<backend-host>/api`, then redeploy.
6. Verify CORS: an API call from the Vercel origin returns `200` with `Access-Control-Allow-Origin`.

---

## 4. Post-deployment verification procedure

```powershell
# 1) Backend health (expect 200, safe JSON)
curl.exe -i https://<backend-host>/health

# 2) Provider catalog (expect 5 providers, no secrets)
curl.exe -s https://<backend-host>/api/providers

# 3) Real data path (expect 200 + provenance)
curl.exe -s "https://<backend-host>/api/power/trend?latitude=31.42&longitude=73.08&startYear=2015&endYear=2024&parameters=T2M"

# 4) CORS from the production origin (expect Access-Control-Allow-Origin header)
curl.exe -i -H "Origin: https://astro-link-xi.vercel.app" https://<backend-host>/health

# 5) CyberShield deny-by-default (expect 403 without token)
curl.exe -i https://<backend-host>/api/cybershield/metrics
```

Then open the Vercel site, confirm the browser Network tab shows calls to the backend base URL (not `localhost`), and confirm no console errors.

---

## 5. Production-readiness verdict

| Requirement | Status |
|-------------|--------|
| Backend root/build/start/health specified from repo | **PASS** |
| Backend env vars enumerated | **PASS** |
| Frontend env var (`VITE_API_URL`) specified | **PASS** |
| Correct production CORS origin | **PASS** |
| Correct API base URL behavior | **PASS** |
| Node version / lockfiles | **PASS** |
| Persistence / cold-start limitations documented | **PASS** |
| Architecture preserved (Vercel FE + Node BE) | **PASS** |
| **Live production deployment** | **BLOCKED** — requires owner-provided secrets, hosting accounts, and key rotation; no deploy performed per Rule 13 |

---

## Session Update — 2026-11-14 (Engineering Repair & Verification)

Post-repair verification of the local stack. **No deployment was performed** (Rule 13); the architecture and settings in §1–§4 are unchanged.

**Local runtime confirmed:** backend port **5001**; frontend Vite dev server port **5173** with proxy `/api` → `http://localhost:5001`; app version **1.0.0**.

**`/health` (live):** 200 — `version` `1.0.0`, `aiNarration` "deterministic-only", `nasaApiKeys` "configured", `keyFailover` true.

**Security controls verified live (production-relevant):**

| Control | Result |
|---|---|
| Allowlisted CORS origin | 200 + `Access-Control-Allow-Origin` |
| Disallowed origin | 403 |
| Unknown `/api` route | JSON 404 |
| Invalid query (`latitude=999`) | 400 |
| Security headers | `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN`; `x-powered-by` absent |
| CyberShield admin (no token) | 403 (deny-by-default, timing-safe compare) — the public UI has no admin token entry and no admin menu |

**AI:** deterministic-only mode confirmed; provider-backed generation is **BLOCKED** on external credentials (none configured in this environment).

**Remaining manual owner actions (unchanged):**

1. Rotate the NASA API key exposed in historical commit `bdd07b8`.
2. Set Vercel env `VITE_API_URL` (no trailing slash) to the deployed backend URL.
3. Set backend `ALLOWED_ORIGINS` to the production frontend origin, and `ADMIN_TOKEN` for CyberShield admin.
4. Provide `OPENAI_*` / `ANTHROPIC_*` to enable live AI narration.
5. ADS requires its own token (currently an honest demo fallback).
6. DONKI FLR upstream returns 404 (NOAA SWPC X-ray fallback is in place).

**Quality gates green this session:** production `build.sourcemap` now disabled; backend `node --test` 45 / 45 (7 files, 3 new regression tests); frontend vitest 39 / 39 (4 files); `tsc --noEmit` 0 errors; `npm run build` SUCCESS (973 modules, source maps disabled); `npm run lint` 0 errors / 24 pre-existing warnings; backend `npm audit` 0; frontend `npm audit` 27 advisories (11 production-relevant) deferred.
