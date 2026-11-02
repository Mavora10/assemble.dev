from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class EventCreateRequest(BaseModel):
    title: str
    description: str
    category: str
    format: Optional[str] = "In-Person"
    startDate: str
    startTime: Optional[str] = "10:00 AM"
    location: str
    city: str
    price: Optional[float] = 0.00
    isFree: Optional[bool] = True
    expectedAttendees: Optional[int] = 100
    budget: Optional[float] = 0.00
    ticketTiers: Optional[List[Dict[str, Any]]] = []
    sponsorshipOpportunities: Optional[List[Dict[str, Any]]] = []

class ExpenseCreateRequest(BaseModel):
    title: str
    category: str
    allocated: Optional[float] = 0.00
    spent: float
    status: Optional[str] = "Paid"

