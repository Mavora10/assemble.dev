# Assemble.dev — FastAPI + Supabase Backend

FastAPI backend implementing the official Assemble.dev [API_SPECIFICATION.md](../API_SPECIFICATION.md).

## Requirements
- Python 3.12+ (Virtual environment initialized in `backend/venv`)
- Supabase Project credentials (configured in `.env`)

## Running the Server

### Option A: Via NPM (Root directory)
```bash
npm run backend
```

### Option B: Directly with Python
```powershell
# From the backend directory
.\venv\Scripts\python run.py
```
Server starts on **`http://localhost:8000`** with auto-reload enabled.

---

## Interactive API Documentation
Once the server is running, visit:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Implemented API Endpoints

### 6. Sponsorships & Due Diligence (`/api/v1/sponsorships`)
- `GET  /api/v1/sponsorships/opportunities`: Marketplace of events seeking sponsors
- `POST /api/v1/sponsorships/requests`: Sponsor pitch or requirement proposal
- `PATCH /api/v1/sponsorships/requests/{request_id}`: Approve or reject sponsorship request
- `POST /api/v1/sponsorships/requests/{request_id}/payout`: Escrow funding simulation

### 7. Venues Marketplace & Bookings (`/api/v1/venues`)
- `GET   /api/v1/venues`: Search venues by city, capacity, amenities, vibe, price
- `GET   /api/v1/venues/{venue_id}`: Full venue details and booked calendar dates
- `POST  /api/v1/venues`: Provider lists a new venue
- `POST  /api/v1/venues/{venue_id}/bookings`: Submit venue booking reservation
- `PATCH /api/v1/venues/bookings/{booking_id}/status`: Provider confirms or declines booking

### 8. Speakers Marketplace & Lineups (`/api/v1/speakers`)
- `GET   /api/v1/speakers`: Search speakers by topic, location, fee, availability
- `GET   /api/v1/speakers/{speaker_id}`: Speaker portfolio & past talk engagements
- `POST  /api/v1/speakers/invitations`: Organizer invites speaker to an event
- `PATCH /api/v1/speakers/invitations/{invite_id}`: Speaker accepts/declines (auto-adds to lineup on accept)
- `GET   /api/v1/events/{event_id}/lineup`: Confirmed event speakers & topics schedule

### 9. Merchandise & Swag Store (`/api/v1/merchandise`)
- `GET  /api/v1/merchandise/catalog`: Customizable event swag products & bulk pricing
- `POST /api/v1/merchandise/orders`: Place bulk merchandise order
- `GET  /api/v1/merchandise/orders/{order_id}`: Track production and shipping progress

### 10. Organizer Task Management (`/api/v1/events/{event_id}/tasks`)
- `GET   /api/v1/events/{event_id}/tasks`: Grouped tasks (Logistics, Marketing, Speakers, Sponsors, Day-Of)
- `POST  /api/v1/events/{event_id}/tasks`: Create an event-aware task
- `PATCH /api/v1/events/{event_id}/tasks/{task_id}`: Update task status (`todo`, `in_progress`, `completed`), priority, or assignee
- `POST  /api/v1/events/{event_id}/tasks/apply-template`: 1-click apply pre-built templates (`Tech Conference`, `Hackathon`, `Community Meetup`)
