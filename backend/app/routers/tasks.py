from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_supabase_client
from app.models.task import (
    TaskCreate,
    TaskUpdate,
    TaskApplyTemplate,
)

router = APIRouter(prefix="/events/{event_id}/tasks", tags=["10. Organizer Task Management"])

TEMPLATES = {
    "Tech Conference": [
        {"title": "Book keynote venue and sign contract", "category": "Logistics", "relative_timeline": "T-30 Days", "priority": "urgent"},
        {"title": "Collect presentation slides and speaker AV requirements", "category": "Speakers", "relative_timeline": "T-7 Days", "priority": "high"},
        {"title": "Finalize sponsor booth specs and collateral approvals", "category": "Sponsors", "relative_timeline": "T-10 Days", "priority": "medium"},
        {"title": "Send reminder email with QR ticket access to attendees", "category": "Marketing", "relative_timeline": "T-2 Days", "priority": "high"},
        {"title": "Setup badge printing stations and door check-in scanner", "category": "Day-Of", "relative_timeline": "Day-Of", "priority": "urgent"},
    ],
    "Hackathon": [
        {"title": "Provision high-density Wi-Fi routers and power drop boxes", "category": "Logistics", "relative_timeline": "T-5 Days", "priority": "urgent"},
        {"title": "Collect sponsor API access keys and challenge bounty briefs", "category": "Sponsors", "relative_timeline": "T-3 Days", "priority": "high"},
        {"title": "Recruit and brief volunteer technical mentors", "category": "Speakers", "relative_timeline": "T-4 Days", "priority": "medium"},
        {"title": "Schedule opening ceremony kickoff live stream", "category": "Marketing", "relative_timeline": "T-1 Day", "priority": "medium"},
        {"title": "Setup judging booth and midnight food catering delivery", "category": "Day-Of", "relative_timeline": "Day-Of", "priority": "high"},
    ],
    "Community Meetup": [
        {"title": "Confirm meetup space booking and entry door code", "category": "Logistics", "relative_timeline": "T-7 Days", "priority": "high"},
        {"title": "Confirm 2 community lightning talk speakers", "category": "Speakers", "relative_timeline": "T-5 Days", "priority": "medium"},
        {"title": "Order pizza, snacks, and beverage refreshments", "category": "Logistics", "relative_timeline": "T-2 Days", "priority": "medium"},
        {"title": "Post reminder on live community chat room", "category": "Marketing", "relative_timeline": "T-1 Day", "priority": "low"},
        {"title": "Display Assemble QR check-in code at welcome table", "category": "Day-Of", "relative_timeline": "Day-Of", "priority": "high"},
    ],
}


@router.get("")
async def get_event_tasks(
    event_id: str,
    client=Depends(get_supabase_client),
):
    """
    10.1 GET /events/{event_id}/tasks
    Get all planning tasks grouped by category (Logistics, Marketing, Speakers, Sponsors, Day-Of).
    """
    try:
        res = client.from_("event_tasks").select("*").eq("event_id", event_id).order("created_at").execute()
        tasks = res.data or []

        # Group by category
        grouped = {
            "Logistics": [],
            "Marketing": [],
            "Speakers": [],
            "Sponsors": [],
            "Day-Of": [],
        }

        for task in tasks:
            cat = task.get("category") or "Logistics"
            if cat not in grouped:
                grouped[cat] = []
            grouped[cat].append(task)

        completed_count = sum(1 for t in tasks if t.get("status") == "completed")
        total_count = len(tasks)
        progress_percentage = round((completed_count / total_count * 100), 1) if total_count > 0 else 0.0

        return {
            "eventId": event_id,
            "totalTasks": total_count,
            "completedTasks": completed_count,
            "progressPercentage": progress_percentage,
            "categories": grouped,
            "allTasks": tasks,
        }
    except Exception as e:
        if "relation \"event_tasks\" does not exist" in str(e).lower():
            return {
                "eventId": event_id,
                "totalTasks": 0,
                "completedTasks": 0,
                "progressPercentage": 0.0,
                "categories": {"Logistics": [], "Marketing": [], "Speakers": [], "Sponsors": [], "Day-Of": []},
                "allTasks": [],
                "notice": "Table event_tasks is pending migration.",
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching event tasks: {str(e)}",
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event_task(
    event_id: str,
    payload: TaskCreate,
    client=Depends(get_supabase_client),
):
    """
    10.2 POST /events/{event_id}/tasks
    Create an event-aware task linked to an existing entity.
    """
    try:
        insert_data = {
            "event_id": event_id,
            "title": payload.title,
            "category": payload.category,
            "assigned_to_email": payload.assignedToEmail,
            "linked_entity_type": payload.linkedEntityType,
            "linked_entity_id": payload.linkedEntityId,
            "due_date": payload.dueDate,
            "relative_timeline": payload.relativeTimeline,
            "priority": payload.priority or "medium",
            "notes": payload.notes,
            "status": "todo",
        }

        res = client.from_("event_tasks").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create event task")

        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating task: {str(e)}",
        )


@router.patch("/{task_id}")
@router.put("/{task_id}")
async def update_event_task(
    event_id: str,
    task_id: str,
    payload: TaskUpdate,
    client=Depends(get_supabase_client),
):
    """
    10.3 PATCH/PUT /events/{event_id}/tasks/{task_id}
    Mark task status (todo, in_progress, completed), change priority or assignee.
    """
    try:
        update_data = {}
        for key, value in payload.model_dump(exclude_unset=True).items():
            db_key = {
                "assignedToEmail": "assigned_to_email",
                "linkedEntityType": "linked_entity_type",
                "linkedEntityId": "linked_entity_id",
                "dueDate": "due_date",
                "relativeTimeline": "relative_timeline",
            }.get(key, key)
            update_data[db_key] = value

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid update fields provided")

        res = client.from_("event_tasks").update(update_data).eq("id", task_id).eq("event_id", event_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Task not found for this event")

        return {
            "message": "Task updated successfully",
            "task": res.data[0],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating task: {str(e)}",
        )


@router.delete("/{task_id}")
async def delete_event_task(
    event_id: str,
    task_id: str,
    client=Depends(get_supabase_client),
):
    """
    Delete an event task.
    """
    try:
        res = client.from_("event_tasks").delete().eq("id", task_id).eq("event_id", event_id).execute()
        return {"success": True, "message": f"Task '{task_id}' deleted"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting task: {str(e)}",
        )


@router.post("/apply-template", status_code=status.HTTP_201_CREATED)
async def apply_task_template(
    event_id: str,
    payload: TaskApplyTemplate,
    client=Depends(get_supabase_client),
):
    """
    10.4 POST /events/{event_id}/tasks/apply-template
    1-click apply pre-built event templates (Hackathon, Tech Conference, Community Meetup).
    """
    chosen_template = payload.final_template
    template_items = TEMPLATES.get(chosen_template)
    if not template_items:
        # Fallback to Tech Conference if partial match
        template_items = TEMPLATES["Tech Conference"]

    try:
        tasks_to_insert = [
            {
                "event_id": event_id,
                "title": item["title"],
                "category": item["category"],
                "relative_timeline": item["relative_timeline"],
                "priority": item["priority"],
                "status": "todo",
            }
            for item in template_items
        ]

        res = client.from_("event_tasks").insert(tasks_to_insert).execute()
        return {
            "message": f"Successfully applied '{chosen_template}' template with {len(tasks_to_insert)} tasks",
            "createdTasks": res.data or [],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error applying template: {str(e)}",
        )
