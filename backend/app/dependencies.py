from typing import Optional
from fastapi import Header, HTTPException, status
from supabase import create_client, Client
from app.config import settings

# Global Supabase client
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Returns singleton Supabase client instance."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables."
            )
        _supabase_client = create_client(settings.supabase_url, settings.supabase_key)
    return _supabase_client


async def get_current_user_optional(
    authorization: Optional[str] = Header(None)
) -> Optional[dict]:
    """
    Extracts Bearer token from header and validates with Supabase Auth.
    Returns None if no token or invalid in development mode.
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    client = get_supabase_client()
    try:
        user_response = client.auth.get_user(token)
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
