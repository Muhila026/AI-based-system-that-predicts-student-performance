# Personal chat backend (MongoDB collections)

Only **1:1 (direct) chats** are supported between accounts (teacher, student, admin). Group chats are rejected.

## Collections

### 1. `chats`
One document per conversation (always a pair).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Chat id (used as `chatId` in API) |
| `type` | string | Always `"direct"` |
| `participantKey` | string | Sorted pair: `email1|email2` (lowercase) — one chat per pair |
| `createdBy` | string | Email who opened the chat first |
| `lastMessageAt` | ISO string | Updated on each message |
| `isActive` | bool | Soft hide |
| `createdAt` / `updatedAt` | ISO string | |

Optional: `name`, `description`, `avatarUrl`, `isArcheived` (legacy typo kept for compatibility).

### 2. `chat_members`
Exactly **two** documents per direct chat (one per account).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Member row id |
| `chatId` | string | References `chats.id` |
| `userEmail` | string | Participant email (same as `users.email`) |
| `role` | string | `owner` (creator) or `member` |
| `unreadCount` | int | Incremented when the *other* user sends a message; cleared when they open the thread |
| `lastReadAt` | ISO string | |
| `isActive` | bool | |
| `joinedAt` / `createdAt` / `updatedAt` | ISO string | |

### 3. `messages`
| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Message id |
| `chatId` | string | |
| `senderEmail` | string | |
| `content` | string | Text body |
| `messageType` | string | e.g. `text` |
| `createdAt` / `updatedAt` | ISO string | |

## API behaviour

- **Create/open chat:** `POST /api/v1/chats/direct` with `{ "otherUserEmail": "..." }` — returns existing `chatId` if pair already has a chat.
- **List conversations:** `GET /api/v1/chats/conversations` — only `type: direct` chats.
- **Messages:** `GET/POST /api/v1/messages?chatId=...` — only for direct chats the user is a member of.
- **Generic create:** `POST /api/v1/chats/` returns 400 (no group creation).

## Indexes (see `app/database.py`)

- `chats`: `(type, participantKey)` for fast find-by-pair
- `chat_members`: `(userEmail, chatId)`, `(chatId, userEmail)`
- `messages`: `chatId`, `(chatId, createdAt)`
