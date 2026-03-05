from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

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


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


chats_router = APIRouter(prefix="/api/v1/chats", tags=["Chats"])
chat_members_router = APIRouter(prefix="/api/v1/chat-members", tags=["Chat Members"])
messages_router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])
message_reactions_router = APIRouter(prefix="/api/v1/message-reactions", tags=["Message Reactions"])
message_reads_router = APIRouter(prefix="/api/v1/message-reads", tags=["Message Reads"])
notifications_router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@chats_router.get("/", response_model=List[ChatsResponse])
async def list_chats(user=Depends(get_current_user)):
    db = get_database()
    email = user["email"]
    member_chat_ids = await db.chat_members.find(
        {"userEmail": email, "isActive": True}, {"chatId": 1, "_id": 0}
    ).to_list(1000)
    chat_ids = [m["chatId"] for m in member_chat_ids]
    docs = await db.chats.find({"id": {"$in": chat_ids}}, {"_id": 0}).to_list(1000)
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
    chats = await db.chats.find({"id": {"$in": chat_ids}}, {"_id": 0}).to_list(1000)
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
        last_message_time = last_msg.get("createdAt") or chat.get("lastMessageAt") or chat.get("createdAt") or ""
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
    Create a direct chat with another user, or return existing one.
    Body: { "otherUserEmail": "user@example.com" }
    """
    db = get_database()
    email = user["email"]
    other = (body.get("otherUserEmail") or "").strip()
    if not other or other == email:
        raise HTTPException(status_code=400, detail="otherUserEmail required and must differ from current user")
    # find existing direct chat between these two
    my_members = await db.chat_members.find(
        {"userEmail": email, "isActive": True}, {"chatId": 1}
    ).to_list(1000)
    my_chat_ids = [m["chatId"] for m in my_members]
    for cid in my_chat_ids:
        chat_doc = await db.chats.find_one({"id": cid}, {"_id": 0, "type": 1})
        if (chat_doc or {}).get("type") != "direct":
            continue
        other_member = await db.chat_members.find_one(
            {"chatId": cid, "userEmail": other, "isActive": True}
        )
        if other_member:
            return {"chatId": cid, "conversationId": cid}
    # create new direct chat
    chat_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": chat_id,
        "type": "direct",
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
    for u_email in (email, other):
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
    db = get_database()
    chat_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": chat_id,
        "type": request.type or "direct",
        "name": request.name,
        "description": request.description,
        "avatarUrl": request.avatarUrl,
        "createdBy": user["email"],
        "lastMessageAt": None,
        "isArcheived": False,
        "isActive": request.isActive,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.chats.insert_one(doc)
    # auto-add creator as member
    member = {
        "id": str(uuid.uuid4()),
        "chatId": chat_id,
        "userEmail": user["email"],
        "role": "owner",
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
    return ChatsResponse(**doc)


@messages_router.get("/")
async def list_messages(chatId: str, user=Depends(get_current_user)):
    db = get_database()
    member = await db.chat_members.find_one(
        {"chatId": chatId, "userEmail": user["email"], "isActive": True}
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat")

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
    # Ensure user is a member of the chat
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
    return MessagesResponse(**doc)


@notifications_router.get("/", response_model=List[NotificationResponse])
async def list_notifications(user=Depends(get_current_user)):
    db = get_database()
    docs = await db.notifications.find(
        {"userEmail": user["email"]}, {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    return docs




