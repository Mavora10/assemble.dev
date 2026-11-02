from typing import Optional
from fastapi import Header, HTTPException, status
from app.services.supabase_client import supabase


def get_supabase_client():
    """Returns singleton Supabase client instance."""
    return supabase


async def get_current_user_optional(
    authorization: Optional[str] = Header(None)
) -> Optional[dict]:
    """
    Extracts Bearer token from header and validates with Supabase Auth or returns None.
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    try:
        user_response = supabase.auth.get_user(token)
        if user_response and user_response.user:
            return {
                "id": user_response.user.id,
                "email": user_response.user.email,
                "role": user_response.user.role,
                "user_metadata": user_response.user.user_metadata,
            }
    except Exception:
        pass
    
    return None


async def require_auth(
    authorization: Optional[str] = Header(None)
) -> dict:
    """Enforces valid Bearer JWT authentication."""
    user = await get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid Bearer token required in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
