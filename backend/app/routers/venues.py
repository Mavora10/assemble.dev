import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_supabase_client, get_current_user_optional
from app.models.venue import (
    VenueCreate,
    VenueBookingCreate,
    VenueBookingStatusUpdate,
)

router = APIRouter(prefix="/venues", tags=["7. Venues Marketplace & Bookings"])


@router.get("")
async def get_venues(
    city: Optional[str] = Query(None, description="Filter by city"),
    minCapacity: Optional[int] = Query(None, ge=1, description="Minimum venue capacity"),
    maxPrice: Optional[float] = Query(None, ge=0, description="Max hourly price"),
    amenities: Optional[str] = Query(None, description="Comma-separated amenities (e.g. WiFi,Projector)"),
    vibe: Optional[str] = Query(None, description="Venue aesthetic/vibe"),
    client=Depends(get_supabase_client),
):
    """
    7.1 GET /venues
    Search venues by city, capacity, amenities, vibe, and max hourly rate.
    """
    try:
        query = client.from_("venues").select("*")
        if city and city != "All":
            query = query.ilike("city", f"%{city}%")
        if minCapacity:
            query = query.gte("capacity", minCapacity)
        if maxPrice:
            query = query.lte("price_per_hour", maxPrice)
        if vibe and vibe != "All":
            query = query.ilike("vibe", f"%{vibe}%")

        res = query.order("rating", desc=True).execute()
        venues = res.data or []

        # In-memory filter for amenities array if provided
        if amenities:
            amenity_list = [a.strip().lower() for a in amenities.split(",") if a.strip()]
            filtered = []
            for v in venues:
                v_amenities = [str(x).lower() for x in (v.get("amenities") or [])]
                if all(a in v_amenities for a in amenity_list):
                    filtered.append(v)
            venues = filtered

        return venues
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch venues: {str(e)}",
        )


@router.get("/bookings")
async def get_venue_bookings(
    venueId: Optional[str] = Query(None),
    eventId: Optional[str] = Query(None),
    organizerId: Optional[str] = Query(None),
    statusFilter: Optional[str] = Query(None, alias="status"),
    user=Depends(get_current_user_optional),
    client=Depends(get_supabase_client),
):
    """
    List venue bookings for hosts or event organizers.
    """
    try:
        query = client.from_("venue_bookings").select("*, venues(name, address, city, price_per_hour, image_url)")
        if venueId:
            query = query.eq("venue_id", venueId)
        if eventId:
            query = query.eq("event_id", eventId)
        if organizerId:
            query = query.eq("organizer_id", organizerId)
        if statusFilter:
            query = query.eq("status", statusFilter.lower())

        res = query.order("created_at", desc=True).execute()
        bookings = res.data or []

        formatted = []
        for b in bookings:
            v_info = b.get("venues") or {}
            formatted.append({
                "id": b.get("id"),
                "bookingId": b.get("booking_id") or b.get("id"),
                "venueId": b.get("venue_id"),
                "venueName": b.get("venue_name") or v_info.get("name"),
                "eventId": b.get("event_id"),
                "eventName": b.get("event_name"),
                "organizerId": b.get("organizer_id"),
                "organizerName": b.get("organizer_name"),
                "organizerEmail": b.get("organizer_email"),
                "bookingDate": b.get("booking_date"),
                "durationHours": b.get("duration_hours"),
                "expectedAttendees": b.get("expected_attendees"),
                "estimatedTotal": float(b.get("estimated_total") or 0.0),
                "status": b.get("status") or "pending",
                "notes": b.get("notes"),
                "createdAt": b.get("created_at"),
            })
        return formatted
    except Exception as e:
        print(f"Notice: Failed to fetch venue bookings: {e}")
        return []


