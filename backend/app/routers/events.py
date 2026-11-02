from fastapi import APIRouter, HTTPException, Header, Query
from typing import Optional
from app.services.supabase_client import supabase
from app.models.event import EventCreateRequest, ExpenseCreateRequest
from app.routers.auth import decode_token

router = APIRouter()

@router.get("")
def list_events(
    search: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None,
    isFree: Optional[bool] = None,
    limit: int = 20
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
def create_event(payload: EventCreateRequest, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    event_data = {
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "format": payload.format,
        "start_date": payload.startDate,
        "start_time": payload.startTime,
        "location": payload.location,
        "city": payload.city,
        "price": payload.price,
        "is_free": payload.isFree,
        "expected_attendees": payload.expectedAttendees,
        "budget": payload.budget,
        "ticket_tiers": payload.ticketTiers,
        "sponsorship_opportunities": payload.sponsorshipOpportunities,
        "organizer_id": user["sub"],
        "status": "published"
    }

    result = supabase.table("events").insert(event_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create event in database")
    return result.data[0]

@router.get("/{event_id}/finances")
def get_finances(event_id: str):
    event_res = supabase.table("events").select("budget, revenue").eq("id", event_id).execute()
    if not event_res.data:
        raise HTTPException(status_code=404, detail="Event not found")
    
    expenses_res = supabase.table("event_expenses").select("*").eq("event_id", event_id).execute()
    expenses = expenses_res.data or []
    total_spent = sum(item.get("spent", 0) for item in expenses)

    return {
        "allocatedBudget": event_res.data[0].get("budget", 0),
        "totalSpent": total_spent,
        "ticketRevenue": event_res.data[0].get("revenue", 0),
        "expenses": expenses
    }

@router.post("/{event_id}/expenses", status_code=201)
def log_expense(event_id: str, payload: ExpenseCreateRequest):
    expense_data = {
        "event_id": event_id,
        "title": payload.title,
        "category": payload.category,
        "allocated": payload.allocated,
        "spent": payload.spent,
        "status": payload.status
    }
    result = supabase.table("event_expenses").insert(expense_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to log expense")
    return result.data[0]

