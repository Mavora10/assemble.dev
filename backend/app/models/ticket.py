from pydantic import BaseModel, EmailStr
from typing import Optional

class TicketBookRequest(BaseModel):
    eventId: str
    ticketTierName: Optional[str] = "General Admission"
    price: Optional[float] = 0.00
    userName: str
    userEmail: EmailStr
    phone: Optional[str] = None

class TicketCheckInRequest(BaseModel):
    ticketId: Optional[str] = None
    ticketCode: Optional[str] = None
    eventId: Optional[str] = None
