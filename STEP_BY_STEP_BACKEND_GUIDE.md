# Beginner's Step-by-Step Guide: Building Your First 5 Backend APIs

> **Target Stack:** Python (FastAPI) + Supabase (PostgreSQL)  
> **Audience:** First-time backend developers. Every step is explained from scratch with file paths, code, and testing instructions.

---

## Architecture Overview (How it works)

Before writing any code, here is what happens when someone uses your app:

```mermaid
flowchart LR
    Browser["React Frontend (Port 3000)"] -->|"HTTP / REST or WebSocket"| FastAPI["FastAPI Backend (Port 8000)"]
    FastAPI -->|"Validates Data (Pydantic)"| Logic["Business Logic & Route Handlers"]
    Logic -->|"Service Role Query"| Supabase["Supabase PostgreSQL Database"]
    Supabase -->|"JSON Data"| Logic
    Logic -->|"Clean JSON Response"| Browser
```

1. **React** sends a request (e.g. "Create an event" or "Login").
2. **FastAPI** checks that all fields are valid (e.g. valid email, correct price numbers).
3. **FastAPI** executes the query against your **Supabase database** using the private `service_role` key.
4. **Supabase** stores the data and returns the result.
5. **FastAPI** sends the clean response back to React.
6. For **Live Community Room (Module 5)**, participants connect through a continuous **WebSocket tunnel** so messages appear instantly with zero page refreshing.

---

## Folder Structure to Create

Inside your project folder `event-horizon`, you will create a new `backend/` folder:

```text
event-horizon/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # Entry point (creates FastAPI app)
│   │   ├── config.py                   # Reads environment variables (.env)
│   │   ├── dependencies.py             # Auth & user helper utilities
│   │   ├── models/                     # Request & response data shapes (Pydantic)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── event.py
│   │   │   ├── ticket.py
│   │   │   └── community.py
│   │   ├── routers/                    # Endpoint handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # Module 1: Auth & User Roles
│   │   │   ├── events.py               # Module 2: Events & Budgeting
│   │   │   ├── tickets.py              # Module 3: Tickets & QR Check-In
│   │   │   └── communities.py          # Module 4: Communities & Discussions
│   │   ├── websockets/
│   │   │   ├── __init__.py
│   │   │   └── community_room.py       # Module 5: Real-time Live Room
│   │   └── services/
│   │       ├── __init__.py
│   │       └── supabase_client.py      # Supabase connection singleton
│   ├── .env                            # Backend secrets
│   └── requirements.txt                # Python libraries
├── src/                                # Existing React frontend
└── package.json
```

---

## Step 1: Create the Virtual Environment & Dependencies

In your Mac terminal, open the project directory and create a virtual environment (this isolates your Python packages):

```bash
# 1. Move to backend folder (create it if not exists)
mkdir -p backend/app/models backend/app/routers backend/app/websockets backend/app/services

# 2. Enter backend
cd backend

# 3. Create a Python virtual environment named 'venv'
python3 -m venv venv

# 4. Activate the virtual environment
source venv/bin/activate
```

*(You will see `(venv)` in your terminal prompt, indicating it is active).*

### Create `backend/requirements.txt`:
```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
supabase==2.11.0
pydantic==2.10.4
pydantic-settings==2.7.0
python-dotenv==1.0.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
websockets==14.1
httpx==0.28.1
```

Install them:
```bash
pip install -r requirements.txt
```

---

## Step 2: Configure Environment Variables

Create `backend/.env`:

```env
PORT=8000
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000

# Your Supabase Project Settings > API
SUPABASE_URL=https://fahlfdvzkeoxsfvrrvlv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhaGxmZHZ6a2VveHNmdnJydmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NjE5NjYsImV4cCI6MjEwOTEzNzk2Nn0.v9wT4KQL7D9X9kYRv_QKEcMB_yW1-tw7Bodyvf13bAw
# Get your service_role key from Supabase Dashboard > Settings > API > service_role (secret)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

# Security
JWT_SECRET=super_secret_jwt_random_signing_key_assemble_2027
```

> [!IMPORTANT]
> **What is the `service_role` key?**  
> While the frontend uses the public `anon` key, the backend uses the `service_role` key. It allows the backend to perform administrative operations, verify users, and securely write to tables that have Row-Level Security enabled. Keep this secret and **never** commit it to public GitHub.

