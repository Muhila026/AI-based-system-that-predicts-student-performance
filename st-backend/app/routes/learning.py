from fastapi import APIRouter

theory_router = APIRouter(prefix="/api/v1/theory", tags=["Theory"])
techniques_router = APIRouter(prefix="/api/v1/techniques", tags=["Techniques"])


@theory_router.get("/")
async def list_theory_topics():
    """
    Placeholder endpoint for theory topics.
    The main goal is to satisfy imports and allow the backend to run.
    """
    return []


@techniques_router.get("/")
async def list_techniques():
    """
    Placeholder endpoint for techniques.
    The main goal is to satisfy imports and allow the backend to run.
    """
    return []

