import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.dependencies import get_supabase_client, get_current_user_optional
from app.models.speaker import (
    SpeakerInvitationCreate,
    SpeakerInvitationStatusUpdate,
)

router = APIRouter(prefix="", tags=["8. Speakers Marketplace & Lineups"])


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
        if location:
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
        lineup_res = client.from_("event_speakers").select("role, topic, events(title, start_date, city)").eq("speaker_id", speaker_id).execute()
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
        spk_res = client.from_("speakers").select("name, email").eq("id", payload.speakerId).single().execute()
        if not spk_res.data:
            raise HTTPException(status_code=404, detail="Speaker not found")
        speaker = spk_res.data
        
        # Fetch event details
        evt_res = client.from_("events").select("title, organizer_name").eq("id", payload.eventId).single().execute()
        if not evt_res.data:
            raise HTTPException(status_code=404, detail="Target event not found")
        event = evt_res.data
        
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
async def update_speaker_invitation_status(
    invite_id: str,
    payload: SpeakerInvitationStatusUpdate,
    client=Depends(get_supabase_client),
):
    """
    8.4 PATCH /speakers/invitations/{invite_id}
    Speaker accepts or declines the invitation. When accepted, automatically registers into event_speakers!
    """
    try:
        query = client.from_("speaker_invitations").update({
            "status": payload.status.lower()
        })
        
        if "-" in invite_id and not invite_id.startswith("INV-"):
            query = query.eq("id", invite_id)
        else:
            query = query.eq("invite_id", invite_id)
            
        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail=f"Invitation '{invite_id}' not found")
            
        invitation = res.data[0]
        
        # If accepted, upsert into event_speakers lineup
        if payload.status.lower() == "accepted":
            client.from_("event_speakers").upsert({
                "event_id": invitation["event_id"],
                "speaker_id": invitation["speaker_id"],
                "role": invitation.get("session_type", "Speaker"),
                "topic": invitation.get("pitch", "Invited Talk"),
            }).execute()
            
        return {
            "message": f"Invitation status updated to '{payload.status.lower()}'",
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
        res = client.from_("event_speakers").select(
            "role, topic, speakers(id, name, designation, company, photo_url, bio, expertise, rating)"
        ).eq("event_id", event_id).execute()
        
        lineup = []
        for item in (res.data or []):
            spk = item.get("speakers") or {}
            lineup.append({
                "role": item.get("role", "Speaker"),
                "topic": item.get("topic"),
                "speaker": spk,
            })
            
        return lineup
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching event lineup: {str(e)}",
        )
