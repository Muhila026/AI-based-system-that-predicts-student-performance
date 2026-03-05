from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_database
from app.models import (
    CourseRequest,
    CourseResponse,
    ApiResponse,
)
from app.auth import require_role


router = APIRouter(prefix="/api/v1/courses", tags=["Courses"])


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


@router.get("/", response_model=List[CourseResponse])
async def list_courses(teacherId: Optional[str] = None):
    """List all courses, optionally filtered by teacherId."""
    db = get_database()
    query = {}
    if teacherId:
        query["teacherId"] = teacherId
    docs = await db.courses.find(query, {"_id": 0}).to_list(1000)
    return docs


@router.post("/", response_model=CourseResponse)
async def create_course(
    request: CourseRequest,
    user=Depends(require_role(["admin"])),
):
    """Create a new course."""
    db = get_database()
    course_id = str(uuid.uuid4())
    now = _now_iso()

    doc = {
        "id": course_id,
        "courseTitle": request.courseTitle,
        "teacherId": request.teacherId,
        "courseDuration": request.courseDuration,
        "startDate": request.startDate,
        "endDate": request.endDate,
        "totalLessons": request.totalLessons,
        "totalEnrolledStudents": request.totalEnrolledStudents,
        "price": request.price,
        "level": request.level,
        "aboutCourse": request.aboutCourse,
        "status": request.status,
        "isActive": request.isActive,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.courses.insert_one(doc)
    return CourseResponse(**doc)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str):
    db = get_database()
    doc = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(**doc)

