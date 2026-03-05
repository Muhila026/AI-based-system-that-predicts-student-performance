from fastapi import APIRouter
from datetime import datetime
import uuid

from app.database import get_database
from app.models import (
    ChallengeDetailsRequest,
    ChallengeDetailsResponse,
    ChallengesUserCompletionRequest,
    ChallengesUserCompletionResponse,
)

# Stub routers for content-related features which are not currently in scope.
# They are defined so that imports in main.py succeed.

choreography_router = APIRouter(
    prefix="/api/v1/choreography", tags=["Choreography"]
)
choreography_teachers_router = APIRouter(
    prefix="/api/v1/choreography-teachers", tags=["Choreography Teachers"]
)
choreography_search_router = APIRouter(
    prefix="/api/v1/choreography-search", tags=["Choreography Search"]
)
games_router = APIRouter(prefix="/api/v1/games", tags=["Games"])
game_details_router = APIRouter(
    prefix="/api/v1/game-details", tags=["Game Details"]
)
game_user_router = APIRouter(
    prefix="/api/v1/game-user", tags=["Game User"]
)
challenges_router = APIRouter(
    prefix="/api/v1/challenges", tags=["Challenges"]
)
challenge_completions_router = APIRouter(
    prefix="/api/v1/challenge-completions", tags=["Challenge Completions"]
)
events_router = APIRouter(
    prefix="/api/v1/events", tags=["Online Events"]
)
event_bookings_router = APIRouter(
    prefix="/api/v1/event-bookings", tags=["Event Bookings"]
)
reels_router = APIRouter(prefix="/api/v1/reels", tags=["Reels"])
reel_comments_router = APIRouter(
    prefix="/api/v1/reel-comments", tags=["Reel Comments"]
)
user_likes_router = APIRouter(
    prefix="/api/v1/user-likes", tags=["User Likes"]
)


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


@challenges_router.get("/", response_model=list[ChallengeDetailsResponse])
async def list_challenges():
    db = get_database()
    docs = await db.challenges.find({}, {"_id": 0}).to_list(1000)
    return docs


@challenges_router.post("/", response_model=ChallengeDetailsResponse)
async def create_challenge(request: ChallengeDetailsRequest):
    db = get_database()
    challenge_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": challenge_id,
        "challengeName": request.challengeName,
        "description": request.description,
        "level": request.level,
        "points": request.points,
        "isActive": request.isActive,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.challenges.insert_one(doc)
    return ChallengeDetailsResponse(**doc)