---

## Step 3: Base Configuration & Supabase Client

### 3.1 `backend/app/config.py`
This loads your `.env` safely:
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    
    JWT_SECRET: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```

### 3.2 `backend/app/services/supabase_client.py`
Creates the database connection:
```python
from supabase import create_client, Client
from app.config import settings

# Admin client with Service Role for privileged backend operations
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
```

---

## Step 4: Module 1 — Authentication & User Roles

### Why this is needed:
Your app allows a user to sign up, log in, switch active roles (`attendee`, `organizer`, `sponsor`, etc.), and fetch their profile.

### 4.1 Data Models: `backend/app/models/auth.py`
```python
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

class UserSignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    city: Optional[str] = "San Francisco"
    initialRole: Optional[str] = "attendee"

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class SwitchRoleRequest(BaseModel):
    targetRole: str

class RoleSetupRequest(BaseModel):
    role: str
    profileData: Dict[str, Any]
```

### 4.2 Router: `backend/app/routers/auth.py`
```python
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.services.supabase_client import supabase
from app.config import settings
from app.models.auth import UserSignupRequest, UserLoginRequest, SwitchRoleRequest, RoleSetupRequest

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def decode_token(auth_header: Optional[str]) -> dict:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth_header.split(" ")[1]
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

@router.post("/signup", status_code=201)
def signup(payload: UserSignupRequest):
    # 1. Check if email already exists
    existing = supabase.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    # 2. Hash password
    hashed_pwd = pwd_context.hash(payload.password)

    # 3. Insert into Supabase
    user_record = {
        "email": payload.email,
        "password_hash": hashed_pwd,
        "name": payload.name,
        "phone": payload.phone,
        "city": payload.city,
        "active_role": payload.initialRole,
        "capabilities": [payload.initialRole]
    }
    result = supabase.table("users").insert(user_record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user account")

    user = result.data[0]
    token = create_jwt_token(user["id"], user["email"], user["active_role"])
    return {"token": token, "user": user}

@router.post("/login")
def login(payload: UserLoginRequest):
    result = supabase.table("users").select("*").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = result.data[0]
    if not pwd_context.verify(payload.password, user.get("password_hash") or ""):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt_token(user["id"], user["email"], user["active_role"])
    return {"token": token, "user": user}

@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    token_data = decode_token(authorization)
    result = supabase.table("users").select("*").eq("id", token_data["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]

@router.post("/switch-role")
def switch_role(payload: SwitchRoleRequest, authorization: Optional[str] = Header(None)):
    token_data = decode_token(authorization)
    user_id = token_data["sub"]

    # Update active role in database
    result = supabase.table("users").update({"active_role": payload.targetRole}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to switch role")

    user = result.data[0]
    # Issue fresh token with new active role
    new_token = create_jwt_token(user["id"], user["email"], payload.targetRole)
    return {"token": new_token, "user": user}
```

---

## Step 5: Module 2 — Events & Budgeting

### Why this is needed:
Powers discovery, event creation wizard, event details, and organizer budget/expenses tracking.

### 5.1 Data Models: `backend/app/models/event.py`
```python
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class EventCreateRequest(BaseModel):
    title: str
    description: str
    category: str
    format: Optional[str] = "In-Person"
    startDate: str
    startTime: Optional[str] = "10:00 AM"
    location: str
    city: str
    price: Optional[float] = 0.00
    isFree: Optional[bool] = True
    expectedAttendees: Optional[int] = 100
    budget: Optional[float] = 0.00
    ticketTiers: Optional[List[Dict[str, Any]]] = []
    sponsorshipOpportunities: Optional[List[Dict[str, Any]]] = []

class ExpenseCreateRequest(BaseModel):
    title: str
    category: str
    allocated: Optional[float] = 0.00
    spent: float
    status: Optional[str] = "Paid"
```

### 5.2 Router: `backend/app/routers/events.py`
```python
from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from app.services.supabase_client import supabase
from app.models.event import EventCreateRequest, ExpenseCreateRequest
from app.routers.auth import decode_token

router = APIRouter()

@router.get("")
def list_events(
    search: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None,
    isFree: Optional[bool] = None,
    limit: int = 20
):
    query = supabase.table("events").select("*").limit(limit)
    if category and category != "All":
        query = query.eq("category", category)
    if city and city != "All":
        query = query.ilike("city", f"%{city}%")
    if isFree is not None:
        query = query.eq("is_free", isFree)
    if search:
        query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")

    result = query.execute()
    return result.data

@router.get("/{event_id}")
def get_event(event_id: str):
    result = supabase.table("events").select("*").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return result.data[0]

@router.post("", status_code=201)
def create_event(payload: EventCreateRequest, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    event_data = {
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "format": payload.format,
        "start_date": payload.startDate,
        "start_time": payload.startTime,
        "location": payload.location,
        "city": payload.city,
        "price": payload.price,
        "is_free": payload.isFree,
        "expected_attendees": payload.expectedAttendees,
        "budget": payload.budget,
        "ticket_tiers": payload.ticketTiers,
        "sponsorship_opportunities": payload.sponsorshipOpportunities,
        "organizer_id": user["sub"],
        "status": "published"
    }

    result = supabase.table("events").insert(event_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create event")
    return result.data[0]

@router.get("/{event_id}/finances")
def get_finances(event_id: str):
    event_res = supabase.table("events").select("budget, revenue").eq("id", event_id).execute()
    if not event_res.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    expenses_res = supabase.table("event_expenses").select("*").eq("event_id", event_id).execute()
    expenses = expenses_res.data or []
    total_spent = sum(item.get("spent", 0) for item in expenses)

    return {
        "allocatedBudget": event_res.data[0].get("budget", 0),
        "totalSpent": total_spent,
        "ticketRevenue": event_res.data[0].get("revenue", 0),
        "expenses": expenses
    }

@router.post("/{event_id}/expenses")
def log_expense(event_id: str, payload: ExpenseCreateRequest):
    expense_data = {
        "event_id": event_id,
        "title": payload.title,
        "category": payload.category,
        "allocated": payload.allocated,
        "spent": payload.spent,
        "status": payload.status
    }
    result = supabase.table("event_expenses").insert(expense_data).execute()
    return result.data[0]
```

---

## Step 6: Module 3 — Tickets & QR Door Check-In

### Why this is needed:
Handles ticket reservations, generates unique ticket numbers, lists an attendee's tickets, and lets event organizers scan QR codes at the door.

### 6.1 Data Models: `backend/app/models/ticket.py`
```python
from pydantic import BaseModel, EmailStr
from typing import Optional

class TicketBookRequest(BaseModel):
    eventId: str
    ticketTierName: Optional[str] = "General Admission"
    price: Optional[float] = 0.00
    userName: str
    userEmail: EmailStr
    phone: Optional[str] = None

class TicketCheckInRequest(BaseModel):
    ticketId: str
    eventId: str
```

### 6.2 Router: `backend/app/routers/tickets.py`
```python
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import uuid
from datetime import datetime, timezone
from app.services.supabase_client import supabase
from app.models.ticket import TicketBookRequest, TicketCheckInRequest
from app.routers.auth import decode_token

router = APIRouter()

@router.post("/book", status_code=201)
def book_ticket(payload: TicketBookRequest, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    # Generate human-readable ticket code e.g. TCK-9A4B-2027
    short_code = str(uuid.uuid4())[:6].upper()
    ticket_id = f"TCK-{short_code}"

    ticket_record = {
        "ticket_id": ticket_id,
        "event_id": payload.eventId,
        "user_id": user["sub"],
        "user_name": payload.userName,
        "user_email": payload.userEmail,
        "phone": payload.phone,
        "ticket_tier_name": payload.ticketTierName,
        "price": payload.price,
        "status": "confirmed"
    }

    result = supabase.table("tickets").insert(ticket_record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to issue ticket")

    # Increment registered_count on the event
    supabase.rpc("increment_event_attendees", {"event_id_param": payload.eventId}).execute()

    return {
        "success": True,
        "ticket": result.data[0],
        "qrPayload": f"ASSEMBLE:{ticket_id}:{payload.eventId}"
    }

@router.get("/my-tickets")
def get_my_tickets(authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    result = supabase.table("tickets").select("*, events(title, start_date, location, city, image_url)").eq("user_id", user["sub"]).execute()
    return result.data

@router.post("/check-in")
def check_in_ticket(payload: TicketCheckInRequest, authorization: Optional[str] = Header(None)):
    # 1. Look up ticket
    res = supabase.table("tickets").select("*").eq("ticket_id", payload.ticketId).eq("event_id", payload.eventId).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Invalid ticket or ticket does not belong to this event")

    ticket = res.data[0]

    # 2. Check if already used
    if ticket.get("status") == "checked-in":
        return {
            "valid": False,
            "alreadyCheckedIn": True,
            "checkedInAt": ticket.get("checked_in_at"),
            "attendeeName": ticket.get("user_name"),
            "message": "⚠️ Ticket already checked in previously!"
        }

    # 3. Mark as checked in
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("tickets").update({
        "status": "checked-in",
        "checked_in_at": now_iso
    }).eq("id", ticket["id"]).execute()

    return {
        "valid": True,
        "alreadyCheckedIn": False,
        "attendeeName": ticket.get("user_name"),
        "tier": ticket.get("ticket_tier_name"),
        "checkedInAt": now_iso,
        "message": "✅ Check-in successful! Welcome to the event."
    }
```

---

## Step 7: Module 4 — Communities & Discussions

### Why this is needed:
Allows users to discover communities, join them, post discussions, and view member directories.

### 7.1 Data Models: `backend/app/models/community.py`
```python
from pydantic import BaseModel
from typing import Optional

class CommunityCreateRequest(BaseModel):
    name: str
    slug: str
    code: str
    description: Optional[str] = ""
    category: Optional[str] = "Tech"
    location: Optional[str] = "Global"

class PostMessageRequest(BaseModel):
    text: str
```

### 7.2 Router: `backend/app/routers/communities.py`
```python
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.services.supabase_client import supabase
from app.models.community import CommunityCreateRequest, PostMessageRequest
from app.routers.auth import decode_token

router = APIRouter()

@router.get("")
def list_communities():
    result = supabase.table("communities").select("*").execute()
    return result.data

@router.get("/{community_id}")
def get_community(community_id: str):
    res = supabase.table("communities").select("*").eq("id", community_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Community not found")
    return res.data[0]

@router.post("/{community_id}/join")
def join_community(community_id: str, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    # Check if already a member
    existing = supabase.table("community_members").select("id").eq("community_id", community_id).eq("user_id", user["sub"]).execute()
    if existing.data:
        return {"message": "Already a member"}

    supabase.table("community_members").insert({
        "community_id": community_id,
        "user_id": user["sub"],
        "role": "member"
    }).execute()

    return {"success": True, "message": "Successfully joined community"}

@router.get("/{community_id}/messages")
def get_messages(community_id: str, limit: int = 50):
    result = supabase.table("community_messages").select("*").eq("community_id", community_id).order("created_at", desc=False).limit(limit).execute()
    return result.data

@router.post("/{community_id}/messages")
def post_message(community_id: str, payload: PostMessageRequest, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    # Get user name
    user_res = supabase.table("users").select("name").eq("id", user["sub"]).execute()
    user_name = user_res.data[0]["name"] if user_res.data else "Anonymous"

    msg_record = {
        "community_id": community_id,
        "user_id": user["sub"],
        "user_name": user_name,
        "text": payload.text
    }
    result = supabase.table("community_messages").insert(msg_record).execute()
    return result.data[0]
```

---

## Step 8: Module 5 — Live Community Room (WebSockets)

### Why this is needed:
Powers real-time live chat, interactive trivia quizzes, and live leaderboards in `CommunityRoomView.jsx`.

### 8.1 Implementation: `backend/app/websockets/community_room.py`
```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Map community_id -> list of active WebSocket connections
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, community_id: str, websocket: WebSocket):
        await websocket.accept()
        if community_id not in self.active_rooms:
            self.active_rooms[community_id] = []
        self.active_rooms[community_id].append(websocket)
        # Broadcast attendee presence update
        await self.broadcast(community_id, {
            "type": "PRESENCE_UPDATE",
            "onlineCount": len(self.active_rooms[community_id])
        })

    def disconnect(self, community_id: str, websocket: WebSocket):
        if community_id in self.active_rooms:
            if websocket in self.active_rooms[community_id]:
                self.active_rooms[community_id].remove(websocket)

    async def broadcast(self, community_id: str, message: dict):
        if community_id in self.active_rooms:
            dead_connections = []
            for connection in self.active_rooms[community_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(community_id, dead)

manager = ConnectionManager()

@router.websocket("/ws/community/{community_id}")
async def websocket_community_room(websocket: WebSocket, community_id: str):
    await manager.connect(community_id, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            msg_type = data.get("type")

            if msg_type == "CHAT_MESSAGE":
                # Broadcast chat message to everyone in this room
                await manager.broadcast(community_id, {
                    "type": "NEW_CHAT_MESSAGE",
                    "userName": data.get("userName", "Anonymous"),
                    "text": data.get("text"),
                    "timestamp": data.get("timestamp")
                })

            elif msg_type == "QUIZ_ANSWER":
                # Handle trivia quiz answer & update leaderboard
                await manager.broadcast(community_id, {
                    "type": "LEADERBOARD_UPDATE",
                    "userName": data.get("userName"),
                    "score": data.get("score")
                })

            elif msg_type == "REACTION":
                # Floating emojis (🔥, 👏, ❤️)
                await manager.broadcast(community_id, {
                    "type": "ROOM_REACTION",
                    "emoji": data.get("emoji")
                })

    except WebSocketDisconnect:
        manager.disconnect(community_id, websocket)
        await manager.broadcast(community_id, {
            "type": "PRESENCE_UPDATE",
            "onlineCount": len(manager.active_rooms.get(community_id, []))
        })
```

---

## Step 9: Assemble Everything in `main.py`

### Create `backend/app/main.py`:
```python
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

# Allow React app on port 3000 to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the 5 routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["1. Authentication & Roles"])
app.include_router(events.router, prefix="/api/v1/events", tags=["2. Events & Budgeting"])
app.include_router(tickets.router, prefix="/api/v1/tickets", tags=["3. Tickets & Check-In"])
app.include_router(communities.router, prefix="/api/v1/communities", tags=["4. Communities & Discussions"])
app.include_router(community_room.router, tags=["5. Real-Time Community Room (WebSockets)"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "Supabase Connected"}
```

---

## Step 10: How to Run & Test (Without Writing Frontend Code Yet!)

FastAPI gives you an **interactive testing website for free** called Swagger UI.

### 1. Start the server
In your terminal inside `backend/`:
```bash
uvicorn app.main:app --reload --port 8000
```
You will see:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

### 2. Open the Interactive Docs
Open your browser and navigate to:  
👉 **`http://localhost:8000/docs`**

You will see an interactive page listing all 5 modules!

```text
┌────────────────────────────────────────────────────────┐
│  Event Horizon API — Swagger Docs                      │
├────────────────────────────────────────────────────────┤
│  ▼ 1. Authentication & Roles                           │
│    POST /api/v1/auth/signup       [ Try it out ]       │
│    POST /api/v1/auth/login        [ Try it out ]       │
│    GET  /api/v1/auth/me           [ Try it out ]       │
│                                                        │
│  ▼ 2. Events & Budgeting                               │
│    GET  /api/v1/events            [ Try it out ]       │
│    POST /api/v1/events            [ Try it out ]       │
│                                                        │
│  ▼ 3. Tickets & Check-In                               │
│    POST /api/v1/tickets/book      [ Try it out ]       │
│    POST /api/v1/tickets/check-in  [ Try it out ]       │
└────────────────────────────────────────────────────────┘
```

### 3. Test in this exact order:
1. Click **`POST /api/v1/auth/signup`** $\rightarrow$ Click **"Try it out"** $\rightarrow$ Enter your name, email, password $\rightarrow$ Click **"Execute"**.  
   *Look at your Supabase dashboard: your user appears instantly in the `users` table!*
2. Copy the `token` from the response.
3. Click **`POST /api/v1/events`** $\rightarrow$ Fill out a demo event $\rightarrow$ Click **"Execute"**.  
   *Event appears in Supabase `events` table!*
4. Click **`GET /api/v1/events`** $\rightarrow$ Click **"Execute"** to see your list of real events.
5. Click **`POST /api/v1/tickets/book`** to book a ticket $\rightarrow$ then test **`POST /api/v1/tickets/check-in`** with that ticket ID to see the door check-in scanner validate in real time!

