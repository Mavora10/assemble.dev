from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.services.supabase_client import supabase
from app.routers.auth import decode_token

router = APIRouter()


@router.get("")
def list_notifications(
    authorization: Optional[str] = Header(None),
    limit: int = 50,
):
    """
    Fetch all notifications for the currently logged-in user,
    ordered by creation date descending.
    """
    user = decode_token(authorization)
    user_email = (user.get("email") or "").lower().strip()
    user_id = str(user.get("sub") or "").strip()

    try:
        # Match by user_email or user_id
        res = (
            supabase.table("notifications")
            .select("*")
            .or_(f"user_email.ilike.{user_email},user_id.eq.{user_id}")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception as e:
        # If table is empty or being migrated, gracefully return empty list
        print(f"Notice: Failed to fetch notifications: {e}")
        return []


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Mark a single notification as read.
    """
    user = decode_token(authorization)
    user_email = (user.get("email") or "").lower().strip()
    user_id = str(user.get("sub") or "").strip()

    try:
        res = (
            supabase.table("notifications")
            .update({"read": True})
            .eq("id", notification_id)
            .or_(f"user_email.ilike.{user_email},user_id.eq.{user_id}")
            .execute()
        )
        return {"success": True, "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification read: {e}")


@router.post("/read-all")
def mark_all_read(
    authorization: Optional[str] = Header(None),
):
    """
    Mark all notifications for the authenticated user as read.
    """
    user = decode_token(authorization)
    user_email = (user.get("email") or "").lower().strip()
    user_id = str(user.get("sub") or "").strip()

    try:
        res = (
            supabase.table("notifications")
            .update({"read": True})
            .or_(f"user_email.ilike.{user_email},user_id.eq.{user_id}")
            .execute()
        )
        return {"success": True, "count": len(res.data) if res.data else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark all read: {e}")