@router.get("/{venue_id}")
async def get_venue_by_id(
    venue_id: str,
    client=Depends(get_supabase_client),
):
    """
    7.2 GET /venues/{venue_id}
    Get full venue details, photo gallery, floor plan, rules, and calendar availability.
    """
    try:
        res = client.from_("venues").select("*").eq("id", venue_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Venue '{venue_id}' not found")

        venue = res.data[0]

        # Attach recent confirmed bookings dates for calendar availability check
        bookings_res = (
            client.from_("venue_bookings")
            .select("booking_date, duration_hours, status")
            .eq("venue_id", venue_id)
            .eq("status", "confirmed")
            .execute()
        )
        venue["confirmedBookings"] = bookings_res.data or []

        return venue
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching venue details: {str(e)}",
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_venue(
    payload: VenueCreate,
    user=Depends(get_current_user_optional),
    client=Depends(get_supabase_client),
):
    """
    7.3 POST /venues
    Venue Providers list a new venue property.
    """
    try:
        slug = payload.name.lower().replace(" ", "-") + f"-{uuid.uuid4().hex[:4]}"
        provider_id = user["id"] if user else None
        provider_name = user.get("user_metadata", {}).get("name") if user else None
        provider_email = user.get("email") if user else None

        insert_data = {
            "name": payload.name,
            "slug": slug,
            "location": payload.location,
            "address": payload.address or payload.location,
            "city": payload.city,
            "capacity": payload.capacity,
            "price_per_hour": payload.pricePerHour,
            "vibe": payload.vibe,
            "description": payload.description,
            "amenities": payload.amenities or [],
            "image_url": payload.imageUrl,
            "images": payload.images or [],
            "provider_id": provider_id,
            "provider_name": provider_name,
            "provider_email": provider_email,
            "is_available": True,
        }

        res = client.from_("venues").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create venue")

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing venue: {str(e)}",
        )


@router.post("/{venue_id}/bookings", status_code=status.HTTP_201_CREATED)
async def create_venue_booking(
    venue_id: str,
    payload: VenueBookingCreate,
    user=Depends(get_current_user_optional),
    client=Depends(get_supabase_client),
):
    """
    7.4 POST /venues/{venue_id}/bookings
    Event organizer submits a booking request for dates and duration.
    """
    try:
        # Fetch venue details to compute estimated total
        v_res = client.from_("venues").select("name, price_per_hour").eq("id", venue_id).single().execute()
        if not v_res.data:
            raise HTTPException(status_code=404, detail="Target venue not found")

        venue = v_res.data
        price_per_hour = float(venue.get("price_per_hour") or 0.0)
        estimated_total = price_per_hour * payload.durationHours

        # Fetch event title if exists
        evt_res = client.from_("events").select("title, organizer_name, organizer_email").eq("id", payload.eventId).single().execute()
        event_name = evt_res.data.get("title") if evt_res.data else "Upcoming Assemble Event"
        org_name = evt_res.data.get("organizer_name") if evt_res.data else (user.get("user_metadata", {}).get("name") if user else "Organizer")
        org_email = evt_res.data.get("organizer_email") if evt_res.data else (user.get("email") if user else None)

        booking_id = f"VBK-{uuid.uuid4().hex[:6].upper()}"

        insert_data = {
            "booking_id": booking_id,
            "venue_id": venue_id,
            "event_id": payload.eventId,
            "venue_name": venue.get("name"),
            "event_name": event_name,
            "organizer_id": user["id"] if user else None,
            "organizer_name": org_name,
            "organizer_email": org_email,
            "booking_date": payload.bookingDate,
            "duration_hours": payload.durationHours,
            "expected_attendees": payload.expectedAttendees,
            "estimated_total": estimated_total,
            "notes": payload.notes,
            "status": "pending",
        }

        res = client.from_("venue_bookings").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create venue booking")

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting venue booking: {str(e)}",
        )


@router.patch("/bookings/{booking_id}/status")
@router.put("/bookings/{booking_id}/status")
async def update_venue_booking_status(
    booking_id: str,
    payload: VenueBookingStatusUpdate,
    client=Depends(get_supabase_client),
):
    """
    7.5 PATCH/PUT /venues/bookings/{booking_id}/status
    Venue Provider confirms, declines, or requests adjustments to a booking.
    """
    try:
        new_status = payload.status.lower()
        query = client.from_("venue_bookings").update({"status": new_status})

        if "-" in booking_id and not booking_id.startswith("VBK-"):
            query = query.eq("id", booking_id)
        else:
            query = query.eq("booking_id", booking_id)

        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")

        return {
            "message": f"Venue booking marked as '{new_status}'",
            "booking": res.data[0],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating venue booking status: {str(e)}",
        )
