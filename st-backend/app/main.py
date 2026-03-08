from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_to_mongo, close_mongo_connection
from app.config import get_settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Cloud Campus Backend...")
    await connect_to_mongo()
    logger.info("Application started successfully!")
    yield
    # Shutdown
    await close_mongo_connection()
    logger.info("Application shut down.")


app = FastAPI(
    title="Cloud Campus API",
    description="FastAPI backend for the Cloud Campus student performance platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration (matches the original CorsConfig.java)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

# ==================== IMPORT & REGISTER ROUTES ====================

# Auth
from app.routes.auth import router as auth_router
app.include_router(auth_router)

# Study Resources under /students and /api/v1 (files). Teacher routes are mounted inside teachers router.
from app.routes.study_resources import router as study_resources_router
app.include_router(study_resources_router, prefix="/api/v1/students")
app.include_router(study_resources_router, prefix="/api/v1")

# Teachers
from app.routes.teachers import router as teachers_router
app.include_router(teachers_router)

# Courses
from app.routes.courses import router as courses_router
app.include_router(courses_router)

# Course Sub-Resources
from app.routes.course_sub import (
    lessons_router, schedule_router, attendance_router,
    enquire_router, enroll_router, payments_router,
)
app.include_router(lessons_router)
app.include_router(schedule_router)
app.include_router(attendance_router)
app.include_router(enquire_router)
app.include_router(enroll_router)
app.include_router(payments_router)

# Chat & Messaging
from app.routes.chat import (
    chats_router, chat_members_router,
    messages_router, message_reactions_router, message_reads_router,
    notifications_router,
)
app.include_router(chats_router)
app.include_router(chat_members_router)
app.include_router(messages_router)
app.include_router(message_reactions_router)
app.include_router(message_reads_router)
app.include_router(notifications_router)

# Users (roles for admin UI)
from app.routes.users_roles import router as users_roles_router
app.include_router(users_roles_router)

# Admin Dashboard & user management
from app.routes.admin import router as admin_router
app.include_router(admin_router)

# Schema collections: subjects, student_subjects, teacher_subjects, student_subject_marks, predictions
from app.routes.schema_collections import router as schema_router
app.include_router(schema_router)

# Student Performance & ML Prediction
from app.routes.prediction import (
    study_logs_router, participation_router, prediction_router,
)
app.include_router(study_logs_router)
app.include_router(participation_router)
app.include_router(prediction_router)

# Student Dashboard (predicted score & metrics)
from app.routes.students_dashboard import router as students_dashboard_router
app.include_router(students_dashboard_router)

# Assignment submissions (total_score for ML)
from app.routes.assignment_submissions import router as assignment_submissions_router
app.include_router(assignment_submissions_router)

# Attendance (attendance_percentage for ML)
from app.routes.attendance_ml import router as attendance_ml_router
app.include_router(attendance_ml_router)

# Assessments (course-linked exams/quizzes/assignments)
from app.routes.assessments import router as assessments_router
app.include_router(assessments_router)

# Results (teacher Student Results page – assignment_submissions CRUD)
from app.routes.results import router as results_router
app.include_router(results_router)

# ML Pipeline (aggregate features → predicted grade, no manual form)
from app.routes.pipeline import router as pipeline_router
app.include_router(pipeline_router)

# AI Chat (Gemini study assistant)
from app.routes.ai import router as ai_router
app.include_router(ai_router)


# ==================== ROOT & HEALTH ====================
@app.get("/")
async def root():
    return {"message": "Cloud Campus API is running!", "docs": "/docs"}


@app.get("/api/v1/health")
async def health():
    """Frontend uses this for checkBackendConnection when API_BASE_URL is /api/v1."""
    return {"status": "ok", "message": "Backend is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
