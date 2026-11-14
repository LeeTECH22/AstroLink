# AstroLink - Agent Instructions

## Project Overview

AstroLink is a NASA Space Exploration platform built with React 19, TypeScript, Vite, Express.js, and Tailwind CSS. It integrates multiple NASA APIs and provides a research assistant for NASA-related topics.

**Project Root**: `c:\Users\afnan\OneDrive\Desktop\AstroLink\AstroLink`
**Git Branch**: `feat/rapidapi-ai-provider`
**Live URL**: https://astro-link-xi.vercel.app/

## Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React hooks, React Query
- **Location**: `src/` directory

### Backend
- **Framework**: Express.js (Node.js)
- **Location**: `server/` directory
- **Entry Point**: `server/index.js`
- **Port**: 5001 (configurable via PORT env var)

### Key Directories
```
AstroLink/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (22 pages)
│   ├── services/       # API layer (api.ts)
│   ├── data/           # Static data (nasaResearch.ts)
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions (trendStats.ts)
│   ├── types/          # TypeScript type definitions
│   └── test/           # Frontend tests
├── server/
│   ├── lib/            # Backend libraries (ai.js, providers.js, cybershield.js)
│   ├── test/           # Backend tests (42 tests)
│   └── data/           # Runtime data (ai-usage.jsonl)
└── docs/               # Project documentation
```

## NASA Research Assistant

### Current Implementation
- **Frontend Page**: `src/pages/NasaAiResearch.tsx`
- **Backend Scope**: `server/lib/research.js`
- **Data Structure**: `src/data/nasaResearch.ts`

### Research Categories
- **Total Categories**: 21
- **Expected Questions**: 340
- **Current Questions Loaded**: 0 (EMPTY - needs to be populated)

### Category Structure
The 21 categories cover NASA topics including:
1. NASA's Origins and Hidden History (Q1-15)
2. Apollo Missions and the Moon Landing (Q16-40)
3. Moon Landing Controversies and Conspiracy Theories (Q41-53)
4. NASA Astronauts: Human Stories (Q54-70)
5. NASA Disasters, Accidents and Failures (Q71-86)
6. UFOs, UAPs and Extraterrestrial Life (Q87-106)
7. NASA's Mysterious Space Discoveries (Q107-125)
8. NASA's Famous Space Telescopes (Q126-140)
9. NASA's Mars Exploration Stories (Q141-157)
10. NASA's Voyager Missions and Interstellar Space (Q158-170)
11. NASA's Secret, Classified and Military-Related History (Q171-182)
12. International Space Competition (Q183-198)
13. International Space Station (Q199-211)
14. NASA's Forgotten, Cancelled and Abandoned Projects (Q212-225)
15. NASA's Rocket and Aircraft Engineering (Q226-242)
16. NASA and Earth: Discoveries About Our Own Planet (Q243-256)
17. The Sun, Moon and Solar System Mysteries (Q257-272)
18. NASA's Biggest Scientific and Technological Contributions (Q273-287)
19. NASA's Future Missions and Ambitions (Q288-302)
20. NASA's Lesser-Known Stories and Unusual Events (Q303-320)
21. NASA's Biggest Unanswered Questions (Q321-340)

### API Endpoints
- `GET /api/research/categories` - Returns research categories
- `POST /api/ai/research` - Non-streaming research chat
- `POST /api/ai/research/stream` - Streaming research chat (SSE)

### Conversation History
- **Current Implementation**: LocalStorage only (`astrolink:recentResearch`)
- **Max Recent Items**: 8
- **Persistence**: Browser-local only (no server persistence)

## AI Integrations

### Configured Providers
The application has a multi-provider AI system in `server/lib/ai.js`:

1. **RapidAPI (ChatGPT)**
   - Module: `server/lib/aiProviders/rapidapi.js`
   - Environment Variables:
     - `RAPIDAPI_KEY`
     - `RAPIDAPI_HOST` (default: chatgpt-42.p.rapidapi.com)
     - `RAPIDAPI_CHAT_PATH` (default: /gpt4)
     - `RAPIDAPI_ENABLED` (default: true)

