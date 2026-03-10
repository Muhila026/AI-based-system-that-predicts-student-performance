from fastapi import APIRouter, Depends, HTTPException, Body
from datetime import datetime
from typing import List, Optional
import uuid

from app.database import get_database, DEFAULT_ADMIN_EMAIL
from app.models import DashboardStatisticsResponse, AdminCreateUserRequest, AdminUpdateUserRequest
from app.auth import require_role
from app.password_util import encode_password


router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _course_doc_to_admin(doc: dict) -> dict:
    """Map DB course doc to AdminCourse shape for frontend."""
    teacher_id = doc.get("teacherId") or doc.get("teacherName") or ""
    teachers = [teacher_id] if teacher_id else []
    if doc.get("teachers") and isinstance(doc["teachers"], list):
        teachers = doc["teachers"]
    return {
        "id": doc.get("id", ""),
        "name": doc.get("courseTitle") or doc.get("name") or "",
        "code": doc.get("code") or "",
        "teachers": teachers,
        "students": doc.get("totalEnrolledStudents") or doc.get("students") or 0,
        "status": "Active" if (doc.get("status") or doc.get("isActive", True)) not in ("Inactive", "inactive", False) else "Inactive",
    }


async def _sync_user_to_teachers(db, user_doc: dict) -> None:
    """Save/update user with user_role=teacher in the teachers collection (by email as id)."""
    email = (user_doc.get("email") or "").strip()
    if not email:
        return
    first = (user_doc.get("firstName") or "").strip()
    last = (user_doc.get("lastName") or "").strip()
    name = f"{first} {last}".strip() or email
    is_active = user_doc.get("isActive", True)
    now = datetime.utcnow().isoformat()
    teacher_doc = {
        "id": email,
        "name": name,
        "email": email,
        "title": None,
        "experience": None,
        "specialization": None,
        "avatarUrl": None,
        "bio": None,
        "phone": user_doc.get("phoneNumber") or None,
        "rating": None,
        "totalStudents": 0,
        "isActive": is_active,
        "createdAt": user_doc.get("createdAt") or now,
        "updatedAt": now,
    }
    # Upsert: insert if not exists, else update
    await db.teachers.update_one(
        {"id": email},
        {"$set": teacher_doc},
        upsert=True,
    )


async def _remove_teacher_by_email(db, email: str) -> None:
    """Remove teacher document by email (when user role is no longer teacher or user is deleted)."""
    if not email:
        return
    await db.teachers.delete_one({"id": email})


async def _sync_user_to_students(db, user_doc: dict) -> None:
    """Save/update user with user_role=student in the students collection (by email as id)."""
    email = (user_doc.get("email") or "").strip()
    if not email:
        return
    first = (user_doc.get("firstName") or "").strip()
    last = (user_doc.get("lastName") or "").strip()
    name = f"{first} {last}".strip() or email
    is_active = user_doc.get("isActive", True)
    now = datetime.utcnow().isoformat()
    student_doc = {
        "id": email,
        "name": name,
        "email": email,
        "studentId": user_doc.get("studentId") or user_doc.get("student_id") or "",
        "batch": user_doc.get("batch") or "",
        "program": user_doc.get("program") or "",
        "currentSemester": user_doc.get("currentSemester") or user_doc.get("current_semester") or 1,
        "guardianName": user_doc.get("guardianName") or user_doc.get("guardian_name"),
        "contactNumber": user_doc.get("contactNumber") or user_doc.get("phoneNumber"),
        "address": user_doc.get("address"),
        "isActive": is_active,
        "createdAt": user_doc.get("createdAt") or now,
        "updatedAt": now,
    }
    await db.students.update_one(
        {"id": email},
        {"$set": student_doc},
        upsert=True,
    )


async def _remove_student_by_email(db, email: str) -> None:
    """Remove student document by email (when user role is no longer student or user is deleted)."""
    if not email:
        return
    await db.students.delete_one({"id": email})


def _doc_to_admin_user(doc: dict, index: int) -> dict:
    """Map DB user doc to AdminUser shape for frontend."""
    first = (doc.get("firstName") or "").strip()
    last = (doc.get("lastName") or "").strip()
    name = f"{first} {last}".strip() or doc.get("email", "")
    role_raw = (doc.get("user_role") or "user").strip().lower()
    role_map = {"student": "Student", "teacher": "Teacher", "admin": "Admin", "user": "Student"}
    role = role_map.get(role_raw, "Student")
    return {
        "id": doc.get("email"),  # use email as id for update/delete
        "name": name,
        "email": doc.get("email", ""),
        "role": role,
        "status": "Active" if doc.get("isActive", True) else "Inactive",
        "joinedDate": doc.get("createdAt", ""),
    }


