from typing import Optional, List
from pydantic import BaseModel, Field


class VenueCreate(BaseModel):
    name: str = Field(..., description="Venue name")
    location: str = Field(..., description="General location or district")
    address: Optional[str] = Field(None, description="Detailed physical address")
    city: str = Field(..., description="City")
    capacity: int = Field(100, ge=1, description="Maximum guest capacity")
    pricePerHour: float = Field(0.0, ge=0, description="Hourly rental price")
    vibe: Optional[str] = Field("Modern Conference", description="Vibe / atmosphere")
    description: Optional[str] = Field(None, description="Detailed venue description")
    amenities: Optional[List[str]] = Field(default_factory=list, description="List of amenities")
    imageUrl: Optional[str] = Field(None, description="Primary photo URL")
    images: Optional[List[str]] = Field(default_factory=list, description="Gallery photo URLs")


class VenueBookingCreate(BaseModel):
    eventId: str = Field(..., description="UUID of the event being hosted")
    bookingDate: str = Field(..., description="Date of the booking (YYYY-MM-DD)")
    durationHours: int = Field(6, ge=1, le=72, description="Duration in hours")
    expectedAttendees: int = Field(100, ge=1, description="Expected attendee count")
    notes: Optional[str] = Field(None, description="Equipment, AV, or catering notes")


class VenueBookingStatusUpdate(BaseModel):
    status: str = Field(..., description="New booking status: confirmed, declined, pending, or cancelled")
    notes: Optional[str] = Field(None, description="Provider confirmation notes or decline reason")