2. **OpenAI**
   - Environment Variables:
     - `OPENAI_API_KEY`
     - `OPENAI_MODEL` (default: gpt-4o-mini)
     - `OPENAI_BASE_URL` (default: https://api.openai.com/v1)
     - `OPENAI_ENABLED` (default: true)

3. **Anthropic**
   - Environment Variables:
     - `ANTHROPIC_API_KEY`
     - `ANTHROPIC_MODEL` (default: claude-3-5-sonnet-latest)
     - `ANTHROPIC_BASE_URL` (default: https://api.anthropic.com/v1)
     - `ANTHROPIC_ENABLED` (default: true)

### AI Configuration
- **Provider Selection**: `AI_PROVIDER` (rapidapi | openai | anthropic | none)
- **Priority Order**: `AI_PROVIDER_PRIORITY` (comma-separated)
- **Default Mode**: `AI_PROVIDER=none` (deterministic-only)
- **Token Limits**: `AI_MAX_TOKENS` (700), `AI_RESEARCH_MAX_TOKENS` (1600)

### AI Endpoints
- `GET /api/ai/status` - Returns AI provider status
- `POST /api/ai/explain` - Explains deterministic results (Intelligence page)
- `POST /api/ai/research` - NASA Research assistant
- `POST /api/ai/research/stream` - Streaming research assistant
- `GET /api/admin/ai-usage` - Admin-only usage statistics

## Voice Features

### Current Status
- **Voice Components**: NOT IMPLEMENTED
- **Speech Recognition**: NOT IMPLEMENTED
- **Speech Synthesis**: NOT IMPLEMENTED
- **Microphone Controls**: NOT IMPLEMENTED

### Required Implementation
- Browser-native speech recognition (Web Speech API)
- Browser-native speech synthesis (Web Speech API)
- Microphone permission handling
- Voice input for questions
- Voice output for answers
- Stop speaking control

## Supabase Integration

### Current Status
- **Supabase Client**: NOT INSTALLED
- **Supabase Dependencies**: NOT ADDED
- **Database Connection**: NOT CONFIGURED

### Target Configuration
- **Project Reference**: wlpyytnbqtruposszrjn
- **Project URL**: https://wlpyytnbqtruposszrjn.supabase.co
- **Main Table**: `public.nasa_research_questions`
- **Expected Records**: 340

### Required Tables
1. **nasa_research_questions** (existing)
   - question_id
   - question
   - category
   - answer_material
   - scientific_background
   - key_findings
   - sources
   - related_questions
   - research_status
   - created_at
   - updated_at

2. **nasa_chat_sessions** (to be created)
   - id
   - user_id
   - title
   - created_at
   - updated_at

3. **nasa_chat_messages** (to be created)
   - id
   - session_id
   - role
   - message
   - question_id
   - matched_sources
   - created_at

## Environment Variables

### Frontend (VITE_*)
- `VITE_API_URL` - Backend API URL (empty uses /api proxy)
- `VITE_SUPABASE_URL` - Supabase project URL (to be added)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (to be added)

### Backend
- `PORT` - Server port (default: 5001)
- `NASA_API_KEY` - NASA API key (backend only)
- `NASA_API_KEY_2`, `NASA_API_KEY_3` - Failover keys
- `ALLOWED_ORIGINS` - CORS allowlist
- `SUPABASE_URL` - Supabase project URL (to be added)
- `SUPABASE_ANON_KEY` - Supabase anon key (to be added)
- `AI_PROVIDER` - AI provider selection
- `AI_PROVIDER_PRIORITY` - Provider priority order
- `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, etc. - RapidAPI config
- `OPENAI_API_KEY`, `OPENAI_MODEL`, etc. - OpenAI config
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, etc. - Anthropic config
- `ADMIN_TOKEN` - CyberShield admin token
- `FIRMS_MAP_KEY` - NASA FIRMS API key
- `ADS_API_KEY` - NASA ADS API key

## Security

### Current Security Features
- **CORS**: Configured allowlist via `ALLOWED_ORIGINS`
- **Rate Limiting**: General (120/min) and expensive (20/min)
- **CyberShield**: Multi-signal abuse detection with auto-expiring restrictions
- **Helmet**: Security headers
- **Request Timeout**: 45s hard cap
- **Body Size Limit**: 64kb
- **Key Redaction**: API keys redacted from logs
- **Secret Protection**: No VITE_* variables for secrets

### Git Status
- **Branch**: feat/rapidapi-ai-provider
- **Staged**: .env (deleted)
- **Modified**: Multiple files (package.json, server files, src files)
- **Untracked**: Multiple documentation files, new components

### .gitignore
- `.env` and variants are properly ignored
- `server/data/` ignored (AI usage logs)
- `node_modules/` ignored
- `dist/` ignored

## Testing

### Frontend Tests
- **Framework**: Vitest
- **Location**: `src/test/`, `src/**/*.test.ts`
- **Current Status**: 40/40 tests passing

### Backend Tests
- **Framework**: Node.js built-in test runner
- **Location**: `server/test/`
- **Current Status**: 42/42 tests passing

### Test Commands
```bash
npm test                    # Frontend tests
npm run test:watch          # Frontend watch mode
cd server && npm test       # Backend tests
npm run lint                # ESLint
npx tsc --noEmit            # TypeScript check
npm run build               # Production build
```

## Current Issues

### Critical
1. **NASA Research Questions Empty**: `RESEARCH_QUESTIONS` array is empty (0/340 questions)
2. **No Supabase Integration**: @supabase/supabase-js not installed
3. **No Voice Features**: Speech recognition/synthesis not implemented
4. **No Persistent History**: Conversations only in localStorage

### Medium
1. **AI Dependencies**: External AI providers (RapidAPI, OpenAI, Anthropic) configured but may need removal
2. **Missing AGENTS.md**: This file is being created now

## Development Workflow

### Starting the Application
```bash
npm run install:all    # Install all dependencies
npm run dev:full        # Start frontend (:5173) + backend (:5001)
```

### Building for Production
```bash
npm run build           # Build frontend to dist/
```

### Deployment
- **Frontend**: Vercel (set VITE_API_URL)
- **Backend**: Any Node.js hosting (set backend env vars)

## Important Notes

1. **Never commit .env files** - They are in .gitignore
2. **Never use VITE_* for secrets** - Vite inlines them into the public bundle
3. **NASA API keys stay server-side** - Frontend only uses DEMO_KEY
4. **AI keys stay server-side** - Never exposed to browser
5. **Preserve existing functionality** - Don't break working NASA API integrations
6. **Test after changes** - Run full test suite before committing
7. **Security first** - Never expose credentials, always validate inputs

## Supabase Migration Approval Required

Before creating or modifying production database tables:
1. Prepare migration SQL
2. Present for review
3. Wait for explicit approval
4. Execute only after approval

## Voice Implementation Priority

Voice features should be implemented using:
- Web Speech API (browser-native)
- No external AI APIs for speech
- Fallback for unsupported browsers
- Clear error states
- User permission handling

## AI API Removal Strategy

When removing external AI dependencies:
1. Identify all AI provider usage
2. Remove unused environment variables
3. Remove unused packages from package.json
4. Update .env.example
5. Test deterministic-only mode
6. Ensure no broken imports remain

## Final Goals

1. Integrate Supabase for NASA research data (340 questions)
2. Build persistent conversation history with Supabase
3. Implement voice-first experience
4. Remove unnecessary external AI API dependencies
5. Maintain all existing NASA API integrations
6. Pass all tests (frontend + backend)
7. Successful production build
8. Secure configuration
9. Comprehensive documentation

---

**Last Updated**: 2026-11-14
**Version**: 1.0.0
