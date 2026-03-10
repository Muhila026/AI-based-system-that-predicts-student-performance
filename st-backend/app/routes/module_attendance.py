from datetime import datetime
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_role
from app.database import get_database
from app.routes.schema_collections import _teacher_teaches_subject

router = APIRouter(prefix="/api/v1/module-attendance", tags=["Module Attendance"])


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


@router.get("/students/{subject_id}")
async def get_subject_students(subject_id: str, user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    List students enrolled in a given subject (for module attendance upload).
    Uses student_subjects + users.
    """
    db = get_database()

    # Validate subject exists
    subject = await db.subjects.find_one({"_id": subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # If teacher, ensure they actually teach this subject
    role = (user.get("role") or user.get("user_role") or "").lower()
    email = (user.get("email") or "").strip()
    if role == "teacher":
        teaches = await _teacher_teaches_subject(db, email, subject_id)
        if not teaches:
            raise HTTPException(status_code=403, detail="You are not assigned to this subject")

    # Find student_ids from student_subjects (student_id is stored as email)
    cursor = db.student_subjects.find({"subject_id": subject_id})
    student_emails = set()
    async for doc in cursor:
        sid = (doc.get("student_id") or "").strip()
        if sid:
            student_emails.add(sid)

    if not student_emails:
        return []

    # Join with users to get names
    users_cursor = db.users.find(
        {"email": {"$in": list(student_emails)}},
        {"_id": 0, "email": 1, "firstName": 1, "lastName": 1},
    )
    result = []
    async for u in users_cursor:
        email_val = u.get("email", "")
        name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or email_val
        result.append({"email": email_val, "name": name})
    # In case some emails do not exist in users, add them with fallback name
    known_emails = {r["email"] for r in result}
    for e in student_emails:
        if e not in known_emails:
            result.append({"email": e, "name": e})
    return result


@router.post("/upload")
async def upload_module_attendance(
    body: Dict[str, Any],
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """
    Upload attendance for a specific subject on a given date.

    - subject_id: subject/module id
    - date: ISO date string (YYYY-MM-DD)
    - present_student_emails: list of student emails who are present

    Enforces: at most 50 distinct attendance dates per subject.
    Stores only "present" documents; absence is implied by missing record.
    """
    db = get_database()

    subject_id = (body.get("subject_id") or "").strip()
    date_str = (body.get("date") or "").strip()
    present_emails = list({(e or "").strip() for e in (body.get("present_student_emails") or []) if e})

    if not subject_id:
        raise HTTPException(status_code=400, detail="subject_id is required")
    if not date_str:
        date_str = datetime.utcnow().date().isoformat()

    # Validate subject exists
    subject = await db.subjects.find_one({"_id": subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # If teacher, ensure they actually teach this subject
    role = (user.get("role") or user.get("user_role") or "").lower()
    email = (user.get("email") or "").strip()
    if role == "teacher":
        teaches = await _teacher_teaches_subject(db, email, subject_id)
        if not teaches:
            raise HTTPException(status_code=403, detail="You are not assigned to this subject")

    # Enforce max 50 distinct dates per subject
    existing_dates = await db.module_attendance.distinct("date", {"subject_id": subject_id})
    if date_str not in existing_dates and len(existing_dates) >= 50:
        raise HTTPException(status_code=400, detail="Maximum 50 attendance days reached for this subject")

    now = _now_iso()
    updated = 0
    for student_email in present_emails:
        await db.module_attendance.update_one(
            {"subject_id": subject_id, "date": date_str, "student_email": student_email},
            {
                "$set": {
                    "subject_id": subject_id,
                    "date": date_str,
                    "student_email": student_email,
                    "present": True,
                    "updatedAt": now,
                },
                "$setOnInsert": {"createdAt": now},
            },
            upsert=True,
        )
        updated += 1

    return {"subject_id": subject_id, "date": date_str, "students_updated": updated}


@router.get("/summary/{subject_id}")
async def get_module_attendance_summary(
    subject_id: str,
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """
    Summary of attendance for a subject:
    - total_sessions (distinct dates, max 50)
    - per-student present_days and attendance_percentage.
    """
    db = get_database()

    # Validate subject exists
    subject = await db.subjects.find_one({"_id": subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # If teacher, ensure they actually teach this subject
    role = (user.get("role") or user.get("user_role") or "").lower()
    email = (user.get("email") or "").strip()
    if role == "teacher":
        teaches = await _teacher_teaches_subject(db, email, subject_id)
        if not teaches:
            raise HTTPException(status_code=403, detail="You are not assigned to this subject")

    # Distinct session dates for this subject
    dates = await db.module_attendance.distinct("date", {"subject_id": subject_id})
    dates = sorted(dates)
    total_sessions = len(dates)

    # Planned total attendance days for this subject, set by admin in subjects.attendance_days.
    attendance_days = int(subject.get("attendance_days") or 0)
    # If not configured, fall back to the number of sessions taken so far.
    planned_sessions = max(attendance_days, total_sessions)

    # Start with enrolled students
    students_cursor = db.student_subjects.find({"subject_id": subject_id})
    student_emails = set()
    async for doc in students_cursor:
        sid = (doc.get("student_id") or "").strip()
        if sid:
            student_emails.add(sid)

    # Initialize summary map
    summary: Dict[str, Dict[str, Any]] = {}
    for e in student_emails:
        summary[e] = {"email": e, "name": e, "present_days": 0}

    # Join with users for nicer names
    if student_emails:
        users_cursor = db.users.find(
            {"email": {"$in": list(student_emails)}},
            {"_id": 0, "email": 1, "firstName": 1, "lastName": 1},
        )
        async for u in users_cursor:
            e = u.get("email", "")
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or e
            if e in summary:
                summary[e]["name"] = name

    # Count present records and mark per-date presence
    cursor = db.module_attendance.find({"subject_id": subject_id, "present": True})
    async for doc in cursor:
        e = (doc.get("student_email") or "").strip()
        d = (doc.get("date") or "").strip()
        if e and e in summary:
            summary[e]["present_days"] = summary[e].get("present_days", 0) + 1
            dates_map = summary[e].setdefault("dates", {})
            dates_map[d] = True

    # Build list with percentages
    students_out = []
    for e, data in summary.items():
        present_days = int(data.get("present_days", 0))
        if planned_sessions > 0:
            pct = round((present_days / planned_sessions) * 100.0, 1)
        else:
            pct = 0.0
        students_out.append(
            {
                "email": e,
                "name": data.get("name", e),
                "present_days": present_days,
                "total_sessions": total_sessions,
                "attendance_percentage": pct,
                "dates": data.get("dates", {}),
            }
        )

    return {
        "subject_id": subject_id,
        "total_sessions": total_sessions,
        "planned_sessions": planned_sessions,
        "dates": dates,
        "students": students_out,
    }

