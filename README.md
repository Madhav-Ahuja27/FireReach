# FireReach — AI Outbound Engine

7-agent AI pipeline that turns a single ICP into ranked target companies, verified buying signals, scored opportunities, discovered contacts, and personalised outreach.

```
Step 1: Company Discovery
Step 2: Signal Harvesting
Step 3: Signal Verification
Step 4: Research Brief Generation
Step 5: ICP + Signal Scoring & Ranking
Step 6: Contact Discovery
Step 7: Outreach Generation / Send
```

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLAlchemy, Pydantic, JWT |
| Frontend | React 18, Vite, Framer Motion, Three.js |
| AI | OpenAI Chat Completions |
| Search | Serper API |
| Email | SMTP (Gmail app password) |
| SMS OTP | Twilio (optional) |
| DB | SQLite (file: `firereach.db`) |

---

## Quick Start

### 1. Clone / extract

```
FireReach/
  backend/
  frontend/
  README.md
  DOCS.md
```

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Copy and fill env file:

```bash
cp .env.example .env
```

Required variables:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini-2026-03-17
SERPER_API_KEY=...
SENDER_EMAIL=you@gmail.com
SENDER_EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
JWT_SECRET=any-long-random-string
```

Start:

```bash
uvicorn main:app --reload --port 8000
```

API docs at: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App at: http://localhost:5173

---

## Environment Variables

### Required

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Model name (e.g. `gpt-5.4-mini-2026-03-17`) |
| `SERPER_API_KEY` | Serper/Google search API key |
| `SENDER_EMAIL` | Gmail address for outbound email |
| `SENDER_EMAIL_APP_PASSWORD` | Gmail app password (not your login password) |
| `JWT_SECRET` | Any long random string |

### Optional

| Variable | Default | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | — | Twilio SID for SMS OTP |
| `TWILIO_AUTH_TOKEN` | — | Twilio auth token |
| `TWILIO_FROM_NUMBER` | — | Twilio phone number |
| `DEMO_OTP_DEBUG` | `true` | Return OTP in API response (dev only) |
| `DEMO_OTP_TTL_MINUTES` | `5` | OTP expiry window |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

---

## API Routes

### Auth
```
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me
PATCH  /api/auth/me
```

### Credits
```
GET    /api/credits
POST   /api/credits/consume
```

### Payments (OTP demo)
```
POST   /api/payments/demo/create
GET    /api/payments/demo/{id}
POST   /api/payments/demo/{id}/submit
GET    /api/payments/demo/{id}/status
```

### Campaign
```
POST   /run-agent?stream=true      → NDJSON stream
POST   /select-company             → manual mode company selection
POST   /send-email                 → manual send
```

### History
```
POST   /api/history
GET    /api/history
GET    /api/history/{id}
PATCH  /api/history/{id}
DELETE /api/history/{id}
```

---

## Credit Costs

| Mode | Credits |
|---|---|
| Manual | 5 |
| Auto | 10 |

New accounts start with **20 free credits**.

---

## Plans

| Plan | Price | Credits |
|---|---|---|
| Starter | $9 | 50 |
| Growth | $29 | 200 |
| Scale | $79 | 600 |
| Pro | $149 | 1,500 |
| Enterprise | $299 | 5,000 |

---

## Stream Contract

Endpoint: `POST /run-agent?stream=true`  
Media type: `application/x-ndjson`

Event types: `step` · `result` · `error` · `history_saved`

```json
{"type":"step","step":"step3","status":"in-progress","message":"Verifying signals..."}
{"type":"result","data":{"status":"completed","rankings":[...],"outreach":{...}}}
```

---

## Gmail App Password Setup

1. Enable 2FA on your Google account
2. Go to myaccount.google.com → Security → App Passwords
3. Generate a password for "Mail"
4. Use that 16-character password as `SENDER_EMAIL_APP_PASSWORD`

---

## Common Issues

| Symptom | Fix |
|---|---|
| All scores = 0 | Check OpenAI key and model access |
| OTP not arriving | Set `DEMO_OTP_DEBUG=true` to get OTP in response |
| Email send fails | Use Gmail app password, not login password. Some cloud hosts block SMTP — use Railway or switch to API-based email provider |
| Campaign fails immediately | Check credits balance at `/api/credits` |
| CORS errors | Add frontend origin to `CORS_ORIGINS` |

---

## Test ICP

```
We sell cybersecurity training to Series B startups
```

---

## Deployment Notes

- SQLite works for single-instance deploys. Swap to Postgres for multi-instance.
- Some free-tier hosts (Render free, Fly free) block outbound SMTP on port 587. Use Railway or switch to Resend/SendGrid API.
- Set `DEMO_OTP_DEBUG=false` in production.
- Set a strong random `JWT_SECRET` in production.
