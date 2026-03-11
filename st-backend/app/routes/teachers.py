from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timedelta
import re
import uuid

from app.database import get_database
from app.models import (
    TeacherRequest,
    TeacherResponse,
    ApiResponse,
)
from app.routes.prediction import predict_grade_from_features
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
    Basic teacher dashboard stats. Aligns with the rest of the teacher panel:
    subjects come from teacher_subjects (same as /my-subjects); student counts
    from student_subjects enrollments for those subjects.
    """
    db = get_database()

    email = (user.get("email") or user.get("sub") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Teacher email missing")

    email_regex = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
    # Subjects assigned to this teacher (same source as /my-subjects)
    ts_cursor = db.teacher_subjects.find({"teacher_id": email_regex}, {"_id": 0, "subject_id": 1})
    subject_ids_raw = []
    async for doc in ts_cursor:
        sid = doc.get("subject_id")
        if sid is not None:
            subject_ids_raw.append(sid)

    # Distinct subject count (Active Courses == Subjects)
    seen_subjects = set()
    for sid in subject_ids_raw:
        seen_subjects.add(str(sid))
    active_courses = len(seen_subjects)

    # $in list for student_subjects (subject_id may be stored as str or int)
    in_values = list(seen_subjects)
    for sid in subject_ids_raw:
        if isinstance(sid, str) and sid.isdigit():
            in_values.append(int(sid))
        elif isinstance(sid, int):
            in_values.append(sid)
            in_values.append(str(sid))

    total_students = 0
    if in_values:
        student_ids = set()
        ss_cursor = db.student_subjects.find(
            {"subject_id": {"$in": in_values}},
            {"_id": 0, "student_id": 1},
        )
        async for doc in ss_cursor:
            try:
                student_ids.add(int(doc.get("student_id")))
            except (TypeError, ValueError):
                pass
        total_students = len(student_ids)

    stats = [
        {
            "title": "Total Students",
            "value": str(total_students),
            "change": "Unique students in your subjects (student_subjects)",
        },
        {
            "title": "Subjects",
            "value": str(active_courses),
            "change": "Same as My Subjects — subjects assigned to you",
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


@router.get("/my-subjects")
async def get_my_teacher_subjects(user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    List subjects assigned to the current teacher from teacher_subjects table.
    Returns list of { id, teacher_id, subject_id, subject_name }.
    Uses JWT email (user["email"] or user["sub"]) and matches teacher_id case-insensitively.
    """
    db = get_database()
    # JWT stores email in "sub"; get_current_user passes it as "email" - support both
    email = (user.get("email") or user.get("sub") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Teacher email missing")
    email_regex = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
    cursor = db.teacher_subjects.find({"teacher_id": email_regex}, {"_id": 1, "teacher_id": 1, "subject_id": 1})
    items = []
    async for doc in cursor:
        subject_id = doc.get("subject_id")
        subject_name = None
        if subject_id:
            sub = await db.subjects.find_one({"_id": subject_id}, {"subject_name": 1})
            if not sub and isinstance(subject_id, str) and subject_id.isdigit():
                sub = await db.subjects.find_one({"_id": int(subject_id)}, {"subject_name": 1})
            subject_name = (sub.get("subject_name") if sub else None) or (subject_id if isinstance(subject_id, str) else str(subject_id))
        raw_id = doc.get("_id")
        items.append({
            "id": str(raw_id) if raw_id is not None else "",
            "teacher_id": doc.get("teacher_id"),
            "subject_id": str(subject_id) if subject_id is not None else "",
            "subject_name": subject_name or "",
        })
    return items


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
    now_date = datetime.utcnow().date()
    since_study = (now_date - timedelta(days=7)).isoformat()
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
            # Weekly study hours (last 7 days)
            weekly_hours = 0.0
            try:
                async for doc in db.student_study_logs.find(
                    {
                        "userEmail": email,
                        "isActive": True,
                        "studyDate": {"$gte": since_study},
                    }
                ):
                    weekly_hours += float(doc.get("studyHours", 0.0) or 0.0)
            except Exception:
                weekly_hours = 0.0
            weekly_hours = round(weekly_hours, 2)
            # Class participation from latest participationScore (1–5 → 0–100%)
            class_participation = 0.0
            try:
                cursor = (
                    db.student_participation.find(
                        {"userEmail": email, "isActive": True}
                    )
                    .sort("createdAt", -1)
                    .limit(1)
                )
                docs = await cursor.to_list(length=1)
                if docs:
                    rating = float(docs[0].get("participationScore", 0.0) or 0.0)
                    class_participation = max(0.0, min(100.0, rating * 20.0))
            except Exception:
                class_participation = 0.0
            class_participation = round(class_participation, 1)
            # Predicted grade from ML model (best-effort)
            predicted_grade = None
            try:
                grade, _confidence, _pred_score = predict_grade_from_features(
                    weekly_self_study_hours=weekly_hours,
                    attendance_percentage=attendance,
                    class_participation=class_participation,
                    total_score=avg_score,
                )
                predicted_grade = grade
            except Exception:
                predicted_grade = None
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
                "predictedGrade": predicted_grade,
                "totalScore": avg_score,
                "classParticipation": class_participation,
                "studyHours": weekly_hours,
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

