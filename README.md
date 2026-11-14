# 🚀 AstroLink — NASA Earth Intelligence Platform

> **Developed by Viper NEX** — A full-stack web application that integrates NASA public APIs to explore space **and** Earth-system data, with the added focus of the NASA Space Apps Challenge 2026 theme: *"Be An Earth System Trend Detective!"*

![AstroLink](https://img.shields.io/badge/AstroLink-NASA%20Data%20Explorer-blue?style=for-the-badge&logo=nasa)
![Developer](https://img.shields.io/badge/Developer-Viper%20NEX-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Express](https://img.shields.io/badge/Express-backend-black?style=for-the-badge&logo=express)

Live: https://astro-link-xi.vercel.app/

## 🌍 Earth System Trend Detective (challenge focus)

- Multi-year **NASA POWER** monthly analysis (default **Faisalabad 31.418 N, 73.079 E**).
- Variables: 2 m temperature (`T2M`), precipitation (`PRECTOTCORR`), solar radiation (`ALLSKY_SFC_SW_DWN`).
- Monthly + annual aggregation, seasonal climatology, two-location comparison.
- Statistics: OLS linear regression, **Mann-Kendall**, **Sen's slope**, p-values, 95 % confidence intervals.
- Completeness / missing-value analysis and robust outlier detection.
- **Provenance on every result**: location, variable + unit, dataset, date range, resolution, valid
  count, missing %, trend direction + magnitude, significance, uncertainty and limitations.
- Scientific honesty: NASA POWER is **gridded/model-derived (reanalysis), not ground measurements**;
  statistical significance is **not** causation or climate attribution.

## 🤖 AstroLink Intelligence (AI research agent)

A grounded assistant that runs deterministic analysis first and then optionally asks an LLM to
**narrate** it. The model is never the source of numbers and may not invent measurements,
statistics, citations or API responses. Configured through **server-side** environment variables
(OpenAI-compatible or Anthropic); runs fully in **deterministic-only** mode when unconfigured.

## 🛰 Multi-source Data Explorer & Geospatial

A unified provider layer with normalized provenance envelopes for **NASA POWER** (reanalysis),
**EONET** (events), **FIRMS** (observations, keyed), **CMR/Earthdata** (catalog) and **GIBS**
(imagery), with caching, timeouts, bounded retries, per-provider circuit breakers and health
metrics. The Geospatial Explorer (`/geospatial`) overlays **real** EONET events and (when configured)
FIRMS fire hotspots on an interactive map.

## 🛡 CyberShield (defensive security)

Extends the security foundation with multi-signal abuse detection, progressive **auto-expiring**
temporary restrictions, an admin token (deny-by-default), and a sanitized, access-controlled audit
log with a monitoring dashboard (`/cybershield`). In-process, no Redis required.

## ✨ Existing features (preserved)

- **APOD**, **Mars Rover**, **Near Earth Objects**, **Space Weather (DONKI)**, **Earth Images (EPIC)**,
  **Natural Events (EONET)**, **Image Library**, **TechPort**, **Small Bodies**, **Earth Data Search**,
  **Exoplanets**, **Astrophysics Data**.

## 🏗 Architecture

```
AstroLink/
├── src/                     # React + TypeScript frontend
│   ├── components/          # Reusable UI
│   ├── pages/               # Pages (incl. EarthTrends, Intelligence, DataExplorer, Geospatial, CyberShield)
│   ├── services/            # API layer (api.ts)
│   ├── utils/               # trendStats.ts (statistics), chartHelpers.ts
│   └── types/               # Shared types
├── server/                  # Express backend (entry: index.js)
│   └── lib/                 # providers.js, ai.js, cybershield.js
└── dist/                    # Production build output
```

## 🚀 Quick Start

```bash
git clone https://github.com/LeeTECH22/AstroLink.git
cd AstroLink
npm run install:all
npm run dev:full            # frontend :5173 + backend :5001 (Vite proxies /api)
```

### Environment variables

Copy `.env.example` to `.env` and fill in values (see the file for full documentation):

- `NASA_API_KEY` (**backend only**, required) — optional `_2` / `_3` or `NASA_API_KEYS` for failover.
- `ALLOWED_ORIGINS` — CORS allowlist (include your deployed frontend origin).
- `VITE_API_URL` — deployed backend base URL (e.g. `https://<backend>/api`); empty uses `/api`.
- Optional: `ADMIN_TOKEN`, `FIRMS_MAP_KEY`, `AI_PROVIDER` + `OPENAI_*`/`ANTHROPIC_*`, `AI_MAX_TOKENS`.

> **Security:** never put a private key in a `VITE_*` variable — Vite inlines those into the public
> bundle. The frontend only ever uses NASA's public `DEMO_KEY` for client-side fallbacks.

## 🧪 Testing & quality

```bash
npx vitest run            # frontend tests (40)
npx tsc --noEmit          # type check
npm run lint              # ESLint
npm run build             # production build
npm --prefix server test  # backend tests (42)
npm audit --omit=dev      # production dependency audit
```

Current status: frontend **40/40**, backend **42/42**, `tsc` clean, build PASS, production audit
**0 vulnerabilities** (7 dev-only advisories remain in the ESLint toolchain).

## 🚀 Deployment

- **Frontend:** Vercel — set `VITE_API_URL` to the backend URL and add the site origin to
  `ALLOWED_ORIGINS` on the backend.
- **Backend:** deploy the `server/` folder, set the backend env vars, expose a public HTTPS URL.

Full instructions, manual steps and verification: `ASTROLINK_DEPLOYMENT_GUIDE.md`.

## 📚 Documentation

| Document | Contents |
|---|---|
| `ASTROLINK_FINAL_PROGRESS.md` | Progress, status, limitations, manual actions |
| `ASTROLINK_SCIENTIFIC_VALIDATION.md` | Methods + synthetic-dataset validation |
| `ASTROLINK_AI_AGENT_REPORT.md` | Grounded AI agent |
| `ASTROLINK_DATA_FUSION_REPORT.md` | Unified provider layer |
| `ASTROLINK_ML_VALIDATION.md` | Anomaly / forecast validation |
| `ASTROLINK_CYBERSHIELD_REPORT.md` | Defensive security |
| `ASTROLINK_FINAL_TEST_RESULTS.md` | Exact test evidence |
| `ASTROLINK_DEPLOYMENT_GUIDE.md` | Deployment + manual steps |
| `ASTROLINK_HACKATHON_DEMO.md` | Demonstration walkthrough |

## 📝 License

MIT — see [LICENSE](LICENSE).

## 👨‍💻 Developer

**Viper NEX** — building tools that make NASA's data accessible and scientifically honest.

## 🙏 Acknowledgments

- NASA for open access to its data and APIs.
- The open-source community for the tools and libraries.

---

*Internal project version: V1.0.0 (not displayed in the product UI). AstroLink is not endorsed by
NASA and has no official partnership with NASA.*
