from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import razorpay
import requests
import hmac as hmaclib
import asyncio
import base64
import hashlib
import secrets
import bcrypt
from pymongo.errors import DuplicateKeyError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ---------------- Razorpay payments ----------------
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET else None


class CreateOrderRequest(BaseModel):
    amount: float            # amount in INR (rupees)
    currency: str = 'INR'
    kind: Optional[str] = None       # lecture | course | consultation
    refId: Optional[str] = None
    label: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    slot_date: Optional[str] = None      # YYYY-MM-DD for consultation slots
    slot_time: Optional[str] = None      # HH:MM for consultation slots
    slot_duration: Optional[int] = None  # 30 or 60


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    kind: Optional[str] = None
    refId: Optional[str] = None
    email: Optional[str] = None


def _kind_to_purchase_type(kind: str) -> str:
    return {"lecture": "registration", "course": "enrollment", "consultation": "booking"}.get(kind or "", "")


@api_router.post("/create-order")
async def create_order(req: CreateOrderRequest, request: Request):
    if razorpay_client is None:
        raise HTTPException(status_code=503, detail="Payment gateway is not configured.")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")

    # Duplicate check: if the user is authenticated and item is a course/lecture, reject repeat purchases
    user = await _current_user(request)
    purchase_type = _kind_to_purchase_type(req.kind)
    if user and req.refId and purchase_type in ("enrollment", "registration"):
        existing = await db.purchases.find_one({
            "user_id": user["user_id"],
            "item_id": req.refId,
            "type": purchase_type,
            "status": {"$ne": "cancelled"},
        })
        if existing:
            raise HTTPException(status_code=409, detail="You have already purchased this item.")

    amount_paise = int(round(req.amount * 100))
    receipt = f"rb_{uuid.uuid4().hex[:18]}"  # must be <= 40 chars
    try:
        order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": req.currency or "INR",
            "payment_capture": 1,
            "receipt": receipt,
            "notes": {
                "kind": req.kind or "",
                "refId": req.refId or "",
                "email": req.email or "",
                "label": req.label or "",
            },
        })
    except Exception as e:
        logger.exception("Razorpay order creation failed")
        raise HTTPException(status_code=502, detail=f"Could not create order: {e}")

    await db.payments.insert_one({
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": order.get("currency", "INR"),
        "kind": req.kind,
        "refId": req.refId,
        "label": req.label,
        "email": req.email,
        "name": req.name,
        "phone": req.phone,
        "user_id": user["user_id"] if user else None,
        "slot_date": req.slot_date,
        "slot_time": req.slot_time,
        "slot_duration": req.slot_duration,
        "status": "created",
        "verified": False,
        "payment_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"orderId": order["id"], "amount": order["amount"], "currency": order.get("currency", "INR"), "keyId": RAZORPAY_KEY_ID}


@api_router.post("/verify-payment")
async def verify_payment(req: VerifyPaymentRequest, request: Request):
    if razorpay_client is None:
        raise HTTPException(status_code=503, detail="Payment gateway is not configured.")
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        await db.payments.update_one(
            {"order_id": req.razorpay_order_id},
            {"$set": {"status": "failed", "verified": False, "payment_id": req.razorpay_payment_id}},
        )
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    paid_at = datetime.now(timezone.utc).isoformat()
    await db.payments.update_one(
        {"order_id": req.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "verified": True,
            "payment_id": req.razorpay_payment_id,
            "signature": req.razorpay_signature,
            "paid_at": paid_at,
        }},
    )

    # --- Auto-create a purchase record linked to the authenticated user ---
    purchase = None
    payment_doc = await db.payments.find_one({"order_id": req.razorpay_order_id}, {"_id": 0})
    user = await _current_user(request)
    kind = (payment_doc or {}).get("kind") or req.kind or ""
    ref_id = (payment_doc or {}).get("refId") or req.refId or ""
    purchase_type = _kind_to_purchase_type(kind)

    if user and purchase_type and ref_id:
        # For courses/lectures: prevent duplicate purchase
        if purchase_type in ("enrollment", "registration"):
            existing = await db.purchases.find_one({
                "user_id": user["user_id"],
                "item_id": ref_id,
                "type": purchase_type,
                "status": {"$ne": "cancelled"},
            })
            if existing:
                return {"verified": True, "purchase": None}

        # Resolve item title and access link from site_content
        item_title = (payment_doc or {}).get("label") or ""
        access_link = ""
        content = await db.site_content.find_one({"_id": "singleton"})
        if content:
            if purchase_type == "enrollment":
                match = next((c for c in (content.get("courses") or []) if isinstance(c, dict) and c.get("id") == ref_id), None)
                if match:
                    item_title = item_title or match.get("title", "")
                    access_link = match.get("link", "")
            elif purchase_type == "registration":
                match = next((l for l in (content.get("lectures") or []) if isinstance(l, dict) and l.get("id") == ref_id), None)
                if match:
                    item_title = item_title or match.get("title", "")
                    access_link = match.get("joinLink", "")

        # --- Consultation slot booking ---
        slot_date = (payment_doc or {}).get("slot_date") or ""
        slot_time = (payment_doc or {}).get("slot_time") or ""
        slot_duration = (payment_doc or {}).get("slot_duration") or 30
        if purchase_type == "booking":
            item_title = item_title or "1:1 Career Clarity Consultation"
            # Resolve consultation form URL as access_link
            settings = (content or {}).get("settings") or {}
            access_link = settings.get("consultationFormUrl") or "https://forms.gle/SdUuf9npWgMxzNpj8"
            # Book the slot(s) atomically
            if slot_date and slot_time:
                slots_to_book = [slot_time]
                if slot_duration == 60:
                    h, m = map(int, slot_time.split(":"))
                    m2 = m + 30
                    h2 = h + m2 // 60
                    m2 = m2 % 60
                    slots_to_book.append(f"{h2:02d}:{m2:02d}")
                try:
                    for st in slots_to_book:
                        await db.booked_slots.insert_one({
                            "date": slot_date,
                            "time": st,
                            "user_id": user["user_id"],
                            "consultation_type": ref_id,
                            "payment_id": req.razorpay_payment_id,
                            "order_id": req.razorpay_order_id,
                            "created_at": paid_at,
                        })
                except DuplicateKeyError:
                    logger.warning(f"Slot conflict: {slot_date} {slot_time} already booked (payment {req.razorpay_payment_id})")

        purchase = {
            "purchase_id": f"pur_{uuid.uuid4().hex[:12]}",
            "user_id": user["user_id"],
            "email": user.get("email", (payment_doc or {}).get("email", "")),
            "name": user.get("name", (payment_doc or {}).get("name", "")),
            "type": purchase_type,
            "item_id": ref_id,
            "item_title": item_title,
            "access_link": access_link,
            "phone": (payment_doc or {}).get("phone", ""),
            "amount": ((payment_doc or {}).get("amount", 0)) / 100,  # paise → rupees
            "payment_id": req.razorpay_payment_id,
            "order_id": req.razorpay_order_id,
            "goal": "",
            "slot_date": slot_date,
            "slot_time": slot_time,
            "slot_duration": slot_duration,
            "status": "confirmed",
            "extra": {},
            "created_at": paid_at,
        }
        await db.purchases.insert_one(purchase)
        purchase.pop("_id", None)

    return {"verified": True, "purchase": purchase}


# ---------------- Custom Google OAuth Authentication ----------------
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
SESSION_DAYS = 7


async def _current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not expires_at or expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    return user


# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.get("/auth/google/login")
async def google_login(request: Request, redirect: Optional[str] = None):
    """Redirect user to Google's OAuth consent screen."""
    # Build callback URL from the incoming request origin
    origin = str(request.base_url).rstrip("/")
    # Use X-Forwarded headers if behind proxy
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    forwarded_host = request.headers.get("x-forwarded-host", "")
    if forwarded_host:
        proto = forwarded_proto or "https"
        origin = f"{proto}://{forwarded_host}"
    callback_url = f"{origin}/api/auth/google/callback"

    state = secrets.token_urlsafe(32)
    # Store state + optional redirect in a short-lived cookie
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "state": state,
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{'&'.join(f'{k}={requests.utils.quote(str(v))}' for k, v in params.items())}"
    resp = Response(status_code=307, headers={"Location": url})
    # Pack state + frontend redirect into a cookie
    cookie_val = f"{state}|{redirect or '/'}"
    resp.set_cookie(key="oauth_state", value=cookie_val, httponly=True, secure=True, samesite="lax", max_age=600, path="/")
    return resp


@api_router.get("/auth/google/callback")
async def google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """Handle Google's OAuth callback — exchange code for tokens, create user, set session."""
    # Determine frontend origin for redirects
    origin = str(request.base_url).rstrip("/")
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    forwarded_host = request.headers.get("x-forwarded-host", "")
    if forwarded_host:
        proto = forwarded_proto or "https"
        origin = f"{proto}://{forwarded_host}"

    # Verify state
    cookie_val = request.cookies.get("oauth_state", "")
    parts = cookie_val.split("|", 1)
    saved_state = parts[0] if parts else ""
    frontend_redirect = parts[1] if len(parts) > 1 else "/"

    if error or not code:
        return Response(status_code=307, headers={"Location": f"{origin}{frontend_redirect}?auth_error=cancelled"})

    if not saved_state or state != saved_state:
        logger.warning("OAuth state mismatch")
        return Response(status_code=307, headers={"Location": f"{origin}{frontend_redirect}?auth_error=state_mismatch"})

    # Exchange code for tokens
    callback_url = f"{origin}/api/auth/google/callback"
    try:
        token_resp = requests.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": callback_url,
            "grant_type": "authorization_code",
        }, timeout=15)
        if token_resp.status_code != 200:
            logger.error(f"Google token exchange failed: {token_resp.text}")
            return Response(status_code=307, headers={"Location": f"{origin}{frontend_redirect}?auth_error=token_failed"})
        tokens = token_resp.json()
    except Exception as e:
        logger.error(f"Google token exchange error: {e}")
        return Response(status_code=307, headers={"Location": f"{origin}{frontend_redirect}?auth_error=network"})

    # Get user info from Google
    try:
        info_resp = requests.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {tokens['access_token']}"}, timeout=10)
        if info_resp.status_code != 200:
            return Response(status_code=307, headers={"Location": f"{origin}{frontend_redirect}?auth_error=userinfo_failed"})
        guser = info_resp.json()
    except Exception as e:
        logger.error(f"Google userinfo error: {e}")
        return Response(status_code=307, headers={"Location": f"{origin}{frontend_redirect}?auth_error=network"})

    email = (guser.get("email") or "").lower()
    name = guser.get("name", "")
    picture = guser.get("picture", "")
    if not email:
        return Response(status_code=307, headers={"Location": f"{origin}{frontend_redirect}?auth_error=no_email"})

    # Create or update user in DB
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name or existing.get("name"), "picture": picture or existing.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        try:
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except DuplicateKeyError:
            existing = await db.users.find_one({"email": email}, {"_id": 0})
            user_id = existing["user_id"]

    # Create session
    session_token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user_id, "session_token": session_token, "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )

    # Redirect to frontend dashboard with session set via cookie
    resp = Response(status_code=307, headers={"Location": f"{origin}/dashboard?auth_success=1"})
    resp.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=SESSION_DAYS * 24 * 3600)
    resp.delete_cookie("oauth_state", path="/")
    return resp


