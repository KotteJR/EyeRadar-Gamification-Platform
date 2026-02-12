# EyeRadar Dyslexia Exercise Platform

AI-powered personalized exercise generation for dyslexia intervention, extending EyeRadar's eye-tracking diagnostic platform.

## Architecture

- **Backend**: Python FastAPI with SQLite database
- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server (port 8000)
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Install dependencies (already installed during setup)
npm install

# Start development server (port 3000)
npm run dev
```

Visit: http://localhost:3000

## Features

- **29 Games** across 6 deficit areas (Phonological Awareness, Rapid Naming, Working Memory, Visual Processing, Reading Fluency, Comprehension)
- **Adaptive Difficulty** - adjusts based on student performance
- **Gamification** - points, levels, badges, streaks
- **EyeRadar Integration** - imports assessment data for personalized exercises
- **Analytics Dashboard** - track progress across all areas

## Project Structure

```
eyeradar-exercises/
├── README.md
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── requirements.txt
│   └── app/
│       ├── models.py              # Pydantic data models
│       ├── database.py            # SQLite database layer
│       ├── games/
│       │   └── game_definitions.py # 29 game definitions
│       ├── services/
│       │   ├── content_generator.py    # Exercise content generation
│       │   ├── adaptive_difficulty.py  # Difficulty algorithm
│       │   ├── gamification_badges.py  # Badge definitions
│       │   └── gamification_service.py # Points & rewards logic
│       └── routers/
│           ├── students.py        # Student CRUD + assessment
│           ├── exercises.py       # Exercise session management
│           ├── games.py           # Game catalog
│           ├── gamification.py    # Gamification endpoints
│           └── analytics.py       # Progress & reporting
└── frontend/
    └── src/
        ├── app/                   # Next.js App Router pages
        │   ├── page.tsx           # Dashboard
        │   ├── students/          # Student management
        │   ├── games/             # Game catalog
        │   ├── exercises/         # Exercise play
        │   └── analytics/         # Progress analytics
        ├── components/            # Reusable UI components
        ├── lib/api.ts             # Backend API client
        └── types/index.ts         # TypeScript type definitions
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/students` | Create student |
| GET | `/api/v1/students` | List students |
| GET | `/api/v1/students/{id}` | Get student |
| POST | `/api/v1/students/{id}/assessment` | Import assessment |
| POST | `/api/v1/exercises/start` | Start exercise session |
| POST | `/api/v1/exercises/{id}/submit` | Submit answer |
| POST | `/api/v1/exercises/{id}/complete` | Complete session |
| GET | `/api/v1/exercises/recommendations/{id}` | Get recommendations |
| GET | `/api/v1/games` | List all games |
| GET | `/api/v1/gamification/{id}/summary` | Gamification summary |
| GET | `/api/v1/analytics/{id}/overview` | Analytics overview |
# EyeRadar-Gamification-Platform
