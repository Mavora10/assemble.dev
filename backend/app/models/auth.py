from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

class UserSignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    city: Optional[str] = "San Francisco"
    initialRole: Optional[str] = "attendee"

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class SwitchRoleRequest(BaseModel):
    targetRole: str

class RoleSetupRequest(BaseModel):
    role: str
    profileData: Dict[str, Any] = {}

