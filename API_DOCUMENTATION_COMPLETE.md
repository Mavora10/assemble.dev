# Event Horizon — Complete Backend API Reference

> **Base URL:** `http://localhost:8000/api/v1` (Local Development) or `https://api.eventhorizon.dev/api/v1` (Production)  
> **Server Framework:** Python FastAPI  
> **Database:** Supabase Cloud PostgreSQL  
> **Auth Scheme:** Bearer Token (`Authorization: Bearer <jwt>`)  
> **Real-Time Protocol:** WebSockets (`ws://localhost:8000/ws/...`)

---

## Table of Contents
1. [Authentication & Multi-Role User Management](#1-authentication--multi-role-user-management)
2. [Events, Publishing & Budgeting](#2-events-publishing--budgeting)
3. [Tickets & Door Check-In](#3-tickets--door-check-in)
4. [Communities & Discussion Threads](#4-communities--discussion-threads)
5. [Real-Time Community Rooms (WebSockets)](#5-real-time-community-rooms-websockets)
6. [Sponsorships & Escrow Management](#6-sponsorships--escrow-management)
7. [Venues Marketplace & Bookings](#7-venues-marketplace--bookings)
8. [Speakers Marketplace & Lineups](#8-speakers-marketplace--lineups)
9. [Merchandise & Swag Store](#9-merchandise--swag-store)
10. [Organizer Task Management & Timelines](#10-organizer-task-management--timelines)
11. [Attendee Notifications](#11-attendee-notifications)
12. [System Health & Documentation Endpoints](#12-system-health--documentation-endpoints)

---

## 1. Authentication & Multi-Role User Management
**Router:** `backend/app/routers/auth.py`  
**Frontend Consumers:** `LoginView.jsx`, `SignupView.jsx`, `Navbar.jsx`, `RoleSetupView.jsx`, `authService.js`  
**Primary Database Tables:** `users`, `user_profiles`

---

### 1.1 User Signup
* **Route:** `POST /api/v1/auth/signup`
* **Purpose:** Creates a new base user account in Supabase with cryptographically hashed passwords using `bcrypt`. Generates and returns an initial JWT authentication token valid for 7 days.
* **Headers:** None (Public)
* **Request Body:**
  ```json
  {
    "email": "sarah@cyberdyne.com",
    "password": "SecurePassword123!",
    "name": "Sarah Connor",
    "phone": "+1 555-0192",
    "city": "San Francisco",
    "initialRole": "organizer"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "7b56a1b8-6a3f-4228-a3f2-1279a0b0d39e",
      "email": "sarah@cyberdyne.com",
      "name": "Sarah Connor",
      "city": "San Francisco",
      "active_role": "organizer",
      "capabilities": ["organizer", "attendee"]
    }
  }
  ```
* **Error Responses:**
  * `400 Bad Request`: `"An account with this email already exists"`
  * `500 Internal Server Error`: Database insertion failure

---

### 1.2 User Login
* **Route:** `POST /api/v1/auth/login`
* **Purpose:** Verifies email and password using `bcrypt.checkpw()`. On success, issues a signed JWT session containing user ID (`sub`), email, and active role.
* **Headers:** None (Public)
* **Request Body:**
  ```json
  {
    "email": "sarah@cyberdyne.com",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "7b56a1b8-6a3f-4228-a3f2-1279a0b0d39e",
      "email": "sarah@cyberdyne.com",
      "name": "Sarah Connor",
      "active_role": "organizer",
      "capabilities": ["organizer", "attendee"]
    }
  }
  ```
* **Error Responses:**
  * `401 Unauthorized`: `"Invalid email or password"`

---

### 1.3 Get Current Authenticated Profile
* **Route:** `GET /api/v1/auth/me`
* **Purpose:** Validates the Bearer token and returns the current user's profile and permissions. Excludes sensitive password hashes.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** User record dictionary from `users` table.

---

### 1.4 Switch Active Role Persona
* **Route:** `POST /api/v1/auth/switch-role`
* **Purpose:** Allows instant switching between user roles (`attendee`, `organizer`, `sponsor`, `speaker`, `venue_provider`). Updates `active_role` in database and issues a refreshed JWT reflecting the new active role perspective.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "targetRole": "sponsor"
  }
  ```
* **Response (200 OK):** `{"token": "new-jwt-token", "user": { ... }}`

---

### 1.5 Setup Capability Profile
* **Route:** `POST /api/v1/auth/setup-role`
* **Purpose:** Onboards specialized metadata for newly unlocked capabilities (e.g., company tax ID for venue providers, speaker fee/topics for speakers, organization name for organizers).
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "role": "speaker",
    "profileData": {
      "title": "Principal AI Researcher",
      "organization": "Stanford AI Lab",
      "topics": ["AI Ethics", "Agentic Systems"],
      "fee": 1500.00
    }
  }
  ```
* **Response (200 OK):** `{"success": true, "role": "speaker"}`

---

## 2. Events, Publishing & Budgeting
**Router:** `backend/app/routers/events.py`  
**Frontend Consumers:** `DiscoverView.jsx`, `CreateEventView.jsx`, `EventDetailsView.jsx`, `OrganizerDashboardView.jsx`, `EventAnalyticsView.jsx`, `ScheduleManager.jsx`, `eventService.js`  
**Primary Database Tables:** `events`, `event_expenses`, `tickets`, `notifications`

---

### 2.1 List & Filter Events
* **Route:** `GET /api/v1/events`
* **Purpose:** Discovers and searches published events for attendees and sponsors.
* **Query Parameters:**
  * `search` *(optional string)*: Title or description keyword search
  * `category` *(optional string)*: Filter by category (e.g. `Tech`, `Design`, `Web3`)
  * `city` *(optional string)*: Filter by location (e.g. `San Francisco`, `Bangalore`)
  * `isFree` *(optional boolean)*: Filter for free events
  * `limit` *(optional int, default: 20)*: Pagination limit
* **Response (200 OK):** Array of event summary objects.

---

### 2.2 Get Single Event Details
* **Route:** `GET /api/v1/events/{event_id}`
* **Purpose:** Retrieves full event details, ticket tiers, sponsor tiers, confirmed speakers, venue details, and interactive schedule.
* **Response (200 OK):** Complete event object.
* **Error Response:** `404 Not Found` if the event ID does not exist.

---

### 2.3 Create Event (Draft or Published)
* **Route:** `POST /api/v1/events`
* **Purpose:** Creates a new event record. Organizers are free to publish or save as draft even if the venue, speakers, or schedule are not yet finalized.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "title": "Global AI Summit 2027",
    "description": "Premier conference on agentic multi-agent systems.",
    "category": "Tech",
    "format": "In-Person",
    "startDate": "2027-04-15",
    "startTime": "09:00 AM",
    "endDate": "2027-04-16",
    "location": "Venue to be announced",
    "city": "San Francisco",
    "price": 0.00,
    "isFree": true,
    "expectedAttendees": 500,
    "budget": 25000.00,
    "ticketTiers": [
      { "name": "General Admission", "price": 0.00, "capacity": 500 }
    ],
    "sponsorshipOpportunities": [],
    "speakers": [],
    "schedule": [],
    "status": "published"
  }
  ```
* **Response (201 Created):** Newly inserted event database record.

---

### 2.4 Update Event (Full / Upsert)
* **Route:** `PUT /api/v1/events/{event_id}`
* **Purpose:** Updates an existing draft or published event.
* **Security & Authorization:** **Organizer Only.** Validates that the caller is the event owner (`user["sub"] == event["organizer_id"]` or organizer email match) or platform admin. Non-organizers receive `HTTP 403 Forbidden`.
* **Attendee Notifications:** Automatically inspects diffs. If venue, speakers, or schedule change on a published event, notifications are generated and inserted into the `notifications` table for every registered ticket holder.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:** `EventUpdateRequest` (any subset of event fields to update).
* **Response (200 OK):** Updated event record.

---

### 2.5 Partial Event Update / Publishing
* **Route:** `PATCH /api/v1/events/{event_id}`
* **Purpose:** Fast partial updates (e.g. toggling status from `"draft"` to `"published"` or updating image banner). Enforces the same ownership rules and notification dispatch as `PUT`.

---

### 2.6 Update Event Schedule
* **Route:** `PUT /api/v1/events/{event_id}/schedule`
* **Purpose:** Dedicated endpoint for the interactive Schedule Manager. Allows organizers to add, edit, reorder, or delete agenda items post-publication.
* **Security:** **Organizer Only (`HTTP 403 Forbidden` for non-owners).**
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "schedule": [
      {
        "title": "Opening Keynote: Agentic Architectures",
        "date": "2027-04-15",
        "startTime": "09:30 AM",
        "endTime": "10:30 AM",
        "location": "Auditorium A",
        "description": "Deep dive into multi-agent protocols."
      },
      {
        "title": "Panel: Human-AI Collaboration",
        "date": "2027-04-15",
        "startTime": "11:00 AM",
        "endTime": "12:00 PM",
        "location": "Hall B",
        "description": "Industry experts debate future workflows."
      }
    ]
  }
  ```
* **Response (200 OK):** Updated event record with the new schedule array.

---

### 2.7 Get Event Attendees
* **Route:** `GET /api/v1/events/{event_id}/attendees`
* **Purpose:** Returns the roster of all registered attendees and ticket check-in statuses for door management.
* **Security:** **Organizer Only (`HTTP 403 Forbidden` for attendees, sponsors, and other organizers).**
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** Array of ticket records belonging to the event.

---

### 2.8 Get Event Finances
* **Route:** `GET /api/v1/events/{event_id}/finances`
* **Purpose:** Returns financial aggregates: allocated budget, total spent, ticket revenue, and itemized expenses.
* **Response (200 OK):**
  ```json
  {
    "allocatedBudget": 25000.00,
    "totalSpent": 12450.00,
    "ticketRevenue": 34500.00,
    "expenses": [
      {
        "id": "exp-1",
        "title": "Venue Deposit",
        "category": "Venue",
        "allocated": 10000.00,
        "spent": 8000.00,
        "status": "Paid"
      }
    ]
  }
  ```

---

### 2.9 Log Event Expense
* **Route:** `POST /api/v1/events/{event_id}/expenses`
* **Purpose:** Records an itemized expense against the event budget.
* **Request Body:**
  ```json
  {
    "title": "Catering Deposit",
    "category": "Food & Beverage",
    "allocated": 3500.00,
    "spent": 3200.00,
    "status": "Paid"
  }
  ```
* **Response (201 Created):** Created expense record.

---

## 3. Tickets & Door Check-In
**Router:** `backend/app/routers/tickets.py`  
**Frontend Consumers:** `EventDetailsView.jsx`, `AttendeeDashboardView.jsx`, `EventAnalyticsView.jsx`, `ticketService.js`  
**Primary Database Tables:** `tickets`, `events`

---

### 3.1 Book Ticket
* **Route:** `POST /api/v1/tickets/book`
* **Purpose:** Registers an attendee for an event. Generates a unique pass code (`TCK-XXXX`), stores the record in `tickets`, increments `registered_count` and `revenue` on the `events` table, and returns QR payload.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "eventId": "7b56a1b8-6a3f-4228-a3f2-1279a0b0d39e",
    "ticketTierName": "General Admission",
    "price": 0.00,
    "userName": "Alice Smith",
    "userEmail": "alice@example.com",
    "phone": "+1 555-0144"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "ticket": {
      "id": "uuid",
      "ticket_id": "TCK-89A4",
      "event_id": "7b56a1b8...",
      "status": "confirmed"
    },
    "qrPayload": "ASSEMBLE:TCK-89A4:7b56a1b8..."
  }
  ```

---

### 3.2 Get My Booked Tickets
* **Route:** `GET /api/v1/tickets/my-tickets`
* **Purpose:** Returns all tickets booked by the logged-in attendee, joining event title, date, location, and banner image.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** Array of ticket objects.

---

### 3.3 Door Check-In Scanner
* **Route:** `POST /api/v1/tickets/check-in`
* **Purpose:** Door scanner validation. Accepts `ticketCode`, `ticketId`, or raw QR payload `ASSEMBLE:<ticket_id>:<event_id>`. Marks ticket status as `checked-in` and prevents double check-ins.
* **Request Body:**
  ```json
  {
    "ticketCode": "TCK-89A4",
    "eventId": "optional-event-uuid"
  }
  ```
* **Response (200 OK - First Check-In):**
  ```json
  {
    "valid": true,
    "alreadyCheckedIn": false,
    "attendeeName": "Alice Smith",
    "tier": "General Admission",
    "checkedInAt": "2027-04-15T09:12:00Z",
    "message": "✅ Check-in successful! Welcome to the event."
  }
  ```
* **Response (200 OK - Duplicate Prevention):**
  ```json
  {
    "valid": false,
    "alreadyCheckedIn": true,
    "attendeeName": "Alice Smith",
    "checkedInAt": "2027-04-15T09:12:00Z",
    "message": "⚠️ Ticket already checked in previously!"
  }
  ```

---

## 4. Communities & Discussion Threads
**Router:** `backend/app/routers/communities.py`  
**Frontend Consumers:** `CommunitiesView.jsx`, `CommunityDetailsView.jsx`, `communityService.js`  
**Primary Database Tables:** `communities`, `community_members`, `community_messages`

---

### 4.1 List Communities
* **Route:** `GET /api/v1/communities`
* **Purpose:** Lists public developer and creative communities.
* **Response (200 OK):** Array of community objects with member counts.

---

### 4.2 Get Community by ID
* **Route:** `GET /api/v1/communities/{community_id}`
* **Purpose:** Fetches community details, guidelines, city, and organizer info.

---

### 4.3 Create Community
* **Route:** `POST /api/v1/communities`
* **Purpose:** Organizers create a new community hub.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "name": "Bay Area AI Developers",
    "description": "Monthly meetups on agentic systems and deep learning.",
    "category": "Tech",
    "city": "San Francisco",
    "code": "EH-BAY2027"
  }
  ```
* **Response (201 Created):** Created community record.

---

### 4.4 Join Community
* **Route:** `POST /api/v1/communities/{community_id}/join`
* **Purpose:** Enrolls the authenticated user into a community and increments member count.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** `{"success": true, "message": "Joined community"}`

---

### 4.5 Get Discussion Messages
* **Route:** `GET /api/v1/communities/{community_id}/messages`
* **Purpose:** Retrieves asynchronous message feed for a community.

---

### 4.6 Post Message to Discussion Feed
* **Route:** `POST /api/v1/communities/{community_id}/messages`
* **Purpose:** Appends a new message to the community board.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "content": "Excited for the upcoming summit! Who else is attending?"
  }
  ```

---

## 5. Real-Time Community Rooms (WebSockets)
**Router:** `backend/app/websockets/community_room.py`  
**Frontend Consumers:** `LiveCommunityRoomModal.jsx`, `PlayerGame.jsx`  
**Connection Endpoint:** `ws://localhost:8000/ws/community/{community_id}`

---

### 5.1 WebSocket Live Room Connection
* **Protocol:** `WSS / WS`
* **Capabilities:**
  1. **Presence Updates:** Automatically broadcasts `PRESENCE_UPDATE` with live online count when attendees join or disconnect.
  2. **Live Chat:** Broadcasts incoming `CHAT_MESSAGE` packets to all connected room participants instantly.
  3. **Interactive Quiz & Leaderboards:** Accepts `QUIZ_ANSWER` events and broadcasts live score updates.
  4. **Floating Reactions:** Broadcasts `REACTION` emojis (🔥, 👏, ❤️) in real-time across attendee screens.

---

## 6. Sponsorships & Escrow Management
**Router:** `backend/app/routers/sponsorships.py`  
**Frontend Consumers:** `SponsorDashboardView.jsx`, `BecomeSponsorView.jsx`, `sponsorshipService.js`  
**Primary Database Tables:** `sponsorship_requests`, `events`

---

### 6.1 Browse Sponsorship Opportunities
* **Route:** `GET /api/v1/sponsorships/opportunities`
* **Purpose:** Search sponsorship tiers across upcoming events filtered by category, budget tier, or city.
* **Response (200 OK):** Array of funding opportunities.

---

### 6.2 Submit Sponsorship Bid / Request
* **Route:** `POST /api/v1/sponsorships/requests`
* **Purpose:** Sponsors commit funds to an event tier with custom deliverable requests.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:**
  ```json
  {
    "eventId": "evt-uuid",
    "tierName": "Snack Sponsor",
    "pledgedAmount": 2500.00,
    "companyName": "TechNova AI",
    "contactEmail": "sponsor@technova.ai",
    "notes": "Request booth placement near the main entrance."
  }
  ```

---

### 6.3 Update Sponsorship Status (Approve / Reject)
* **Route:** `PATCH /api/v1/sponsorships/requests/{request_id}`
* **Purpose:** Organizers approve or reject sponsor bids. On approval, funds are credited toward the event's sponsored revenue.
* **Headers:** `Authorization: Bearer <token>`
* **Request Body:** `{"status": "Approved"}` or `{"status": "Rejected"}`

---

### 6.4 Milestone Payout Release
* **Route:** `POST /api/v1/sponsorships/requests/{request_id}/payout`
* **Purpose:** Releases escrowed funds to organizer upon milestone verification.

---

## 7. Venues Marketplace & Bookings
**Router:** `backend/app/routers/venues.py`  
**Frontend Consumers:** `VenueProviderDashboardView.jsx`, `venueService.js`  
**Primary Database Tables:** `venues`, `venue_bookings`

---

### 7.1 Search Venue Directory
* **Route:** `GET /api/v1/venues`
* **Purpose:** Search venues by city, minimum capacity, amenities, vibe, and maximum hourly price.
* **Query Parameters:** `city`, `minCapacity`, `maxPrice`, `amenities`, `vibe`

---

### 7.2 Get Venue by ID
* **Route:** `GET /api/v1/venues/{venue_id}`
* **Purpose:** Detailed venue listing including layout photos, parking, AV specs, and rules.

---

### 7.3 List New Venue
* **Route:** `POST /api/v1/venues`
* **Purpose:** Venue providers register physical or virtual event spaces.
* **Headers:** `Authorization: Bearer <token>`

---

### 7.4 Create Venue Booking Request
* **Route:** `POST /api/v1/venues/{venue_id}/bookings`
* **Purpose:** Organizers reserve a venue for event dates.
* **Request Body:**
  ```json
  {
    "eventId": "evt-uuid",
    "startDate": "2027-04-15",
    "endDate": "2027-04-16",
    "hours": 16,
    "specialRequests": "Need projector and soundboard access."
  }
  ```

---

### 7.5 Update Booking Status
* **Route:** `PATCH /api/v1/venues/bookings/{booking_id}/status`
* **Purpose:** Venue provider accepts, declines, or cancels a booking.

---

## 8. Speakers Marketplace & Lineups
**Router:** `backend/app/routers/speakers.py`  
**Frontend Consumers:** `SpeakerDashboardView.jsx`, `speakerService.js`  
**Primary Database Tables:** `speakers`, `speaker_invitations`

---

### 8.1 Search Speakers Directory
* **Route:** `GET /api/v1/speakers`
* **Purpose:** Directory of speakers filtered by topic, location, fee, or availability.

---

### 8.2 Get Speaker Profile
* **Route:** `GET /api/v1/speakers/{speaker_id}`
* **Purpose:** Speaker profile, bio, previous keynote recordings, and session topics.

---

### 8.3 Invite Speaker to Event
* **Route:** `POST /api/v1/speakers/invitations`
* **Purpose:** Organizers send invitations with talk topic proposals and honorarium offers.
* **Headers:** `Authorization: Bearer <token>`

---

### 8.4 Respond to Speaker Invitation
* **Route:** `PATCH /api/v1/speakers/invitations/{invite_id}`
* **Purpose:** Speaker accepts or declines the invitation. On acceptance, the speaker is added to the event lineup.

---

### 8.5 Get Event Speaker Lineup
* **Route:** `GET /api/v1/events/{event_id}/lineup`
* **Purpose:** Returns confirmed speakers for an event.

---

## 9. Merchandise & Swag Store
**Router:** `backend/app/routers/merchandise.py`  
**Frontend Consumers:** `CreateEventView.jsx` (Goodies & Swag step), `merchandiseService.js`  
**Primary Database Tables:** `merchandise_items`, `merchandise_orders`

---

### 9.1 Get Swag Catalog
* **Route:** `GET /api/v1/merchandise/catalog`
* **Purpose:** Lists available bulk merchandise (t-shirts, hoodies, badges, notebooks, water bottles) with pricing tiers.

---

### 9.2 Place Swag Order
* **Route:** `POST /api/v1/merchandise/orders`
* **Purpose:** Organizers place print-on-demand swag orders for their event with custom logos, colors, and sizes.
* **Headers:** `Authorization: Bearer <token>`

---

### 9.3 Get Order Status
* **Route:** `GET /api/v1/merchandise/orders/{order_id}`
* **Purpose:** Real-time production tracking (`Manufacturing`, `Printed`, `Shipped`, `Delivered`).

---

## 10. Organizer Task Management & Timelines
**Router:** `backend/app/routers/tasks.py`  
**Frontend Consumers:** `OrganizerDashboardView.jsx`, `taskService.js`  
**Primary Database Tables:** `event_tasks`

---

### 10.1 Get Event Tasks
* **Route:** `GET /api/v1/events/{event_id}/tasks`
* **Purpose:** Retrieves event milestones, deadline checklists, and task assignments.
* **Headers:** `Authorization: Bearer <token>`

---

### 10.2 Create Event Task
* **Route:** `POST /api/v1/events/{event_id}/tasks`
* **Purpose:** Adds a custom task with due date, priority, and assigned team member.
* **Headers:** `Authorization: Bearer <token>`

---

### 10.3 Update Task Status
* **Route:** `PATCH /api/v1/events/{event_id}/tasks/{task_id}`
* **Purpose:** Toggle completion status (`pending` ↔ `completed`).
* **Headers:** `Authorization: Bearer <token>`

---

### 10.4 Apply Organizer Checklist Template
* **Route:** `POST /api/v1/events/{event_id}/tasks/apply-template`
* **Purpose:** Automatically generates standard pre-event checklist items (e.g. "Finalize Venue 30 Days Out", "Confirm Keynotes 21 Days Out", "Order Swag 14 Days Out", "Run Door Scanner Test").
* **Headers:** `Authorization: Bearer <token>`

---

## 11. Attendee Notifications
**Router:** `backend/app/routers/notifications.py`  
**Frontend Consumers:** `NotificationBell.jsx`, `AttendeeDashboardView.jsx` ("Event updates" tab), `notificationService.js`  
**Primary Database Tables:** `notifications`, `tickets`, `events`

---

### 11.1 List Attendee Notifications
* **Route:** `GET /api/v1/notifications`
* **Purpose:** Returns all alerts for the authenticated user (newest first). Used to alert registered attendees whenever an event organizer finalizes a venue, confirms speakers, or updates the schedule post-publication.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):**
  ```json
  [
    {
      "id": "uuid",
      "user_email": "alice@example.com",
      "event_id": "7b56a1b8...",
      "event_title": "Global AI Summit 2027",
      "type": "event_update",
      "title": "Update on Global AI Summit 2027",
      "message": "Venue confirmed: Moscone Center West · Speakers announced: Dr. Sarah AI · Agenda published: 4 sessions added",
      "changes": {
        "venue": "Moscone Center West",
        "speakers": ["Dr. Sarah AI"],
        "scheduleCount": 4
      },
      "read": false,
      "created_at": "2027-04-01T10:00:00Z"
    }
  ]
  ```

---

### 11.2 Mark Notification as Read
* **Route:** `PATCH /api/v1/notifications/{notification_id}/read`
* **Purpose:** Marks an individual notification as read.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** `{"success": true}`

---

### 11.3 Mark All Notifications as Read
* **Route:** `POST /api/v1/notifications/read-all`
* **Purpose:** Batch clears all unread notification badges for the user.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** `{"success": true, "count": 3}`

---

## 12. System Health & Documentation Endpoints
**Router:** `backend/app/main.py`

---

### 12.1 Health Check
* **Route:** `GET /health`
* **Purpose:** Lightweight server & database connectivity probe used by load balancers, monitoring tools, and frontend status bars.
* **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "service": "Event Horizon FastAPI Backend",
    "database": "Supabase PostgreSQL"
  }
  ```

### 12.2 Interactive OpenAPI Documentation
* **Swagger UI:** `GET /docs` — Interactive sandbox allowing you to test every endpoint directly in your browser.
* **ReDoc:** `GET /redoc` — Publication-grade clean REST API documentation.
* **Raw OpenAPI Specification:** `GET /openapi.json` — Machine-readable OpenAPI 3.1 JSON specification.

---

## Complete API Route Summary Table

| # | HTTP Method | Path | Target Module | Protected / Auth |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `POST` | `/api/v1/auth/signup` | Auth | Public |
| 2 | `POST` | `/api/v1/auth/login` | Auth | Public |
| 3 | `GET` | `/api/v1/auth/me` | Auth | **Bearer JWT** |
| 4 | `POST` | `/api/v1/auth/switch-role` | Auth | **Bearer JWT** |
| 5 | `POST` | `/api/v1/auth/setup-role` | Auth | **Bearer JWT** |
| 6 | `GET` | `/api/v1/events` | Events | Public |
| 7 | `GET` | `/api/v1/events/{event_id}` | Events | Public |
| 8 | `POST` | `/api/v1/events` | Events | **Bearer JWT** |
| 9 | `PUT` | `/api/v1/events/{event_id}` | Events | **Organizer Only (403)** |
| 10 | `PATCH` | `/api/v1/events/{event_id}` | Events | **Organizer Only (403)** |
| 11 | `PUT` | `/api/v1/events/{event_id}/schedule` | Events | **Organizer Only (403)** |
| 12 | `GET` | `/api/v1/events/{event_id}/attendees` | Events | **Organizer Only (403)** |
| 13 | `GET` | `/api/v1/events/{event_id}/finances` | Events | Public / Org |
| 14 | `POST` | `/api/v1/events/{event_id}/expenses` | Events | **Organizer Only** |
| 15 | `POST` | `/api/v1/tickets/book` | Tickets | **Bearer JWT** |
| 16 | `GET` | `/api/v1/tickets/my-tickets` | Tickets | **Bearer JWT** |
| 17 | `POST` | `/api/v1/tickets/check-in` | Tickets | Public / Scanner |
| 18 | `GET` | `/api/v1/communities` | Communities | Public |
| 19 | `GET` | `/api/v1/communities/{id}` | Communities | Public |
| 20 | `POST` | `/api/v1/communities` | Communities | **Bearer JWT** |
| 21 | `POST` | `/api/v1/communities/{id}/join` | Communities | **Bearer JWT** |
| 22 | `GET` | `/api/v1/communities/{id}/messages` | Communities | Public |
| 23 | `POST` | `/api/v1/communities/{id}/messages` | Communities | **Bearer JWT** |
| 24 | `WS` | `/ws/community/{id}` | Real-Time Room | **WebSocket** |
| 25 | `GET` | `/api/v1/sponsorships/opportunities` | Sponsorships | Public |
| 26 | `POST` | `/api/v1/sponsorships/requests` | Sponsorships | **Bearer JWT (Sponsor)** |
| 27 | `PATCH` | `/api/v1/sponsorships/requests/{id}` | Sponsorships | **Organizer Only** |
| 28 | `POST` | `/api/v1/sponsorships/requests/{id}/payout` | Sponsorships | **Organizer Only** |
| 29 | `GET` | `/api/v1/venues` | Venues | Public |
| 30 | `GET` | `/api/v1/venues/{id}` | Venues | Public |
| 31 | `POST` | `/api/v1/venues` | Venues | **Bearer JWT (Host)** |
| 32 | `POST` | `/api/v1/venues/{id}/bookings` | Venues | **Bearer JWT** |
| 33 | `PATCH` | `/api/v1/venues/bookings/{id}/status` | Venues | **Venue Host Only** |
| 34 | `GET` | `/api/v1/speakers` | Speakers | Public |
| 35 | `GET` | `/api/v1/speakers/{id}` | Speakers | Public |
| 36 | `POST` | `/api/v1/speakers/invitations` | Speakers | **Organizer Only** |
| 37 | `PATCH` | `/api/v1/speakers/invitations/{id}` | Speakers | **Speaker Only** |
| 38 | `GET` | `/api/v1/events/{id}/lineup` | Speakers | Public |
| 39 | `GET` | `/api/v1/merchandise/catalog` | Merchandise | Public |
| 40 | `POST` | `/api/v1/merchandise/orders` | Merchandise | **Organizer Only** |
| 41 | `GET` | `/api/v1/merchandise/orders/{id}` | Merchandise | **Bearer JWT** |
| 42 | `GET` | `/api/v1/events/{id}/tasks` | Tasks | **Organizer Only** |
| 43 | `POST` | `/api/v1/events/{id}/tasks` | Tasks | **Organizer Only** |
| 44 | `PATCH` | `/api/v1/events/{id}/tasks/{task_id}` | Tasks | **Organizer Only** |
| 45 | `POST` | `/api/v1/events/{id}/tasks/apply-template` | Tasks | **Organizer Only** |
| 46 | `GET` | `/api/v1/notifications` | Notifications | **Bearer JWT** |
| 47 | `PATCH` | `/api/v1/notifications/{id}/read` | Notifications | **Bearer JWT** |
| 48 | `POST` | `/api/v1/notifications/read-all` | Notifications | **Bearer JWT** |
| 49 | `GET` | `/health` | Health Check | Public |

