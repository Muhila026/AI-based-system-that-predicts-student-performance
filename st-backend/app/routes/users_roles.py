"""User-related endpoints (roles list, teacher profile, etc.)."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Body

from app.database import get_database
from app.auth import require_role


router = APIRouter(prefix="/api/v1/users", tags=["Users"])


ROLES = [
    {"roleKey": "Student", "displayName": "Student", "description": "Student role"},
    {"roleKey": "Teacher", "displayName": "Teacher", "description": "Teacher role"},
    {"roleKey": "Admin", "displayName": "Admin", "description": "Administrator role"},
]


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


@router.get("/roles")
async def get_roles():
    return ROLES


@router.get("/student/profile")
async def get_student_profile(user: dict = Depends(require_role(["student", "user", "teacher", "admin"]))):
    """
    Return profile data for the currently authenticated student.

    Shape is tailored for the Student Profile page:
    {
      "fullName": str,
      "email": str,
      "phone": str | None,
      "studentId": str,
      "major": str,
      "year": str,
      "gpa": str,
      "address": str,
    }
    """
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="User email missing")

    student_doc = await db.students.find_one({"id": email}, {"_id": 0})
    user_doc = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})

    if student_doc is None:
        student_doc = {}
    if user_doc is None:
        user_doc = {}

    full_name = (student_doc.get("name") or "").strip()
    if not full_name:
        first = (user_doc.get("firstName") or "").strip()
        last = (user_doc.get("lastName") or "").strip()
        full_name = f"{first} {last}".strip() or email

    student_id = student_doc.get("studentId") or student_doc.get("student_id") or ""
    program = (student_doc.get("program") or "").strip()
    current_sem = student_doc.get("currentSemester") or student_doc.get("current_semester")
    year_label = (student_doc.get("year") or "").strip()
    if not year_label and current_sem:
        year_label = f"Semester {current_sem}"

    address = student_doc.get("address") or ""
    gpa = str(student_doc.get("gpa")) if student_doc.get("gpa") is not None else ""

    return {
        "fullName": full_name or email,
        "email": email,
        "phone": (student_doc.get("contactNumber") or user_doc.get("phoneNumber") or "").strip() or None,
        "studentId": student_id,
        "major": program,
        "year": year_label,
        "gpa": gpa,
        "address": address,
    }


@router.post("/student/profile")
async def save_student_profile(
    body: dict = Body(...),
    user: dict = Depends(require_role(["student", "user", "teacher", "admin"])),
):
    """
    Save profile data for the current student.

    Accepts the same shape as returned by GET /users/student/profile.
    Stores/updates data in the `students` collection, keyed by email.
    """
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="User email missing")

    full_name = (body.get("fullName") or "").strip()
    phone = (body.get("phone") or "").strip()
    student_id = (body.get("studentId") or "").strip()
    major = (body.get("major") or "").strip()
    year_label = (body.get("year") or "").strip()
    gpa = (body.get("gpa") or "").strip()
    address = (body.get("address") or "").strip()

    now = _now_iso()

    existing = await db.students.find_one({"id": email})
    base_doc = existing or {}
    if not existing:
        base_doc = {
            "id": email,
            "email": email,
            "createdAt": now,
        }

    update_doc = {
        **base_doc,
        "name": full_name or base_doc.get("name") or email,
        "studentId": student_id or base_doc.get("studentId", ""),
        "program": major or base_doc.get("program", ""),
        "year": year_label or base_doc.get("year", ""),
        "gpa": gpa or base_doc.get("gpa", ""),
        "contactNumber": phone or base_doc.get("contactNumber"),
        "address": address or base_doc.get("address", ""),
        "updatedAt": now,
    }

    await db.students.update_one({"id": email}, {"$set": update_doc}, upsert=True)

    # Optionally sync phone and name into users collection
    updates_user = {"updatedAt": now}
    if phone:
        updates_user["phoneNumber"] = phone
    if full_name:
        parts = full_name.split(None, 1)
        updates_user["firstName"] = parts[0]
        if len(parts) > 1:
            updates_user["lastName"] = parts[1]
    if updates_user:
        await db.users.update_one({"email": email}, {"$set": updates_user})

    return await get_student_profile(user)


@router.get("/teacher/profile")
async def get_teacher_profile(user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    Return profile data for the currently authenticated teacher.

    Shape is tailored for the Teacher Profile page:
    {
      "fullName": str,
      "email": str,
      "phone": str | None,
      "teacherId": str,
      "department": str,
      "experience": str,
      "subjects": List[str],
    }
    """
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="User email missing")

    teacher_doc = await db.teachers.find_one({"id": email}, {"_id": 0})
    user_doc = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})

    if teacher_doc is None:
        teacher_doc = {}
    if user_doc is None:
        user_doc = {}

    full_name = (teacher_doc.get("name") or "").strip()
    if not full_name:
        first = (user_doc.get("firstName") or "").strip()
        last = (user_doc.get("lastName") or "").strip()
        full_name = f"{first} {last}".strip() or email

    subjects = teacher_doc.get("subjects") or []
    if not isinstance(subjects, list):
        try:
            subjects = list(subjects)
        except Exception:
            subjects = []
    subjects = [str(s) for s in subjects]

    return {
        "fullName": full_name or email,
        "email": email,
        "phone": (teacher_doc.get("phone") or user_doc.get("phoneNumber") or "").strip() or None,
        "teacherId": (teacher_doc.get("teacherId") or "").strip(),
        "department": (teacher_doc.get("department") or "").strip(),
        "experience": (teacher_doc.get("experience") or "").strip(),
        "subjects": subjects,
    }


@router.post("/teacher/profile")
async def save_teacher_profile(
    body: dict = Body(...),
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """
    Save profile data for the current teacher.

    Accepts the same shape as returned by GET /users/teacher/profile.
    Stores/updates data in the `teachers` collection, keyed by email.
    """
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="User email missing")

    full_name = (body.get("fullName") or "").strip()
    phone = (body.get("phone") or "").strip()
    teacher_id = (body.get("teacherId") or "").strip()
    department = (body.get("department") or "").strip()
    experience = (body.get("experience") or "").strip()
    subjects = body.get("subjects") or []
    if not isinstance(subjects, list):
        subjects = []
    subjects = [str(s) for s in subjects]

    now = _now_iso()

    existing = await db.teachers.find_one({"id": email})
    base_doc = existing or {}
    if not existing:
        base_doc = {
            "id": email,
            "email": email,
            "createdAt": now,
        }

    update_doc = {
        **base_doc,
        "name": full_name or base_doc.get("name") or email,
        "phone": phone or base_doc.get("phone"),
        "teacherId": teacher_id or base_doc.get("teacherId", ""),
        "department": department or base_doc.get("department", ""),
        "experience": experience or base_doc.get("experience", ""),
        "subjects": subjects,
        "updatedAt": now,
    }

    await db.teachers.update_one({"id": email}, {"$set": update_doc}, upsert=True)

    # Optionally sync phone number into users collection
    if phone:
        await db.users.update_one(
            {"email": email},
            {"$set": {"phoneNumber": phone, "updatedAt": now}},
        )

    # Return the updated profile in the standard shape
    return await get_teacher_profile(user)
