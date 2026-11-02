from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from app.services.supabase_client import supabase
from app.models.community import CommunityCreateRequest, PostMessageRequest
from app.routers.auth import decode_token

router = APIRouter()

@router.get("")
def list_communities():
    result = supabase.table("communities").select("*").execute()
    return result.data or []

@router.get("/{community_id}")
def get_community(community_id: str):
    res = supabase.table("communities").select("*").eq("id", community_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Community not found")
    return res.data[0]

@router.post("", status_code=201)
def create_community(payload: CommunityCreateRequest, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    comm_data = {
        "name": payload.name,
        "slug": payload.slug,
        "code": payload.code,
        "description": payload.description,
        "category": payload.category,
        "location": payload.location,
        "created_by": user["sub"]
    }
    result = supabase.table("communities").insert(comm_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create community")
    return result.data[0]

@router.post("/{community_id}/join")
def join_community(community_id: str, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    # Check if already a member
    existing = supabase.table("community_members").select("id").eq("community_id", community_id).eq("user_id", user["sub"]).execute()
    if existing.data and len(existing.data) > 0:
        return {"success": True, "message": "Already a member"}

    supabase.table("community_members").insert({
        "community_id": community_id,
        "user_id": user["sub"],
        "role": "member"
    }).execute()

    return {"success": True, "message": "Successfully joined community"}

@router.get("/{community_id}/messages")
def get_messages(community_id: str, limit: int = 50):
    result = supabase.table("community_messages").select("*").eq("community_id", community_id).order("created_at", desc=False).limit(limit).execute()
    return result.data or []

@router.post("/{community_id}/messages", status_code=201)
def post_message(community_id: str, payload: PostMessageRequest, authorization: Optional[str] = Header(None)):
    user = decode_token(authorization)
    
    # Fetch user name for display
    user_res = supabase.table("users").select("name").eq("id", user["sub"]).execute()
    user_name = user_res.data[0]["name"] if user_res.data else "Anonymous"

    msg_record = {
        "community_id": community_id,
        "user_id": user["sub"],
        "user_name": user_name,
        "text": payload.text
    }
    result = supabase.table("community_messages").insert(msg_record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to post message")
    return result.data[0]

