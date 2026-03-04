# EyeRadar Exercises

A comprehensive AI-powered gamified intervention platform for dyslexia. Built as the exercise and training companion to EyeRadar's eye-tracking diagnostic system, the platform delivers personalized learning adventures through 35+ educational games, adaptive difficulty, and real-time progress tracking — all wrapped in an engaging pixel-art game experience that children love.

---

## Table of Contents

- [What is EyeRadar Exercises?](#what-is-eyeradar-exercises)
- [How It Works](#how-it-works)
  - [Guardian Flow](#guardian-flow)
  - [Child Flow](#child-flow)
  - [The AI Engine](#the-ai-engine)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
  - [Backend](#backend-env)
  - [Frontend](#frontend-env)
- [Keycloak Configuration](#keycloak-configuration)
- [Stripe Billing](#stripe-billing)
- [Deployment (Railway)](#deployment-railway)
- [API Reference](#api-reference)
- [Game Catalog](#game-catalog)
- [Adventure Mode](#adventure-mode)
- [Shop & Rewards](#shop--rewards)

---

## What is EyeRadar Exercises?

EyeRadar Exercises turns dyslexia intervention into an adventure. After a child is diagnosed through the EyeRadar eye-tracking platform, their diagnostic profile flows into this system — where AI maps their specific deficits to a personalized journey of worlds, levels, and boss battles.

```
EyeRadar Diagnostic Platform          EyeRadar Exercise Platform
┌─────────────────────────┐           ┌──────────────────────────────────────┐
│  Eye-Tracking Analysis  │           │                                      │
│  Reading Pattern Tests  │──report──▶│  Guardian Dashboard                  │
│  Dyslexia Assessment    │   JSON    │  ├─ View child progress & analytics  │
│  Severity Profiling     │           │  ├─ AI suggests worlds & exercises   │
│  Deficit Area Scoring   │           │  ├─ Manage children & subscriptions  │
│                         │           │  └─ AI re-evaluates & adjusts plan   │
└─────────────────────────┘           │                                      │
                                      │  Child Experience                    │
                                      │  ├─ Adventure Map (world per area)   │
                                      │  ├─ 35+ games (classic & Phaser)     │
                                      │  ├─ Castle boss battles & dungeons   │
                                      │  ├─ Points, levels, badges, streaks  │
                                      │  └─ Avatar shop (characters, fx)     │
                                      └──────────────────────────────────────┘
```

**Pricing:**
- **Family Plan** — €10/month (1 guardian + 1 child), +€5/month per additional child
- **Educator Plan** — €74.99/month (up to 15 students)

---

## How It Works

### Guardian Flow

1. **Sign up** — Guardians register through a multi-step onboarding flow: username, email, name, password, number of children. Payment via Stripe is required before the account is created.

2. **Manage children** — Each child gets their own login credentials. The guardian dashboard shows all linked children with their progress, levels, and adventure status.

3. **Import diagnostic report** — When the EyeRadar diagnostic platform produces an assessment (eye-tracking data, reading metrics, deficit severities), the report is imported into the child's profile. The system parses:
   - Dyslexia type (phonological, surface, mixed, visual, rapid-naming)
   - Severity level per deficit area (mild / moderate / severe)
   - Reading metrics (fixation duration, saccade patterns, regression rate)
   - Overall severity score

4. **AI generates an adventure plan** — The AI agent analyzes the child's diagnostic profile, age, and interests to suggest:
   - Which **worlds** (deficit areas) the child should focus on, ordered by priority
   - Which **games** (exercises) belong in each world, selected for the child's age and dyslexia type
   - Reasoning for each suggestion

5. **Track progress** — The dashboard shows per-area difficulty levels, accuracy trends, session history, points/XP/badges/streaks, and recommended next exercises.

6. **AI re-evaluates over time** — After days or weeks of play, the AI considers recent session history, accuracy trends, and which areas improved vs. need work. It recommends keeping exercises the child still needs, dropping mastered ones, and introducing new ones.

### Child Flow

1. **Log in** — Each child has their own username and password. They see a personalized home screen with their avatar, points, level, streak, and XP bar.

2. **Adventure Mode** — The main experience. An overworld map shows biome-themed world nodes (one per deficit area). Each world contains:
   - Multiple level nodes (one per exercise/game)
   - Recap castle dungeons every 2 exercises for reinforcement
   - Boss node at the end
   - Star ratings based on performance
   - Progress bars showing completion

3. **Quick Play** — Children can browse all available games by skill area and play any game directly.

4. **Phaser Games** — Full Phaser engine action games:
   - **Castle Boss** — Face three bosses, answer questions to deal damage
   - **Dungeon Adventure** — Top-down open-world exploration with enemies, NPCs, collectibles, and questions on each kill
   - **3-Stage Dungeon** — Zone-based dungeon with gates, stone walls, shrines, zone bosses, and a final Shadow Lord boss with a shield mechanic

5. **Classic Games** — 29+ exercise types rendered as interactive UI:
   - Multiple choice, grid memory, sequence tap, word building, fill-in-the-blank, sorting, speed rounds, pattern matching, sound matching, read-aloud, story recall, and more

6. **Earn rewards** — Correct answers earn points. Sessions award XP toward levels. Streaks build for consecutive days. Badges unlock for milestones.

7. **Shop** — Spend earned points on character avatars, background themes, and visual effects across rarity tiers.

### The AI Engine

| Layer | What it does | Technology |
|-------|-------------|------------|
| **Exercise Selection Agent** | Chooses which game and difficulty based on diagnostic profile, age, dyslexia type, severity, and session history | Rule-based scoring with dyslexia-type preferences, severity exclusions, age fit, and recency penalty |
| **Adventure Builder** | Suggests complete adventure maps (worlds + games per world) based on per-area severity | Rule-based with severity profiles and age configuration |
| **Content Generator** | Generates exercise items (questions, stories, word banks, rhymes) | OpenAI GPT-4o-mini with template fallback |
| **Adaptive Difficulty** | Adjusts difficulty between sessions based on recent accuracy | Algorithmic: >85% accuracy → harder, <50% → easier |
| **Content Anti-Repetition** | Tracks recently shown passages/content per student | MD5 hashing + DB content_history table |
| **Age-Aware Content** | Adjusts passage difficulty based on student age | Dynamic level shifting (young → easier, older → medium+) |

---

## Core Features

| Category | Details |
|----------|---------|
| **Games** | 35+ games across 6 deficit areas + 3 Phaser action games |
| **Deficit Areas** | Phonological Awareness, Rapid Naming, Working Memory, Visual Processing, Reading Fluency, Comprehension |
| **AI Content** | LLM-generated stories, questions, word banks, rhymes, syllable exercises |
| **Adaptive Difficulty** | Auto-adjusts per student per deficit area based on performance |
| **Adventure Mode** | Biome-themed overworld map with per-world level progression and recap dungeons |
| **Phaser Games** | Castle boss battles, dungeon exploration, 3-stage dungeon with zones/gates/shrines |
| **Gamification** | Points, XP, levels, streaks, 15+ badge types |
| **Shop** | Characters, backgrounds, effects purchasable with earned points |
| **Diagnostics** | Import EyeRadar assessment JSON for personalized intervention |
| **Multi-language** | English and Greek support with TTS |
| **Analytics** | Per-student progress tracking, per-area trends, session history |
| **Authentication** | Keycloak-based SSO with guardian/child role separation |
| **Billing** | Stripe subscription management with Family and Educator plans |
| **Content Pools** | Curated word banks, passages, rhymes, and phrases in English and Greek, split by age |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Frontend                          │
│         Next.js 16 / React 19 / TypeScript / Tailwind   │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────┐ │
│  │ Guardian  │  │ Student  │  │  Phaser   │  │ Shop  │ │
│  │Dashboard │  │   Home   │  │  Engine   │  │       │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬───┘ │
│       │              │              │             │     │
│       └──────────────┴──────────────┴─────────────┘     │
│                          │                              │
│                     API Client                          │
│                   (src/lib/api.ts)                      │
│                          │                              │
│                     NextAuth.js                         │
│                  (Keycloak OIDC)                        │
└──────────────────────────┬──────────────────────────────┘
                           │ REST
┌──────────────────────────┴──────────────────────────────┐
│                       Backend                           │
│               Python FastAPI + PostgreSQL                │
│                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Routers    │  │   Services    │  │   Database   │ │
│  │              │  │               │  │              │ │
│  │ auth_public  │  │ exercise_agent│  │ users        │ │
│  │ students     │  │ content_gen   │  │ students     │ │
│  │ exercises    │  │ ai_content    │  │ sessions     │ │
│  │ games        │  │ adaptive_diff │  │ adventures   │ │
│  │ adventures   │  │ gamification  │  │ billing      │ │
│  │ gamification │  │ adventure_bld │  │ onboarding   │ │
│  │ analytics    │  │ keycloak_admin│  │              │ │
│  │ billing      │  │ ollama_client │  │ PostgreSQL   │ │
│  │ tts          │  │ assessment    │  │ (asyncpg)    │ │
│  │ account      │  │               │  │              │ │
│  └──────────────┘  └───────────────┘  └──────────────┘ │
│                          │                              │
│                    OpenAI / Ollama                       │
└─────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                    External Services                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐ │
│  │ Keycloak │  │  Stripe  │  │  OpenAI GPT-4o-mini   │ │
│  │  (Auth)  │  │(Billing) │  │  (Content Gen)        │ │
│  └──────────┘  └──────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| UI Components | Material UI 7, Lucide icons |
| Game Engine | Phaser 3 (canvas-based action games) |
| Backend | Python 3.10+, FastAPI 0.115, Pydantic 2 |
| Database | PostgreSQL (asyncpg) |
| Authentication | Keycloak (OIDC), NextAuth.js v5 |
| Billing | Stripe (subscriptions, webhooks, customer portal) |
| AI / LLM | OpenAI GPT-4o-mini (with Ollama fallback) |
| TTS | Edge TTS (Microsoft) |
| Avatars | DiceBear (procedural avatar generation) |
| Deployment | Railway (backend + DB), Vercel (frontend) |

---

## Project Structure

```
eyeradar-exercises/
├── README.md
├── backend/
│   ├── main.py                           # FastAPI app, CORS, middleware, lifespan
│   ├── requirements.txt
│   ├── railway.toml                      # Railway deployment config
│   ├── Procfile                          # Process file for deployment
│   ├── .env.example                      # Environment variable template
│   └── app/
│       ├── auth.py                       # JWT verification, role enforcement, student access checks
│       ├── database.py                   # PostgreSQL schema, CRUD, migrations (asyncpg)
│       ├── models.py                     # Core Pydantic models
│       ├── models_enhanced.py            # Dyslexia types, severity profiles, age configs
│       ├── games/
│       │   ├── game_definitions.py       # 35+ game definitions with metadata
│       │   └── definitions/              # Content pool JSON files
│       │       ├── games.json            # Game catalog definitions
│       │       ├── content_pools.json    # Master content pool
│       │       ├── words_en.json         # English word banks
│       │       ├── words_el.json         # Greek word banks
│       │       ├── words_by_age.json     # Age-banded word pools
│       │       ├── passages_en.json      # English reading passages
│       │       ├── passages_el.json      # Greek reading passages
│       │       ├── rhymes.json           # Rhyme pairs
│       │       ├── phrases_en.json       # English phrases
│       │       └── phrases_el.json       # Greek phrases
│       ├── routers/
│       │   ├── auth_public.py            # Registration, onboarding, password reset
│       │   ├── account.py                # Account management endpoints
│       │   ├── students.py               # Student CRUD, assessment import
│       │   ├── exercises.py              # Session start, submit, complete, recommendations
│       │   ├── games.py                  # Game catalog endpoints
│       │   ├── adventures.py             # Adventure CRUD, AI suggestions
│       │   ├── gamification.py           # Points, badges, level summaries
│       │   ├── analytics.py              # Progress overview, reports
│       │   ├── billing.py                # Stripe checkout, webhooks, portal
│       │   └── tts.py                    # Text-to-speech synthesis
│       └── services/
│           ├── exercise_agent.py         # AI exercise selection (diagnostic-aware)
│           ├── adventure_builder.py      # AI adventure map suggestion
│           ├── content_generator.py      # Exercise item generation (AI + templates)
│           ├── ai_content.py             # LLM-powered content generation
│           ├── ollama_client.py          # OpenAI / Ollama LLM client
│           ├── adaptive_difficulty.py    # Difficulty adjustment algorithm
│           ├── gamification_service.py   # Points, XP, levels, streaks
│           ├── gamification_badges.py    # Badge definitions and award logic
│           ├── keycloak_admin.py         # Keycloak admin API (user/role management)
│           └── assessment_parser.py      # Diagnostic report parsing
│
└── frontend/
    ├── package.json
    ├── next.config.ts                    # Next.js config (standalone, console removal)
    ├── tailwind.config.ts
    ├── railway.toml                      # Railway deployment config
    ├── vercel.json                       # Vercel deployment config
    ├── .env.example                      # Environment variable template
    └── src/
        ├── auth.ts                       # NextAuth.js configuration
        ├── middleware.ts                 # Route protection middleware
        ├── app/
        │   ├── layout.tsx                # Root layout with SEO metadata
        │   ├── page.tsx                  # Landing / dashboard
        │   ├── login/page.tsx            # Sign in page
        │   ├── register/                 # Multi-step guardian onboarding
        │   │   ├── page.tsx
        │   │   └── success/page.tsx
        │   ├── forgot-password/page.tsx  # Password reset request
        │   ├── reset-password/page.tsx   # Password reset form
        │   ├── pricing/page.tsx          # Public pricing page
        │   ├── parent/                   # Guardian dashboard
        │   │   ├── page.tsx
        │   │   └── pricing/page.tsx
        │   ├── student/                  # Child-facing pages
        │   │   ├── page.tsx              # Student home
        │   │   ├── games/page.tsx        # Game browser
        │   │   ├── map/page.tsx          # Adventure overworld map
        │   │   └── shop/page.tsx         # Avatar shop
        │   ├── students/                 # Educator student management
        │   │   ├── page.tsx
        │   │   └── [id]/page.tsx
        │   ├── exercises/
        │   │   ├── play/page.tsx         # Classic game play
        │   │   ├── dungeon/page.tsx      # Dungeon adventure (Phaser)
        │   │   ├── castle/page.tsx       # Castle boss battle (Phaser)
        │   │   └── dungeon3/page.tsx     # 3-stage dungeon (Phaser)
        │   ├── games/page.tsx            # Game catalog
        │   ├── analytics/[studentId]/    # Per-student analytics
        │   ├── mapeditor/page.tsx        # Terrain map editor
        │   ├── error.tsx                 # Error boundary
        │   ├── global-error.tsx          # Root error boundary
        │   ├── not-found.tsx             # Custom 404
        │   └── api/
        │       ├── auth/[...nextauth]/route.ts
        │       ├── health/route.ts
        │       └── save-map/route.ts
        ├── components/
        │   ├── AppShell.tsx              # Layout + auth routing
        │   ├── Sidebar.tsx               # Navigation
        │   ├── ParentTopbar.tsx          # Guardian header bar
        │   ├── GameCard.tsx              # Game card with play link
        │   ├── WorldMap.tsx              # Per-world level path and nodes
        │   ├── WorldCard.tsx             # World selection card
        │   ├── WorldBiomes.tsx           # Biome visual themes
        │   ├── Avatar.tsx                # Student avatar display
        │   ├── StatsCard.tsx             # Stat display cards
        │   ├── ProgressBar.tsx           # Progress bars
        │   ├── BadgeCard.tsx             # Badge display
        │   ├── games/                    # Classic game renderers
        │   │   ├── GameRenderer.tsx
        │   │   ├── MemoryRecallGame.tsx
        │   │   ├── RapidNamingGame.tsx
        │   │   ├── ReadAloudGame.tsx
        │   │   ├── SoundMatchingGame.tsx
        │   │   ├── WordImageMatchGame.tsx
        │   │   └── WordSoundMatchGame.tsx
        │   ├── gamified/                 # Gamified exercise renderers
        │   │   ├── GamifiedRenderer.tsx
        │   │   ├── BossEncounter.tsx
        │   │   ├── CardDealer.tsx
        │   │   ├── DragonBattle.tsx
        │   │   ├── GameWorld.tsx
        │   │   ├── MemoryBlocks.tsx
        │   │   ├── PuzzleBridge.tsx
        │   │   ├── RunnerMode.tsx
        │   │   └── Sprites.tsx
        │   ├── memory/                   # Memory-specific games
        │   │   ├── MemoryMatchGame.tsx
        │   │   └── PatternMemoryGame.tsx
        │   └── phaser/                   # Phaser game UI overlays
        │       ├── PhaserGame.tsx
        │       ├── PhaserCanvas.tsx
        │       ├── HUDOverlay.tsx
        │       ├── GameOverOverlay.tsx
        │       ├── AnswerOverlay.tsx
        │       ├── CastleBossOverlay.tsx
        │       ├── DungeonOverlay.tsx
        │       ├── Dungeon3StageOverlay.tsx
        │       └── ClassicAnswerOverlay.tsx
        ├── lib/
        │   ├── api.ts                    # Backend API client (with timeouts)
        │   ├── auth.tsx                  # Auth provider, session management
        │   ├── shop-items.ts             # Shop item definitions
        │   ├── game-assets.ts            # Game visual assets mapping
        │   ├── map-utils.ts              # Adventure map node/path generation
        │   ├── ui-sounds.ts              # Sound effects
        │   ├── music-manager.ts          # Background music
        │   ├── tts.ts                    # Text-to-speech client
        │   ├── stt.ts                    # Speech-to-text client
        │   ├── boss-config.ts            # Boss battle configuration
        │   ├── level-config.ts           # Level scaling configuration
        │   ├── avatar-items.ts           # Avatar item definitions
        │   ├── theme.tsx                 # MUI theme provider
        │   └── phaser/
        │       ├── config.ts             # Phaser game config + scene registry
        │       ├── EventBus.ts           # React ↔ Phaser event bus
        │       ├── constants.ts          # Phaser constants
        │       ├── scenes/               # Phaser game scenes
        │       │   ├── BootScene.ts
        │       │   ├── PreloadScene.ts
        │       │   ├── BattleScene.ts
        │       │   ├── DragonBattleScene.ts
        │       │   ├── RunnerScene.ts
        │       │   ├── MemoryScene.ts
        │       │   ├── WorldMapScene.ts
        │       │   ├── CastleBossScene.ts
        │       │   ├── CastleDungeonScene.ts
        │       │   └── CastleDungeon3StageScene.ts
        │       ├── sprites/
        │       │   ├── PlayerSprite.ts
        │       │   └── BossSprite.ts
        │       └── utils/
        │           ├── AnimationFactory.ts
        │           ├── ParallaxBackground.ts
        │           ├── SoundManager.ts
        │           └── Transitions.ts
        └── types/
            ├── index.ts                  # TypeScript type definitions
            └── speech.d.ts               # Speech API type declarations
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 20+** with npm
- **PostgreSQL** (local or hosted, e.g. Railway)
- **Keycloak** instance (for authentication)
- **Stripe** account (for billing)
- *(Optional)* OpenAI API key for AI content generation

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template and fill in values
cp .env.example .env
# Edit .env with your DATABASE_URL, Keycloak, Stripe, and OpenAI settings

# Start the server
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env.local
# Edit .env.local with your API URL, Keycloak, and auth settings

# Start development server
npm run dev
```

Visit: http://localhost:3000

---

## Environment Variables

<a id="backend-env"></a>
### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `KEYCLOAK_ISSUER` | Yes | Keycloak realm issuer URL (e.g. `https://auth.example.com/realms/game_dev`) |
| `KEYCLOAK_CLIENT_ID` | Yes | Keycloak client ID for token verification |
| `KEYCLOAK_ADMIN_CLIENT_ID` | Yes | Keycloak service account client for user management |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Yes | Secret for the admin service account client |
| `KEYCLOAK_ADMIN_REALM` | No | Realm for admin operations (defaults to extracted from issuer) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_PARENT_MONTHLY` | Yes | Stripe Price ID for Family Plan (`price_...`) |
| `STRIPE_PRICE_EXTRA_CHILD` | Yes | Stripe Price ID for extra child slot (`price_...`) |
| `APP_BASE_URL` | Yes | Frontend URL for Stripe redirects |
| `FRONTEND_URL` | No | Frontend URL for CORS and email links |
| `OPENAI_API_KEY` | No | Enables AI-generated exercise content |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (defaults to `http://localhost:3000`) |
| `ONBOARDING_ENCRYPTION_KEY` | No | Encryption key for pending signup payloads |
| `LOG_LEVEL` | No | Logging level (default: `INFO`) |
| `PORT` | No | Server port (default: `8000`) |

<a id="frontend-env"></a>
### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL (e.g. `http://localhost:8000/api/v1`) |
| `AUTH_SECRET` | Yes | NextAuth.js secret (`openssl rand -hex 32`) |
| `AUTH_KEYCLOAK_ISSUER` | Yes | Keycloak realm issuer URL |
| `AUTH_KEYCLOAK_ID` | Yes | Keycloak client ID |
| `AUTH_KEYCLOAK_SECRET` | Yes | Keycloak client secret |
| `NEXT_PUBLIC_KEYCLOAK_ISSUER` | Yes | Public Keycloak issuer (for client-side redirects) |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | Yes | Public Keycloak client ID |
| `NEXTAUTH_URL` | No | NextAuth.js base URL (defaults to site URL) |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for SEO metadata |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key for client-side |

---

## Keycloak Configuration

### Realm Setup

Use a Keycloak realm (e.g. `game_dev`) with two realm roles:

| Role | Description |
|------|-------------|
| `guardian` | Parent/guardian account — manages children, billing, adventure config |
| `child` | Child account — plays games, earns rewards |

### Client Configuration (`eyeradar-frontend` or `games-frontend`)

- **Access type:** Confidential
- **Direct Access Grants:** Enabled (required for username/password credentials flow)
- **Valid redirect URIs:**
  - `https://your-domain.com/api/auth/callback/keycloak`
  - `https://your-domain.com/*`
- **Valid post-logout redirect URIs:**
  - `https://your-domain.com/login`
  - `https://your-domain.com/*`
- **Web origins:**
  - `https://your-domain.com`

### Admin Service Account

Create a second client (or use the same client with service account enabled) for backend user management operations. This client needs the `realm-management` composite role to create users and assign roles programmatically.

---

## Stripe Billing

### Setup

1. Create two **Products** in Stripe:
   - **Family Plan** — €10/month recurring
   - **Extra Child Slot** — €5/month recurring

2. Copy the **Price IDs** (format: `price_...`) into `STRIPE_PRICE_PARENT_MONTHLY` and `STRIPE_PRICE_EXTRA_CHILD`.

3. Create a **Webhook** endpoint pointing to `https://your-backend.com/api/v1/billing/webhook` and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Copy the **Webhook signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

### Onboarding Flow

1. Guardian fills multi-step form (username, email, name, password, child count)
2. Backend creates a Stripe Checkout Session and stores encrypted pending data
3. Guardian completes payment on Stripe
4. Stripe webhook fires `checkout.session.completed`
5. Backend creates Keycloak user, assigns `guardian` role, creates DB records
6. Child accounts are created and linked to the guardian
7. Subscription is activated with the correct child slot count

### Billing Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/billing/checkout/parent-plan` | Start Family Plan checkout |
| `POST` | `/api/v1/billing/checkout/add-child-slot` | Add extra child slot |
| `POST` | `/api/v1/billing/portal` | Open Stripe Customer Portal |
| `POST` | `/api/v1/billing/webhook` | Stripe webhook handler |
| `GET` | `/api/v1/billing/summary` | Subscription summary |

---

## Deployment (Railway)

### Backend

The backend is configured for Railway with `railway.toml`:

```toml
[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Frontend

The frontend is configured for Railway with standalone output:

```toml
[build]
builder = "nixpacks"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Updating Railway Environment Variables

There are two ways:

**Option 1: Railway Dashboard (recommended)**
1. Go to [railway.app](https://railway.app) and open your project
2. Click on your **service** (e.g. `backend` or `frontend`)
3. Go to the **Variables** tab
4. Click **+ New Variable** to add, or click on an existing variable to edit
5. After making changes, Railway will **automatically redeploy** the service

**Option 2: Railway CLI**
```bash
# Install the CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set a variable
railway variables set KEY=value

# Set multiple variables at once
railway variables set KEY1=value1 KEY2=value2

# List current variables
railway variables list
```

After setting variables via CLI, trigger a redeploy:
```bash
railway up
```

---

## API Reference

### Authentication & Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/onboarding/start` | Start guardian registration + Stripe checkout |
| `GET` | `/api/v1/auth/onboarding/{id}` | Check onboarding status |
| `POST` | `/api/v1/auth/password/forgot` | Request password reset email |
| `POST` | `/api/v1/auth/password/reset` | Reset password with token |
| `GET` | `/api/v1/auth/username/availability` | Check username availability |
| `GET` | `/api/v1/auth/email/availability` | Check email availability |

### Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/students` | Create student |
| `GET` | `/api/v1/students` | List all students |
| `GET` | `/api/v1/students/{id}` | Get student details |
| `PATCH` | `/api/v1/students/{id}` | Update student |
| `PUT` | `/api/v1/students/{id}` | Upsert student |
| `DELETE` | `/api/v1/students/{id}` | Delete student |
| `POST` | `/api/v1/students/{id}/assessment` | Import diagnostic report |

### Exercises

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/exercises/start` | Start session (AI selects difficulty + items) |
| `GET` | `/api/v1/exercises/{session_id}` | Get session details |
| `POST` | `/api/v1/exercises/{session_id}/submit` | Submit an answer |
| `POST` | `/api/v1/exercises/{session_id}/complete` | Complete session (awards points, badges) |
| `GET` | `/api/v1/exercises/student/{student_id}` | List student's sessions |
| `GET` | `/api/v1/exercises/recommendations/{student_id}` | AI recommendations |

### Adventures

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/adventures/suggest` | AI-generate adventure suggestion |
| `POST` | `/api/v1/adventures` | Create adventure map |
| `GET` | `/api/v1/adventures/student/{student_id}` | Get active adventure |
| `GET` | `/api/v1/adventures/student/{student_id}/all` | List all adventures |
| `PUT` | `/api/v1/adventures/{id}` | Update adventure |
| `DELETE` | `/api/v1/adventures/{id}` | Delete adventure |

### Games, Gamification & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/games` | List all games |
| `GET` | `/api/v1/games/by-area/{area}` | Games by deficit area |
| `GET` | `/api/v1/games/{game_id}` | Single game details |
| `GET` | `/api/v1/gamification/{student_id}/summary` | Points, level, streak, badges |
| `GET` | `/api/v1/gamification/{student_id}/badges` | Student's earned badges |
| `GET` | `/api/v1/gamification/badges/all` | All possible badges |
| `GET` | `/api/v1/analytics/{student_id}/overview` | Progress overview |
| `GET` | `/api/v1/analytics/{student_id}/report` | Detailed report |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/tts?text=...&lang=en` | Text-to-speech audio |
| `GET` | `/health` | Backend health check |
| `GET` | `/ai-status` | LLM availability status |

---

## Game Catalog

### Phonological Awareness (7 games)
Sound Swap, Rhyme Time, Syllable Splitter, Sound Blender, Phoneme Pop, Word Family Builder, Phoneme Counter

### Rapid Naming (5 games)
Speed Naming, Color & Shape Dash, Letter Sprint, Word Flash, Category Blitz

### Working Memory (5 games)
Pattern Recall, Sequence Master, Memory Grid, Dual Task Challenge, Story Recall

### Visual Processing (5 games)
Letter Detective, Mirror Match, Symbol Search, Word Shape Match, Visual Tracking

### Reading Fluency (6 games)
Sight Word Sprint, Timed Reading, Word Chains, Sentence Builder, Passage Pacer, Prosody Practice

### Comprehension (7 games)
Context Clues, Story Sequencing, Main Idea Match, Inference Engine, Vocabulary Builder, Question Quest, Fact or Opinion

### Phaser Action Games (3 games)
Castle Boss Battle, Dungeon Adventure, 3-Stage Dungeon

---

## Adventure Mode

Adventure mode transforms the intervention plan into a game-like journey:

```
Overworld Map
├── World 1: Phonological Forest        ← Highest priority deficit area
│   ├── Level 1: Sound Swap
│   ├── Level 2: Rhyme Time
│   ├── Recap Castle                    ← Dungeon recap every 2 exercises
│   ├── Level 3: Syllable Splitter
│   ├── Level 4: Sound Blender
│   ├── Recap Castle
│   └── Boss: Phoneme Pop
├── World 2: Memory Mountains
│   ├── Level 1: Pattern Recall
│   ├── Level 2: Sequence Master
│   ├── Recap Castle
│   └── Boss: Memory Grid
└── World 3: Reading Rapids
    ├── Level 1: Sight Word Sprint
    ├── Level 2: Timed Reading
    ├── Recap Castle
    └── Boss: Passage Pacer
```

### How adventures are built

1. Guardian (or educator) clicks "Generate with AI" on the child's adventure tab
2. The AI agent analyzes the diagnostic profile and returns a suggested world layout
3. The guardian reviews the AI's reasoning, edits if needed, and activates
4. The child sees the adventure map with biome-themed world nodes
5. Each world shows progress (stars, completion percentage)
6. Re-running AI suggestions after weeks of play recommends changes based on progress

### World themes

Worlds are visually themed based on their deficit area — forests, mountains, deserts, oceans, etc. — with decorative elements matching the child's interests.

---

## Shop & Rewards

### Earning Points
- **Correct answers:** 10 points each
- **Participation:** 2 points per attempt
- **Session completion:** Bonus points based on accuracy
- **Streaks:** Consecutive days of play

### Spending Points

| Category | Examples | Price Range |
|----------|----------|-------------|
| Characters | Pixel Knight, Forest Ranger, Space Explorer | 50 – 500 pts |
| Backgrounds | Starfield, Ocean Depths, Enchanted Forest | 30 – 300 pts |
| Effects | Sparkle Trail, Fire Aura, Rainbow Glow | 20 – 200 pts |

Items have rarity tiers: Common, Uncommon, Rare, Epic, Legendary.

### Badges
15+ badge types across categories:
- **Progress:** First Steps, Dedicated Learner, Exercise Champion
- **Mastery:** Area Expert, Perfect Score, Speed Demon
- **Consistency:** Daily Player, Week Warrior, Streak Master
- **Special:** Explorer, Completionist, Rising Star
