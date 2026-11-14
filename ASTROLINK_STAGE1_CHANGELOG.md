# ASTROLINK — STAGE 1 CHANGELOG

**Date:** 2026-11-14
**Stage:** 1 — Foundation Stabilization, Security Hardening & Deployment Readiness
**Note:** No commit or push was performed. All changes are on the working tree.

---

## Added

| File | Purpose |
|---|---|
| [`server/test/api.test.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/test/api.test.js) | Backend integration tests (health, headers, CORS, validation, 404) |
| [`server/test/ratelimit.test.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/test/ratelimit.test.js) | 429 rate-limit test |
| [`server/test/failover.test.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/test/failover.test.js) | Multi-key failover test |
| [`server/__verify_failover.cjs`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/__verify_failover.cjs) | Deterministic failover harness (permanent test helper) |
| [`src/utils/trendStats.test.ts`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/utils/trendStats.test.ts) | Statistics unit tests |
| [`src/components/ErrorBanner.test.tsx`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/components/ErrorBanner.test.tsx) | Error-state component test |
| [`src/services/api.test.ts`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/services/api.test.ts) | API client config + no-secret test |
| [`src/test/setup.ts`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/test/setup.ts) | Vitest setup (jest-dom matchers) |
| [`eslint.config.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/eslint.config.js) | ESLint 9 flat config (none existed before) |
| `ASTROLINK_STAGE1_*.md` (5 reports) + `ASTROLINK_STAGE1_PROGRESS.md` | Stage 1 documentation & tracker |

## Changed

| File | Change |
|---|---|
| [`server/index.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/index.js) | Added Helmet, CORS allowlist (+ prod origin), rate limiters (general + expensive), 16 kB body cap, 45 s timeout, cache headers, `sendError()`, schema validation on all routes, JSON 404, centralized error handler, `trust proxy`, `app.disable('x-powered-by')`, safe `/health`, `nasaGet` failover applied to all keyed routes, EPIC date bug fix, unhandled-rejection/exception guards |
| [`package.json`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/package.json) | Pinned `tailwindcss@^3.4.1`; added `test`/`test:watch` (vitest); simplified `lint` scripts; added test devDeps |
| [`server/package.json`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/package.json) | Added `test: node --test`; security deps `helmet`, `express-rate-limit` |
| [`vite.config.ts`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/vite.config.ts) | Vitest config (jsdom, setup file); typed via `vitest/config` |
| [`src/services/api.ts`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/src/services/api.ts#L17-L21) | Removed dead SSR `localhost:5001` fallback; base URL = `VITE_API_URL || '/api'` |
| `.env.example` | Documented multi-key failover vars, `ALLOWED_ORIGINS`, `VITE_API_URL`, security note |

## Removed / untracked

| Item | Detail |
|---|---|
| `.env` (Git tracking) | `git rm --cached .env` — **staged, not committed**; local file preserved |
| Tailwind v4 | downgraded/pinned to v3.4.1 (fixes build) |

## Not changed (intentional)
- [`server/app.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/app.js) — orphaned dead code; left in place pending user approval.
- Frontend pages/components/routes — all preserved.
- Dependency versions not required for security/build — not upgraded.

## Evidence
- Build: `npm run build` → PASS
- Backend tests: **14/14** PASS · Frontend tests: 15/15 PASS
- `tsc --noEmit` PASS · `eslint .` 0 errors / 23 warnings · backend `npm audit` 0 vulnerabilities

---

## Final verification pass (2026-11-14)

Verification-only review. Changes made:

| File | Change |
|---|---|
| [`server/__verify_failover.cjs`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/__verify_failover.cjs) | Added `FAILOVER_FAIL_COUNT` (default 1) so the harness can exhaust N keys — enables proving the full 3-key pool walk. Default behaviour unchanged. |
| [`server/test/failover.test.js`](file:///c:/Users/afnan/OneDrive/Desktop/AstroLink/AstroLink/server/test/failover.test.js) | Refactored to a shared `runHarness()` helper; added a second test asserting ≥3 distinct keys are exercised. |
| `ASTROLINK_STAGE1_*.md` | Updated audit/security/test/deployment/progress reports with the verification results. |

No production code changed. No packages upgraded. No commit/push/deploy/history rewrite.

**Verification results:** `.env` untracked (pure deletion staged, local file kept); no secrets in `src/` or `dist/`; 3/3 keys exercised in failover; all tests pass (backend 14/14, frontend 15/15); 27 advisories categorized (11 production-only).
