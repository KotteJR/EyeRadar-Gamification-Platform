# EyeRadar Exercise Platform

A comprehensive AI-powered gamified intervention platform for dyslexia, built as the exercise and training companion to EyeRadar's eye-tracking diagnostic system. Teachers and parents manage children's profiles, import diagnostic reports, and receive AI-driven exercise recommendations. Children play through personalized adventure maps with 35+ educational games spanning 6 deficit areas, earning points and rewards along the way.

---

## Table of Contents

- [Platform Overview](#platform-overview)
- [How It Works](#how-it-works)
  - [Teacher / Parent Flow](#teacher--parent-flow)
  - [Child / Student Flow](#child--student-flow)
  - [The AI Agent](#the-ai-agent)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Game Catalog](#game-catalog)
- [Adventure Mode](#adventure-mode)
- [Shop & Rewards](#shop--rewards)
- [Configuration](#configuration)

---

## Platform Overview

```
EyeRadar Diagnostic Platform          EyeRadar Exercise Platform
┌─────────────────────────┐           ┌──────────────────────────────────────┐
│  Eye-Tracking Analysis  │           │                                      │
│  Reading Pattern Tests  │──report──▶│  Teacher Dashboard                   │
│  Dyslexia Assessment    │   JSON    │  ├─ Import diagnostic report         │
│  Severity Profiling     │           │  ├─ AI suggests worlds & exercises   │
└─────────────────────────┘           │  ├─ Track child progress over time   │
                                      │  └─ AI re-evaluates & adjusts plan  │
                                      │                                      │
                                      │  Student Experience                  │
                                      │  ├─ Adventure Map (world per area)   │
                                      │  ├─ 35+ games (classic & Phaser)     │
                                      │  ├─ Castle boss battles & dungeons   │
                                      │  ├─ Points, levels, badges, streaks  │
                                      │  └─ Avatar shop (characters, fx)     │
                                      └──────────────────────────────────────┘
```

---

## How It Works

### Teacher / Parent Flow

1. **Create students** — Register each child with name, age, grade, language, and interests. A login username is generated so the child can sign in independently.

2. **Import diagnostic report** — When the EyeRadar diagnostic platform produces an assessment (eye-tracking, reading metrics, deficit severities), the teacher pastes the JSON report into the student profile. The system parses it and stores:
   - Dyslexia type (phonological, surface, mixed, visual, rapid-naming)
   - Severity level per deficit area (mild / moderate / severe)
   - Reading metrics (fixation duration, saccade patterns, regression rate)
   - Overall severity score

3. **AI generates an adventure plan** — Click "Generate with AI" and the trained exercise agent analyzes the child's diagnostic profile, age, and interests to suggest:
   - Which **worlds** (deficit areas) the child should focus on, ordered by priority
   - Which **games** (exercises) belong in each world, selected for the child's age and dyslexia type
   - Reasoning for each suggestion (e.g. "Severe phonological deficit — prioritize sound-based exercises")
   - The teacher can edit, reorder, add, or remove games before activating the adventure map

4. **Track progress** — The dashboard shows:
   - Per-area difficulty levels and accuracy trends
   - Session history with per-item results
   - Points, XP, badges, and streaks
   - Recommended next exercises based on recent performance

5. **AI re-evaluates over time** — After days or weeks of the child playing, the teacher can re-run AI suggestions. The agent considers:
   - Recent session history and accuracy trends
   - Which areas improved vs. which still need work
   - Recency penalty (avoids recommending the same game repeatedly)
   - Severity-based exclusions (some game types are too complex for certain severity levels)
   
   It then recommends keeping exercises the child still needs, dropping ones they've mastered, and introducing new ones for areas that need attention.

### Child / Student Flow

1. **Log in** — Each child has their own username. They see a personalized home screen with their avatar, points, level, streak, and XP progress bar.

2. **Adventure Mode** — The main experience. An overworld map shows biome-themed world nodes (one per deficit area). Each world contains:
   - Multiple level nodes (one per exercise/game)
   - A boss node at the end
   - Star ratings based on performance
   - Progress bars showing completion

   Children tap a world to enter it, then play through levels sequentially. Each level launches a game session with items generated at their adaptive difficulty.

3. **Quick Play** — Alternatively, children can browse all available games by skill area and play any game directly without the adventure structure.

4. **Phaser Games** — Action-based games run in a full Phaser engine:
   - **Castle Boss** — Face three bosses, answer questions to deal damage
   - **Dungeon Adventure** — Top-down open-world exploration with enemies, NPCs, collectibles, and questions on each kill
   - **3-Stage Dungeon** — Zone-based dungeon with gates, stone walls, shrines, zone bosses, and a final Shadow Lord boss with a shield mechanic that requires answering questions to break

5. **Classic Games** — 29+ exercise types rendered as interactive UI cards:
   - Multiple choice, grid memory, sequence tap, word building, fill-in-the-blank, sorting, speed rounds, pattern matching, sound matching, read-aloud, and more

6. **Earn rewards** — Every correct answer earns points. Sessions award XP toward the next level. Streaks build for consecutive days of play. Badges unlock for milestones (first session, accuracy streaks, area mastery, etc.).

7. **Shop** — Spend earned points on:
   - Character avatars (common to legendary rarity)
   - Background themes
   - Visual effects
   - Items are organized by category with rarity tiers and pricing

### The AI Agent

The platform has a multi-layer AI system:

| Layer | What it does | Technology |
|-------|-------------|------------|
| **Exercise Selection Agent** | Chooses which game and difficulty for each session based on diagnostic profile, age, dyslexia type, severity, and session history | Rule-based scoring with `DYSLEXIA_TYPE_GAME_PREFERENCES`, `SEVERITY_EXCLUSIONS`, age fit, and recency penalty |
| **Adventure Builder** | Suggests complete adventure maps (worlds + games per world) based on per-area severity | Rule-based with severity profiles and age configuration |
| **Content Generator** | Generates exercise items (questions, stories, word banks, rhymes, etc.) | OpenAI GPT (or local Ollama fallback) for English; template-based for Greek |
| **Adaptive Difficulty** | Adjusts difficulty between sessions based on recent accuracy | Algorithmic: accuracy > 85% → level up, < 50% → level down |

When a teacher clicks "Generate with AI" on a student's adventure tab, the agent:
1. Reads the student's diagnostic profile (dyslexia type, per-area severities)
2. Scores all 35+ games by relevance to the child's needs
3. Groups top games into worlds by deficit area, ordered by severity
4. Returns a suggested adventure with reasoning
5. The teacher reviews, edits if desired, and activates

When content is generated for a session, the system:
1. Tries AI generation first (GPT-4o-mini for stories/comprehension, GPT-4o-mini for word banks/hints)
2. Falls back to curated templates if AI is unavailable
3. Adjusts item count and complexity based on difficulty level and age

---

## Features

| Category | Details |
|----------|---------|
| **Games** | 35+ games across 6 deficit areas |
| **Deficit Areas** | Phonological Awareness, Rapid Naming, Working Memory, Visual Processing, Reading Fluency, Comprehension |
| **AI Content** | LLM-generated stories, questions, word banks, rhymes, syllable exercises |
| **Adaptive Difficulty** | Auto-adjusts per student per deficit area based on performance |
| **Adventure Mode** | Biome-themed overworld map with per-world level progression |
| **Phaser Games** | Castle boss battles, dungeon exploration, 3-stage dungeon with zones/gates/shrines |
| **Gamification** | Points, XP, levels, streaks, 15+ badge types |
| **Shop** | Characters, backgrounds, effects purchasable with earned points |
| **Diagnostics** | Import EyeRadar assessment JSON for personalized intervention |
| **AI Agent** | Trained exercise selection agent with dyslexia-type-aware game scoring |
| **Multi-language** | English and Greek support with TTS |
| **Analytics** | Per-student progress tracking, per-area trends, session history |
| **Teacher Dashboard** | Manage students, view progress, import reports, configure adventures |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Frontend                          │
│              Next.js 14+ / TypeScript / Tailwind        │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────┐ │
│  │ Teacher  │  │ Student  │  │  Phaser   │  │ Shop  │ │
│  │Dashboard │  │   Home   │  │  Engine   │  │       │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬───┘ │
│       │              │              │             │     │
│       └──────────────┴──────────────┴─────────────┘     │
│                          │                              │
│                     API Client                          │
│                   (src/lib/api.ts)                      │
└──────────────────────────┬──────────────────────────────┘
                           │ REST
┌──────────────────────────┴──────────────────────────────┐
│                       Backend                           │
│               Python FastAPI + SQLite                   │
│                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Routers    │  │   Services    │  │   Database   │ │
│  │              │  │               │  │              │ │
│  │ students     │  │ exercise_agent│  │ students     │ │
│  │ exercises    │  │ content_gen   │  │ sessions     │ │
│  │ games        │  │ ai_content    │  │ adventures   │ │
│  │ adventures   │  │ adaptive_diff │  │              │ │
│  │ gamification │  │ gamification  │  │   SQLite     │ │
│  │ analytics    │  │ adventure_bld │  │   (WAL)      │ │
│  │ tts          │  │ ollama_client │  │              │ │
│  └──────────────┘  └───────────────┘  └──────────────┘ │
│                          │                              │
│                    OpenAI / Ollama                       │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
eyeradar-exercises/
├── README.md
├── backend/
│   ├── main.py                          # FastAPI app, CORS, lifespan
│   ├── requirements.txt
│   └── app/
│       ├── models.py                    # Core Pydantic models (Student, Game, Session, Adventure, etc.)
│       ├── models_enhanced.py           # Dyslexia types, severity profiles, age configs for AI agent
│       ├── database.py                  # SQLite schema, CRUD operations, migrations
│       ├── games/
│       │   └── game_definitions.py      # 35+ game definitions with metadata
│       ├── services/
│       │   ├── exercise_agent.py        # AI exercise selection agent (diagnostic-aware)
│       │   ├── adventure_builder.py     # AI adventure map suggestion engine
│       │   ├── content_generator.py     # Exercise item generation (AI + templates)
│       │   ├── ai_content.py            # LLM-powered content (stories, word banks, etc.)
│       │   ├── ollama_client.py         # OpenAI / Ollama LLM client
│       │   ├── adaptive_difficulty.py   # Difficulty adjustment algorithm
│       │   ├── gamification_service.py  # Points, XP, levels, streaks
│       │   └── gamification_badges.py   # Badge definitions and award logic
│       └── routers/
│           ├── students.py              # Student CRUD, assessment import, diagnostics
│           ├── exercises.py             # Session start, submit, complete, recommendations
│           ├── games.py                 # Game catalog endpoints
│           ├── adventures.py            # Adventure CRUD, AI suggestions
│           ├── gamification.py          # Points, badges, level summaries
│           ├── analytics.py             # Progress overview, reports
│           └── tts.py                   # Text-to-speech synthesis
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── app/                         # Next.js App Router
        │   ├── page.tsx                 # Teacher dashboard
        │   ├── login/page.tsx           # Authentication
        │   ├── wizard/page.tsx          # Student onboarding (interests)
        │   ├── students/
        │   │   ├── page.tsx             # Student list & creation
        │   │   └── [id]/page.tsx        # Student detail (overview, adventure, sessions, badges)
        │   ├── student/
        │   │   ├── page.tsx             # Student home
        │   │   ├── games/page.tsx       # Student game browser
        │   │   ├── shop/page.tsx        # Avatar shop
        │   │   └── map/page.tsx         # Adventure overworld map
        │   ├── exercises/
        │   │   ├── play/page.tsx        # Main game play page
        │   │   ├── dungeon/page.tsx     # Dungeon adventure (Phaser)
        │   │   ├── castle/page.tsx      # Castle boss battle (Phaser)
        │   │   └── dungeon3/page.tsx    # 3-stage dungeon (Phaser)
        │   ├── games/page.tsx           # Teacher game catalog
        │   ├── analytics/
        │   │   └── [studentId]/page.tsx # Per-student analytics
        │   ├── mapeditor/page.tsx       # Terrain map editor
        │   └── api/save-map/route.ts    # Map save API route
        ├── components/
        │   ├── AppShell.tsx             # Layout + auth routing
        │   ├── Sidebar.tsx              # Navigation (teacher vs student views)
        │   ├── GameCard.tsx             # Game card with play link
        │   ├── WorldMap.tsx             # Per-world level path and nodes
        │   ├── Avatar.tsx               # Student avatar display
        │   ├── StatsCard.tsx            # Stat display cards
        │   ├── ProgressBar.tsx          # Progress bars
        │   ├── BadgeCard.tsx            # Badge display
        │   ├── games/
        │   │   └── GameRenderer.tsx     # Classic game item renderer
        │   └── phaser/
        │       ├── PhaserGame.tsx       # Phaser game wrapper
        │       ├── PhaserCanvas.tsx     # Phaser canvas + scene launcher
        │       ├── HUDOverlay.tsx       # In-game HUD (HP, points, boss bar)
        │       ├── GameOverOverlay.tsx   # Game over screen
        │       ├── DungeonOverlay.tsx    # Dungeon game overlay
        │       ├── Dungeon3StageOverlay.tsx # 3-stage dungeon overlay
        │       ├── CastleBossOverlay.tsx   # Castle boss overlay
        │       ├── AnswerOverlay.tsx     # In-game answer popup
        │       └── ClassicAnswerOverlay.tsx # Classic mode answer popup
        ├── lib/
        │   ├── api.ts                   # Backend API client
        │   ├── auth.tsx                 # Auth provider, login, registration
        │   ├── shop-items.ts            # Shop item definitions
        │   ├── game-assets.ts           # Game visual assets mapping
        │   ├── map-utils.ts             # Adventure map node/path generation
        │   ├── ui-sounds.ts             # Sound effects
        │   └── phaser/
        │       ├── config.ts            # Phaser game config + scene registry
        │       ├── EventBus.ts          # React ↔ Phaser event communication
        │       └── scenes/
        │           ├── BootScene.ts
        │           ├── PreloadScene.ts
        │           ├── BattleScene.ts
        │           ├── DragonBattleScene.ts
        │           ├── RunnerScene.ts
        │           ├── MemoryScene.ts
        │           ├── WorldMapScene.ts
        │           ├── CastleBossScene.ts
        │           ├── CastleDungeonScene.ts
        │           └── CastleDungeon3StageScene.ts
        └── types/
            └── index.ts                 # TypeScript type definitions
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **(Optional)** OpenAI API key for AI content generation
- **(Optional)** Ollama for local LLM inference

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set OpenAI key for AI-generated content
export OPENAI_API_KEY=sk-...

# Start the server
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit: http://localhost:3000

### Demo Accounts

| Username | Role | Description |
|----------|------|-------------|
| `teacher` | Teacher | Full dashboard access |
| `student5yrs` | Student | 5-year-old demo student |
| `student10yrs` | Student | 10-year-old demo student |
| `student15yrs` | Student | 15-year-old demo student |

---

## API Reference

### Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/students` | Create student (with optional diagnostic profile) |
| `GET` | `/api/v1/students` | List all students |
| `GET` | `/api/v1/students/{id}` | Get student details |
| `PATCH` | `/api/v1/students/{id}` | Update student (including diagnostic) |
| `PUT` | `/api/v1/students/{id}` | Upsert student |
| `DELETE` | `/api/v1/students/{id}` | Delete student |
| `POST` | `/api/v1/students/{id}/assessment` | Import EyeRadar assessment report |

### Exercises

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/exercises/start` | Start a session (AI selects difficulty + items) |
| `GET` | `/api/v1/exercises/{session_id}` | Get session details |
| `POST` | `/api/v1/exercises/{session_id}/submit` | Submit an answer |
| `POST` | `/api/v1/exercises/{session_id}/complete` | Complete session (awards points, badges) |
| `GET` | `/api/v1/exercises/student/{student_id}` | List student's sessions |
| `GET` | `/api/v1/exercises/recommendations/{student_id}` | AI exercise recommendations |

### Adventures

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/adventures/suggest` | AI-generate adventure suggestion |
| `POST` | `/api/v1/adventures` | Create adventure map |
| `GET` | `/api/v1/adventures/student/{student_id}` | Get student's active adventure |
| `GET` | `/api/v1/adventures/student/{student_id}/all` | List all adventures |
| `PUT` | `/api/v1/adventures/{id}` | Update adventure |
| `DELETE` | `/api/v1/adventures/{id}` | Delete adventure |
| `GET` | `/api/v1/adventures/status/all` | Status of all students' adventures |
| `GET` | `/api/v1/adventures/games-for-area/{area}` | Games available for a deficit area |

### Games, Gamification & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/games` | List all 35+ games |
| `GET` | `/api/v1/games/by-area/{area}` | Games filtered by deficit area |
| `GET` | `/api/v1/games/{game_id}` | Single game details |
| `GET` | `/api/v1/gamification/{student_id}/summary` | Points, level, streak, badges |
| `GET` | `/api/v1/gamification/{student_id}/badges` | Student's earned badges |
| `GET` | `/api/v1/gamification/badges/all` | All possible badges |
| `GET` | `/api/v1/analytics/{student_id}/overview` | Progress overview with trends |
| `GET` | `/api/v1/analytics/{student_id}/report` | Detailed educator report |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/tts?text=...&lang=en` | Text-to-speech audio |
| `GET` | `/health` | Health check |
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

### Action / Phaser Games (3 games)
Castle Boss Battle, Dungeon Adventure, 3-Stage Dungeon

---

## Adventure Mode

Adventure mode is the core personalized learning experience. It transforms the exercise plan into a game-like journey:

```
Overworld Map
├── World 1: Phonological Forest        ← Highest priority deficit area
│   ├── Level 1: Sound Swap             ← Exercise as a playable level
│   ├── Level 2: Rhyme Time
│   ├── Level 3: Syllable Splitter
│   └── Boss: Phoneme Pop               ← Boss battle at the end
├── World 2: Memory Mountains
│   ├── Level 1: Pattern Recall
│   ├── Level 2: Sequence Master
│   └── Boss: Memory Grid
└── World 3: Reading Rapids
    ├── Level 1: Sight Word Sprint
    ├── Level 2: Timed Reading
    └── Boss: Passage Pacer
```

### How adventures are built

1. **Teacher clicks "Generate with AI"** on the student's Adventure tab
2. The AI agent analyzes the diagnostic profile and returns a suggested world layout
3. The teacher reviews the AI's reasoning, edits if needed, and activates
4. The student sees the adventure map with biome-themed world nodes
5. Each world shows progress (stars, completion percentage)
6. Re-running AI suggestions after weeks of play will recommend changes based on the child's progress

### World themes

Worlds are visually themed based on their deficit area — forests, mountains, deserts, oceans, etc. — with decorative elements matching the child's interests (configured during onboarding).

---

## Shop & Rewards

### Earning Points
- **Correct answers**: 10 points each
- **Participation**: 2 points per attempt
- **Session completion**: Bonus points based on accuracy
- **Streaks**: Consecutive days of play

### Spending Points
Children visit the Avatar Shop to purchase:

| Category | Examples | Price Range |
|----------|----------|-------------|
| Characters | Pixel Knight, Forest Ranger, Space Explorer | 50 - 500 pts |
| Backgrounds | Starfield, Ocean Depths, Enchanted Forest | 30 - 300 pts |
| Effects | Sparkle Trail, Fire Aura, Rainbow Glow | 20 - 200 pts |

Items have rarity tiers: Common, Uncommon, Rare, Epic, Legendary.

### Badges
15+ badge types across categories:
- **Progress**: First Steps, Dedicated Learner, Exercise Champion
- **Mastery**: Area Expert, Perfect Score, Speed Demon
- **Consistency**: Daily Player, Week Warrior, Streak Master
- **Special**: Explorer, Completionist, Rising Star

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | Enables AI-generated exercise content (GPT-4o-mini) |
| `OLLAMA_BASE_URL` | No | URL for local Ollama instance (default: `http://localhost:11434`) |

When no LLM is available, the system falls back to curated template-based content generation.

### Database

SQLite with WAL mode, stored at `backend/eyeradar.db`. Auto-created on first run with schema migrations.

### Supported Languages

- **English** (`en`) — Full AI content generation + templates
- **Greek** (`el`) — Template-based content only

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+, TypeScript, Tailwind CSS, Lucide icons |
| Game Engine | Phaser 3 (canvas-based action games) |
| Backend | Python, FastAPI, Pydantic |
| Database | SQLite (aiosqlite, WAL mode) |
| AI / LLM | OpenAI GPT-4o-mini (or Ollama local) |
| TTS | Text-to-speech synthesis endpoint |
| Asset Generation | PixelLab AI (pixel art characters, tilesets, map objects) |
