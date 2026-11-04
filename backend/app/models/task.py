from typing import Optional
from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., description="Actionable task title")
    category: str = Field("Logistics", description="Category: Logistics, Marketing, Speakers, Sponsors, Day-Of")
    assignedToEmail: Optional[str] = Field(None, description="Assignee email address")
    linkedEntityType: Optional[str] = Field(None, description="Linked entity: speaker, venue, sponsor, merchandise")
    linkedEntityId: Optional[str] = Field(None, description="ID of the linked entity")
    dueDate: Optional[str] = Field(None, description="Target completion date (YYYY-MM-DD)")
    relativeTimeline: Optional[str] = Field(None, description="Relative milestone: T-30 Days, T-5 Days, Day-Of")
    priority: Optional[str] = Field("medium", description="Priority level: low, medium, high, urgent")
    notes: Optional[str] = Field(None, description="Detailed checklist description")


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    assignedToEmail: Optional[str] = None
    linkedEntityType: Optional[str] = None
    linkedEntityId: Optional[str] = None
    dueDate: Optional[str] = None
    relativeTimeline: Optional[str] = None
    status: Optional[str] = Field(None, description="Status: todo, in_progress, completed")
    priority: Optional[str] = None
    notes: Optional[str] = None


class TaskApplyTemplate(BaseModel):
    templateName: Optional[str] = Field(None, description="Pre-built template: 'Hackathon', 'Tech Conference', or 'Community Meetup'")
    template_name: Optional[str] = Field(None, description="Alternative field for template name")

    @property
    def final_template(self) -> str:
        return self.templateName or self.template_name or "Tech Conference"