@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return user


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ---------------- Admin authentication (enforced on the server) ----------------
ADMIN_SETUP_CODE = os.environ.get('ADMIN_SETUP_CODE', '').strip()
ADMIN_IDLE = timedelta(minutes=15)
ADMIN_MAX = timedelta(hours=8)
RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


class AdminSetupRequest(BaseModel):
    password: str
    setupCode: str


class AdminLoginRequest(BaseModel):
    password: str


class AdminRecoverRequest(BaseModel):
    recoveryCode: str
    newPassword: str


class AdminChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str


def _now():
    return datetime.now(timezone.utc)


def _parse_dt(v):
    if not v:
        return None
    d = datetime.fromisoformat(v) if isinstance(v, str) else v
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _strong(pw: str) -> bool:
    return (
        len(pw) >= 10
        and any(c.islower() for c in pw)
        and any(c.isupper() for c in pw)
        and any(c.isdigit() for c in pw)
        and any(not c.isalnum() for c in pw)
    )


def _norm_code(c: str) -> str:
    return ''.join(ch for ch in (c or '').upper() if ch.isalnum())


def _make_recovery_code() -> str:
    raw = ''.join(secrets.choice(RECOVERY_ALPHABET) for _ in range(16))
    return '-'.join(raw[i:i + 4] for i in range(0, 16, 4))


