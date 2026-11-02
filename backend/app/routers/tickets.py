from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import uuid
from datetime import datetime, timezone
from app.services.supabase_client import supabase
from app.models.ticket import TicketBookRequest, TicketCheckInRequest
from app.routers.auth import decode_token

router = APIRouter()

@router.post("/book", status_code=201)
def book_ticket(payload: TicketBookRequest, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    # Generate human-readable ticket code e.g. TCK-9A4B-2027
    short_code = str(uuid.uuid4())[:6].upper()
    ticket_id = f"TCK-{short_code}"

    ticket_record = {
        "ticket_id": ticket_id,
        "event_id": payload.eventId,
        "user_id": user["sub"],
        "user_name": payload.userName,
        "user_email": payload.userEmail,
        "phone": payload.phone,
        "ticket_tier_name": payload.ticketTierName,
        "price": payload.price,
        "status": "confirmed"
    }

    result = supabase.table("tickets").insert(ticket_record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to issue ticket in database")

    # Increment registered_count on the event if possible
    try:
        event_res = supabase.table("events").select("registered_count").eq("id", payload.eventId).execute()
        if event_res.data:
            current_count = event_res.data[0].get("registered_count") or 0
            supabase.table("events").update({"registered_count": current_count + 1}).eq("id", payload.eventId).execute()
    except Exception:
        pass

    return {
        "success": True,
        "ticket": result.data[0],
        "qrPayload": f"ASSEMBLE:{ticket_id}:{payload.eventId}"
    }

@router.get("/my-tickets")
def get_my_tickets(authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    result = supabase.table("tickets").select("*, events(title, start_date, location, city, image_url)").eq("user_id", user["sub"]).execute()
    return result.data or []

@router.post("/check-in")
def check_in_ticket(payload: TicketCheckInRequest, authorization: Optional[str] = Header(None)):
    # 1. Look up ticket
    res = supabase.table("tickets").select("*").eq("ticket_id", payload.ticketId).eq("event_id", payload.eventId).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Invalid ticket or ticket does not belong to this event")

    ticket = res.data[0]

    # 2. Check if already used
    if ticket.get("status") == "checked-in":
        return {
            "valid": False,
            "alreadyCheckedIn": True,
            "checkedInAt": ticket.get("checked_in_at"),
            "attendeeName": ticket.get("user_name"),
            "message": "⚠️ Ticket already checked in previously!"
        }

    # 3. Mark as checked in
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("tickets").update({
        "status": "checked-in",
        "checked_in_at": now_iso
    }).eq("id", ticket["id"]).execute()

    return {
        "valid": True,
        "alreadyCheckedIn": False,
        "attendeeName": ticket.get("user_name"),
        "tier": ticket.get("ticket_tier_name"),
        "checkedInAt": now_iso,
        "message": "✅ Check-in successful! Welcome to the event."
    }

