"""
Attendance for ML: daily upload by teacher → attendance_percentage = (present_days/total_days)*100 per student.
Uses attendance_daily collection keyed by userEmail and date.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta

from app.database import get_database
from app.auth import get_current_user, require_role
from app.models import AttendanceMeResponse, AttendanceDailyRequest

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance (ML)"])


def _student_id_from_email(email: str) -> int:
    """Stable numeric id from email for frontend student list and daily upload."""
    return abs(hash(email)) % 1000000


@router.get("/me", response_model=AttendanceMeResponse)
async def get_my_attendance(user: dict = Depends(get_current_user)):
    """
    Current user's attendance: total_days = count of dates, present_days = count present.
    attendance_percentage = (present_days/total_days)*100.
    """
    db = get_database()
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cursor = db.attendance_daily.find({"userEmail": email})
    total_days = 0
    present_days = 0
    async for doc in cursor:
        total_days += 1
        if doc.get("present", False):
            present_days += 1
    if total_days == 0:
        attendance_percentage = 0.0
    else:
        attendance_percentage = round((present_days / total_days) * 100.0, 2)
    return AttendanceMeResponse(
        total_days=total_days,
        present_days=present_days,
        attendance_percentage=attendance_percentage,
    )


@router.get("/student-list")
async def get_student_list(user: dict = Depends(require_role(["TEACHER", "ADMIN"]))):
    """
    List students for attendance/assignment upload. Returns student_id (stable from email), name, email.
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
        result.append({
            "student_id": _student_id_from_email(email),
            "name": name,
            "email": email,
        })
    return result


@router.post("/daily")
async def upload_daily_attendance(
    request: AttendanceDailyRequest,
    user: dict = Depends(require_role(["TEACHER", "ADMIN"])),
):
    """
    Record who was present on a given date. present_student_ids are from /attendance/student-list.
    """
    db = get_database()
    date_str = request.date or datetime.utcnow().date().isoformat()
    present_ids = set(request.present_student_ids or [])

    # Resolve student_id -> userEmail from users
    users = await db.users.find(
        {"user_role": {"$in": ["student", "Student", "STUDENT"]}},
        {"_id": 0, "email": 1},
    ).to_list(1000)
    id_to_email = {_student_id_from_email(u["email"]): u["email"] for u in users}

    updated = 0
    for sid in present_ids:
        email = id_to_email.get(sid)
        if not email:
            continue
        await db.attendance_daily.update_one(
            {"userEmail": email, "date": date_str},
            {"$set": {"userEmail": email, "date": date_str, "present": True}},
            upsert=True,
        )
        updated += 1
    return {"date": date_str, "students_updated": updated}
