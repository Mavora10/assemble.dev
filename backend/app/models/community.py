from pydantic import BaseModel
from typing import Optional

class CommunityCreateRequest(BaseModel):
    name: str
    slug: str
    code: str
    description: Optional[str] = ""
    category: Optional[str] = "Tech"
    location: Optional[str] = "Global"

class PostMessageRequest(BaseModel):
    text: str

