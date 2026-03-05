from fastapi import APIRouter

# Stub routers so imports in main.py succeed.
# These can be extended later if workout & preference features are needed.

workout_tabs_router = APIRouter(
    prefix="/api/v1/workout-tabs", tags=["Workout Tabs"]
)
workout_videos_router = APIRouter(
    prefix="/api/v1/workout-videos", tags=["Workout Videos"]
)
pref_questions_router = APIRouter(
    prefix="/api/v1/user-pref-questions", tags=["User Preference Questions"]
)
pref_answers_router = APIRouter(
    prefix="/api/v1/user-pref-answers", tags=["User Preference Answers"]
)
pref_router = APIRouter(
    prefix="/api/v1/user-preferences", tags=["User Preferences"]
)

