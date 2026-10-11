# Rehabilified — Product Requirements Document

## Original Problem Statement
Clone a React + Vite + Tailwind v4 + TS frontend-only website ("Rehabilified" by Dr. Sayyeda Uneza Fatima) and extend it into a fully functional full-stack application with FastAPI + MongoDB backend, live Razorpay payment integration, Emergent Google Sign-in, admin panel with global content sync, and deployment support.

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS v3 + Zustand + Framer Motion
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **Auth**: HttpOnly cookies + Bearer tokens, Google OAuth via Emergent
- **Payments**: Live Razorpay (HMAC signature verification)

## Completed Features
1. Ported Vite/Tailwind v4/TS app to CRA/Tailwind v3/JS (Oct 2026)
2. Replaced placeholder info with Dr. Sayyeda Uneza Fatima's real credentials (Oct 2026)
3. Live Razorpay payment gateway for 30-min/60-min consultations (Oct 2026)
4. "Payment successful" state reveals Google Form link (Oct 2026)
5. UI updates: single "Book Patient Appointment" WhatsApp link, auto-slider testimonials, Admin in footer (Oct 2026)
6. Emergent Google Sign-in for user dashboard (Oct 2026)
7. Hostinger VPS deployment guide (Oct 2026)
8. MongoDB-backed content sync for admin edits (Oct 2026)
9. Secured admin panel with setup code + lockout (Oct 2026)
10. Replaced AI-generated SVG logo with actual Rehabilified brand logo (Oct 2026)
11. Splash animation updated with real logo (Oct 2026)
12. Premium gallery section with 5 photos, masonry layout, lightbox (Oct 2026)
13. Gallery photos fixed — tilted image corrected, focal points adjusted (Oct 2026)
14. Hero section: added Online Lecture + 1:1 Consultation buttons (Oct 2026)
15. Course thumbnail upload in admin panel (Oct 2026)
16. Admin editable 1:1 consultation prices (30-min, 60-min) and form URL (Oct 2026)
17. Course checkout "lessons.length" bug fixed (Oct 2026)
18. Student purchases moved to MongoDB linked to user ID (Oct 2026)
19. Server-side purchase record creation on payment verification (Oct 2026)
20. Duplicate charge prevention for already-purchased items (Oct 2026)

## Key Credentials
- Admin Setup Code: `RB-SUF2025REHAB`
- Admin Password (preview): `TestAdmin@1234`
- Razorpay: LIVE keys in backend/.env
- MongoDB: localhost:27017, DB: test_database (preview) / rehabilified (production)

## DB Collections
- `site_content`: Global KV store for site content
- `admin_auth` / `admin_sessions`: Admin credentials and sessions
- `users` / `user_sessions`: Google OAuth users and sessions
- `payments`: Razorpay payment records (order_id, amount, status, verified, user_id)
- `purchases`: Student purchases linked to user_id (type, item_id, item_title, amount, payment_id, status)

## API Endpoints
- `POST /api/create-order` — Initiate Razorpay order (with duplicate check for authenticated users)
- `POST /api/verify-payment` — Validate HMAC + auto-create purchase record
- `POST /api/auth/session` — Google Sign-in
- `GET /api/auth/me` — Current user
- `GET/PUT /api/content` — Global site content
- `GET /api/admin/status` + `POST /api/admin/setup` — Admin management
- `POST /api/purchases` — Manual purchase creation (auth required)
- `GET /api/purchases` — Fetch user's purchases (auth required)
- `PATCH /api/purchases/{id}/cancel` — Cancel booking (auth required)

## Pending / Upcoming Tasks (P0-P2)
### P0
- Oracle Cloud Free VPS deployment guide

### P1
- Favicon update with real logo
- Open Graph meta tags for social sharing
- Admin view of all student purchases

### P2
- Refactor server.py into modular APIRouters (~700 lines)
- Gallery management from admin panel
