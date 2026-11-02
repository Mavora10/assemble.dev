from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class NotificationResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: str
    event_id: Optional[str] = None
    event_title: Optional[str] = None
    type: Optional[str] = "event_update"
    title: str
    message: str
    changes: Optional[Dict[str, Any]] = {}
    read: bool = False
    created_at: str

class MarkReadRequest(BaseModel):
    read: Optional[bool] = True

