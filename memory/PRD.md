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
10. Admin credentials reset for fresh setup (Oct 2026)
11. Replaced AI-generated SVG logo with actual Rehabilified brand logo (Oct 2026)
12. Splash animation updated with real logo (Oct 2026)
13. Premium gallery section with 5 photos, masonry layout, lightbox (Oct 2026)
14. Gallery photos fixed — tilted image corrected, focal points adjusted (Oct 2026)
15. Hero section: added Online Lecture + 1:1 Consultation buttons (Oct 2026)
16. Course thumbnail upload in admin panel (Oct 2026)
17. Admin editable 1:1 consultation prices (30-min, 60-min) and form URL (Oct 2026)
18. Course checkout "lessons.length" bug fixed — replaced with "Lifetime access" (Oct 2026)
19. Student purchases (enrollments, registrations, bookings) moved to MongoDB linked to user ID (Oct 2026)

## Key Credentials
- Admin Setup Code: `RB-SUF2025REHAB`
- Admin Password (preview): `TestAdmin@1234`
- Razorpay: LIVE keys in backend/.env
- MongoDB: localhost:27017, DB: test_database (preview) / rehabilified (production)

## DB Collections
- `site_content`: Global KV store for site content (lectures, courses, FAQs, stats, settings, slots)
- `admin_auth`: Admin credentials (hash, token, recoveryCode)
- `admin_sessions`: Admin session tokens
- `users`: Google OAuth users (user_id, email, name, picture)
- `user_sessions`: User session tokens
- `payments`: Razorpay payment records (order_id, amount, status, verified)
- `purchases`: Student purchases linked to user_id (type, item_id, item_title, amount, payment_id, status)

## API Endpoints
- `POST /api/create-order` — Initiate Razorpay order
- `POST /api/verify-payment` — Validate Razorpay HMAC signature
- `POST /api/auth/session` — Handle Emergent Google Sign-in
- `GET /api/auth/me` — Get current user
- `POST /api/auth/logout` — Logout
- `GET/PUT /api/content` — Fetch/Update global site content
- `GET /api/admin/status` — Check admin config
- `POST /api/admin/setup` — Setup admin with code
- `POST /api/purchases` — Record student purchase (auth required)
- `GET /api/purchases` — Fetch user's purchases (auth required)
- `PATCH /api/purchases/{id}/cancel` — Cancel a booking (auth required)

## Pending / Upcoming Tasks (P0-P2)
### P0
- Assist with Oracle Cloud Free VPS deployment (user's preferred hosting)

### P1
- Verify live Razorpay payment end-to-end once deployed
- Favicon update with real logo
- Open Graph meta tags for social sharing
- Admin view of all student purchases

### P2
- Refactor server.py into modular APIRouters (~660 lines)
- Gallery management from admin panel

## Deployment
- User chose **Oracle Cloud Always Free VPS** for hosting
- Deployment guide exists: `/app/DEPLOY_HOSTINGER_VPS.md`
- Need to create Oracle Cloud-specific guide
