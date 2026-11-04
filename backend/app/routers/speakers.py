import uuid
from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_supabase_client, get_current_user_optional
from app.models.speaker import (
    SpeakerInvitationCreate,
    SpeakerInvitationStatusUpdate,
)

router = APIRouter(prefix="", tags=["8. Speakers Marketplace & Lineups"])


class SpeakerCreate(BaseModel):
    name: str = Field(..., description="Speaker full name")
    email: Optional[str] = Field(None, description="Speaker email")
    designation: str = Field(..., description="Professional title / designation")
    company: Optional[str] = Field(None, description="Organization or company")
    photoUrl: Optional[str] = Field(None, description="Headshot photo URL")
    bio: Optional[str] = Field(None, description="Speaker biography")
    expertise: Optional[List[str]] = Field(default_factory=list, description="Topics of expertise")
    location: Optional[str] = Field(None, description="City / Country")
    feeAmount: Optional[float] = Field(0.0, ge=0, description="Speaker honorarium fee")
    feeType: Optional[str] = Field("fee", description="'fee' or 'free'")
    currency: Optional[str] = Field("$", description="Currency symbol")
    yearsExperience: Optional[int] = Field(5, ge=0, description="Years speaking experience")
    videoUrl: Optional[str] = Field(None, description="Keynote recording sample video URL")
    availability: Optional[str] = Field("Available for Bookings", description="Availability statement")


@router.get("/speakers")
async def get_speakers(
    topic: Optional[str] = Query(None, description="Topic or expertise keyword"),
    location: Optional[str] = Query(None, description="Speaker city or location"),
    availableOnly: Optional[bool] = Query(True, description="Only show available speakers"),
    client=Depends(get_supabase_client),
):
    """
    8.1 GET /speakers
    Search directory of professional & community speakers by topic, fee, and location.
    """
    try:
        query = client.from_("speakers").select("*")
        if location and location != "All":
            query = query.ilike("location", f"%{location}%")
        if availableOnly:
            query = query.eq("is_available", True)

        res = query.order("rating", desc=True).execute()
        speakers = res.data or []

        if topic:
            topic_lower = topic.lower()
            filtered = []
            for spk in speakers:
                expertise = [str(x).lower() for x in (spk.get("expertise") or [])]
                name = str(spk.get("name", "")).lower()
                designation = str(spk.get("designation", "")).lower()
                if (
                    any(topic_lower in exp for exp in expertise)
                    or topic_lower in name
                    or topic_lower in designation
                ):
                    filtered.append(spk)
            speakers = filtered

        return speakers
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch speakers directory: {str(e)}",
        )


@router.post("/speakers", status_code=status.HTTP_201_CREATED)
async def create_speaker(
    payload: SpeakerCreate,
    user=Depends(get_current_user_optional),
    client=Depends(get_supabase_client),
):
    """
    Register a new speaker profile in the marketplace.
    """
    try:
        user_id = user["id"] if user else None
        email = payload.email or (user["email"] if user else None)

        insert_data = {
            "user_id": user_id,
            "name": payload.name,
            "email": email,
            "designation": payload.designation,
            "company": payload.company,
            "photo_url": payload.photoUrl,
            "bio": payload.bio,
            "expertise": payload.expertise or [],
            "location": payload.location,
            "fee_amount": payload.feeAmount or 0.0,
            "fee_type": payload.feeType or "fee",
            "currency": payload.currency or "$",
            "years_experience": payload.yearsExperience or 5,
            "video_url": payload.videoUrl,
            "availability": payload.availability or "Available for Bookings",
            "is_available": True,
        }

        res = client.from_("speakers").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to register speaker profile")

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registering speaker: {str(e)}",
        )


@router.get("/speakers/invitations")
async def get_speaker_invitations(
    speakerId: Optional[str] = Query(None),
    eventId: Optional[str] = Query(None),
    organizerId: Optional[str] = Query(None),
    statusFilter: Optional[str] = Query(None, alias="status"),
    user=Depends(get_current_user_optional),
    client=Depends(get_supabase_client),
):
    """
    List speaking invitations and applications.
    """
    try:
        query = client.from_("speaker_invitations").select("*, events(title, start_date, city, location)")
        if speakerId:
            query = query.eq("speaker_id", speakerId)
        if eventId:
            query = query.eq("event_id", eventId)
        if organizerId:
            query = query.eq("organizer_id", organizerId)
        if statusFilter:
            query = query.eq("status", statusFilter.lower())

        res = query.order("created_at", desc=True).execute()
        invites = res.data or []

        formatted = []
        for inv in invites:
            evt = inv.get("events") or {}
            formatted.append({
                "id": inv.get("id"),
                "inviteId": inv.get("invite_id") or inv.get("id"),
                "speakerId": inv.get("speaker_id"),
                "speakerName": inv.get("speaker_name"),
                "speakerEmail": inv.get("speaker_email"),
                "eventId": inv.get("event_id"),
                "eventTitle": inv.get("event_title") or evt.get("title"),
                "organizerId": inv.get("organizer_id"),
                "organizerName": inv.get("organizer_name"),
                "message": inv.get("message") or inv.get("pitch"),
                "pitch": inv.get("pitch") or inv.get("message"),
                "sessionType": inv.get("session_type") or "Keynote",
                "status": inv.get("status") or "pending",
                "date": inv.get("date") or evt.get("start_date"),
                "createdAt": inv.get("created_at"),
            })
        return formatted
    except Exception as e:
        print(f"Notice: Failed to fetch speaker invitations: {e}")
        return []