@router.get("/dashboard")
async def get_dashboard(user: dict = Depends(require_role(["admin"]))):
    """
    Admin dashboard data for the UI: stats (Total Users, Active Courses), breakdown by role, recent activities.
    """
    db = get_database()

    total_users = await db.users.count_documents({})
    # Treat "Active Courses" on the admin panel as the total number of subjects configured
    total_subjects = await db.subjects.count_documents({})

    # Role breakdown
    pipeline = [
        {"$group": {"_id": "$user_role", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    role_counts = {}
    async for doc in db.users.aggregate(pipeline):
        role = (doc.get("_id") or "user").replace("_", " ").title()
        role_counts[role] = doc.get("count", 0)

    total_for_pct = sum(role_counts.values()) or 1
    breakdown = [
        {"type": k, "count": v, "percentage": round(100 * v / total_for_pct)}
        for k, v in role_counts.items()
    ]
    if not breakdown:
        breakdown = [
            {"type": "Students", "count": 0, "percentage": 0},
            {"type": "Teachers", "count": 0, "percentage": 0},
            {"type": "Administrators", "count": 0, "percentage": 0},
        ]

    stats = [
        {
            "title": "Total Users",
            "value": str(total_users),
            "change": "From database",
            "color": "#3b82f6",
        },
        {
            "title": "Active Courses",
            "value": str(total_subjects),
            "change": "Total subjects from database",
            "color": "#10b981",
        },
    ]
    activities = [
        {"activity": "Admin dashboard loaded", "user": user.get("email", "System"), "time": "Just now"},
    ]

    return {
        "stats": stats,
        "breakdown": breakdown,
        "activities": activities,
    }


@router.get("/dashboard/statistics", response_model=DashboardStatisticsResponse)
async def get_dashboard_statistics(user: dict = Depends(require_role(["admin"]))):
    """
    Basic admin dashboard stats based on existing collections.
    Can be extended later with more advanced analytics.
    """
    db = get_database()

    total_earnings = 0.0
    async for doc in db.course_payments.find(
        {"status": "PAID"}, {"amount": 1, "_id": 0}
    ):
        if doc.get("amount"):
            total_earnings += float(doc["amount"])

    total_course_requests = await db.course_enquiries.count_documents({})

    pending_classes = await db.course_schedules.count_documents(
        {"isActive": True}
    )

    return DashboardStatisticsResponse(
        totalEarnings=total_earnings,
        totalCourseRequests=total_course_requests,
        pendingClasses=pending_classes,
    )


# ---------- Admin user management ----------
@router.get("/teachers")
async def list_teachers(user: dict = Depends(require_role(["admin"]))):
    """Return all users with role Teacher from the users collection (for TeacherManagement page)."""
    db = get_database()
    cursor = db.users.find({"user_role": "teacher"}, {"_id": 0, "password": 0}).sort("createdAt", 1)
    teachers = []
    async for doc in cursor:
        teachers.append(_doc_to_admin_user(doc, len(teachers) + 1))
    return teachers


@router.get("/students")
async def list_students(user: dict = Depends(require_role(["admin"]))):
    """Return all users with role Student (or user) from the users collection (for StudentManagement page)."""
    db = get_database()
    cursor = db.users.find(
        {"user_role": {"$in": ["student", "user"]}},
        {"_id": 0, "password": 0},
    ).sort("createdAt", 1)
    students = []
    async for doc in cursor:
        students.append(_doc_to_admin_user(doc, len(students) + 1))
    return students


@router.get("/students/{email}/details")
async def get_student_details(email: str, user: dict = Depends(require_role(["admin"]))):
    """Return student details for Admin Student Management (by email)."""
    from urllib.parse import unquote
    email = unquote(email)
    db = get_database()
    doc = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    first = (doc.get("firstName") or "").strip()
    last = (doc.get("lastName") or "").strip()
    name = f"{first} {last}".strip() or doc.get("email", "")
    return {
        "email": doc.get("email", ""),
        "name": name,
        "studentId": doc.get("studentId") or doc.get("student_id") or "",
        "batch": doc.get("batch") or "",
        "program": doc.get("program") or "",
        "currentSemester": doc.get("currentSemester") or doc.get("current_semester") or 1,
        "guardianName": doc.get("guardianName") or doc.get("guardian_name"),
        "contactNumber": doc.get("contactNumber") or doc.get("phoneNumber"),
        "address": doc.get("address"),
    }


# ---------- Admin course management (CourseManagement page) ----------
@router.get("/courses")
async def list_admin_courses(user: dict = Depends(require_role(["admin", "teacher"]))):
    """
    List courses in AdminCourse shape.

    - Admin: all courses (for CourseManagement page).
    - Teacher: only courses where they are assigned as teacher (for teacher pages).
    """
    db = get_database()
    cursor = db.courses.find({}, {"_id": 0}).sort("createdAt", 1)
    courses = []
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    async for doc in cursor:
        course = _course_doc_to_admin(doc)
        if role == "teacher":
            teachers = course.get("teachers") or []
            teacher_id = (doc.get("teacherId") or "").strip()
            if email not in teachers and email != teacher_id:
                continue
        courses.append(course)
    return courses


@router.post("/courses")
async def create_admin_course(
    user: dict = Depends(require_role(["admin"])),
    body: dict = Body(...),
):
    """Create a course from AdminCourse shape (name, code, teachers, students, status). Returns full list."""
    db = get_database()
    name = (body.get("name") or "").strip()
    code = (body.get("code") or "").strip()
    teachers = body.get("teachers") or []
    if isinstance(teachers, list):
        teachers = [str(t).strip() for t in teachers if t]
    else:
        teachers = [str(teachers).strip()] if teachers else []
    students = int(body.get("students") or 0)
    status = (body.get("status") or "Active").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Course name is required")
    teacher_id = teachers[0] if teachers else ""
    course_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": course_id,
        "courseTitle": name,
        "code": code,
        "teacherId": teacher_id,
        "teachers": teachers,
        "totalEnrolledStudents": students,
        "status": status,
        "isActive": status.lower() != "inactive",
        "courseDuration": None,
        "startDate": None,
        "endDate": None,
        "totalLessons": None,
        "price": None,
        "level": None,
        "aboutCourse": None,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.courses.insert_one(doc)
    cursor = db.courses.find({}, {"_id": 0}).sort("createdAt", 1)
    courses = []
    async for d in cursor:
        courses.append(_course_doc_to_admin(d))
    return courses


@router.put("/courses/{course_id}")
async def update_admin_course(
    course_id: str,
    user: dict = Depends(require_role(["admin"])),
    body: dict = Body(...),
):
    """Update a course by id. Returns full course list."""
    from urllib.parse import unquote
    course_id = unquote(course_id)
    db = get_database()
    found = await db.courses.find_one({"id": course_id})
    if not found:
        raise HTTPException(status_code=404, detail="Course not found")
    updates = {"updatedAt": _now_iso()}
    if "name" in body and body["name"] is not None:
        updates["courseTitle"] = str(body["name"]).strip()
    if "code" in body and body["code"] is not None:
        updates["code"] = str(body["code"]).strip()
    if "teachers" in body and body["teachers"] is not None:
        teachers = body["teachers"] if isinstance(body["teachers"], list) else [body["teachers"]]
        teachers = [str(t).strip() for t in teachers if t]
        updates["teachers"] = teachers
        if teachers:
            updates["teacherId"] = teachers[0]
    if "students" in body and body["students"] is not None:
        updates["totalEnrolledStudents"] = int(body["students"])
    if "status" in body and body["status"] is not None:
        updates["status"] = str(body["status"]).strip()
        updates["isActive"] = str(body["status"]).strip().lower() != "inactive"
    await db.courses.update_one({"id": course_id}, {"$set": updates})
    cursor = db.courses.find({}, {"_id": 0}).sort("createdAt", 1)
    courses = []
    async for doc in cursor:
        courses.append(_course_doc_to_admin(doc))
    return courses


@router.delete("/courses/{course_id}")
async def delete_admin_course(
    course_id: str,
    user: dict = Depends(require_role(["admin"])),
):
    """Delete a course by id. Returns full course list."""
    from urllib.parse import unquote
    course_id = unquote(course_id)
    db = get_database()
    result = await db.courses.delete_one({"id": course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    cursor = db.courses.find({}, {"_id": 0}).sort("createdAt", 1)
    courses = []
    async for doc in cursor:
        courses.append(_course_doc_to_admin(doc))
    return courses


@router.get("/users")
async def list_users(user: dict = Depends(require_role(["admin"]))):
    db = get_database()
    cursor = db.users.find({}, {"_id": 0, "password": 0}).sort("createdAt", 1)
    users = []
    async for doc in cursor:
        users.append(_doc_to_admin_user(doc, len(users) + 1))
    return users


@router.post("/users")
async def create_user(body: AdminCreateUserRequest, user: dict = Depends(require_role(["admin"]))):
    db = get_database()
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    parts = (body.name or "").strip().split(None, 1)
    first_name = parts[0] if parts else "User"
    last_name = parts[1] if len(parts) > 1 else ""
    role_lower = (body.role or "student").strip().lower()
    if role_lower not in ("student", "teacher", "admin", "user"):
        role_lower = "student"
    from datetime import datetime
    now = datetime.utcnow().isoformat()
    password = (body.password or "").strip()
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    doc = {
        "email": body.email,
        "firstName": first_name,
        "lastName": last_name,
        "password": encode_password(password),
        "phoneNumber": "0000000000",
        "isEmailVerified": False,
        "isActive": (body.status or "Active").strip().lower() != "inactive",
        "user_role": role_lower,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.users.insert_one(doc)
    if role_lower == "teacher":
        await _sync_user_to_teachers(db, doc)
    if role_lower in ("student", "user"):
        await _sync_user_to_students(db, doc)
    cursor = db.users.find({}, {"_id": 0, "password": 0}).sort("createdAt", 1)
    users = []
    async for d in cursor:
        users.append(_doc_to_admin_user(d, len(users) + 1))
    return users


@router.put("/users/{email}")
async def update_user(email: str, body: AdminUpdateUserRequest, user: dict = Depends(require_role(["admin"]))):
    db = get_database()
    from urllib.parse import unquote
    email = unquote(email)
    found = await db.users.find_one({"email": email})
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    updates = {"updatedAt": __import__("datetime").datetime.utcnow().isoformat()}
    if body.name is not None:
        parts = body.name.strip().split(None, 1)
        updates["firstName"] = parts[0] if parts else found.get("firstName", "")
        updates["lastName"] = parts[1] if len(parts) > 1 else found.get("lastName", "")
    if body.role is not None:
        r = body.role.strip().lower()
        if r in ("student", "teacher", "admin", "user"):
            updates["user_role"] = r
    if body.status is not None:
        updates["isActive"] = body.status.strip().lower() != "inactive"
    was_teacher = (found.get("user_role") or "").strip().lower() == "teacher"
    was_student = (found.get("user_role") or "").strip().lower() in ("student", "user")
    await db.users.update_one({"email": email}, {"$set": updates})
    updated_doc = {**found, **updates}
    new_role = (updated_doc.get("user_role") or "").strip().lower()
    # Sync to teachers table
    if new_role == "teacher":
        await _sync_user_to_teachers(db, updated_doc)
    elif was_teacher:
        await _remove_teacher_by_email(db, email)
    # Sync to students table
    if new_role in ("student", "user"):
        await _sync_user_to_students(db, updated_doc)
    elif was_student:
        await _remove_student_by_email(db, email)
    cursor = db.users.find({}, {"_id": 0, "password": 0}).sort("createdAt", 1)
    users = []
    async for doc in cursor:
        users.append(_doc_to_admin_user(doc, len(users) + 1))
    return users


@router.put("/change-user-password")
async def change_user_password(
    body: dict = Body(...),
    user: dict = Depends(require_role(["admin"])),
):
    """Admin: set a user's password by email. Frontend sends { email, new_password }."""
    from urllib.parse import unquote
    db = get_database()
    email = (body.get("email") or "").strip()
    if email:
        email = unquote(email)
    new_password = (body.get("new_password") or "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not email:
        raise HTTPException(status_code=400, detail="email is required")
    found = await db.users.find_one({"email": email})
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    now = datetime.utcnow().isoformat()
    await db.users.update_one(
        {"email": email},
        {"$set": {"password": encode_password(new_password), "updatedAt": now}},
    )
    return {"message": "Password updated"}


@router.delete("/users/{email}")
async def delete_user(email: str, user: dict = Depends(require_role(["admin"]))):
    from urllib.parse import unquote
    db = get_database()
    email = unquote(email)
    if email == DEFAULT_ADMIN_EMAIL:
        raise HTTPException(status_code=400, detail="Default admin account cannot be deleted")
    result = await db.users.delete_one({"email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await _remove_teacher_by_email(db, email)
    await _remove_student_by_email(db, email)
    cursor = db.users.find({}, {"_id": 0, "password": 0}).sort("createdAt", 1)
    users = []
    async for doc in cursor:
        users.append(_doc_to_admin_user(doc, len(users) + 1))
    return users

