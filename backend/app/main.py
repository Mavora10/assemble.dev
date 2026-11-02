from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import (
    sponsorships,
    venues,
    speakers,
    merchandise,
    tasks,
)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Assemble.dev Event & Community Intelligence Platform — FastAPI + Supabase Backend",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev & Vite preview
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api/v1 prefix per API_SPECIFICATION.md
API_PREFIX = "/api/v1"

app.include_router(sponsorships.router, prefix=API_PREFIX)
app.include_router(venues.router, prefix=API_PREFIX)
app.include_router(speakers.router, prefix=API_PREFIX)
app.include_router(merchandise.router, prefix=API_PREFIX)
app.include_router(tasks.router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "sponsorships": f"{API_PREFIX}/sponsorships",
            "venues": f"{API_PREFIX}/venues",
            "speakers": f"{API_PREFIX}/speakers",
            "merchandise": f"{API_PREFIX}/merchandise",
            "tasks": f"{API_PREFIX}/events/{{event_id}}/tasks",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.environment}