@router.get("/speakers/{speaker_id}")
async def get_speaker_by_id(
    speaker_id: str,
    client=Depends(get_supabase_client),
):
    """
    8.2 GET /speakers/{speaker_id}
    View speaker portfolio, past talks, video reel links, and ratings.
    """
    try:
        res = client.from_("speakers").select("*").eq("id", speaker_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Speaker '{speaker_id}' not found")

        speaker = res.data[0]

        # Attach speaking engagements history
        lineup_res = (
            client.from_("event_speakers")
            .select("role, topic, events(title, start_date, city)")
            .eq("speaker_id", speaker_id)
            .execute()
        )
        speaker["pastEngagements"] = lineup_res.data or []

        return speaker
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching speaker details: {str(e)}",
        )


@router.post("/speakers/invitations", status_code=status.HTTP_201_CREATED)
async def send_speaker_invitation(
    payload: SpeakerInvitationCreate,
    user=Depends(get_current_user_optional),
    client=Depends(get_supabase_client),
):
    """
    8.3 POST /speakers/invitations
    Organizer invites a speaker to speak at an upcoming event.
    """
    try:
        # Fetch speaker details
        spk_res = client.from_("speakers").select("name, email").eq("id", payload.speakerId).execute()
        speaker = spk_res.data[0] if spk_res.data else {"name": "Speaker", "email": None}

        # Fetch event details
        evt_res = client.from_("events").select("title, organizer_name").eq("id", payload.eventId).execute()
        event = evt_res.data[0] if evt_res.data else {"title": "Assemble Event", "organizer_name": "Organizer"}

        invite_id = f"INV-{uuid.uuid4().hex[:6].upper()}"
        org_name = event.get("organizer_name") or (user.get("user_metadata", {}).get("name") if user else "Event Organizer")

        insert_data = {
            "invite_id": invite_id,
            "speaker_id": payload.speakerId,
            "speaker_name": speaker.get("name"),
            "speaker_email": speaker.get("email"),
            "event_id": payload.eventId,
            "event_title": event.get("title"),
            "organizer_id": user["id"] if user else None,
            "organizer_name": org_name,
            "session_type": payload.sessionType,
            "pitch": payload.pitch,
            "message": payload.pitch,
            "status": "pending",
        }

        res = client.from_("speaker_invitations").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to send speaker invitation")

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending speaker invitation: {str(e)}",
        )


@router.patch("/speakers/invitations/{invite_id}")
@router.put("/speakers/invitations/{invite_id}")
async def update_speaker_invitation_status(
    invite_id: str,
    payload: SpeakerInvitationStatusUpdate,
    client=Depends(get_supabase_client),
):
    """
    8.4 PATCH/PUT /speakers/invitations/{invite_id}
    Speaker accepts or declines the invitation. When accepted, automatically registers into event_speakers!
    """
    try:
        new_status = payload.status.lower()
        query = client.from_("speaker_invitations").update({"status": new_status})

        if "-" in invite_id and not invite_id.startswith("INV-"):
            query = query.eq("id", invite_id)
        else:
            query = query.eq("invite_id", invite_id)

        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Invitation '{invite_id}' not found")

        invitation = res.data[0]

        # If accepted, upsert into event_speakers lineup
        if new_status == "accepted" and invitation.get("event_id") and invitation.get("speaker_id"):
            try:
                client.from_("event_speakers").upsert({
                    "event_id": invitation["event_id"],
                    "speaker_id": invitation["speaker_id"],
                    "role": invitation.get("session_type", "Speaker"),
                    "topic": invitation.get("pitch", "Invited Talk"),
                }).execute()
            except Exception as e:
                print(f"Notice: Non-blocking event_speakers upsert error: {e}")

        return {
            "message": f"Invitation status updated to '{new_status}'",
            "invitation": invitation,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating invitation: {str(e)}",
        )


@router.get("/events/{event_id}/lineup")
async def get_event_lineup(
    event_id: str,
    client=Depends(get_supabase_client),
):
    """
    8.5 GET /events/{event_id}/lineup
    Returns the confirmed agenda/schedule of speakers and session topics for an event.
    """
    try:
        res = (
            client.from_("event_speakers")
            .select("role, topic, speakers(id, name, designation, company, photo_url, bio, expertise, rating)")
            .eq("event_id", event_id)
            .execute()
        )

        lineup = []
        for item in res.data or []:
            spk = item.get("speakers") or {}
            lineup.append(
                {
                    "role": item.get("role", "Speaker"),
                    "topic": item.get("topic"),
                    "speaker": spk,
                }
            )

        return lineup
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching event lineup: {str(e)}",
        )
