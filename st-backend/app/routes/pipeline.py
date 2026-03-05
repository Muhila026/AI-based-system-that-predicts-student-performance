"""
ML pipeline: aggregate features from assignments, attendance, participation, study logs → predicted grade.
NO manual form; all inputs from system data.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta

from app.database import get_database
from app.auth import get_current_user, require_role
from app.routes.prediction import predict_grade_from_features
from app.routes.attendance_ml import _student_id_from_email

router = APIRouter(prefix="/api/v1/pipeline", tags=["ML Pipeline"])


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

    # 2) Attendance percentage: from attendance_daily
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

    # 4) Total score: from assignment_submissions
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
