from typing import Optional, List
from pydantic import BaseModel, Field


class SpeakerInvitationCreate(BaseModel):
    speakerId: str = Field(..., description="UUID of the invited speaker")
    eventId: str = Field(..., description="UUID of the event")
    sessionType: str = Field("Keynote", description="Session format: Keynote, Workshop, Panel, Lightning Talk")
    pitch: Optional[str] = Field(None, description="Organizer invite message and topic pitch")


class SpeakerInvitationStatusUpdate(BaseModel):
    status: str = Field(..., description="New invite status: accepted, declined, or pending")
    message: Optional[str] = Field(None, description="Speaker response message or constraints")
