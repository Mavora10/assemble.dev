from typing import Optional
from pydantic import BaseModel, Field


class SponsorshipRequestCreate(BaseModel):
    eventId: str = Field(..., description="UUID of the event")
    requirement: Optional[str] = Field(None, description="Sponsorship tier or requirement (e.g. Title Sponsor, Goodies)")
    tierName: Optional[str] = Field(None, description="Alternative field for requirement/tier name")
    offeredAmount: Optional[float] = Field(None, ge=0, description="Pledged or requested amount")
    pledgedAmount: Optional[float] = Field(None, ge=0, description="Alternative field for offered amount")
    sponsorNotes: Optional[str] = Field(None, description="Notes, deliverables, or pitch details")
    notes: Optional[str] = Field(None, description="Alternative field for notes")
    sponsorId: Optional[str] = Field(None, description="UUID of sponsor user if authenticated")
    companyName: Optional[str] = Field(None, description="Sponsor company name")
    contactEmail: Optional[str] = Field(None, description="Sponsor contact email")
    status: Optional[str] = Field("REQUESTED", description="Status of the request")

    @property
    def final_requirement(self) -> str:
        return self.requirement or self.tierName or "General Sponsor"

    @property
    def final_amount(self) -> float:
        if self.offeredAmount is not None:
            return float(self.offeredAmount)
        if self.pledgedAmount is not None:
            return float(self.pledgedAmount)
        return 0.0

    @property
    def final_notes(self) -> str:
        return self.sponsorNotes or self.notes or ""


class SponsorshipStatusUpdate(BaseModel):
    status: str = Field(..., description="New status: APPROVED, REJECTED, or REQUESTED")
    notes: Optional[str] = Field(None, description="Optional feedback or rejection reason")
    message: Optional[str] = Field(None, description="Alternative field for notes")


class SponsorshipPayoutRequest(BaseModel):
    paymentMethod: Optional[str] = Field("escrow_simulation", description="Payment provider or escrow method")
    notes: Optional[str] = Field(None, description="Transaction notes or invoice ref")
