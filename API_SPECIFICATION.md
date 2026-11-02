# Event Horizon (Assemble.dev) — Complete API Specification

> **Base URL:** `http://localhost:8000/api/v1` (Development) or `https://api.assemble.dev/api/v1` (Production)  
> **Protocol:** RESTful JSON over HTTPS + WebSockets for Real-Time Rooms  
> **Database:** Supabase PostgreSQL  
> **Auth Scheme:** Bearer Token (JWT from Supabase Auth or FastAPI `Authorization: Bearer <token>`)

---

## Table of Contents
1. [Authentication & User Roles](#1-authentication--user-roles)
2. [Events & Budgeting](#2-events--budgeting)
3. [Tickets & QR Check-In](#3-tickets--qr-check-in)
4. [Communities & Discussions](#4-communities--discussions)
5. [Live Community Room (WebSockets)](#5-live-community-room-websockets)
6. [Sponsorships & Due Diligence](#6-sponsorships--due-diligence)
7. [Venues Marketplace & Bookings](#7-venues-marketplace--bookings)
8. [Speakers Marketplace & Lineups](#8-speakers-marketplace--lineups)
9. [Merchandise & Swag Store](#9-merchandise--swag-store)
10. [Organizer Task Management](#10-organizer-task-management)
11. [Event Photo Storage & AI Face Match](#11-event-photo-storage--ai-face-match)
12. [Gamification & Rewards Engine](#12-gamification--rewards-engine)
13. [Gemini AI Intelligence & Analytics](#13-gemini-ai-intelligence--analytics)

---

## 1. Authentication & User Roles
*Powers: `LoginView.jsx`, `SignupView.jsx`, `RoleSetupView.jsx`, `ProfileView.jsx`, and Navbar multi-role switcher.*

### 1.1 `POST /auth/signup`
* **Description:** Register a new user with base credentials.
* **Request Body:**
  ```json
  {
    "email": "sarah@example.com",
    "password": "Password123!",
    "name": "Sarah Connor",
    "phone": "+1 555-0192",
    "city": "San Francisco",
    "initialRole": "attendee"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "7b56a1b8-6a3f-4228-a3f2-1279a0b0d39e",
      "email": "sarah@example.com",
      "name": "Sarah Connor",
      "activeRole": "attendee",
      "capabilities": ["attendee"]
    }
  }
  ```

### 1.2 `POST /auth/login`
* **Description:** Authenticate user and issue JWT session token.
* **Request Body:**
  ```json
  {
    "email": "sarah@example.com",
    "password": "Password123!"
  }
  ```
* **Response (200 OK):** User object + JWT session token.

### 1.3 `GET /auth/me`
* **Description:** Fetch the currently authenticated user profile, roles, and profile metadata.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):**
  ```json
  {
    "id": "7b56a1b8-6a3f-4228-a3f2-1279a0b0d39e",
    "email": "sarah@example.com",
    "name": "Sarah Connor",
    "activeRole": "organizer",
    "capabilities": ["attendee", "organizer", "speaker"],
    "avatarUrl": "https://...",
    "bio": "Event host & developer community lead.",
    "profiles": {
      "organizer": { "organizationName": "Cyberdyne Events", "website": "https://..." },
      "speaker": { "designation": "AI Architect", "fee": "$500" }
    }
  }
  ```

### 1.4 `POST /auth/switch-role`
* **Description:** Switch the active viewing perspective (e.g., from Attendee to Organizer or Sponsor).
* **Request Body:**
  ```json
  {
    "targetRole": "organizer"
  }
  ```
* **Response (200 OK):** Updated user object with new `activeRole`.

### 1.5 `POST /auth/setup-role`
* **Description:** Complete onboard setup when enabling a new role capability (e.g. creating organizer organization, venue host profile, or speaker profile).
* **Request Body:**
  ```json
  {
    "role": "venue_provider",
    "profileData": {
      "companyName": "Skyline Venues LLC",
      "taxId": "TAX-9921",
      "payoutAccount": "acct_12345"
    }
  }
  ```

---

## 2. Events & Budgeting
*Powers: `DiscoverView.jsx`, `CreateEventView.jsx`, `EventDetailsView.jsx`, `OrganizerDashboardView.jsx`, and `EventAnalyticsView.jsx`.*

### 2.1 `GET /events`
* **Description:** List events with filtering, search, and pagination.
* **Query Params:**
  * `search` (optional string): title or description query
  * `category` (optional string): `Tech`, `Design`, `Web3`, etc.
  * `format` (optional string): `In-Person`, `Online`, `Hybrid`
  * `city` (optional string): `Bangalore`, `San Francisco`, etc.
  * `isFree` (optional boolean)
  * `page` (default: 1), `limit` (default: 12)
* **Response (200 OK):** Array of event summary cards with registered count and pricing.

### 2.2 `GET /events/{event_id}`
* **Description:** Get full event details, ticket tiers, sponsor tiers, confirmed speakers, and venue details.
* **Response (200 OK):** Complete event aggregate object.

### 2.3 `POST /events`
* **Description:** Create a new event (by verified Organizer).
* **Request Body:**
  ```json
  {
    "title": "Global AI Summit 2027",
    "description": "The premier conference on agentic systems.",
    "category": "Tech",
    "format": "In-Person",
    "startDate": "2027-04-15",
    "startTime": "09:00 AM",
    "location": "Moscone Center",
    "city": "San Francisco",
    "expectedAttendees": 500,
    "budget": 25000.00,
    "ticketTiers": [
      { "name": "Early Bird", "price": 49.00, "capacity": 100 },
      { "name": "Standard Attendee", "price": 99.00, "capacity": 400 }
    ],
    "sponsorshipOpportunities": [
      { "tier": "Title Sponsor", "amount": 10000.00, "slots": 1 },
      { "tier": "Snack Sponsor", "amount": 2500.00, "slots": 3 }
    ],
    "venueDetails": { "venueId": "optional-uuid-of-booked-venue" },
    "swagOrder": { "tshirts": 500, "stickers": 1000 }
  }
  ```
* **Response (201 Created):** Newly created event record.

### 2.4 `PATCH /events/{event_id}`
* **Description:** Update event details, status (`draft`, `published`, `completed`, `cancelled`).

### 2.5 `DELETE /events/{event_id}`
* **Description:** Soft-delete or archive an event.

### 2.6 `GET /events/{event_id}/finances`
* **Description:** Fetch budget breakdown, ticket revenue, sponsorship funds raised, and expense list.
* **Response (200 OK):**
  ```json
  {
    "allocatedBudget": 25000.00,
    "totalSpent": 18450.00,
    "ticketRevenue": 34500.00,
    "sponsorshipRevenue": 15000.00,
    "netProfit": 31050.00,
    "expenses": [
      { "id": "uuid", "title": "Catering Deposit", "category": "Food", "spent": 4200.00, "status": "Paid" }
    ]
  }
  ```

### 2.7 `POST /events/{event_id}/expenses`
* **Description:** Log a new expense against an event budget.

---

## 3. Tickets & QR Check-In
*Powers: `EventDetailsView.jsx` (Booking modal), `AttendeeDashboardView.jsx` (My Tickets), and `OrganizerDashboardView.jsx` (Door Check-In Scanner).*

### 3.1 `POST /tickets/book`
* **Description:** Reserve and book tickets for an event.
* **Request Body:**
  ```json
  {
    "eventId": "uuid",
    "ticketTierName": "Standard Attendee",
    "quantity": 1,
    "attendeeDetails": {
      "name": "Sarah Connor",
      "email": "sarah@example.com",
      "phone": "+1 555-0192"
    }
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "ticketId": "TCK-8849-AI",
    "qrCodePayload": "ASSEMBLE:TCK-8849-AI:SIGNATURE_HASH",
    "status": "confirmed",
    "pricePaid": 99.00
  }
  ```

### 3.2 `GET /tickets/my-tickets`
* **Description:** List all tickets booked by the currently authenticated attendee.

### 3.3 `POST /tickets/check-in`
* **Description:** Door volunteer or organizer scans an attendee's QR code to verify entry.
* **Request Body:**
  ```json
  {
    "eventId": "uuid",
    "ticketId": "TCK-8849-AI"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "valid": true,
    "alreadyCheckedIn": false,
    "attendee": { "name": "Sarah Connor", "tier": "VIP" },
    "checkedInAt": "2027-04-15T09:12:00Z"
  }
  ```

---

## 4. Communities & Discussions
*Powers: `CommunityRoomView.jsx`, `CommunityAnalysisView.jsx`, and community cards.*

### 4.1 `GET /communities`
* **Description:** List all public communities with member counts and activity level.

### 4.2 `GET /communities/{community_id}`
* **Description:** Get community overview, guidelines, organizers, and upcoming events.

### 4.3 `POST /communities/{community_id}/join`
* **Description:** Join a community as a member.

### 4.4 `GET /communities/{community_id}/messages`
* **Description:** Fetch past chat messages and discussion threads.
* **Query Params:** `limit` (default: 50), `before` (timestamp cursor).

### 4.5 `POST /communities/{community_id}/messages`
* **Description:** Post a message in the community discussion thread.

---

## 5. Live Community Room (WebSockets)
*Powers: Real-time interactions in `CommunityRoomView.jsx` (live chat, quizzes, leaderboards).*

### 5.1 `WS /ws/community/{community_id}`
* **Protocol:** WebSocket
* **Connection Params:** `?token=<jwt_token>`
* **Supported Incoming Client Messages:**
  * **Send Chat:**
    ```json
    { "type": "CHAT_MESSAGE", "text": "Hello everyone from SF!" }
    ```
  * **Submit Quiz Answer:**
    ```json
    { "type": "QUIZ_ANSWER", "questionId": "q1", "chosenIndex": 2, "timeSeconds": 4.2 }
    ```
  * **Send Reaction:**
    ```json
    { "type": "REACTION", "emoji": "🔥" }
    ```
* **Broadcasted Server Events:**
  * `NEW_CHAT_MESSAGE`: Real-time chat sync across all connected participants.
  * `QUIZ_QUESTION_START`: Trigger countdown for an interactive trivia question.
  * `QUIZ_ROUND_ENDED`: Reveal correct answer and XP awards.
  * `LEADERBOARD_UPDATED`: Live scores ranked by speed and accuracy.
  * `ATTENDEE_PRESENCE`: Real-time online headcount.

---

## 6. Sponsorships & Due Diligence
*Powers: `SponsorshipSection.jsx`, `BecomeSponsorView.jsx`, and `SponsorDashboardView.jsx`.*

### 6.1 `GET /sponsorships/opportunities`
* **Description:** Marketplace of events looking for sponsors with tier pricing and audience demographics.

### 6.2 `POST /sponsorships/requests`
* **Description:** Sponsor applies to sponsor an event or organizer sends a sponsorship pitch.
* **Request Body:**
  ```json
  {
    "eventId": "uuid",
    "requirement": "Title Sponsor",
    "offeredAmount": 10000.00,
    "sponsorNotes": "Includes booth and 10 min opening keynote."
  }
  ```

### 6.3 `PATCH /sponsorships/requests/{request_id}`
* **Description:** Organizer approves, rejects, or counters a sponsorship request.
* **Request Body:** `{ "status": "APPROVED" }`

### 6.4 `POST /sponsorships/requests/{request_id}/payout`
* **Description:** Escrow payment simulation or Stripe Checkout intent for sponsor funding.

---

## 7. Venues Marketplace & Bookings
*Powers: `VenueMarketplaceView.jsx` and `VenueProviderDashboardView.jsx`.*

### 7.1 `GET /venues`
* **Description:** Search venues by city, capacity, amenities, vibe, and max hourly rate.
* **Query Params:** `city`, `minCapacity`, `maxPrice`, `amenities` (comma-separated).

### 7.2 `GET /venues/{venue_id}`
* **Description:** Get full venue details, photo gallery, floor plan, rules, and calendar availability.

### 7.3 `POST /venues`
* **Description:** Venue Providers list a new venue property.

### 7.4 `POST /venues/{venue_id}/bookings`
* **Description:** Event organizer submits a booking request for dates and duration.
* **Request Body:**
  ```json
  {
    "eventId": "uuid",
    "bookingDate": "2027-04-15",
    "durationHours": 8,
    "expectedAttendees": 400,
    "notes": "Need projector setup and high-speed Wi-Fi."
  }
  ```

### 7.5 `PATCH /venues/bookings/{booking_id}/status`
* **Description:** Venue Provider confirms, declines, or requests adjustments to a booking.

---

## 8. Speakers Marketplace & Lineups
*Powers: `SpeakerMarketplaceView.jsx` and `SpeakerDashboardView.jsx`.*

### 8.1 `GET /speakers`
* **Description:** Search directory of professional & community speakers by topic, fee, and location.

### 8.2 `GET /speakers/{speaker_id}`
* **Description:** View speaker portfolio, past talks, video reel links, and ratings.

### 8.3 `POST /speakers/invitations`
* **Description:** Organizer invites a speaker to speak at an upcoming event.
* **Request Body:**
  ```json
  {
    "speakerId": "uuid",
    "eventId": "uuid",
    "sessionType": "Keynote",
    "pitch": "We would love for you to present on multi-agent architectures."
  }
  ```

### 8.4 `PATCH /speakers/invitations/{invite_id}`
* **Description:** Speaker accepts or declines the invitation.

### 8.5 `GET /events/{event_id}/lineup`
* **Description:** Returns the confirmed agenda/schedule of speakers and session topics for an event.

---

## 9. Merchandise & Swag Store
*Powers: `GoodiesMerchSection.jsx` and `ServicesMarketplaceView.jsx`.*

### 9.1 `GET /merchandise/catalog`
* **Description:** Fetch customizable event swag products (t-shirts, hoodies, badges, lanyards, stickers).

### 9.2 `POST /merchandise/orders`
* **Description:** Place a bulk swag order for an event.
* **Request Body:**
  ```json
  {
    "eventId": "uuid",
    "items": [
      { "item": "Premium Cotton T-Shirt", "quantity": 300, "unitPrice": 12.00, "sizes": { "M": 150, "L": 150 } },
      { "item": "Eco Lanyards", "quantity": 500, "unitPrice": 1.50 }
    ],
    "shippingAddress": "100 Howard St, San Francisco, CA"
  }
  ```

### 9.3 `GET /merchandise/orders/{order_id}`
* **Description:** Track swag production and shipping status (`submitted`, `in-production`, `shipped`, `delivered`).

---

## 10. Organizer Task Management *(New Feature)*
*Powers: Organizer Event Operations Dashboard (logistics, checklists, vendor tracking).*

### 10.1 `GET /events/{event_id}/tasks`
* **Description:** Get all planning tasks grouped by category (`Logistics`, `Marketing`, `Speakers`, `Sponsors`, `Day-Of`).

### 10.2 `POST /events/{event_id}/tasks`
* **Description:** Create an event-aware task linked to an existing entity.
* **Request Body:**
  ```json
  {
    "title": "Collect presentation slides",
    "category": "Speakers",
    "assignedToEmail": "alex@speaker.com",
    "linkedEntityType": "speaker",
    "linkedEntityId": "uuid-speaker",
    "dueDate": "2027-04-10",
    "relativeTimeline": "T-5 Days"
  }
  ```

### 10.3 `PATCH /events/{event_id}/tasks/{task_id}`
* **Description:** Mark task status (`todo`, `in_progress`, `completed`), change priority or assignee.

### 10.4 `POST /events/{event_id}/tasks/apply-template`
* **Description:** 1-click apply pre-built event templates (`Hackathon`, `Tech Conference`, `Community Meetup`).

---

## 11. Event Photo Storage & AI Face Match *(New Feature)*
*Powers: Centralized Event Gallery & Attendee Selfie Photo Finder.*

### 11.1 `POST /events/{event_id}/photos/upload-url`
* **Description:** Generate signed Supabase Storage upload URLs for organizers, community photographers, or attendees.
* **Request Body:** `{ "fileNames": ["img_001.jpg", "img_002.jpg"], "uploaderRole": "photographer" }`

### 11.2 `GET /events/{event_id}/photos`
* **Description:** Fetch paginated event gallery photos with thumbnail URLs and photographer attribution.

### 11.3 `POST /events/{event_id}/photos/face-match`
* **Description:** Attendee uploads a selfie photo to find all event photos they appear in.
* **Request:** Multipart form upload (`selfie_image` file).
* **Processing:** Backend detects face landmarks, computes facial embedding, and queries vector similarity.
* **Response (200 OK):**
  ```json
  {
    "matchedCount": 7,
    "photos": [
      { "photoId": "uuid-1", "url": "https://.../img_042.jpg", "confidence": 0.94 },
      { "photoId": "uuid-2", "url": "https://.../img_119.jpg", "confidence": 0.89 }
    ]
  }
  ```

---

## 12. Gamification & Rewards Engine *(New Feature)*
*Powers: Daily check-ins, attendee reward points, badges, and discounts.*

### 12.1 `GET /rewards/my-wallet`
* **Description:** Returns the attendee's total XP points, tier level, and earned badges.
* **Response (200 OK):**
  ```json
  {
    "totalPoints": 1450,
    "level": "Gold Explorer",
    "badges": ["Early Bird", "Trivia Master", "Networking Hero"],
    "dailyStreak": 5
  }
  ```

### 12.2 `POST /rewards/daily-checkin`
* **Description:** Claim daily login reward points to boost platform retention.

### 12.3 `POST /rewards/redeem`
* **Description:** Redeem accumulated points for ticket discount codes or merchandise vouchers.

---

## 13. Gemini AI Intelligence & Analytics
*Powers: AI Quiz Generator, Community Due Diligence, and AI Insights.*

### 13.1 `POST /ai/generate-quiz`
* **Description:** Uses Google Gemini to generate 5 trivia questions based on event description and topics.
* **Request Body:**
  ```json
  {
    "eventTitle": "Kubernetes & Cloud Native Day",
    "topics": ["K8s", "Docker", "DevOps"],
    "difficulty": "medium",
    "questionCount": 5
  }
  ```
* **Response (200 OK):** Array of formatted question objects with options, correct index, and explanations.

### 13.2 `POST /ai/community-due-diligence`
* **Description:** Gemini analyzes a community's historical event growth, sentiment, and sponsor ROI rating.

---

## Summary Matrix

| Section | Route Prefix | Primary Tables Touched | Real-Time / AI |
| :--- | :--- | :--- | :--- |
| **1. Auth** | `/api/v1/auth` | `users`, `user_profiles` | - |
| **2. Events** | `/api/v1/events` | `events`, `event_expenses` | - |
| **3. Tickets** | `/api/v1/tickets` | `tickets`, `ticket_checkins` | QR Code Validation |
| **4. Communities** | `/api/v1/communities` | `communities`, `community_members` | - |
| **5. Live Rooms** | `/ws/community` | `community_messages` | **WebSocket Realtime** |
| **6. Sponsorships** | `/api/v1/sponsorships` | `sponsorship_requests` | Escrow / Due Diligence |
| **7. Venues** | `/api/v1/venues` | `venues`, `venue_bookings` | - |
| **8. Speakers** | `/api/v1/speakers` | `speakers`, `speaker_invitations`, `event_speakers` | - |
| **9. Merchandise** | `/api/v1/merchandise` | `merchandise_orders` | - |
| **10. Tasks** | `/api/v1/tasks` | `event_tasks` *(new)* | Event Timeline Engine |
| **11. Photos** | `/api/v1/photos` | `event_photos` *(new)* | **AI Face Matching** |
| **12. Rewards** | `/api/v1/rewards` | `user_rewards`, `badges` *(new)* | Gamification XP |
| **13. AI** | `/api/v1/ai` | Supabase Logs | **Google Gemini SDK** |

