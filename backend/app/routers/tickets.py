from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import uuid
from datetime import datetime, timezone
from app.services.supabase_client import supabase
from app.models.ticket import TicketBookRequest, TicketCheckInRequest
from app.routers.auth import decode_token

router = APIRouter()


@router.post("/book", status_code=201)
def book_ticket(
    payload: TicketBookRequest, authorization: Optional[str] = Header(None)
):
    user = decode_token(authorization)

    # Generate human-readable ticket code e.g. TCK-9A4B-2027 or EH-XXXXX
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
        "status": "confirmed",
    }

    result = supabase.table("tickets").insert(ticket_record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to issue ticket in database")

    # Increment registered_count and revenue on the event
    try:
        event_res = (
            supabase.table("events")
            .select("registered_count, revenue")
            .eq("id", payload.eventId)
            .execute()
        )
        if event_res.data:
            current_count = event_res.data[0].get("registered_count") or 0
            current_rev = float(event_res.data[0].get("revenue") or 0)
            supabase.table("events").update(
                {
                    "registered_count": current_count + 1,
                    "revenue": current_rev + float(payload.price or 0),
                }
            ).eq("id", payload.eventId).execute()
    except Exception:
        pass

    return {
        "success": True,
        "ticket": result.data[0],
        "qrPayload": f"ASSEMBLE:{ticket_id}:{payload.eventId}",
    }


@router.get("/my-tickets")
def get_my_tickets(authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    result = (
        supabase.table("tickets")
        .select("*, events(title, start_date, location, city, image_url)")
        .eq("user_id", user["sub"])
        .execute()
    )
    return result.data or []


@router.post("/check-in")
def check_in_ticket(
    payload: TicketCheckInRequest, authorization: Optional[str] = Header(None)
):
    """
    Validates and checks in an attendee using their ticket code or QR code string.
    """
    raw_code = (payload.ticketCode or payload.ticketId or "").strip()
    if not raw_code:
        raise HTTPException(status_code=400, detail="ticketCode or ticketId is required")

    # Check if raw_code is formatted as ASSEMBLE:<ticket_id>:<event_id>
    event_id = payload.eventId
    ticket_id = raw_code
    if raw_code.startswith("ASSEMBLE:"):
        parts = raw_code.split(":")
        if len(parts) >= 2:
            ticket_id = parts[1]
        if len(parts) >= 3 and not event_id:
            event_id = parts[2]

    # Look up ticket by ticket_id (case-insensitive)
    query = supabase.table("tickets").select("*").ilike("ticket_id", ticket_id)
    if event_id:
        query = query.eq("event_id", event_id)

    res = query.execute()
    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Invalid ticket or ticket does not belong to this event",
        )

    ticket = res.data[0]
    matched_event_id = ticket.get("event_id")

    # If authorization provided, verify organizer permission for the event
    if authorization:
        try:
            user = decode_token(authorization)
            event_res = (
                supabase.table("events")
                .select("organizer_id, organizer_email")
                .eq("id", matched_event_id)
                .execute()
            )
            if event_res.data:
                org_info = event_res.data[0]
                user_id = str(user.get("sub") or "")
                user_email = (user.get("email") or "").lower()
                user_role = (user.get("role") or "").lower()
                org_id = str(org_info.get("organizer_id") or "")
                org_email = (org_info.get("organizer_email") or "").lower()
                is_authorized = (
                    (org_id and org_id == user_id)
                    or (org_email and org_email == user_email)
                    or user_role in ["admin", "organizer"]
                )
                if not is_authorized:
                    raise HTTPException(
                        status_code=403,
                        detail="Only the event organizer can check in tickets for this event",
                    )
        except HTTPException:
            raise
        except Exception:
            pass

    # Check if already used
    if ticket.get("status") == "checked-in":
        return {
            "valid": False,
            "alreadyCheckedIn": True,
            "checkedInAt": ticket.get("checked_in_at"),
            "attendeeName": ticket.get("user_name"),
            "message": "⚠️ Ticket already checked in previously!",
        }

    # Mark as checked in
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("tickets").update(
        {
            "status": "checked-in",
            "checked_in_at": now_iso,
        }
    ).eq("id", ticket["id"]).execute()

    # Increment checked_in_count on event
    try:
        event_res = (
            supabase.table("events")
            .select("checked_in_count")
            .eq("id", matched_event_id)
            .execute()
        )
        if event_res.data:
            current_count = event_res.data[0].get("checked_in_count") or 0
            supabase.table("events").update(
                {"checked_in_count": current_count + 1}
            ).eq("id", matched_event_id).execute()
    except Exception:
        pass

    return {
        "valid": True,
        "alreadyCheckedIn": False,
        "attendeeName": ticket.get("user_name"),
        "tier": ticket.get("ticket_tier_name"),
        "checkedInAt": now_iso,
        "message": "✅ Check-in successful! Welcome to the event.",
    }
