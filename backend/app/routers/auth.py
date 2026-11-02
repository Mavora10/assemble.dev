import bcrypt
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.services.supabase_client import supabase
from app.config import settings
from app.models.auth import UserSignupRequest, UserLoginRequest, SwitchRoleRequest, RoleSetupRequest

router = APIRouter()

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = password.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def decode_token(auth_header: Optional[str]) -> dict:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header (Bearer token required)")
    token = auth_header.split(" ")[1]
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

@router.post("/signup", status_code=201)
def signup(payload: UserSignupRequest):
    # 1. Check if email already exists
    existing = supabase.table("users").select("id").eq("email", payload.email).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    # 2. Hash password
    hashed_pwd = hash_password(payload.password)

    # 3. Insert into Supabase
    user_record = {
        "email": payload.email,
        "password_hash": hashed_pwd,
        "name": payload.name,
        "phone": payload.phone,
        "city": payload.city,
        "active_role": payload.initialRole,
        "capabilities": [payload.initialRole]
    }
    result = supabase.table("users").insert(user_record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user account in database")

    user = result.data[0]
    token = create_jwt_token(user["id"], user["email"], user["active_role"])
    # Don't return password_hash in response
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@router.post("/login")
def login(payload: UserLoginRequest):
    result = supabase.table("users").select("*").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = result.data[0]
    stored_hash = user.get("password_hash")
    if not stored_hash or not verify_password(payload.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt_token(user["id"], user["email"], user.get("active_role", "attendee"))
    user.pop("password_hash", None)
    return {"token": token, "user": user}

@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    token_data = decode_token(authorization)
    result = supabase.table("users").select("*").eq("id", token_data["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = result.data[0]
    user.pop("password_hash", None)
    return user

@router.post("/switch-role")
def switch_role(payload: SwitchRoleRequest, authorization: Optional[str] = Header(None)):
    token_data = decode_token(authorization)
    user_id = token_data["sub"]

    # Update active role in database
    result = supabase.table("users").update({"active_role": payload.targetRole}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to switch role")

    user = result.data[0]
    user.pop("password_hash", None)
    new_token = create_jwt_token(user["id"], user["email"], payload.targetRole)
    return {"token": new_token, "user": user}

@router.post("/setup-role")
def setup_role(payload: RoleSetupRequest, authorization: Optional[str] = Header(None)):
    token_data = decode_token(authorization)
    user_id = token_data["sub"]

    # Insert or update user_profiles
    profile_record = {
        "user_id": user_id,
        "role": payload.role,
        "profile_data": payload.profileData
    }
    supabase.table("user_profiles").upsert(profile_record).execute()

    # Add role to capabilities array if not already present
    user_res = supabase.table("users").select("capabilities").eq("id", user_id).execute()
    if user_res.data:
        current_caps = user_res.data[0].get("capabilities") or []
        if payload.role not in current_caps:
            current_caps.append(payload.role)
            supabase.table("users").update({"capabilities": current_caps, "active_role": payload.role}).eq("id", user_id).execute()

    return {"success": True, "role": payload.role}

