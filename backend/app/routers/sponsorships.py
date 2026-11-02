import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_supabase_client, get_current_user_optional
from app.models.sponsorship import (
    SponsorshipRequestCreate,
    SponsorshipStatusUpdate,
    SponsorshipPayoutRequest,
)

router = APIRouter(prefix="/sponsorships", tags=["6. Sponsorships & Due Diligence"])


@router.get("/opportunities")
async def get_sponsorship_opportunities(
    category: Optional[str] = Query(None, description="Filter by event category"),
    city: Optional[str] = Query(None, description="Filter by city"),
    client=Depends(get_supabase_client),
):
    """
    6.1 GET /sponsorships/opportunities
    Marketplace of events looking for sponsors with tier pricing and audience demographics.
    """
    try:
        query = client.from_("events").select(
            "id, title, description, category, city, location, start_date, expected_attendees, sponsorship_opportunities, organizer_name, organizer_email"
        )
        if category:
            query = query.eq("category", category)
        if city:
            query = query.ilike("city", f"%{city}%")
            
        res = query.execute()
        events = res.data or []
        
        # Format into opportunities list
        opportunities = []
        for evt in events:
            tiers = evt.get("sponsorship_opportunities") or []
            if isinstance(tiers, list) and len(tiers) > 0:
                opportunities.append({
                    "eventId": evt["id"],
                    "eventTitle": evt["title"],
                    "category": evt.get("category"),
                    "city": evt.get("city"),
                    "location": evt.get("location"),
                    "startDate": evt.get("start_date"),
                    "expectedAttendees": evt.get("expected_attendees"),
                    "organizerName": evt.get("organizer_name"),
                    "organizerEmail": evt.get("organizer_email"),
                    "tiers": tiers,
                })
        return opportunities
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sponsorship opportunities: {str(e)}",
        )


@router.post("/requests", status_code=status.HTTP_201_CREATED)
async def create_sponsorship_request(
    payload: SponsorshipRequestCreate,
    user=Depends(get_current_user_optional),
    client=Depends(get_supabase_client),
):
    """
    6.2 POST /sponsorships/requests
    Sponsor applies to sponsor an event or organizer sends a sponsorship pitch.
    """
    try:
        req_id = f"REQ-{uuid.uuid4().hex[:6].upper()}"
        sponsor_id = payload.sponsorId or (user["id"] if user else None)
        
        # Verify event exists
        evt_res = client.from_("events").select("id, title").eq("id", payload.eventId).single().execute()
        if not evt_res.data:
            raise HTTPException(status_code=404, detail="Target event not found")
            
        insert_data = {
            "request_id": req_id,
            "event_id": payload.eventId,
            "sponsor_id": sponsor_id,
            "requirement": payload.requirement,
            "amount": payload.offeredAmount,
            "pitch": payload.sponsorNotes,
            "status": "REQUESTED",
        }
        
        res = client.from_("sponsorship_requests").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create sponsorship request")
            
        created = res.data[0]
        return {
            "message": "Sponsorship request submitted successfully",
            "request": created,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating sponsorship request: {str(e)}",
        )


@router.patch("/requests/{request_id}")
async def update_sponsorship_request_status(
    request_id: str,
    payload: SponsorshipStatusUpdate,
    client=Depends(get_supabase_client),
):
    """
    6.3 PATCH /sponsorships/requests/{request_id}
    Organizer approves, rejects, or counters a sponsorship request.
    """
    try:
        # Determine whether request_id is UUID or human-readable format (REQ-XXXX)
        query = client.from_("sponsorship_requests").update({
            "status": payload.status.upper()
        })
        
        if "-" in request_id and not request_id.startswith("REQ-"):
            query = query.eq("id", request_id)
        else:
            query = query.eq("request_id", request_id)
            
        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Sponsorship request '{request_id}' not found")
            
        updated = res.data[0]
        return {
            "message": f"Sponsorship request status updated to {payload.status.upper()}",
            "request": updated,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating sponsorship status: {str(e)}",
        )


@router.post("/requests/{request_id}/payout")
async def process_sponsorship_payout(
    request_id: str,
    payload: SponsorshipPayoutRequest,
    client=Depends(get_supabase_client),
):
    """
    6.4 POST /sponsorships/requests/{request_id}/payout
    Escrow payment simulation or Stripe Checkout intent for sponsor funding.
    """
    try:
        query = client.from_("sponsorship_requests").select("*, events(title, organizer_name, organizer_email)")
        if "-" in request_id and not request_id.startswith("REQ-"):
            query = query.eq("id", request_id)
        else:
            query = query.eq("request_id", request_id)
            
        res = query.single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Sponsorship request not found")
            
        req = res.data
        tx_id = f"ESCROW-TX-{uuid.uuid4().hex[:8].upper()}"
        
        return {
            "status": "escrow_funded",
            "transactionId": tx_id,
            "requestId": req.get("request_id") or request_id,
            "amountFunded": req.get("amount", 0.0),
            "paymentMethod": payload.paymentMethod,
            "disbursementStatus": "held_in_escrow_until_milestones_met",
            "event": req.get("events"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing sponsorship payout: {str(e)}",
        )
