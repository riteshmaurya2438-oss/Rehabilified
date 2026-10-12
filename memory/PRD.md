# Rehabilified — Product Requirements Document

## Original Problem Statement
Clone a React + Vite + Tailwind frontend-only website ("Rehabilified" by Dr. Sayyeda Uneza Fatima) and extend it into a fully functional full-stack application with FastAPI + MongoDB backend, live Razorpay payments, Emergent Google Sign-in, admin panel, and server-backed global content syncing.

## Architecture
- **Frontend**: React CRA + Tailwind CSS v3 + Zustand + Framer Motion + React Router
- **Backend**: FastAPI + Motor (async MongoDB) + Razorpay SDK
- **Database**: MongoDB (local preview, production on user's VPS)
- **Auth**: Google OAuth (Emergent-managed) for students; password-based for admin

## Core Features — Completed
- [x] Brand logo in navbar, footer, splash screen
- [x] Premium masonry image gallery with lightbox
- [x] Hero section with 3 CTA buttons (Appointments, Lectures, Consultations)
- [x] Course thumbnail image upload in Admin panel
- [x] Consultation dynamic pricing & Google Form link in Admin "Site Settings"
- [x] Course checkout bug fix (lesson count crash)
- [x] Student purchases (courses, lectures, consultations) stored in MongoDB
- [x] `access_link` / `joinLink` validation in Admin; links returned on Razorpay verify
- [x] Google Sign-In enforced across all checkout flows; local email sign-in removed
- [x] Course "parts" data structure in store and Admin panel
- [x] Deep-link standalone pages for courses, lectures, consultations
- [x] Consultation slot availability text: "Monday to Thursday from 2-5 pm" (Oct 12, 2026)

## Key DB Schema
- `site_content`: {content_data, stats, testimonials, slots, courses, settings}
- `admin_auth`: {_id: 'admin', hash, token, recoveryCode}
- `admin_sessions`: {_id, token, created}
- `orders`: {_id, amount, currency, status, user_info}
- `purchases`: {user_id, item_id, kind, amount, status, access_link}

## Key API Endpoints
- `POST /api/verify-payment` — Razorpay HMAC verification + auto-create purchase
- `GET /api/purchases` — Fetch authenticated user's purchases
- `GET/PUT /api/content` — Global site content sync

## Backlog (Prioritized)
### P0
- Verify deep-link pages end-to-end (CoursePage, LecturePage, ConsultationPage)

### P1
- Oracle Cloud Free VPS deployment guide (markdown)

### P2
- Admin session timeout adjustment (extend to 24h instead of lockout-on-exit)
- Backend refactoring: modularize server.py with APIRouter

## Credentials
- Admin Setup Code: RB-SUF2025REHAB
- Admin Password: TestAdmin@1234

## 3rd Party Integrations
- Razorpay (live keys in .env)
- Emergent Google OAuth
