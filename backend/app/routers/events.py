from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional, List, Dict, Any
from app.services.supabase_client import supabase
from app.models.event import (
    EventCreateRequest,
    EventUpdateRequest,
    ScheduleUpdateRequest,
    ExpenseCreateRequest,
)
from app.routers.auth import decode_token

router = APIRouter()


def verify_event_owner(event: dict, user: dict):
    """
    Ensures that only the organizer who owns this event (or a platform admin)
    can edit its details, schedule, or view sensitive attendee rosters.
    """
    user_id = str(user.get("sub") or user.get("id") or "").strip()
    user_email = (user.get("email") or "").lower().strip()
    user_role = (user.get("role") or "").lower().strip()

    org_id = str(event.get("organizer_id") or "").strip()
    org_email = (event.get("organizer_email") or "").lower().strip()

    is_owner = (
        (org_id and org_id == user_id)
        or (org_email and org_email == user_email)
        or user_role == "admin"
    )

    if not is_owner:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only the organizer who owns this event can edit its details or schedule.",
        )
    return True


def notify_attendees_on_event_changes(
    event_id: str, old_event: dict, updated_fields: dict
):
    """
    Notifies registered attendees when finalized details (venue, speakers, schedule)
    change on a published event.
    """
    new_status = updated_fields.get("status") or old_event.get("status")
    if new_status != "published":
        return

    changes_list = []
    details = {}

    # 1. Venue changes
    old_venue = (old_event.get("location") or "").strip()
    new_venue = (
        updated_fields["location"]
        if "location" in updated_fields and updated_fields["location"] is not None
        else old_venue
    ).strip()

    if new_venue and new_venue != old_venue:
        was_tbd = (
            not old_venue
            or "to be announced" in old_venue.lower()
            or old_venue.lower() == "tbd"
        )
        if was_tbd:
            changes_list.append(f"Venue confirmed: {new_venue}")
        else:
            changes_list.append(f"Venue updated to: {new_venue}")
        details["venue"] = new_venue

    # 2. Speaker lineup changes
    if "speakers" in updated_fields and updated_fields["speakers"] is not None:
        old_speakers = old_event.get("speakers") or []
        new_speakers = updated_fields.get("speakers") or []
        old_names = [
            s.get("name") or s.get("title")
            for s in old_speakers
            if s.get("name") or s.get("title")
        ]
        new_names = [
            s.get("name") or s.get("title")
            for s in new_speakers
            if s.get("name") or s.get("title")
        ]
        if set(old_names) != set(new_names):
            if not old_names and new_names:
                changes_list.append(f"Speakers announced: {', '.join(new_names)}")
            else:
                changes_list.append(
                    f"Speaker lineup updated ({len(new_names)} speaker{'s' if len(new_names) > 1 else ''})"
                )
            details["speakers"] = new_names

    # 3. Schedule / Agenda changes
    if "schedule" in updated_fields and updated_fields["schedule"] is not None:
        old_sch = old_event.get("schedule") or []
        new_sch = updated_fields.get("schedule") or []
        old_keys = [
            f"{s.get('title')}-{s.get('startTime') or s.get('time')}" for s in old_sch
        ]
        new_keys = [
            f"{s.get('title')}-{s.get('startTime') or s.get('time')}" for s in new_sch
        ]
        if old_keys != new_keys:
            if not old_keys and new_keys:
                changes_list.append(
                    f"Agenda published: {len(new_sch)} session{'s' if len(new_sch) > 1 else ''} added"
                )
            else:
                changes_list.append(
                    f"Schedule updated ({len(new_sch)} session{'s' if len(new_sch) > 1 else ''})"
                )
            details["scheduleCount"] = len(new_sch)

    if not changes_list:
        return

    # Notify all registered attendees from tickets table
    try:
        tickets_res = (
            supabase.table("tickets")
            .select("user_id, user_email")
            .eq("event_id", event_id)
            .execute()
        )
        tickets = tickets_res.data or []
        if not tickets:
            return

        organizer_email = (old_event.get("organizer_email") or "").lower().strip()
        seen_emails = set()
        notification_records = []

        summary_msg = " · ".join(changes_list)
        event_title = updated_fields.get("title") or old_event.get("title") or "Event"

        for t in tickets:
            u_email = (t.get("user_email") or "").lower().strip()
            if not u_email or u_email == organizer_email or u_email in seen_emails:
                continue
            seen_emails.add(u_email)

            notification_records.append(
                {
                    "user_id": t.get("user_id"),
                    "user_email": u_email,
                    "event_id": event_id,
                    "event_title": event_title,
                    "type": "event_update",
                    "title": f"Update on {event_title}",
                    "message": summary_msg,
                    "changes": details,
                    "read": False,
                }
            )

        if notification_records:
            supabase.table("notifications").insert(notification_records).execute()
    except Exception as e:
        # Non-blocking log if notifications table is being provisioned or empty
        print(f"Notice: Background attendee notification sync: {e}")


