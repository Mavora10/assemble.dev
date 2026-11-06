# Event Horizon — Production Launch & Deployment Guide

This document provides a complete record of all completed backend and frontend integrations, alongside a step-by-step checklist to take Event Horizon from your local machine to live users in production.

---

## 1. Status of Implemented & Connected Features

All core features are implemented, connected to the FastAPI backend, and backed by Supabase persistence with local offline fallback.

| Module | Status | Backend Endpoints | Frontend Integration |
| :--- | :--- | :--- | :--- |
| **Authentication & Users** | ✅ Complete | `/auth/signup`, `/auth/login`, `/auth/me` | Hydrates on load; supports multi-role profiles (organizer, speaker, sponsor, venue host, attendee). |
| **Events & Publishing** | ✅ Complete | `/events` (CRUD, publish, draft, cancel, filter) | Creates, updates, drafts, and publishes live to database. |
| **Schedules & Speakers** | ✅ Complete | `/events/{id}/schedule`, `/speakers`, `/speakers/invitations` | Add sessions, invite speakers, accept/decline speaking invites, register speaker profile. |
| **Venues & Bookings** | ✅ Complete | `/venues`, `/venues/{id}/bookings`, `/venues/bookings/status` | List venues, book venue for event, accept/decline booking requests, create new venues. |
| **Sponsorships** | ✅ Complete | `/sponsorships/requests`, `/sponsorships/requests/{id}` | Submit sponsorship offers, simulate/approve deals, auto-credit event funding needs. |
| **Ticketing & Check-In**| ✅ Complete | `/tickets`, `/tickets/{id}/checkin` | Purchase tickets, view QR/tokens, check-in attendees at event door with duplicate prevention. |
| **Merchandise / Swag**  | ✅ Complete | `/merchandise/items`, `/merchandise/orders` | Cart checkout, track order delivery dates, link orders to events. |
| **Milestones & Tasks**  | ✅ Complete | `/events/{id}/tasks`, `/events/{id}/tasks/templates` | 1-click organizer milestone templates, toggle completion, custom task creation. |
| **In-App Notifications**| ✅ Complete | `/notifications`, `/notifications/{id}/read` | Organizer-to-attendee notification broadcasts on detail changes; instant unread badge. |

---

## 2. Verification & Test Results

- **Backend Integration Tests:** 7/7 test suites passing in `backend/test_integration.py`
  - Health check endpoint verification
  - JWT auth generation & decoding
  - Role-based access control & 403 Forbidden enforcement
  - Cross-organizer data tampering prevention
  - Event update notification dispatch to registered attendees
  - Ticket check-in and duplicate check-in rejection
- **Frontend Production Build:** Vite bundle compiles cleanly (`npm run build`) in ~1s with zero syntax/type errors.

---

## 3. Step-by-Step Production Launch Checklist

Follow these 5 steps to launch your application to live users.

### Step 1: Confirm Supabase Database Setup

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Open your project, navigate to **SQL Editor**, and run the SQL migrations located in `backend/migrations/` in order:
   - `20261025_initial_schema.sql`
   - `20261026_fix_schema.sql`
   - `20261102_comprehensive_schema.sql`
3. Verify all tables are present in the **Table Editor**:
   - `users`, `events`, `tickets`, `communities`, `venues`, `venue_bookings`, `speakers`, `speaker_invitations`, `sponsorship_requests`, `merchandise_orders`, `tasks`, `notifications`.
4. Copy your project credentials from **Project Settings > API**:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon / public key**
   - **service_role key** (keep secret)

---

### Step 2: Deploy the Backend (FastAPI)

You can host the backend on **Render**, **Railway**, **Fly.io**, or **AWS EC2/App Runner**.

#### Recommended: Railway or Render
1. Connect your GitHub repository.
2. Set the **Root Directory** to `backend`.
3. Set the **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
4. Set the **Start Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add the following **Environment Variables** in the hosting dashboard:
   ```env
   ENVIRONMENT=production
   PORT=8000
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
   JWT_SECRET=<generate-a-strong-random-64-char-string>
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   FRONTEND_URL=https://your-domain.com
   CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
   ```
6. Deploy and note your public backend URL (e.g., `https://api.eventhorizon.com` or `https://event-horizon-backend.up.railway.app`).

---

### Step 3: Deploy the Frontend (React + Vite)

You can host the frontend on **Vercel**, **Cloudflare Pages**, or **Netlify**.

#### Recommended: Vercel
1. Import your GitHub repository into Vercel.
2. Configure Project Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add the **Environment Variable**:
   ```env
   VITE_API_URL=https://<your-backend-url>/api/v1
   ```
   *(e.g., `https://api.eventhorizon.com/api/v1` or `https://event-horizon-backend.up.railway.app/api/v1`)*
4. Ensure SPA routing rewrite rule is in place (for Vercel, a `vercel.json` file in root):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
5. Click **Deploy**.

---

### Step 4: Configure Custom Domain & SSL

1. **Frontend Domain:**
   - In your frontend provider (e.g. Vercel), add your custom domain: `eventhorizon.com` and `www.eventhorizon.com`.
   - Add the DNS `A` or `CNAME` records in your DNS provider (Namecheap, GoDaddy, Cloudflare).
2. **Backend Domain (Subdomain):**
   - Add a custom subdomain for your API: `api.eventhorizon.com`.
   - Add the `CNAME` record pointing to your backend host.
3. **Update Environment Variables:**
   - On the backend, update `FRONTEND_URL=https://eventhorizon.com` and `CORS_ORIGINS=https://eventhorizon.com,https://www.eventhorizon.com`.
   - On the frontend, set `VITE_API_URL=https://api.eventhorizon.com/api/v1`.

---

### Step 5: Post-Launch Smoke Test

After deployment, test the following flow on your live domain:

1. **Sign Up & Sign In:** Create a new user account and verify session persistence.
2. **Create & Publish Event:** Fill in event details, add a venue, specify sponsorship tiers, and publish.
3. **Ticket Checkout:** As a separate user (or incognito window), register/buy a ticket for the event.
4. **Door Check-In:** Use the organizer dashboard to check in the attendee's ticket.
5. **Attendee Notification:** Update the event's date or venue as organizer and confirm the registered attendee receives an in-app notification bell update.
6. **Sponsor Flow:** Submit a sponsorship offer and approve it from the organizer dashboard. Verify the funding need status updates to "Funded".

---

## 4. Future Production Enhancements (When Ready)

These features can be enabled when you are ready to expand:

1. **Live Payment Gateway:**
   - Replace internal checkout simulation with Stripe or Razorpay SDK by adding live API keys and webhook verification.
2. **Transactional Email / SMS Delivery:**
   - Connect Resend, SendGrid, or AWS SES to trigger external email confirmations whenever notifications are dispatched.
3. **Image & Asset Storage:**
   - Connect Supabase Storage buckets or AWS S3 for uploading custom event banners, speaker headshots, and venue floorplans.

