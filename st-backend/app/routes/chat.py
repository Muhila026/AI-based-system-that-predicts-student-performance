from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Dict
from datetime import datetime
import re
import uuid
import json

from app.database import get_database
from app.models import (
    ChatsRequest,
    ChatsResponse,
    ChatMemberRequest,
    ChatMemberResponse,
    MessagesRequest,
    MessagesResponse,
    NotificationResponse,
)
from app.auth import get_current_user
from app.jwt_util import validate_token, extract_email, extract_role


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _participant_key(email1: str, email2: str) -> str:
    """Deterministic key for a direct chat pair (sorted emails)."""
    e1, e2 = (email1 or "").strip().lower(), (email2 or "").strip().lower()
    if not e1 or not e2:
        return ""
    return "|".join(sorted([e1, e2]))


chats_router = APIRouter(prefix="/api/v1/chats", tags=["Chats"])
chat_members_router = APIRouter(prefix="/api/v1/chat-members", tags=["Chat Members"])
messages_router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])
message_reactions_router = APIRouter(prefix="/api/v1/message-reactions", tags=["Message Reactions"])
message_reads_router = APIRouter(prefix="/api/v1/message-reads", tags=["Message Reads"])
notifications_router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class ChatConnectionManager:
    """In-memory map: user email -> list of WebSockets; role per email for broadcast_to_role."""

    def __init__(self) -> None:
        self._connections: Dict[str, List[WebSocket]] = {}
        self._role_by_email: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, email: str, role: str = "") -> None:
        await websocket.accept()
        email_lower = (email or "").strip().lower()
        role_lower = (role or "user").strip().lower()
        if email_lower not in self._connections:
            self._connections[email_lower] = []
        self._connections[email_lower].append(websocket)
        self._role_by_email[email_lower] = role_lower

    def disconnect(self, websocket: WebSocket, email: str) -> None:
        email_lower = (email or "").strip().lower()
        if email_lower in self._connections:
            self._connections[email_lower] = [
                ws for ws in self._connections[email_lower] if ws != websocket
            ]
            if not self._connections[email_lower]:
                del self._connections[email_lower]
                self._role_by_email.pop(email_lower, None)

    async def send_to_user(self, email: str, data: dict) -> None:
        email_lower = (email or "").strip().lower()
        for ws in self._connections.get(email_lower, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass

    async def broadcast_to_role(self, role: str, data: dict) -> None:
        """Send data to all connected users with the given role (e.g. admin)."""
        role_lower = (role or "").strip().lower()
        for email, r in list(self._role_by_email.items()):
            if r == role_lower:
                await self.send_to_user(email, data)


chat_ws_manager = ChatConnectionManager()


@chats_router.websocket("/ws")
async def chat_websocket(websocket: WebSocket):
    """
    Real-time chat: connect with ?token=JWT.
    Server pushes { "type": "new_message", "chatId": "...", "message": {...} } to recipient.
    """
    token = websocket.query_params.get("token") or ""
    if not token or not validate_token(token):
        await websocket.close(code=4001)
        return
    email = extract_email(token)
    if not email:
        await websocket.close(code=4001)
        return
    role = (extract_role(token) or "user").strip().lower()
    await chat_ws_manager.connect(websocket, email, role)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                if payload.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        chat_ws_manager.disconnect(websocket, email)


@chats_router.get("/", response_model=List[ChatsResponse])
async def list_chats(user=Depends(get_current_user)):
    """List only personal (direct) chats for the current user."""
    db = get_database()
    email = user["email"]
    member_chat_ids = await db.chat_members.find(
        {"userEmail": email, "isActive": True}, {"chatId": 1, "_id": 0}
    ).to_list(1000)
    chat_ids = [m["chatId"] for m in member_chat_ids]
    docs = await db.chats.find(
        {"id": {"$in": chat_ids}, "type": "direct", "isActive": True},
        {"_id": 0},
    ).to_list(1000)
    return docs


@chats_router.get("/conversations")
async def list_conversations_for_ui(user=Depends(get_current_user)):
    """
    List chats as conversation items for the Chat UI: id, other participant, last message, unread.
    Used by all roles (student, teacher, admin).
    """
    db = get_database()
    email = user["email"]
    member_docs = await db.chat_members.find(
        {"userEmail": email, "isActive": True}, {"chatId": 1, "unreadCount": 1}
    ).to_list(1000)
    chat_ids = [m["chatId"] for m in member_docs]
    unread_by_chat = {m["chatId"]: int(m.get("unreadCount") or 0) for m in member_docs}
    chats = await db.chats.find(
        {"id": {"$in": chat_ids}, "type": "direct"}, {"_id": 0}
    ).to_list(1000)
    result = []
    for chat in chats:
        cid = chat["id"]
        # get other member(s) - for direct, the other user
        members = await db.chat_members.find(
            {"chatId": cid, "isActive": True, "userEmail": {"$ne": email}},
            {"userEmail": 1}
        ).to_list(10)
        participant_id = ""
        participant_name = "Chat"
        participant_role = "student"
        if members:
            other_email = members[0].get("userEmail", "")
            participant_id = other_email
            u = await db.users.find_one({"email": other_email}, {"_id": 0, "firstName": 1, "lastName": 1, "user_role": 1})
            if u:
                participant_name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or other_email
                r = (u.get("user_role") or "user").strip().lower()
                participant_role = "teacher" if r == "teacher" else "admin" if r == "admin" else "student"
        last_msg = await db.messages.find_one(
            {"chatId": cid}, {"_id": 0, "content": 1, "createdAt": 1}, sort=[("createdAt", -1)]
        )
        last_message = (last_msg.get("content") or "")[:80] if last_msg else ""
        last_message_time = (
            (last_msg.get("createdAt") or chat.get("lastMessageAt") or chat.get("createdAt") or "")
            if last_msg
            else (chat.get("lastMessageAt") or chat.get("createdAt") or "")
        )
        result.append({
            "id": cid,
            "participantId": participant_id,
            "participantName": participant_name,
            "participantRole": participant_role,
            "lastMessage": last_message,
            "lastMessageTime": last_message_time,
            "unreadCount": unread_by_chat.get(cid, 0),
        })
    result.sort(key=lambda x: (x["lastMessageTime"] or ""), reverse=True)
    return result


@chats_router.post("/direct")
async def create_or_get_direct_chat(body: dict, user=Depends(get_current_user)):
    """
    Create or get existing personal (direct) chat — exactly two participants per chat.
    Body: { "otherUserEmail": "user@example.com" }
    participantKey (sorted emails) ensures one chat per account pair.
    """
    db = get_database()
    email = user["email"]
    other = (body.get("otherUserEmail") or "").strip()
    if not other or other.lower() == (email or "").lower():
        raise HTTPException(status_code=400, detail="otherUserEmail required and must differ from current user")
    other_user = await db.users.find_one({"email": other, "isActive": True}, {"_id": 0, "email": 1})
    if not other_user:
        other_user = await db.users.find_one(
            {"email": {"$regex": f"^{re.escape(other)}$", "$options": "i"}, "isActive": True},
            {"_id": 0, "email": 1},
        )
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found or inactive")
    other_canonical = other_user["email"]
    pkey = _participant_key(email, other_canonical)
    existing = await db.chats.find_one(
        {"type": "direct", "participantKey": pkey, "isActive": True}, {"_id": 0, "id": 1}
    )
    if not existing:
        # Legacy chats without participantKey: scan memberships then backfill
        my_members = await db.chat_members.find(
            {"userEmail": email, "isActive": True}, {"chatId": 1}
        ).to_list(1000)
        for m in my_members:
            cid = m["chatId"]
            chat_doc = await db.chats.find_one({"id": cid, "type": "direct"}, {"_id": 0})
            if not chat_doc:
                continue
            other_member = await db.chat_members.find_one(
                {"chatId": cid, "userEmail": other_canonical, "isActive": True}
            )
            if not other_member:
                other_member = await db.chat_members.find_one(
                    {"chatId": cid, "userEmail": other, "isActive": True}
                )
            if other_member:
                await db.chats.update_one(
                    {"id": cid}, {"$set": {"participantKey": pkey, "updatedAt": _now_iso()}}
                )
                existing = {"id": cid}
                break
    if existing:
        cid = existing["id"]
        for u in (email, other_canonical):
            await db.chat_members.update_many(
                {"chatId": cid, "userEmail": u},
                {"$set": {"isActive": True, "updatedAt": _now_iso()}},
            )
        return {"chatId": cid, "conversationId": cid}
    chat_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": chat_id,
        "type": "direct",
        "participantKey": pkey,
        "name": None,
        "description": None,
        "avatarUrl": None,
        "createdBy": email,
        "lastMessageAt": None,
        "isArcheived": False,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.chats.insert_one(doc)
    for u_email in (email, other_canonical):
        member = {
            "id": str(uuid.uuid4()),
            "chatId": chat_id,
            "userEmail": u_email,
            "role": "owner" if u_email == email else "member",
            "joinedAt": now,
            "leftAt": None,
            "unreadCount": 0,
            "lastReadMessageId": None,
            "lastReadAt": now,
            "isActive": True,
            "createdAt": now,
            "updatedAt": now,
        }
        await db.chat_members.insert_one(member)
    return {"chatId": chat_id, "conversationId": chat_id}


@chats_router.get("/available-users")
async def list_available_users_to_chat(user=Depends(get_current_user)):
    """
    List users the current user can start a direct chat with.
    Student -> teachers; Teacher -> students; Admin -> students + teachers.
    """
    db = get_database()
    role = (user.get("role") or user.get("user_role") or "student").strip().lower()
    email = user.get("email") or ""
    result = []
    if role in ("student", "user"):
        cursor = db.users.find(
            {"user_role": {"$in": ["teacher", "Teacher", "TEACHER"]}},
            {"_id": 0, "email": 1, "firstName": 1, "lastName": 1},
        ).limit(500)
        async for u in cursor:
            em = u.get("email", "")
            if em == email:
                continue
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or em
            result.append({"id": em, "name": name, "email": em, "role": "Teacher"})
    elif role == "teacher":
        cursor = db.users.find(
            {"user_role": {"$in": ["student", "Student", "STUDENT", "user"]}},
            {"_id": 0, "email": 1, "firstName": 1, "lastName": 1},
        ).limit(500)
        async for u in cursor:
            em = u.get("email", "")
            if em == email:
                continue
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or em
            result.append({"id": em, "name": name, "email": em, "role": "Student"})
    else:
        # admin: students + teachers
        seen = set()
        for r in ("student", "Student", "STUDENT", "user", "teacher", "Teacher", "TEACHER"):
            cursor = db.users.find(
                {"user_role": r},
                {"_id": 0, "email": 1, "firstName": 1, "lastName": 1, "user_role": 1},
            ).limit(500)
            async for u in cursor:
                em = u.get("email", "")
                if em == email or em in seen:
                    continue
                seen.add(em)
                name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or em
                rr = (u.get("user_role") or "user").strip().lower()
                role_label = "Teacher" if rr == "teacher" else "Admin" if rr == "admin" else "Student"
                result.append({"id": em, "name": name, "email": em, "role": role_label})
    return result


@chats_router.post("/", response_model=ChatsResponse)
async def create_chat(request: ChatsRequest, user=Depends(get_current_user)):
    """
    Personal-chat-only backend: group chats are not allowed.
    Use POST /chats/direct with otherUserEmail instead; generic POST here returns 400.
    """
    raise HTTPException(
        status_code=400,
        detail="Only direct (1:1) chats are supported. Use POST /api/v1/chats/direct with otherUserEmail.",
    )


@messages_router.get("/")
async def list_messages(chatId: str, user=Depends(get_current_user)):
    db = get_database()
    chat_doc = await db.chats.find_one(
        {"id": chatId, "type": "direct", "isActive": True}, {"_id": 0, "id": 1}
    )
    if not chat_doc:
        raise HTTPException(status_code=404, detail="Chat not found (personal chats only)")
    member = await db.chat_members.find_one(
        {"chatId": chatId, "userEmail": user["email"], "isActive": True}
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat")
    # Personal chat: opening thread clears unread for current user
    now = _now_iso()
    await db.chat_members.update_one(
        {"chatId": chatId, "userEmail": user["email"], "isActive": True},
        {"$set": {"unreadCount": 0, "lastReadAt": now, "updatedAt": now}},
    )

    docs = await db.messages.find({"chatId": chatId}, {"_id": 0}).sort("createdAt", 1).to_list(1000)
    if not docs:
        return []
    sender_emails = list({d.get("senderEmail") for d in docs if d.get("senderEmail")})
    users_map = {}
    if sender_emails:
        async for u in db.users.find({"email": {"$in": sender_emails}}, {"_id": 0, "email": 1, "firstName": 1, "lastName": 1, "user_role": 1}):
            em = u.get("email", "")
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or em
            r = (u.get("user_role") or "user").strip().lower()
            role = "teacher" if r == "teacher" else "admin" if r == "admin" else "student"
            users_map[em] = {"senderName": name, "senderRole": role}
    out = []
    for d in docs:
        em = d.get("senderEmail") or ""
        info = users_map.get(em, {"senderName": em or "Unknown", "senderRole": "student"})
        out.append({
            "id": d.get("id"),
            "chatId": d.get("chatId"),
            "senderId": em,
            "senderName": info["senderName"],
            "senderRole": info["senderRole"],
            "message": d.get("content") or "",
            "messageType": d.get("messageType"),
            "timestamp": d.get("createdAt"),
            "read": True,
            "createdAt": d.get("createdAt"),
        })
    return out


@messages_router.post("/", response_model=MessagesResponse)
async def send_message(request: MessagesRequest, user=Depends(get_current_user)):
    db = get_database()
    chat_doc = await db.chats.find_one(
        {"id": request.chatId, "type": "direct", "isActive": True}, {"_id": 0, "id": 1}
    )
    if not chat_doc:
        raise HTTPException(status_code=404, detail="Chat not found (personal chats only)")
    member = await db.chat_members.find_one(
        {"chatId": request.chatId, "userEmail": user["email"], "isActive": True}
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

    msg_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": msg_id,
        "chatId": request.chatId,
        "senderEmail": user["email"],
        "messageType": request.messageType,
        "content": request.content,
        "mediaUrl": request.mediaUrl,
        "mediaThumbnailUrl": request.mediaThumbnailUrl,
        "mediaSize": request.mediaSize,
        "mediaDuration": request.mediaDuration,
        "replyToMessageId": request.replyToMessageId,
        "isEdited": False,
        "editedAt": None,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.messages.insert_one(doc)
    await db.chats.update_one({"id": request.chatId}, {"$set": {"lastMessageAt": now}})
    # Direct chat: increment unread only for the other participant(s)
    sender = user["email"]
    await db.chat_members.update_many(
        {"chatId": request.chatId, "userEmail": {"$ne": sender}, "isActive": True},
        {"$inc": {"unreadCount": 1}, "$set": {"updatedAt": now}},
    )
    # Real-time: push new message to the other participant's WebSocket(s)
    other_member = await db.chat_members.find_one(
        {"chatId": request.chatId, "userEmail": {"$ne": sender}, "isActive": True},
        {"userEmail": 1},
    )
    if other_member:
        other_email = other_member.get("userEmail")
        if other_email:
            u = await db.users.find_one(
                {"email": sender},
                {"_id": 0, "firstName": 1, "lastName": 1, "user_role": 1},
            )
            sender_name = (
                f"{u.get('firstName', '')} {u.get('lastName', '')}".strip()
                if u
                else sender
            )
            r = (u.get("user_role") or "user").strip().lower() if u else "student"
            sender_role = "teacher" if r == "teacher" else "admin" if r == "admin" else "student"
            await chat_ws_manager.send_to_user(
                other_email,
                {
                    "type": "new_message",
                    "chatId": request.chatId,
                    "message": {
                        "id": doc["id"],
                        "chatId": request.chatId,
                        "senderId": sender,
                        "senderName": sender_name,
                        "senderRole": sender_role,
                        "message": doc.get("content") or "",
                        "messageType": doc.get("messageType"),
                        "timestamp": now,
                        "read": False,
                        "createdAt": now,
                    },
                },
            )
    return MessagesResponse(**doc)


@notifications_router.get("/", response_model=List[NotificationResponse])
async def list_notifications(user=Depends(get_current_user)):
    db = get_database()
    docs = await db.notifications.find(
        {"userEmail": user["email"]}, {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    return docs




