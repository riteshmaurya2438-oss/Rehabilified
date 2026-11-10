# Rehabilified — Product Requirements Document

## Original Problem Statement
Clone a React + Vite + Tailwind frontend-only website ("Rehabilified" by Dr. Sayyeda Uneza Fatima) and extend it into a fully functional full-stack application with FastAPI + MongoDB backend, live Razorpay payments, Google Sign-in for the student dashboard, and server-backed global syncing of admin edits.

## Architecture
- **Frontend**: React CRA + Tailwind CSS v3 + Zustand + Framer Motion + React Router (HashRouter)
- **Backend**: FastAPI + Motor (async MongoDB) + Razorpay SDK
- **Database**: MongoDB (local preview, production on user's VPS)
- **Auth**: Custom Google OAuth for students; password-based for admin
- **Custom Domain**: rehabilified.com (frontend) + backend.rehabilified.com (backend)

## Core Features — Completed
- [x] Brand logo in navbar, footer, splash screen
- [x] Website favicon with cache-busting (?v=2) + manifest.json
- [x] Premium masonry image gallery with lightbox
- [x] Hero section with 3 CTA buttons
- [x] Course thumbnail image upload in Admin panel
- [x] Consultation dynamic pricing & Google Form link in Admin "Site Settings"
- [x] Student purchases stored in MongoDB
- [x] Custom Google OAuth (user's own credentials, no Emergent branding)
- [x] Cross-domain OAuth redirect fix (backend.rehabilified.com → rehabilified.com)
- [x] Course "parts" data structure in store and Admin panel
- [x] Deep-link standalone pages for courses, lectures, consultations
- [x] Shareable consultation page with Share + Copy buttons
- [x] Consultation slot booking system (date → time → pay → lock in DB)
- [x] Registration Form link in student dashboard for consultation bookings
- [x] Dynamic consultation schedule in admin (toggle days, set start/end time)
- [x] **Coupon/Discount System** — Nov 10, 2026
  - Admin: create/list/toggle/delete coupons (code, name, discount type, value, applies_to, max_uses, expiry)
  - Checkout: coupon input on courses, lectures, and consultations with live discount preview
  - Backend: full validation, Razorpay order discount, usage tracking

## Key DB Schema
- `site_content`: {content_data, stats, testimonials, slots, courses, settings}
- `coupons`: {coupon_id, code, name, discount_type, discount_value, applies_to, max_uses, usage_count, active, expires_at}
- `purchases`: {user_id, item_id, kind, amount, status, access_link, slot_date, slot_time, coupon_code}
- `booked_slots`: {date, time, user_id, consultation_type, payment_id} — unique index on (date, time)
- `users`: {user_id, email, name, picture}
- `user_sessions`: {session_token, user_id, expires_at}

## Key API Endpoints
- `POST /api/admin/coupons` — Create coupon (admin)
- `GET /api/admin/coupons` — List coupons (admin)
- `DELETE /api/admin/coupons/{id}` — Delete coupon (admin)
- `PATCH /api/admin/coupons/{id}/toggle` — Toggle active (admin)
- `POST /api/coupons/validate` — Validate coupon code (public)
- `POST /api/create-order` — Creates Razorpay order with coupon discount
- `POST /api/verify-payment` — Verifies payment + books slots
- `GET /api/consultation-slots` — Available time slots (dynamic from DB)
- `GET /api/consultation-config` — Slot config (days, hours)
- `GET /api/auth/google/login` — Google OAuth login
- `GET /api/auth/google/callback` — Google OAuth callback

## Backlog
### P0
- Admin slot calendar (booked consultation schedule view)
### P1
- VPS deployment guide (step-by-step markdown)
### P2
- Admin session timeout (24h instead of lockout-on-exit)
- Backend modularization (APIRouter)

## Credentials
- Admin Setup Code: RB-SUF2025REHAB
- Admin Password: TestAdmin@1234
- Custom Domain: rehabilified.com
- Test Coupon: FLAT50 (50% off courses/lectures/consultations)

## 3rd Party Integrations
- Razorpay (live keys in .env)
- Custom Google OAuth (user's own credentials in .env)
