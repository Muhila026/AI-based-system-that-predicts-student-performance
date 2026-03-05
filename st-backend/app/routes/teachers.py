from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
import uuid

from app.database import get_database
from app.models import (
    TeacherRequest,
    TeacherResponse,
    ApiResponse,
)
from app.auth import require_role

router = APIRouter(prefix="/api/v1/teachers", tags=["Teachers"])

# Study-resources at /teachers/study-resources (router already has prefix /study-resources; do not add again)
from app.routes.study_resources import router as study_resources_router
router.include_router(study_resources_router, tags=["Study Resources"])


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _student_id_from_email(email: str) -> int:
    return abs(hash(email)) % 1000000


@router.get("/dashboard")
async def get_teacher_dashboard(user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    Basic teacher dashboard stats for the Teacher Dashboard page.

    Uses the authenticated teacher's email to aggregate simple metrics
    from the courses collection. Can be extended later with richer
    analytics once more data is available.
    """
    db = get_database()

    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Teacher email missing")

    # Courses where this teacher is the primary teacherId.
    cursor = db.courses.find(
        {"teacherId": email},
        {"_id": 0, "totalEnrolledStudents": 1, "status": 1, "isActive": 1},
    )
    courses = await cursor.to_list(1000)

    total_students = 0
    active_courses = 0
    for c in courses:
        total_students += int(c.get("totalEnrolledStudents") or 0)
        status = (c.get("status") or ("Active" if c.get("isActive", True) else "Inactive")).strip().lower()
        if status != "inactive":
            active_courses += 1

    stats = [
        {
            "title": "Total Students",
            "value": str(total_students),
            "change": "Students across your courses",
        },
        {
            "title": "Active Courses",
            "value": str(active_courses),
            "change": "Courses you are currently teaching",
        },
        {
            "title": "Avg Performance",
            "value": "—",
            "change": "Extend backend to compute performance metrics",
        },
        {
            "title": "Pending Grading",
            "value": "0",
            "change": "Extend backend to track grading workload",
        },
    ]

    return {"stats": stats}


@router.get("/students/performance")
async def get_teacher_students_performance(user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    List all students with performance metrics for Teacher Student Performance page.
    """
    db = get_database()
    try:
        users = await db.users.find(
            {"user_role": {"$in": ["student", "Student", "STUDENT"]}},
            {"_id": 0, "email": 1, "firstName": 1, "lastName": 1},
        ).to_list(1000)
    except Exception:
        return []
    result = []
    for u in users:
        try:
            email = u.get("email", "")
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or email
            sid = _student_id_from_email(email)
            total_marks = 0.0
            total_max = 0.0
            sub_count = 0
            try:
                async for doc in db.assignment_submissions.find({"userEmail": email}):
                    total_marks += float(doc.get("marks", 0))
                    total_max += float(doc.get("max_marks", 0))
                    sub_count += 1
            except Exception:
                pass
            avg_score = round((total_marks / total_max) * 100.0, 1) if total_max > 0 else 0.0
            total_days = 0
            present_days = 0
            try:
                async for doc in db.attendance_daily.find({"userEmail": email}):
                    total_days += 1
                    if doc.get("present", False):
                        present_days += 1
            except Exception:
                pass
            attendance = round((present_days / total_days) * 100.0, 1) if total_days > 0 else 0.0
            assignments_str = f"{sub_count}/—"
            if avg_score >= 85 and attendance >= 90:
                status = "excellent"
            elif avg_score >= 70 and attendance >= 80:
                status = "good"
            elif avg_score >= 55 or attendance >= 65:
                status = "average"
            else:
                status = "at-risk"
            result.append({
                "id": f"STD-{sid % 100000:03d}",
                "name": name,
                "email": email,
                "class": "—",
                "avgScore": avg_score,
                "attendance": attendance,
                "assignments": assignments_str,
                "status": status,
            })
        except Exception:
            continue
    return result


@router.get("/assignments")
async def get_teacher_assignments(user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    List assignments for the teacher dashboard and Assignments page.
    Derived from assignment_submissions (unique assignment_id with submission counts).
    Returns 200 with empty list if no submissions yet.
    """
    db = get_database()
    by_id = {}
    async for doc in db.assignment_submissions.find({}, {"assignment_id": 1, "userEmail": 1, "marks": 1}):
        aid = doc.get("assignment_id")
        if aid is None:
            continue
        key = str(aid)
        if key not in by_id:
            by_id[key] = {"submitted": 0, "graded": 0}
        by_id[key]["submitted"] += 1
        if doc.get("marks") is not None:
            by_id[key]["graded"] += 1
    result = []
    for aid, data in by_id.items():
        result.append({
            "id": aid,
            "title": f"Assignment {aid}",
            "subject": "—",
            "dueDate": "—",
            "students": data["submitted"],
            "submitted": data["submitted"],
            "graded": data["graded"],
            "status": "Active",
        })
    return result


@router.get("/students")
async def get_teacher_students(user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    List students for teacher (Student Results, Manage Students, etc.).
    Same shape as admin students: id (email), name, email.
    """
    db = get_database()
    users = await db.users.find(
        {"user_role": {"$in": ["student", "Student", "STUDENT"]}},
        {"_id": 0, "email": 1, "firstName": 1, "lastName": 1},
    ).to_list(1000)
    result = []
    for u in users:
        email = u.get("email", "")
        name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or email
        result.append({"id": email, "name": name, "email": email})
    return result


@router.get("/", response_model=List[TeacherResponse])
async def list_teachers():
    """Return all teachers."""
    db = get_database()
    docs = await db.teachers.find({}, {"_id": 0}).to_list(1000)
    return docs


@router.post("/", response_model=TeacherResponse)
async def create_teacher(
    request: TeacherRequest,
    user=Depends(require_role(["admin"])),
):
    """Create a new teacher."""
    db = get_database()
    teacher_id = str(uuid.uuid4())
    now = _now_iso()

    doc = {
        "id": teacher_id,
        "name": request.name,
        "title": request.title,
        "experience": request.experience,
        "specialization": request.specialization,
        "avatarUrl": request.avatarUrl,
        "bio": request.bio,
        "email": request.email,
        "phone": request.phone,
        "rating": request.rating,
        "totalStudents": request.totalStudents,
        "isActive": request.isActive,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.teachers.insert_one(doc)
    return TeacherResponse(**doc)


@router.get("/{teacher_id}", response_model=TeacherResponse)
async def get_teacher(teacher_id: str):
    db = get_database()
    doc = await db.teachers.find_one({"id": teacher_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return TeacherResponse(**doc)

