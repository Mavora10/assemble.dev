from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, events, tickets, communities
from app.websockets import community_room

app = FastAPI(
    title="Event Horizon API",
    description="Python FastAPI backend powered by Supabase PostgreSQL",
    version="1.0.0"
)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers for the first 5 modules
app.include_router(auth.router, prefix="/api/v1/auth", tags=["1. Authentication & Roles"])
app.include_router(events.router, prefix="/api/v1/events", tags=["2. Events & Budgeting"])
app.include_router(tickets.router, prefix="/api/v1/tickets", tags=["3. Tickets & Check-In"])
app.include_router(communities.router, prefix="/api/v1/communities", tags=["4. Communities & Discussions"])
app.include_router(community_room.router, tags=["5. Real-Time Community Room (WebSockets)"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Event Horizon FastAPI Backend",
        "database": "Supabase PostgreSQL"
    }

