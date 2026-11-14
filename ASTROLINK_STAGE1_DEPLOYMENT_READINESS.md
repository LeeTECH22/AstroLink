# ASTROLINK — STAGE 1 DEPLOYMENT READINESS

**Date:** 2026-11-14
**Deployment target (existing):** Frontend → Vercel (`https://astro-link-xi.vercel.app`). Backend → Node/Express host (separate service).
**Status key:** `Ready` · `Requires manual action` · `Not verified` · `Blocked`

> No deployment was performed in Stage 1. Nothing below claims deployment success.

---

## 1. Frontend (Vercel)

| Item | Status | Detail |
|---|---|---|
| Vercel compatibility | Ready | standard Vite SPA; build = `npm run build` → `dist/` |
| Production build | Ready · Tested-Passed | `tsc && vite build` succeeds (see test results) |
| No `vercel.json` present | Not verified | no rewrite/proxy config exists; relies on `VITE_API_URL` pointing at the backend |
| Production API base URL | **Requires manual action** | set Vercel env `VITE_API_URL=https://<backend-host>/api` |
| No server secrets in build | Ready · Tested-Passed | `dist/` scan shows only the public `DEMO_KEY` |
| No accidental localhost in production | Ready · Fixed | removed the dead SSR `http://localhost:5001/api` branch in [api.ts](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/services/api.ts#L17-L21); base URL is now `VITE_API_URL || '/api'` |
| Dev API base URL | Ready | Vite `server.proxy` maps `/api` → `http://localhost:5001` |

### Frontend env variables to set on Vercel
| Variable | Required | Example |
|---|---|---|
| `VITE_API_URL` | Yes (production) | `https://<your-backend-host>/api` |

> ⚠️ Never put a private NASA key in a `VITE_*` variable — Vite inlines it into the public bundle.

---

## 2. Backend (Node/Express)

| Item | Status | Detail |
|---|---|---|
| Production CORS | Ready · Fixed | default allowlist now includes `https://astro-link-xi.vercel.app`; override with `ALLOWED_ORIGINS` |
| Env validation | Ready | missing key → falls back to `DEMO_KEY` with a clear warning; no secret printed |
| Health endpoint | Ready · Tested-Passed | `GET /health` returns status/service/version/timestamp/uptime + safe `services` block |
| Safe error handling | Ready · Tested-Passed | generic messages; JSON 404; 403 for CORS |
| Startup config | Ready | `trust proxy` set for reverse proxies; `PORT` env honoured (default 5001) |
| Multi-key failover | Ready · Tested-Passed | 3 keys supported (`NASA_API_KEY`, `_2`, `_3`, `NASA_API_KEYS`, or duplicate lines) |
| Dependency audit | Ready · Tested-Passed | `found 0 vulnerabilities` |

### Backend env variables to set on the host
| Variable | Required | Notes |
|---|---|---|
| `NASA_API_KEY` | Yes | primary key (server-side only) |
| `NASA_API_KEY_2`, `NASA_API_KEY_3` (or `NASA_API_KEYS`) | Recommended | enables automatic failover |
| `ALLOWED_ORIGINS` | Recommended | comma-separated, must include the deployed frontend origin |
| `PORT` | Optional | host-provided in most managed runtimes |
| `APP_VERSION` | Optional | surfaced by `/health` |
| `RATE_LIMIT_MAX`, `EXPENSIVE_RATE_LIMIT_MAX` | Optional | tune throttling |

---

## 3. Cross-service wiring checklist (manual)

1. Deploy/host the Express backend; confirm `GET https://<backend-host>/health` returns `200`.
2. In Vercel → Project → Settings → Environment Variables, set `VITE_API_URL=https://<backend-host>/api` and redeploy.
3. On the backend host, set `ALLOWED_ORIGINS=https://astro-link-xi.vercel.app` (plus any preview URLs you use).
4. Rotate the previously exposed NASA key, then update the backend env values.
5. Confirm the deployed site loads data and that the browser Network tab calls the backend host, **not** `localhost`.

---

## 4. Can we claim deployment success?
**No.** Stage 1 verified the *artifacts* (build, tests, config, live local runtime). Actual Vercel/backend deployment and post-deploy runtime verification were **not** performed and must not be asserted as passing.

## 5. Blocked
- `Blocked` — committing `.env` untracking (no auto-commit allowed; change is staged).
- `Requires manual action` — Vercel & backend host env variables, and the NASA key rotation.

---

## 6. Final verification pass (2026-11-14)

### 6.1 Backend production configuration requirements — VERIFIED
| Requirement | Where | Verified |
|---|---|---|
| `trust proxy` set for hosts behind a reverse proxy | [`server/index.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/index.js) `app.set('trust proxy', 1)` | ✅ |
| `PORT` read from env (default 5001) | `const PORT = process.env.PORT || 5001` | ✅ |
| `x-powered-by` disabled | `app.disable('x-powered-by')` | ✅ (live header absent) |
| CORS allowlist incl. production origin | `DEFAULT_ALLOWED_ORIGINS` includes `https://astro-link-xi.vercel.app` | ✅ (live ACAO echoed) |
| Secrets from env only | `buildNasaKeyPool()` from `process.env` + `.env` | ✅ |
| 3-key pool + failover | pool logs `3 key(s)`; both failover tests pass | ✅ |
| Health endpoint safe | `GET /health` 200, no secrets/paths | ✅ |
| Safe error handling | `sendError()` + JSON 404 + central handler | ✅ |
| Startup config | `app.listen(PORT, …)` | ✅ |

### 6.2 Frontend `VITE_API_URL` handling — VERIFIED
- Resolver: `const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'` — [api.ts](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/services/api.ts#L17-L21).
- Declared in [vite-env.d.ts](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/vite-env.d.ts): `readonly VITE_API_URL: string`.
- Empty value (as shipped in `.env.example`) falls back to same-origin `/api` (Vite dev proxy → `http://localhost:5001`).
- No `localhost` string remains in `dist/` (verified — the dead SSR branch was removed).
- **Production requirement (manual):** set `VITE_API_URL=https://<backend-host>/api` in Vercel, else the deployed SPA will call its own origin and 404.

### 6.3 Not done
- No deployment performed; no `vercel.json` exists; production runtime was **not** verified. Deployment success is **not** claimed.