@router.get("")
def list_events(
    search: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None,
    isFree: Optional[bool] = None,
    limit: int = 20,
):
    query = supabase.table("events").select("*").limit(limit)
    if category and category != "All":
        query = query.eq("category", category)
    if city and city != "All":
        query = query.ilike("city", f"%{city}%")
    if isFree is not None:
        query = query.eq("is_free", isFree)
    if search:
        query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")

    result = query.execute()
    return result.data or []


@router.get("/{event_id}")
def get_event(event_id: str):
    result = supabase.table("events").select("*").eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return result.data[0]


@router.post("", status_code=201)
def create_event(
    payload: EventCreateRequest, authorization: Optional[str] = Header(None)
):
    user = decode_token(authorization)

    event_data = {
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "format": payload.format,
        "start_date": payload.startDate,
        "start_time": payload.startTime,
        "end_date": payload.endDate,
        "location": payload.location or "Venue to be announced",
        "city": payload.city or "TBD",
        "price": payload.price,
        "is_free": payload.isFree,
        "expected_attendees": payload.expectedAttendees,
        "budget": payload.budget,
        "ticket_tiers": payload.ticketTiers or [],
        "sponsorship_opportunities": payload.sponsorshipOpportunities or [],
        "speakers": payload.speakers or [],
        "schedule": payload.schedule or [],
        "venue_details": payload.venueDetails,
        "image_url": payload.imageUrl,
        "volunteers_needed": payload.volunteersNeeded or 0,
        "associated_communities": payload.associatedCommunities or [],
        "budget_type": payload.budgetType or "no-budget",
        "seeking_sponsors": payload.seekingSponsors or False,
        "swag_order": payload.swagOrder,
        "organizer_id": user["sub"],
        "organizer_email": payload.organizerEmail or user.get("email"),
        "organizer_name": payload.organizerName or user.get("name"),
        "status": payload.status or "published",
    }

    result = supabase.table("events").insert(event_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create event in database")
    return result.data[0]


@router.put("/{event_id}")
def update_event(
    event_id: str,
    payload: EventUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Updates an existing draft or published event.
    Enforces that only the event organizer can update the event.
    Triggers notifications to registered attendees when finalized details change.
    """
    user = decode_token(authorization)

    # 1. Fetch existing event
    res = supabase.table("events").select("*").eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Event not found")
    existing_event = res.data[0]

    # 2. Enforce strict organizer ownership check
    verify_event_owner(existing_event, user)

    # 3. Construct update dictionary with snake_case column names
    update_data = {}
    if payload.title is not None:
        update_data["title"] = payload.title
    if payload.description is not None:
        update_data["description"] = payload.description
    if payload.category is not None:
        update_data["category"] = payload.category
    if payload.format is not None:
        update_data["format"] = payload.format
    if payload.startDate is not None:
        update_data["start_date"] = payload.startDate
    if payload.startTime is not None:
        update_data["start_time"] = payload.startTime
    if payload.endDate is not None:
        update_data["end_date"] = payload.endDate
    if payload.location is not None:
        update_data["location"] = payload.location
    if payload.city is not None:
        update_data["city"] = payload.city
    if payload.price is not None:
        update_data["price"] = payload.price
    if payload.isFree is not None:
        update_data["is_free"] = payload.isFree
    if payload.expectedAttendees is not None:
        update_data["expected_attendees"] = payload.expectedAttendees
    if payload.budget is not None:
        update_data["budget"] = payload.budget
    if payload.ticketTiers is not None:
        update_data["ticket_tiers"] = payload.ticketTiers
    if payload.sponsorshipOpportunities is not None:
        update_data["sponsorship_opportunities"] = payload.sponsorshipOpportunities
    if payload.speakers is not None:
        update_data["speakers"] = payload.speakers
    if payload.schedule is not None:
        update_data["schedule"] = payload.schedule
    if payload.venueDetails is not None:
        update_data["venue_details"] = payload.venueDetails
    if payload.imageUrl is not None:
        update_data["image_url"] = payload.imageUrl
    if payload.volunteersNeeded is not None:
        update_data["volunteers_needed"] = payload.volunteersNeeded
    if payload.associatedCommunities is not None:
        update_data["associated_communities"] = payload.associatedCommunities
    if payload.budgetType is not None:
        update_data["budget_type"] = payload.budgetType
    if payload.seekingSponsors is not None:
        update_data["seeking_sponsors"] = payload.seekingSponsors
    if payload.swagOrder is not None:
        update_data["swag_order"] = payload.swagOrder
    if payload.status is not None:
        update_data["status"] = payload.status

    if not update_data:
        return existing_event

    # 4. Save updates to database
    result = supabase.table("events").update(update_data).eq("id", event_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update event in database")

    updated_event = result.data[0]

    # 5. Notify registered attendees if venue, speakers, or schedule changed
    notify_attendees_on_event_changes(event_id, existing_event, update_data)

    return updated_event


@router.patch("/{event_id}")
def patch_event(
    event_id: str,
    payload: EventUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    """Alias for partial updates on draft or published events."""
    return update_event(event_id, payload, authorization)


@router.put("/{event_id}/schedule")
def update_event_schedule(
    event_id: str,
    payload: ScheduleUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Updates the schedule/agenda for an event.
    Enforces organizer ownership check and notifies registered attendees.
    """
    user = decode_token(authorization)

    # 1. Fetch existing event
    res = supabase.table("events").select("*").eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Event not found")
    existing_event = res.data[0]

    # 2. Ownership check
    verify_event_owner(existing_event, user)

    # 3. Update schedule column
    result = (
        supabase.table("events")
        .update({"schedule": payload.schedule})
        .eq("id", event_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update event schedule")

    # 4. Trigger attendee notifications for schedule updates
    notify_attendees_on_event_changes(
        event_id, existing_event, {"schedule": payload.schedule}
    )

    return result.data[0]


@router.get("/{event_id}/attendees")
def get_event_attendees(
    event_id: str, authorization: Optional[str] = Header(None)
):
    """
    Retrieves the registered attendees and tickets for an event.
    Strictly restricted to the event organizer or platform admin.
    """
    user = decode_token(authorization)

    # 1. Fetch existing event to verify organizer ownership
    res = supabase.table("events").select("*").eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Event not found")
    existing_event = res.data[0]

    # 2. Enforce organizer-only access
    verify_event_owner(existing_event, user)

    # 3. Query tickets table for attendees
    tickets_res = (
        supabase.table("tickets")
        .select("*")
        .eq("event_id", event_id)
        .order("created_at", desc=True)
        .execute()
    )

    return tickets_res.data or []


@router.get("/{event_id}/finances")
def get_finances(event_id: str):
    event_res = (
        supabase.table("events")
        .select("budget, revenue")
        .eq("id", event_id)
        .execute()
    )
    if not event_res.data:
        raise HTTPException(status_code=404, detail="Event not found")

    expenses_res = (
        supabase.table("event_expenses")
        .select("*")
        .eq("event_id", event_id)
        .execute()
    )
    expenses = expenses_res.data or []
    total_spent = sum(item.get("spent", 0) for item in expenses)

    return {
        "allocatedBudget": event_res.data[0].get("budget", 0),
        "totalSpent": total_spent,
        "ticketRevenue": event_res.data[0].get("revenue", 0),
        "expenses": expenses,
    }


@router.post("/{event_id}/expenses", status_code=201)
def log_expense(event_id: str, payload: ExpenseCreateRequest):
    expense_data = {
        "event_id": event_id,
        "title": payload.title,
        "category": payload.category,
        "allocated": payload.allocated,
        "spent": payload.spent,
        "status": payload.status,
    }
    result = supabase.table("event_expenses").insert(expense_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to log expense")
    return result.data[0]
