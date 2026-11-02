from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class EventCreateRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "Tech"
    format: Optional[str] = "In-Person"
    startDate: str
    startTime: Optional[str] = "10:00 AM"
    endDate: Optional[str] = None
    location: Optional[str] = "Venue to be announced"
    city: Optional[str] = "TBD"
    price: Optional[float] = 0.00
    isFree: Optional[bool] = True
    expectedAttendees: Optional[int] = 100
    budget: Optional[float] = 0.00
    ticketTiers: Optional[List[Dict[str, Any]]] = []
    sponsorshipOpportunities: Optional[List[Dict[str, Any]]] = []
    speakers: Optional[List[Dict[str, Any]]] = []
    schedule: Optional[List[Dict[str, Any]]] = []
    venueDetails: Optional[Dict[str, Any]] = None
    status: Optional[str] = "published"
    imageUrl: Optional[str] = None
    volunteersNeeded: Optional[int] = 0
    associatedCommunities: Optional[List[str]] = []
    budgetType: Optional[str] = "no-budget"
    seekingSponsors: Optional[bool] = False
    swagOrder: Optional[Dict[str, Any]] = None
    organizerName: Optional[str] = None
    organizerEmail: Optional[str] = None

class EventUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    format: Optional[str] = None
    startDate: Optional[str] = None
    startTime: Optional[str] = None
    endDate: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    price: Optional[float] = None
    isFree: Optional[bool] = None
    expectedAttendees: Optional[int] = None
    budget: Optional[float] = None
    ticketTiers: Optional[List[Dict[str, Any]]] = None
    sponsorshipOpportunities: Optional[List[Dict[str, Any]]] = None
    speakers: Optional[List[Dict[str, Any]]] = None
    schedule: Optional[List[Dict[str, Any]]] = None
    venueDetails: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    imageUrl: Optional[str] = None
    volunteersNeeded: Optional[int] = None
    associatedCommunities: Optional[List[str]] = None
    budgetType: Optional[str] = None
    seekingSponsors: Optional[bool] = None
    swagOrder: Optional[Dict[str, Any]] = None
    organizerName: Optional[str] = None
    organizerEmail: Optional[str] = None

class ScheduleUpdateRequest(BaseModel):
    schedule: List[Dict[str, Any]]

class ExpenseCreateRequest(BaseModel):
    title: str
    category: str
    allocated: Optional[float] = 0.00
    spent: float
    status: Optional[str] = "Paid"
