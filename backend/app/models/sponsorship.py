from typing import Optional
from pydantic import BaseModel, Field


class SponsorshipRequestCreate(BaseModel):
    eventId: str = Field(..., description="UUID of the event")
    requirement: str = Field(..., description="Sponsorship tier or requirement (e.g. Title Sponsor, Goodies)")
    offeredAmount: float = Field(..., ge=0, description="Pledged or requested amount")
    sponsorNotes: Optional[str] = Field(None, description="Notes, deliverables, or pitch details")
    sponsorId: Optional[str] = Field(None, description="UUID of sponsor user if authenticated")


class SponsorshipStatusUpdate(BaseModel):
    status: str = Field(..., description="New status: APPROVED, REJECTED, or REQUESTED")
    notes: Optional[str] = Field(None, description="Optional feedback or rejection reason")


class SponsorshipPayoutRequest(BaseModel):
    paymentMethod: Optional[str] = Field("escrow_simulation", description="Payment provider or escrow method")
    notes: Optional[str] = Field(None, description="Transaction notes or invoice ref")
