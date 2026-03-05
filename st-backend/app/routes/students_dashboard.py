from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_database
from app.auth import get_current_user
from app.routes.pipeline import _aggregate_ml_features, predict_grade_from_features


router = APIRouter(prefix="/api/v1/students", tags=["Students Dashboard"])


def _score_to_grade(score: float) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


@router.get("/dashboard/predicted-score")
async def get_dashboard_predicted_score(
    attendanceRate: float = Query(..., alias="attendanceRate"),
    avgAssignmentScore: float = Query(..., alias="avgAssignmentScore"),
    pastExamAvg: float = Query(..., alias="pastExamAvg"),
    engagementScore: float = Query(..., alias="engagementScore"),
):
    """
    Compute a simple predicted score for the student dashboard.

    Mirrors the frontend fallback formula in getPredictedScore():
      score = 0.35*avgAssignmentScore + 0.35*pastExamAvg
              + 0.2*(attendanceRate*100) + 0.1*(engagementScore*100)
    """
    try:
      a = float(attendanceRate)
      ascore = float(avgAssignmentScore)
      pe = float(pastExamAvg)
      e = float(engagementScore)
    except ValueError:
      raise HTTPException(status_code=400, detail="Invalid numeric parameters")

    score = 0.35 * ascore + 0.35 * pe + 0.2 * (a * 100.0) + 0.1 * (e * 100.0)
    return {"predicted_score": round(score)}


@router.get("/dashboard/metrics")
async def get_student_dashboard_metrics(user: dict = Depends(get_current_user)):
    """
    Student dashboard metrics based on ML features pipeline:

    - study_hours: weekly_self_study_hours
    - attendance_percentage
    - class_participation
    - total_score
    - grade: predicted grade from ML model (or "N/A" on failure)
    """
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")

    features = await _aggregate_ml_features(email)

    grade = "N/A"
    try:
        grade, _, _ = predict_grade_from_features(
            float(features.get("weekly_self_study_hours", 0.0)),
            float(features.get("attendance_percentage", 0.0)),
            float(features.get("class_participation", 0.0)),
            float(features.get("total_score", 0.0)),
        )
    except Exception:
        # Keep grade as "N/A" if prediction fails
        pass

    return {
        "study_hours": float(features.get("weekly_self_study_hours", 0.0)),
        "attendance_percentage": float(features.get("attendance_percentage", 0.0)),
        "class_participation": float(features.get("class_participation", 0.0)),
        "total_score": float(features.get("total_score", 0.0)),
        "grade": grade,
    }


@router.get("/performance/overview")
async def get_performance_overview(user: dict = Depends(get_current_user)):
    """Subject performance overview: one Overall row from metrics + predicted grade."""
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    features = await _aggregate_ml_features(email)
    total_score = float(features.get("total_score", 0.0))
    predicted_score_val = total_score
    try:
        _, _, pred_score = predict_grade_from_features(
            float(features.get("weekly_self_study_hours", 0.0)),
            float(features.get("attendance_percentage", 0.0)),
            float(features.get("class_participation", 0.0)),
            total_score,
        )
        predicted_score_val = pred_score
    except Exception:
        pass
    trend = "up" if predicted_score_val >= total_score else "down"
    return [
        {
            "subject": "Overall",
            "current": round(total_score, 1),
            "predicted": round(predicted_score_val, 1),
            "trend": trend,
        }
    ]


@router.get("/performance/exam-history")
async def get_exam_history(user: dict = Depends(get_current_user)):
    """Exam/assignment history from assignment_submissions."""
    db = get_database()
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cursor = db.assignment_submissions.find({"userEmail": email})
    by_assignment = {}
    async for doc in cursor:
        aid = doc.get("assignment_id")
        key = str(aid) if aid is not None else "unknown"
        if key not in by_assignment:
            by_assignment[key] = {"marks": 0.0, "max_marks": 0.0, "createdAt": doc.get("createdAt", "")}
        by_assignment[key]["marks"] += float(doc.get("marks", 0))
        by_assignment[key]["max_marks"] += float(doc.get("max_marks", 0))
    result = []
    for idx, (aid, data) in enumerate(by_assignment.items(), 1):
        total_max = data["max_marks"]
        score = round((data["marks"] / total_max) * 100.0, 1) if total_max > 0 else 0.0
        grade = _score_to_grade(score)
        date_str = data["createdAt"][:10] if isinstance(data["createdAt"], str) and len(data["createdAt"]) >= 10 else "—"
        result.append({
            "exam": f"Assignment {aid}" if aid != "unknown" else f"Assignment {idx}",
            "date": date_str,
            "score": score,
            "grade": grade,
        })
    result.sort(key=lambda x: x["date"] if x["date"] != "—" else "", reverse=True)
    return result[:20]


@router.get("/performance/strengths-improvements")
async def get_strengths_improvements(user: dict = Depends(get_current_user)):
    """Strengths and improvements derived from metrics."""
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    features = await _aggregate_ml_features(email)
    att = float(features.get("attendance_percentage", 0.0))
    part = float(features.get("class_participation", 0.0))
    total = float(features.get("total_score", 0.0))
    study = float(features.get("weekly_self_study_hours", 0.0))
    strengths = []
    improvements = []
    if att >= 85:
        strengths.append("Attendance")
    elif att < 70:
        improvements.append("Improve attendance")
    if part >= 70:
        strengths.append("Class participation")
    elif part < 50:
        improvements.append("Increase class participation")
    if total >= 80:
        strengths.append("Assignment performance")
    elif total < 60:
        improvements.append("Assignment scores")
    if study >= 5:
        strengths.append("Self-study habits")
    elif study < 2:
        improvements.append("Weekly study hours")
    if not strengths:
        strengths.append("Building foundations")
    if not improvements:
        improvements.append("Keep consistent effort")
    return {"strengths": strengths, "improvements": improvements}
