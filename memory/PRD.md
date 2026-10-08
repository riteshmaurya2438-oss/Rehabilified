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

## Key Credentials
- Admin Setup Code: `RB-SUF2025REHAB`
- Razorpay: LIVE keys in backend/.env
- MongoDB: localhost:27017, DB: test_database (preview) / rehabilified (production)

## Pending / Upcoming Tasks (P0-P2)
### P0
- Assist with Oracle Cloud Free VPS deployment (user's preferred hosting)
- Verify admin account creation on user's device

### P1
- Verify live Razorpay payment end-to-end once deployed
- Favicon update with real logo
- Open Graph meta tags for social sharing

### P2
- Refactor server.py into modular APIRouters
- server.py is ~600 lines with mixed concerns

## Deployment
- User chose **Oracle Cloud Always Free VPS** for hosting
- Previous guide exists: `/app/DEPLOY_HOSTINGER_VPS.md`
- Need to create Oracle Cloud-specific guide
