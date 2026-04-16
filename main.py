from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from routes.auth import router as auth_router
from routes.credits import router as credits_router
from routes.payments import router as payments_router
from routes.history import router as history_router
from routes.campaign import router as campaign_router

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FireReach API",
    description="AI outbound pipeline — 7-agent runtime",
    version="1.0.0",
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(credits_router)
app.include_router(payments_router)
app.include_router(history_router)
app.include_router(campaign_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "FireReach"}
