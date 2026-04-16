# FireReach Agent Config

## Project
Full-stack AI outbound pipeline. FastAPI backend + React frontend.

## Backend
- Entry: backend/main.py
- Agent logic: backend/agent.py
- Run: uvicorn main:app --reload --port 8000 (inside backend/)

## Frontend
- Entry: frontend/src/main.jsx
- Run: npm run dev (inside frontend/)

## Key Files
- backend/agent.py — 7-step streaming pipeline, edit here to change agent logic
- backend/config.py — all env vars
- backend/.env — secrets (never commit)

## Commands the agent can run
- pip install -r backend/requirements.txt
- cd frontend && npm install
- uvicorn main:app --reload --port 8000
- cd frontend && npm run dev