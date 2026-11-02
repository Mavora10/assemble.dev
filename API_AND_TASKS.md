# Assemble.dev — Complete API Specification & 2-Person Team Task Roadmap

> **Project:** Assemble.dev (Event & Community Intelligence Platform)  
> **Tech Stack:** React 19 + Vite (Frontend) • Supabase PostgreSQL & Auth (Database) • Gemini AI  
> **Target Audience:** 2-Developer Engineering Team (Dev A & Dev B)  
> **Date:** November 2026

---

## Table of Contents
1. [Architecture Overview & Integration Pattern](#1-architecture-overview--integration-pattern)
2. [Complete API Specification](#2-complete-api-specification)
   - [2.1 Authentication & Profile Services](#21-authentication--profile-services)
   - [2.2 Events & Expenses Services](#22-events--expenses-services)
   - [2.3 Tickets & Door Check-In Services](#23-tickets--door-check-in-services)
   - [2.4 Communities & Real-Time Messages Services](#24-communities--real-time-messages-services)
   - [2.5 Sponsorships & Requests Services](#25-sponsorships--requests-services)
   - [2.6 Venue Marketplace & Bookings Services](#26-venue-marketplace--bookings-services)
   - [2.7 Speaker Directory & Invitations Services](#27-speaker-directory--invitations-services)
   - [2.8 Merchandise / Goodies Orders Services](#28-merchandise--goodies-orders-services)
   - [2.9 AI Services (Gemini 2.5)](#29-ai-services-gemini-25)
3. [2-Developer Task Division & Roadmap](#3-2-developer-task-division--roadmap)
   - [Sprint 1: Supabase Service Layer & Auth](#sprint-1-supabase-service-layer--auth-days-1-3)
   - [Sprint 2: Core Events, Tickets & Community Room](#sprint-2-core-events-tickets--community-room-days-4-7)
   - [Sprint 3: Marketplaces (Venues & Speakers) + Goodies](#sprint-3-marketplaces-venues--speakers--goodies-days-8-10)
   - [Sprint 4: Dashboards & Role-Based Workflows](#sprint-4-dashboards--role-based-workflows-days-11-13)
   - [Sprint 5: AI Integration, Real-Time Polishing & QA](#sprint-5-ai-integration-real-time-polishing--qa-days-14-16)
4. [Team Git Collaboration & Environment Guidelines](#4-team-git-collaboration--environment-guidelines)

---

## 1. Architecture Overview & Integration Pattern

The frontend communicates with Supabase using the unified client created at `src/utils/supabaseClient.js`.

```
React UI Views (App.jsx & src/components/views/*)
       │
       ▼
Service Layer (src/services/*.js)
       │
       ▼
Supabase Client (src/utils/supabaseClient.js)
       │
       ▼
Supabase Cloud (PostgreSQL 15 + Auth + Realtime + Storage)
       │
       ▲
Gemini AI SDK (@google/genai) for AI Quiz & Community Intelligence
```

### Key Conventions
- **Direct Supabase RPC & Queries**: Fast, typed queries using `@supabase/supabase-js`.
- **Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` loaded in `.env`.
- **Error Handling**: Every service function returns `{ data, error }` consistently.

---

## 2. Complete API Specification

All functions are organized into reusable service modules inside `src/services/`.

### 2.1 Authentication & Multi-Role Profile Services
**File:** `src/services/authService.js`

> **Multi-Role Architecture Note:**  
> A single user account can hold **multiple roles simultaneously** (e.g., an Attendee can also be an Organizer and a Speaker).  
> - **`capabilities` (`TEXT[]`)**: Array of all roles unlocked by the user (e.g. `['attendee', 'organizer', 'speaker']`). Everyone gets `'attendee'` by default.  
> - **`active_role` (`VARCHAR`)**: The role persona currently selected in the UI navigation.  
> - **`user_profiles` (`TABLE`)**: Stores role-specific setup data per role (`UNIQUE(user_id, role)`) such as `speakerProfile` (topics, bio), `sponsorProfile` (company name, budget range), or `venueProfile` (capacity, address).

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `signUpUser` | `supabase.auth.signUp` | `{ email, password, name, initialRole, city }` | `{ user, session, error }` | Creates auth user, adds `['attendee', initialRole]` to `capabilities`, and initializes `users` & `user_profiles`. |
| `signInUser` | `supabase.auth.signInWithPassword` | `{ email, password }` | `{ user, session, profiles, capabilities, error }` | Logs user in and fetches all unlocked `capabilities`, active role, and role profiles. |
| `signOutUser` | `supabase.auth.signOut` | `None` | `{ error }` | Terminates session and clears active storage. |
| `getCurrentUserProfile` | `supabase.from('users').select('*, user_profiles(*)')` | `userId` | `{ user, capabilities, activeRole, profiles, error }` | Loads user record, capabilities list, active persona, and role-specific profile data. |
| `switchActiveRole` | `supabase.from('users').update({ active_role })` | `userId, newRole` | `{ data, error }` | Switches active persona in UI among the user's unlocked `capabilities`. |
| `addRoleCapability` | `supabase.from('users').update({ capabilities })` | `userId, newRole` | `{ data, error }` | Unlocks an additional role (e.g. Attendee registers to become a Speaker or Sponsor) without losing existing roles. |
| `getRoleProfiles` | `supabase.from('user_profiles').select('*')` | `userId` | `{ data: UserProfile[], error }` | Retrieves all role profiles configured for the user. |
| `saveRoleProfile` | `supabase.from('user_profiles').upsert(...)` | `userId, role, profileData` | `{ data, error }` | Saves role-specific onboarding data (e.g. Speaker bio & fee, Sponsor company & tier). |
| `hasRoleSetupCompleted` | Helper / Query | `user, role` | `boolean` | Checks if required onboarding information for `role` has been completed. |

---

### 2.2 Events & Expenses Services
**File:** `src/services/eventService.js`

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `getEvents` | `supabase.from('events').select('*')` | `{ category, city, format, search }` | `{ data: Event[], error }` | List events with optional multi-filter for Discover view. |
| `getEventById` | `supabase.from('events').select('*, event_expenses(*), event_speakers(*)')` | `eventId` | `{ data: EventDetail, error }` | Fetches event with joined expenses and confirmed speakers. |
| `createEvent` | `supabase.from('events').insert(...)` | `eventPayload` | `{ data: Event, error }` | Publishes event, ticket tiers, and sponsorship requirements. |
| `updateEvent` | `supabase.from('events').update(...)` | `eventId, updates` | `{ data, error }` | Modifies event logistics, status, or details. |
| `deleteEvent` | `supabase.from('events').delete()` | `eventId` | `{ data, error }` | Deletes or archives an event. |
| `getEventExpenses` | `supabase.from('event_expenses').select('*')` | `eventId` | `{ data: Expense[], error }` | Loads expense breakdown for organizer budget tracking. |
| `addEventExpense` | `supabase.from('event_expenses').insert(...)` | `expensePayload` | `{ data, error }` | Adds newly incurred expense item. |

---

### 2.3 Tickets & Door Check-In Services
**File:** `src/services/ticketService.js`

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `bookTicket` | `supabase.from('tickets').insert(...)` | `{ eventId, userId, userName, userEmail, tierName, price }` | `{ data: Ticket, error }` | Generates a unique ticket ID (e.g. `TCK-XXXXX`) and increments `registered_count`. |
| `getUserTickets` | `supabase.from('tickets').select('*, events(*)')` | `userId` | `{ data: TicketWithEvent[], error }` | Fetches tickets registered by the logged-in attendee. |
| `getEventAttendees` | `supabase.from('tickets').select('*')` | `eventId` | `{ data: Ticket[], error }` | Attendee list for organizer check-in and CSV export. |
| `checkInTicket` | RPC `increment_event_checkins` + update | `ticketId, eventId` | `{ success: boolean, error }` | Marks ticket status `'checked-in'`, sets timestamp, increments event count. |
| `cancelTicket` | `supabase.from('tickets').update({ status: 'cancelled' })` | `ticketId` | `{ data, error }` | Cancels reservation. |

---

### 2.4 Communities & Real-Time Messages Services
**File:** `src/services/communityService.js`

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `getCommunities` | `supabase.from('communities').select('*')` | `filterQuery` | `{ data: Community[], error }` | Fetches active communities. |
| `getCommunityBySlug`| `supabase.from('communities').select('*')` | `slugOrCode` | `{ data: Community, error }` | Fetches details and member stats. |
| `joinCommunity` | `supabase.from('community_members').insert(...)` | `communityId, userId` | `{ data, error }` | Adds user as community member. |
| `getCommunityMessages` | `supabase.from('community_messages').select('*')` | `communityId, limit = 50` | `{ data: Message[], error }` | Retrieves recent chat history for the Community Room. |
| `sendCommunityMessage` | `supabase.from('community_messages').insert(...)` | `{ communityId, userId, userName, text }` | `{ data, error }` | Posts a new message. |
| `subscribeToCommunityRoom` | `supabase.channel('room:xxx').on('postgres_changes', ...)` | `communityId, onMessageCallback` | `Subscription` | Realtime WebSocket subscription for live incoming messages. |

---

### 2.5 Sponsorships & Requests Services
**File:** `src/services/sponsorshipService.js`

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `getSponsorshipRequests` | `supabase.from('sponsorship_requests').select('*')` | `{ eventId, sponsorId }` | `{ data: Request[], error }` | Fetches incoming or outgoing sponsorship proposals. |
| `createSponsorshipRequest` | `supabase.from('sponsorship_requests').insert(...)` | `requestPayload` | `{ data: Request, error }` | Organizer applies to sponsor or sponsor pledges support. |
| `updateSponsorshipStatus` | `supabase.from('sponsorship_requests').update(...)` | `requestId, status ('APPROVED' / 'REJECTED')` | `{ data, error }` | Approves or rejects sponsor proposal. |

---

### 2.6 Venue Marketplace & Bookings Services
**File:** `src/services/venueService.js`

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `getVenues` | `supabase.from('venues').select('*')` | `{ city, vibe, minCapacity }` | `{ data: Venue[], error }` | Searches venue listings. |
| `getVenueById` | `supabase.from('venues').select('*')` | `venueId` | `{ data: Venue, error }` | Venue details, photos, amenities, pricing. |
| `createVenueBooking` | `supabase.from('venue_bookings').insert(...)` | `bookingPayload` | `{ data: Booking, error }` | Organizer requests venue date reservation. |
| `getVenueBookings` | `supabase.from('venue_bookings').select('*')` | `{ venueId, organizerId }` | `{ data: Booking[], error }` | Loads booking management queue. |
| `updateBookingStatus` | `supabase.from('venue_bookings').update(...)` | `bookingId, status` | `{ data, error }` | Provider accepts or declines date. |

---

### 2.7 Speaker Directory & Invitations Services
**File:** `src/services/speakerService.js`

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `getSpeakers` | `supabase.from('speakers').select('*')` | `{ topic, location, availableOnly }` | `{ data: Speaker[], error }` | Browse marketplace speakers. |
| `sendSpeakerInvitation` | `supabase.from('speaker_invitations').insert(...)` | `invitationPayload` | `{ data: Invitation, error }` | Organizer invites speaker to keynote / panel. |
| `getSpeakerInvitations` | `supabase.from('speaker_invitations').select('*')` | `{ speakerId, organizerId }` | `{ data: Invitation[], error }` | Review incoming invitations. |
| `respondToSpeakerInvitation` | `supabase.from('speaker_invitations').update(...)` | `inviteId, status` | `{ data, error }` | Speaker accepts or declines talk invitation. |

---

### 2.8 Merchandise / Goodies Orders Services
**File:** `src/services/merchService.js`

| Function | Method / Call | Inputs | Response / Return | Description |
|---|---|---|---|---|
| `createMerchandiseOrder` | `supabase.from('merchandise_orders').insert(...)` | `orderPayload` | `{ data: Order, error }` | Submits bulk order for attendee swag & badges. |
| `getOrdersByEvent` | `supabase.from('merchandise_orders').select('*')` | `eventId` | `{ data: Order[], error }` | Fetches tracking and production status. |

---

### 2.9 AI Services (Gemini 2.5)
**File:** `src/services/aiService.js`

| Function | Inputs | Output | Description |
|---|---|---|---|
| `generateEventQuiz` | `topic, difficulty, numQuestions` | `QuizQuestion[]` | Generates multiple-choice quiz questions for the live community room. |
| `analyzeCommunitySentiment` | `communityMessages[]` | `{ sentimentScore, topKeywords, actionItems }` | Analyzes attendee engagement and chat mood. |
| `generateSponsorDueDiligence` | `eventTopic, sponsorCompany` | `{ fitScore, suggestedDeliverables, pitchHooks }` | AI matching score between event audience and sponsor brand. |

---

## 3. 2-Developer Task Division & Roadmap

This project is structured for **Developer A (Frontend & UX Lead)** and **Developer B (Data & Backend Lead)** to work in parallel without blocking each other.

### Sprint 1: Supabase Service Layer & Auth (Days 1–3)
**Goal:** Replace localStorage mock auth with live Supabase authentication and establish project patterns.

#### Developer A (Frontend & Views)
- [ ] **Task A1.1:** Update `src/components/views/LoginView.jsx` to call `signInUser()` and display friendly validation/error alerts.
- [ ] **Task A1.2:** Update `src/components/views/SignupView.jsx` to allow selecting an initial primary role, saving `['attendee', initialRole]` into capabilities.
- [ ] **Task A1.3:** Connect `Navbar.jsx` with real user session state, active role badge, and **interactive multi-role switcher dropdown** (allowing instant switching between unlocked roles in `user.capabilities`).
- [ ] **Task A1.4:** Connect `RoleSetupPendingView.jsx` & `RoleSetupView.jsx` so users can unlock a new persona (e.g., an attendee adding an Organizer or Speaker role) and complete that role's profile.

#### Developer B (Services & Database)
- [ ] **Task B1.1:** Implement `src/services/authService.js` (Sign up, Sign in, Sign out, session listener, `switchActiveRole`, `addRoleCapability`, `saveRoleProfile`).
- [ ] **Task B1.2:** Create auth state listener hook (`src/hooks/useAuth.js`) preserving `user.capabilities`, `user.active_role`, and role profiles.
- [ ] **Task B1.3:** Setup Row Level Security (RLS) policies in Supabase for `users` and `user_profiles` (`UNIQUE(user_id, role)`).
- [ ] **Task B1.4:** Seed test accounts with multiple active capabilities (e.g. `multi-user@test.com` with `capabilities: ['attendee', 'organizer', 'speaker']`).

---

### Sprint 2: Core Events, Tickets & Community Room (Days 4–7)
**Goal:** Event discovery, creation, ticket registration, and real-time live community room.

#### Developer A (Frontend & Views)
- [ ] **Task A2.1:** Wire `src/components/views/DiscoverView.jsx` to fetch live events from Supabase with search/filter debouncing.
- [ ] **Task A2.2:** Update `src/components/views/EventDetailsView.jsx` to load event details, speaker line-ups, and ticket tiers.
- [ ] **Task A2.3:** Connect `src/components/modals/TicketModal.jsx` to execute ticket booking and show confirmed QR code.
- [ ] **Task A2.4:** Refactor `src/components/views/CommunityRoomView.jsx` chat window to render incoming real-time messages.

#### Developer B (Services & Database)
- [ ] **Task B2.1:** Implement `src/services/eventService.js` (CRUD, filters by city/category, expense queries).
- [ ] **Task B2.2:** Implement `src/services/ticketService.js` (Ticket generation, user tickets list, QR check-in RPC).
- [ ] **Task B2.3:** Implement `src/services/communityService.js` with Supabase Realtime WebSocket subscription (`supabase.channel`).
- [ ] **Task B2.4:** Write database seed script or SQL insert for 5 realistic events and 3 communities.

---

### Sprint 3: Marketplaces (Venues & Speakers) + Goodies (Days 8–10)
**Goal:** Venue booking flow, speaker directory invitation system, and merchandise ordering.

#### Developer A (Frontend & Views)
- [ ] **Task A3.1:** Connect `src/components/views/VenueMarketplaceView.jsx` to browse venues and submit date booking modal.
- [ ] **Task A3.2:** Connect `src/components/views/SpeakerMarketplaceView.jsx` to browse speakers and send session invitations.
- [ ] **Task A3.3:** Wire the goodies/swag order section in `CreateEventView.jsx` to submit bulk orders.
- [ ] **Task A3.4:** Add toast notifications for successful booking requests and invite submissions.

#### Developer B (Services & Database)
- [ ] **Task B3.1:** Implement `src/services/venueService.js` (Fetch venues, filter by vibe/capacity, insert/update bookings).
- [ ] **Task B3.2:** Implement `src/services/speakerService.js` (Fetch speakers, send invites, accept/decline invites).
- [ ] **Task B3.3:** Implement `src/services/merchService.js` (Submit and fetch merchandise orders).
- [ ] **Task B3.4:** Add RLS policies for `venue_bookings` and `speaker_invitations`.

---

### Sprint 4: Dashboards & Role-Based Workflows (Days 11–13)
**Goal:** Dedicated dashboards for organizers, attendees, sponsors, speakers, and venue providers.

#### Developer A (Frontend & Views)
- [ ] **Task A4.1:** **Attendee Dashboard** (`AttendeeDashboardView.jsx`): Render real booked tickets, QR codes, and bookmarked events.
- [ ] **Task A4.2:** **Organizer Dashboard** (`OrganizerDashboardView.jsx`): Real attendee counts, check-in scanner view, and expense tracker.
- [ ] **Task A4.3:** **Sponsor Dashboard** (`SponsorDashboardView.jsx`): Filter inbound opportunities and approve/reject sponsorship bids.
- [ ] **Task A4.4:** **Speaker & Venue Dashboards**: Manage received talk invitations and venue calendar dates.

#### Developer B (Services & Database)
- [ ] **Task B4.1:** Implement `src/services/sponsorshipService.js` (fetch requests, approve/reject bids).
- [ ] **Task B4.2:** Build door check-in scanner verification logic (validate ticket ID and trigger `increment_event_checkins`).
- [ ] **Task B4.3:** Aggregate analytics queries for Organizer Dashboard (Revenue, % Checked-in, Budget remaining).
- [ ] **Task B4.4:** Implement CSV attendee list export query.

---

### Sprint 5: AI Integration, Real-Time Polishing & QA (Days 14–16)
**Goal:** Gemini AI powered quiz generation, live game player, performance tuning, and launch readiness.

#### Developer A (Frontend & Views)
- [ ] **Task A5.1:** Wire `src/components/game/PlayerGame.jsx` with live game sessions in the Community Room.
- [ ] **Task A5.2:** Add loading skeletons and optimistic UI updates for chat messages and ticket bookings.
- [ ] **Task A5.3:** End-to-end user testing across all 5 user roles on mobile and desktop.
- [ ] **Task A5.4:** Clean up dead mock data in `src/data/initialData.js`.

#### Developer B (Services & Database)
- [ ] **Task B5.1:** Implement `src/services/aiService.js` using `@google/genai` (generate live event quizzes from prompt).
- [ ] **Task B5.2:** Add AI community sentiment analyzer in `CommunityAnalysisView.jsx`.
- [ ] **Task B5.3:** Database indexes verification and query performance check in Supabase.
- [ ] **Task B5.4:** Prepare production environment build and deployment checklist.

---

## 4. Team Git Collaboration & Environment Guidelines

1. **Branching Strategy**:
   - `main`: Production-ready code.
   - `dev`: Active integration branch.
   - `feature/devA-<feature-name>`: Developer A working branches.
   - `feature/devB-<feature-name>`: Developer B working branches.
2. **Environment Synchronization**:
   - Both developers share the same Supabase project database instance (`fahlfdvzkeoxsfvrrvlv.supabase.co`).
   - `.env` must never be committed (kept in `.gitignore`).
   - Always run `npm run build` locally before pushing to ensure zero build errors.
