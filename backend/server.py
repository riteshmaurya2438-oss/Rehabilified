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


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    kind: Optional[str] = None
    refId: Optional[str] = None
    email: Optional[str] = None


@api_router.post("/create-order")
async def create_order(req: CreateOrderRequest):
    if razorpay_client is None:
        raise HTTPException(status_code=503, detail="Payment gateway is not configured.")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
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
        "status": "created",
        "verified": False,
        "payment_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"orderId": order["id"], "amount": order["amount"], "currency": order.get("currency", "INR"), "keyId": RAZORPAY_KEY_ID}


@api_router.post("/verify-payment")
async def verify_payment(req: VerifyPaymentRequest):
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

    await db.payments.update_one(
        {"order_id": req.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "verified": True,
            "payment_id": req.razorpay_payment_id,
            "signature": req.razorpay_signature,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"verified": True}


# ---------------- Emergent Google Authentication ----------------
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
SESSION_DAYS = 7


class SessionRequest(BaseModel):
    session_id: str


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


@api_router.post("/auth/session")
async def auth_session(body: SessionRequest, response: Response):
    try:
        r = requests.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id}, timeout=15)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach the authentication service.")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    data = r.json()
    email = (data.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned by the provider.")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name", existing.get("name")), "picture": data.get("picture", existing.get("picture"))}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data.get("session_token") or uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": user_id, "session_token": session_token, "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=SESSION_DAYS * 24 * 3600)
    return {"user_id": user_id, "email": email, "name": data.get("name", ""), "picture": data.get("picture", "")}


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
    body = await request.json()
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Invalid content payload.")
    body["_id"] = "singleton"
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_content.replace_one({"_id": "singleton"}, body, upsert=True)
    return {"ok": True}


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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()