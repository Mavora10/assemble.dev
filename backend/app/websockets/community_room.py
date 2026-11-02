from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Maps community_id -> list of active WebSocket connections
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, community_id: str, websocket: WebSocket):
        await websocket.accept()
        if community_id not in self.active_rooms:
            self.active_rooms[community_id] = []
        self.active_rooms[community_id].append(websocket)
        # Broadcast attendee presence update
        await self.broadcast(community_id, {
            "type": "PRESENCE_UPDATE",
            "onlineCount": len(self.active_rooms[community_id])
        })

    def disconnect(self, community_id: str, websocket: WebSocket):
        if community_id in self.active_rooms:
            if websocket in self.active_rooms[community_id]:
                self.active_rooms[community_id].remove(websocket)

    async def broadcast(self, community_id: str, message: dict):
        if community_id in self.active_rooms:
            dead_connections = []
            for connection in self.active_rooms[community_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(community_id, dead)

manager = ConnectionManager()

@router.websocket("/ws/community/{community_id}")
async def websocket_community_room(websocket: WebSocket, community_id: str):
    await manager.connect(community_id, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            msg_type = data.get("type")

            if msg_type == "CHAT_MESSAGE":
                # Broadcast live chat message
                await manager.broadcast(community_id, {
                    "type": "NEW_CHAT_MESSAGE",
                    "userName": data.get("userName", "Anonymous"),
                    "text": data.get("text"),
                    "timestamp": data.get("timestamp")
                })

            elif msg_type == "QUIZ_ANSWER":
                # Handle trivia quiz answer & update leaderboard
                await manager.broadcast(community_id, {
                    "type": "LEADERBOARD_UPDATE",
                    "userName": data.get("userName"),
                    "score": data.get("score")
                })

            elif msg_type == "REACTION":
                # Floating emojis (🔥, 👏, ❤️)
                await manager.broadcast(community_id, {
                    "type": "ROOM_REACTION",
                    "emoji": data.get("emoji")
                })

    except WebSocketDisconnect:
        manager.disconnect(community_id, websocket)
        await manager.broadcast(community_id, {
            "type": "PRESENCE_UPDATE",
            "onlineCount": len(manager.active_rooms.get(community_id, []))
        })