def _prehash(secret: str) -> bytes:
    # bcrypt only uses the first 72 bytes, so long passwords are digested first.
    return base64.b64encode(hashlib.sha256(secret.encode()).digest())


async def _hash_secret(secret: str) -> str:
    hashed = await asyncio.to_thread(bcrypt.hashpw, _prehash(secret), bcrypt.gensalt(rounds=12))
    return hashed.decode()


async def _check_secret(secret: str, hashed: str) -> bool:
    try:
        return await asyncio.to_thread(bcrypt.checkpw, _prehash(secret), hashed.encode())
    except ValueError:
        return False


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _fmt_wait(seconds: int) -> str:
    return f"{seconds // 60}:{seconds % 60:02d}"


def _lock_seconds(doc) -> int:
    until = _parse_dt((doc or {}).get('locked_until'))
    if not until:
        return 0
    return max(0, int((until - _now()).total_seconds() + 0.999))


async def _register_fail(doc):
    fails = int(doc.get('fails', 0)) + 1
    update = {'fails': fails}
    if fails % 5 == 0:
        minutes = min(60, 5 * 2 ** (fails // 5 - 1))
        update['locked_until'] = (_now() + timedelta(minutes=minutes)).isoformat()
    await db.admin_auth.update_one({'_id': 'admin'}, {'$set': update})
    return fails, 'locked_until' in update


async def _new_admin_session() -> str:
    token = secrets.token_urlsafe(32)
    n = _now().isoformat()
    await db.admin_sessions.insert_one({'token_hash': _token_hash(token), 'created_at': n, 'last_seen': n})
    return token


def _bearer(request: Request) -> Optional[str]:
    auth = request.headers.get('Authorization', '')
    return auth[7:] if auth.startswith('Bearer ') else None


async def _admin_session(request: Request):
    token = _bearer(request)
    if not token:
        return None
    th = _token_hash(token)
    sess = await db.admin_sessions.find_one({'token_hash': th}, {'_id': 0})
    if not sess:
        return None
    n = _now()
    if n - _parse_dt(sess['created_at']) > ADMIN_MAX or n - _parse_dt(sess['last_seen']) > ADMIN_IDLE:
        await db.admin_sessions.delete_one({'token_hash': th})
        return None
    await db.admin_sessions.update_one({'token_hash': th}, {'$set': {'last_seen': n.isoformat()}})
    return sess


async def require_admin(request: Request):
    sess = await _admin_session(request)
    if not sess:
        raise HTTPException(status_code=401, detail='Admin sign-in required.')
    return sess


async def _get_admin():
    return await db.admin_auth.find_one({'_id': 'admin'})


@api_router.get('/admin/status')
async def admin_status():
    doc = await _get_admin()
    return {'configured': bool(doc), 'setupAvailable': bool(ADMIN_SETUP_CODE) and not doc, 'lockedSeconds': _lock_seconds(doc)}


@api_router.post('/admin/setup')
async def admin_setup(body: AdminSetupRequest):
    if not ADMIN_SETUP_CODE:
        raise HTTPException(status_code=503, detail='Admin setup is not enabled on this server. Please contact support.')
    if not secrets.compare_digest(body.setupCode.strip().encode(), ADMIN_SETUP_CODE.encode()):
        raise HTTPException(status_code=403, detail='That setup code is not correct.')
    if await _get_admin():
        raise HTTPException(status_code=409, detail='Admin access is already set up. Please sign in.')
    if not _strong(body.password):
        raise HTTPException(status_code=400, detail='Please choose a stronger password.')
    code = _make_recovery_code()
    created = _now().isoformat()
    doc = {
        '_id': 'admin',
        'password_hash': await _hash_secret(body.password),
        'recovery_hash': await _hash_secret(_norm_code(code)),
        'created_at': created,
        'fails': 0,
        'locked_until': None,
    }
    try:
        await db.admin_auth.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail='Admin access is already set up. Please sign in.')
    token = await _new_admin_session()
    return {'token': token, 'recoveryCode': code, 'createdAt': created}


@api_router.post('/admin/login')
async def admin_login(body: AdminLoginRequest):
    doc = await _get_admin()
    if not doc:
        raise HTTPException(status_code=409, detail='Admin access has not been set up yet.')
    wait = _lock_seconds(doc)
    if wait:
        raise HTTPException(status_code=429, detail=f'Too many attempts. Try again in {_fmt_wait(wait)}.')
    if not await _check_secret(body.password, doc['password_hash']):
        fails, locked = await _register_fail(doc)
        if locked:
            wait = _lock_seconds(await _get_admin())
            raise HTTPException(status_code=429, detail=f'Too many attempts. Locked for {_fmt_wait(wait)}.')
        raise HTTPException(status_code=401, detail=f'Incorrect password. {5 - (fails % 5)} attempt(s) left before a temporary lock.')
    await db.admin_auth.update_one({'_id': 'admin'}, {'$set': {'fails': 0, 'locked_until': None}})
    token = await _new_admin_session()
    return {'token': token, 'createdAt': doc.get('created_at')}


@api_router.post('/admin/recover')
async def admin_recover(body: AdminRecoverRequest):
    doc = await _get_admin()
    if not doc:
        raise HTTPException(status_code=409, detail='Admin access has not been set up yet.')
    wait = _lock_seconds(doc)
    if wait:
        raise HTTPException(status_code=429, detail=f'Too many attempts. Try again in {_fmt_wait(wait)}.')
    if not _strong(body.newPassword):
        raise HTTPException(status_code=400, detail='Please choose a stronger new password.')
    if not await _check_secret(_norm_code(body.recoveryCode), doc['recovery_hash']):
        _, locked = await _register_fail(doc)
        if locked:
            wait = _lock_seconds(await _get_admin())
            raise HTTPException(status_code=429, detail=f'Too many attempts. Locked for {_fmt_wait(wait)}.')
        raise HTTPException(status_code=401, detail='That recovery code is not correct.')
    code = _make_recovery_code()
    await db.admin_auth.update_one({'_id': 'admin'}, {'$set': {
        'password_hash': await _hash_secret(body.newPassword),
        'recovery_hash': await _hash_secret(_norm_code(code)),
        'fails': 0,
        'locked_until': None,
        'updated_at': _now().isoformat(),
    }})
    await db.admin_sessions.delete_many({})
    token = await _new_admin_session()
    return {'token': token, 'recoveryCode': code, 'createdAt': doc.get('created_at')}


@api_router.post('/admin/change-password')
async def admin_change_password(body: AdminChangeRequest, request: Request):
    sess = await require_admin(request)
    doc = await _get_admin()
    if not await _check_secret(body.currentPassword, doc['password_hash']):
        raise HTTPException(status_code=400, detail='Your current password is not correct.')
    if not _strong(body.newPassword):
        raise HTTPException(status_code=400, detail='Please choose a stronger new password.')
    code = _make_recovery_code()
    await db.admin_auth.update_one({'_id': 'admin'}, {'$set': {
        'password_hash': await _hash_secret(body.newPassword),
        'recovery_hash': await _hash_secret(_norm_code(code)),
        'updated_at': _now().isoformat(),
    }})
    await db.admin_sessions.delete_many({'token_hash': {'$ne': sess['token_hash']}})
    return {'recoveryCode': code}


@api_router.get('/admin/session')
async def admin_session_check(request: Request):
    await require_admin(request)
    doc = await _get_admin()
    return {'ok': True, 'createdAt': (doc or {}).get('created_at')}


@api_router.post('/admin/logout')
async def admin_logout(request: Request):
    token = _bearer(request)
    if token:
        await db.admin_sessions.delete_one({'token_hash': _token_hash(token)})
    return {'ok': True}


# ---------------- Shared site content (so Admin edits appear on every device) ----------------
@api_router.get("/content")
async def get_content():
    doc = await db.site_content.find_one({"_id": "singleton"})
    if not doc:
        return {}
    doc.pop("_id", None)
    return doc


@api_router.put("/content")
async def put_content(request: Request):
    await require_admin(request)
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Invalid content payload.")
    # Slot bookings are owned by the server (see /slots/{id}/book), so a stale admin tab can't un-book a slot.
    existing = await db.site_content.find_one({"_id": "singleton"}, {"slots": 1})
    server_booked = {s.get("id"): bool(s.get("booked")) for s in (existing or {}).get("slots") or [] if isinstance(s, dict)}
    if isinstance(body.get("slots"), list):
        body["slots"] = [
            {**s, "booked": server_booked[s.get("id")]} if isinstance(s, dict) and s.get("id") in server_booked else s
            for s in body["slots"]
        ]
    body["_id"] = "singleton"
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_content.replace_one({"_id": "singleton"}, body, upsert=True)
    return {"ok": True}


async def _set_slot_booked(slot_id: str, booked: bool):
    res = await db.site_content.update_one(
        {"_id": "singleton", "slots": {"$elemMatch": {"id": slot_id, "booked": {"$ne": booked} if booked else True}}},
        {"$set": {"slots.$.booked": booked}},
    )
    if res.modified_count:
        return {"ok": True}
    if not await db.site_content.find_one({"_id": "singleton", "slots.id": slot_id}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="That time slot no longer exists.")
    if booked:
        raise HTTPException(status_code=409, detail="Sorry, that slot has just been taken.")
    return {"ok": True}


@api_router.post("/slots/{slot_id}/book")
async def book_slot(slot_id: str):
    return await _set_slot_booked(slot_id, True)


@api_router.post("/slots/{slot_id}/release")
async def release_slot(slot_id: str):
    return await _set_slot_booked(slot_id, False)


# ---------------- Student purchases (server-backed) ----------------
class PurchaseCreate(BaseModel):
    type: str          # "enrollment" | "registration" | "booking"
    item_id: str       # courseId, lectureId, or slotId
    item_title: str = ""
    access_link: str = ""
    phone: str = ""
    amount: float = 0
    payment_id: str = ""
    goal: str = ""           # consultation goal
    slot_date: str = ""      # for bookings
    slot_time: str = ""      # for bookings
    status: str = "confirmed"
    extra: dict = {}         # any additional data


@api_router.post("/purchases")
async def create_purchase(req: PurchaseCreate, request: Request):
    user = await _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to record a purchase.")
    doc = {
        "purchase_id": f"pur_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "type": req.type,
        "item_id": req.item_id,
        "item_title": req.item_title,
        "access_link": req.access_link,
        "phone": req.phone,
        "amount": req.amount,
        "payment_id": req.payment_id,
        "goal": req.goal,
        "slot_date": req.slot_date,
        "slot_time": req.slot_time,
        "status": req.status,
        "extra": req.extra,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.purchases.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/purchases")
async def get_purchases(request: Request):
    user = await _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to view purchases.")
    cursor = db.purchases.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(500)


@api_router.get("/admin/purchases")
async def admin_list_purchases(request: Request, type: Optional[str] = None):
    await require_admin(request)
    query = {"type": type} if type else {}
    cursor = db.purchases.find(query, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(1000)


@api_router.get("/admin/payments")
async def admin_list_payments(request: Request):
    await require_admin(request)
    cursor = db.payments.find({}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(1000)


@api_router.patch("/admin/purchases/{purchase_id}/cancel")
async def admin_cancel_purchase(purchase_id: str, request: Request):
    await require_admin(request)
    res = await db.purchases.update_one({"purchase_id": purchase_id}, {"$set": {"status": "cancelled"}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Purchase not found.")
    doc = await db.purchases.find_one({"purchase_id": purchase_id}, {"_id": 0})
    if doc and doc.get("type") == "booking":
        # Release booked_slots
        await _release_consultation_slots(doc)
        # Also release legacy slot if applicable
        if doc.get("item_id"):
            try:
                await _set_slot_booked(doc["item_id"], False)
            except Exception:
                pass
    return {"ok": True}


@api_router.patch("/purchases/{purchase_id}/cancel")
async def cancel_purchase(purchase_id: str, request: Request):
    user = await _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to cancel a purchase.")
    res = await db.purchases.update_one(
        {"purchase_id": purchase_id, "user_id": user["user_id"]},
        {"$set": {"status": "cancelled"}},
    )
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Purchase not found.")
    doc = await db.purchases.find_one({"purchase_id": purchase_id}, {"_id": 0})
    if doc and doc.get("type") == "booking":
        await _release_consultation_slots(doc)
        if doc.get("item_id"):
            try:
                await _set_slot_booked(doc["item_id"], False)
            except Exception:
                pass
    return {"ok": True}


async def _release_consultation_slots(purchase_doc):
    """Remove booked_slots entries for a cancelled consultation purchase."""
    sd = purchase_doc.get("slot_date")
    st = purchase_doc.get("slot_time")
    pid = purchase_doc.get("payment_id")
    if sd and st and pid:
        await db.booked_slots.delete_many({"payment_id": pid})


# ---------- All 30-min base slots between 2 PM and 5 PM ----------
_BASE_SLOTS = ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]


@api_router.get("/consultation-slots")
async def get_consultation_slots(date: str, duration: int = 30):
    """Return available consultation time slots for a given date."""
    # Validate date format
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Validate day is Mon(0)–Thu(3)
    if dt.weekday() > 3:
        raise HTTPException(status_code=400, detail="Consultations are available only Monday to Thursday.")

    # Validate within next 7 days
    today = datetime.now(timezone.utc).date()
    target = dt.date()
    if target <= today or (target - today).days > 7:
        raise HTTPException(status_code=400, detail="Please select a date within the next 7 days.")

    # Fetch all booked 30-min slots for this date
    booked_cursor = db.booked_slots.find({"date": date}, {"time": 1, "_id": 0})
    booked_set = {doc["time"] async for doc in booked_cursor}

    if duration == 60:
        # For 60-min: return start times where both consecutive 30-min slots are free
        slots = []
        for i in range(len(_BASE_SLOTS) - 1):
            s1 = _BASE_SLOTS[i]
            s2 = _BASE_SLOTS[i + 1]
            available = s1 not in booked_set and s2 not in booked_set
            slots.append({"time": s1, "end": s2.split(":")[0] + ":" + str(int(s2.split(":")[1]) + 30).zfill(2) if int(s2.split(":")[1]) + 30 < 60 else str(int(s2.split(":")[0]) + 1).zfill(2) + ":00", "available": available})
        # Compute correct end times
        for s in slots:
            h, m = map(int, s["time"].split(":"))
            eh, em = h + 1, m
            s["end"] = f"{eh:02d}:{em:02d}"
    else:
        # For 30-min: each base slot individually
        slots = [{"time": t, "available": t not in booked_set} for t in _BASE_SLOTS]

    return {"date": date, "duration": duration, "slots": slots}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def ensure_user_email_index():
    await db.users.create_index("email", unique=True)
    await db.booked_slots.create_index([("date", 1), ("time", 1)], unique=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()