"""
ML pipeline: aggregate features from assignments, attendance, participation, study logs → predicted grade.
NO manual form; all inputs from system data.
"""
import re
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta

from app.database import get_database
from app.auth import get_current_user, require_role
from app.routes.prediction import predict_grade_from_features
from app.routes.attendance_ml import _student_id_from_email

router = APIRouter(prefix="/api/v1/pipeline", tags=["ML Pipeline"])

_GRADE_SCORE = {"A": 92.0, "B": 82.0, "C": 72.0, "D": 62.0, "F": 45.0}


def _fallback_grade_from_features(total_score: float, attendance_percentage: float, class_participation: float) -> tuple:
    """When ML model is not available, derive grade from total_score (and optionally attendance/participation). Returns (grade, confidence, predicted_score)."""
    s = float(total_score)
    if s >= 90:
        grade = "A"
    elif s >= 80:
        grade = "B"
    elif s >= 70:
        grade = "C"
    elif s >= 60:
        grade = "D"
    else:
        grade = "F"
    predicted_score = _GRADE_SCORE.get(grade, 50.0)
    return grade, None, predicted_score


async def _aggregate_ml_features(email: str) -> dict:
    """
    Compute ML features for one user from DB.
    Returns dict with keys: weekly_self_study_hours, attendance_percentage, class_participation, total_score.
    Uses defaults (0 or safe mid) when no data.
    """
    db = get_database()
    # Defaults (model can still run; use 0 or mild defaults)
    weekly_self_study_hours = 0.0
    attendance_percentage = 0.0
    class_participation = 0.0
    total_score = 0.0

    # 1) Weekly self-study hours: sum of studyHours in last 7 days from student_study_logs
    try:
        today = datetime.utcnow().date()
        week_ago = (today - timedelta(days=7)).isoformat()
        cursor = db.student_study_logs.find({"userEmail": email, "isActive": True})
        async for doc in cursor:
            sd = doc.get("studyDate")
            if not sd:
                continue
            if isinstance(sd, str) and sd >= week_ago:
                weekly_self_study_hours += float(doc.get("studyHours", 0))
    except Exception:
        pass

    # 2) Attendance percentage: prefer module_attendance with admin-assigned attendance_days; fallback to attendance_daily.
    try:
        # Per-subject attendance based on module_attendance and subjects.attendance_days
        email_regex = {"$regex": f"^{re.escape(email.strip())}$", "$options": "i"}
        student_subjects = await db.student_subjects.find({"student_id": email_regex}, {"subject_id": 1}).to_list(200)
        subject_ids = [doc.get("subject_id") for doc in student_subjects if doc.get("subject_id")]
        total_pct = 0.0
        counted = 0
        for sid in subject_ids:
            subj = await db.subjects.find_one({"_id": sid}, {"attendance_days": 1})
            if not subj:
                continue
            planned_days = int(subj.get("attendance_days") or 0)
            if planned_days <= 0:
                continue
            present_days = 0
            cursor = db.module_attendance.find({"subject_id": sid, "student_email": email, "present": True})
            async for _doc in cursor:
                present_days += 1
            if present_days <= 0:
                continue
            pct = min(100.0, max(0.0, (present_days / planned_days) * 100.0))
            total_pct += pct
            counted += 1
        if counted > 0:
            attendance_percentage = round(total_pct / counted, 2)
    except Exception:
        attendance_percentage = 0.0

    if attendance_percentage == 0.0:
        # Fallback: historical daily attendance (if module-level is not configured)
        try:
            cursor = db.attendance_daily.find({"userEmail": email})
            total_days = 0
            present_days = 0
            async for doc in cursor:
                total_days += 1
                if doc.get("present", False):
                    present_days += 1
            if total_days > 0:
                attendance_percentage = round((present_days / total_days) * 100.0, 2)
        except Exception:
            pass

    # 3) Class participation: average of participationScore from student_participation, scale to 0–100 (assume 1–5 or 0–10)
    try:
        cursor = db.student_participation.find({"userEmail": email, "isActive": True})
        scores = []
        async for doc in cursor:
            scores.append(float(doc.get("participationScore", 0)))
        if scores:
            avg = sum(scores) / len(scores)
            class_participation = min(100.0, (avg / 5.0) * 100.0)  # assume 1–5 scale
    except Exception:
        pass

    # 4) Total score: from assignment_submissions first; fallback to student_subject_marks (by student_id = email)
    try:
        cursor = db.assignment_submissions.find({"userEmail": email})
        total_marks = 0.0
        total_max = 0.0
        async for doc in cursor:
            total_marks += float(doc.get("marks", 0))
            total_max += float(doc.get("max_marks", 0))
        if total_max > 0:
            total_score = round((total_marks / total_max) * 100.0, 2)
    except Exception:
        pass

    if total_score == 0.0:
        try:
            email_regex = {"$regex": f"^{re.escape(email.strip())}$", "$options": "i"}
            cursor = db.student_subject_marks.find({"student_id": email_regex})
            scores = []
            async for doc in cursor:
                a = float(doc.get("assignment", 0))
                q = float(doc.get("quiz", 0))
                m = float(doc.get("mid_exam", 0))
                # Row score = average of assignment, quiz, mid_exam (each 0–100)
                row_score = (a + q + m) / 3.0
                scores.append(min(100.0, max(0.0, row_score)))
            if scores:
                total_score = round(sum(scores) / len(scores), 2)
        except Exception:
            pass

    return {
        "weekly_self_study_hours": weekly_self_study_hours,
        "attendance_percentage": attendance_percentage,
        "class_participation": class_participation,
        "total_score": total_score,
    }


@router.get("/me/ml-features")
async def get_my_ml_features(user: dict = Depends(get_current_user)):
    """Return aggregated ML features for the current user (from assignments, attendance, participation, study logs)."""
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    features = await _aggregate_ml_features(email)
    return features


@router.get("/me/predicted-grade")
async def get_my_predicted_grade(user: dict = Depends(get_current_user)):
    """
    Aggregate ML features from system data, run Logistic Regression model, return predicted grade and score.
    No manual form; uses assignment marks, attendance, participation, study logs.
    """
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    features = await _aggregate_ml_features(email)
    try:
        grade, confidence, predicted_score = predict_grade_from_features(
            features["weekly_self_study_hours"],
            features["attendance_percentage"],
            features["class_participation"],
            features["total_score"],
        )
    except RuntimeError as e:
        if "not found" in str(e).lower() or "assets" in str(e).lower():
            grade, confidence, predicted_score = _fallback_grade_from_features(
                features["total_score"],
                features["attendance_percentage"],
                features["class_participation"],
            )
        else:
            raise HTTPException(status_code=500, detail=f"ML prediction failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction failed: {e}")
    student_id = _student_id_from_email(email)
    return {
        "student_id": student_id,
        "features": features,
        "predicted_score": predicted_score,
        "predicted_grade": grade,
        "confidence": confidence,
    }
