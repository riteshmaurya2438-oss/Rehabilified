# Rehabilified — Product Requirements Document

## Original Problem Statement
Clone a React + Vite + Tailwind frontend-only website ("Rehabilified" by Dr. Sayyeda Uneza Fatima) and extend it into a fully functional full-stack application with FastAPI + MongoDB backend, live Razorpay payments, Google Sign-in for the student dashboard, and server-backed global syncing of admin edits.

## Architecture
- **Frontend**: React CRA + Tailwind CSS v3 + Zustand + Framer Motion + React Router (HashRouter)
- **Backend**: FastAPI + Motor (async MongoDB) + Razorpay SDK
- **Database**: MongoDB (local preview, production on user's VPS)
- **Auth**: Custom Google OAuth for students; password-based for admin
- **Custom Domain**: rehabilified.com

## Core Features — Completed
- [x] Brand logo in navbar, footer, splash screen
- [x] Website favicon with cache-busting (?v=2) + manifest.json
- [x] Premium masonry image gallery with lightbox
- [x] Hero section with 3 CTA buttons (Appointments, Lectures, Consultations)
- [x] Course thumbnail image upload in Admin panel
- [x] Consultation dynamic pricing & Google Form link in Admin "Site Settings"
- [x] Course checkout bug fix (lesson count crash)
- [x] Student purchases (courses, lectures, consultations) stored in MongoDB
- [x] `access_link` / `joinLink` validation in Admin; links returned on Razorpay verify
- [x] Custom Google OAuth (user's own credentials, no Emergent branding)
- [x] Course "parts" data structure in store and Admin panel
- [x] Deep-link standalone pages for courses, lectures, consultations
- [x] Consultation slot booking system (date → time → pay → lock in DB)
- [x] Registration Form link in student dashboard for consultation bookings
- [x] `booked_slots` collection with unique index to prevent double-booking
- [x] Shareable consultation page with Share + Copy buttons
- [x] **Dynamic consultation schedule in admin** — toggle days (Mon-Sun), set start/end time, auto-updates frontend — Oct 16, 2026
- [x] Navbar "1:1 Consultation" links to standalone consultation page

## Google OAuth Configuration
- Client ID: 351024347825-ufqia77j36934sp1uupdg32ip5stmv80.apps.googleusercontent.com
- Authorized JavaScript Origins: preview URL, rehabilified.com, www.rehabilified.com
- Authorized Redirect URIs: {origin}/api/auth/google/callback for each origin

## Key DB Schema
- `site_content`: {content_data, stats, testimonials, slots, courses, settings}
  - `settings.consultationSlots`: {days: [0,1,2,3], startHour: 14, endHour: 17, slotMinutes: 30}
- `admin_auth`: {_id: 'admin', hash, token, recoveryCode}
- `admin_sessions`: {_id, token, created}
- `orders`: {_id, amount, currency, status, user_info}
- `purchases`: {user_id, item_id, kind, amount, status, access_link, slot_date, slot_time, slot_duration}
- `booked_slots`: {date, time, user_id, consultation_type, payment_id, order_id} — unique index on (date, time)
- `users`: {user_id, email, name, picture}
- `user_sessions`: {session_token, user_id, expires_at}

## Key API Endpoints
- `POST /api/verify-payment` — Razorpay HMAC verification + auto-create purchase + book slots
- `GET /api/purchases` — Fetch authenticated user's purchases
- `GET/PUT /api/content` — Global site content sync
- `GET /api/consultation-slots?date=&duration=` — Available time slots (dynamic from DB config)
- `GET /api/consultation-config` — Returns current slot configuration (days, hours, display text)
- `GET /api/auth/google/login` — Initiates Google OAuth flow
- `GET /api/auth/google/callback` — Handles Google OAuth callback
- `GET /api/auth/me` — Returns current user
- `POST /api/auth/logout` — Logs out user

## Backlog (Prioritized)
### P0
- Admin panel: show booked consultation slots / schedule view

### P1
- Oracle Cloud Free VPS deployment guide (markdown)

### P2
- Admin session timeout adjustment (extend to 24h instead of lockout-on-exit)
- Backend refactoring: modularize server.py with APIRouter

## Credentials
- Admin Setup Code: RB-SUF2025REHAB
- Admin Password: TestAdmin@1234
- Custom Domain: rehabilified.com

## 3rd Party Integrations
- Razorpay (live keys in .env)
- Custom Google OAuth (user's own credentials in .env)
