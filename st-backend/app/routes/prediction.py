from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timedelta
import uuid
from functools import lru_cache
from pathlib import Path
import joblib
import numpy as np

from app.database import get_database
from app.auth import get_current_user
from app.models import (
    StudentStudyLogRequest,
    StudentStudyLogResponse,
    StudentParticipationRequest,
    StudentParticipationResponse,
    ParticipationRatingRequest,
    PredictManualRequest,
    PredictionResponse,
)


study_logs_router = APIRouter(
    prefix="/api/v1/study-logs", tags=["Student Study Logs"]
)
participation_router = APIRouter(
    prefix="/api/v1/participation", tags=["Student Participation"]
)
prediction_router = APIRouter(
    prefix="/api/v1/prediction", tags=["Student Performance Prediction"]
)


GRADE_TO_NUM = {"A": 0, "B": 1, "C": 2, "D": 3, "F": 4}
NUM_TO_GRADE = {v: k for k, v in GRADE_TO_NUM.items()}


@lru_cache(maxsize=1)
def _load_model_and_scaler():
    """
    Lazily load the trained Logistic Regression model and MinMaxScaler
    saved by model/train_model.py.
    """
    # This file: ...\student-prediter\st-backend\app\routes\prediction.py
    routes_dir = Path(__file__).resolve().parent
    project_root = routes_dir.parents[2]  # student-prediter (parent of st-backend)
    model_dir = project_root / "model"

    model_path = model_dir / "best_model.pkl"
    scaler_path = model_dir / "scaler.pkl"

    if not model_path.exists() or not scaler_path.exists():
        raise RuntimeError(
            f"ML assets not found. Expected {model_path} and {scaler_path}. "
            f"Run model/train_model.py first to generate them."
        )

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    return model, scaler


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


@study_logs_router.post("/", response_model=StudentStudyLogResponse)
async def create_study_log(request: StudentStudyLogRequest):
    db = get_database()
    log_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": log_id,
        "userEmail": request.userEmail,
        "courseId": request.courseId,
        "studyHours": request.studyHours,
        "studyDate": request.studyDate,
        "notes": request.notes,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.student_study_logs.insert_one(doc)
    return StudentStudyLogResponse(**doc)


@study_logs_router.post("/me", response_model=StudentStudyLogResponse)
async def create_my_study_log(
    studyHours: float = Body(..., embed=True),
    studyDate: str | None = Body(None, embed=True),
    courseId: str = Body("", embed=True),
    notes: str | None = Body(None, embed=True),
    user: dict = Depends(get_current_user),
):
    """
    Log study hours for the current user. Used for prediction: weekly_self_study_hours
    is the sum of studyHours in the last 7 days. studyDate format: YYYY-MM-DD (default: today).
    """
    email = (user.get("email") or user.get("sub") or "").strip()
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if studyHours < 0:
        raise HTTPException(status_code=400, detail="studyHours must be >= 0")
    date_str = (studyDate or "").strip() or datetime.utcnow().date().isoformat()
    db = get_database()
    log_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": log_id,
        "userEmail": email,
        "courseId": courseId or "",
        "studyHours": float(studyHours),
        "studyDate": date_str,
        "notes": notes or "",
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.student_study_logs.insert_one(doc)
    return StudentStudyLogResponse(**doc)


@study_logs_router.get("/me")
async def list_my_study_logs(
    days: int = 30,
    user: dict = Depends(get_current_user),
):
    """List current user's study logs (default last 30 days). For analysis and prediction."""
    email = (user.get("email") or user.get("sub") or "").strip()
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    since = (datetime.utcnow().date() - timedelta(days=min(days, 365))).isoformat()
    db = get_database()
    cursor = db.student_study_logs.find(
        {"userEmail": email, "isActive": True, "studyDate": {"$gte": since}}
    ).sort("studyDate", -1)
    items = []
    async for doc in cursor:
        items.append({
            "id": doc.get("id"),
            "studyDate": doc.get("studyDate"),
            "studyHours": doc.get("studyHours"),
            "notes": doc.get("notes"),
            "createdAt": doc.get("createdAt"),
        })
    return items


def _student_id_from_email(email: str) -> int:
    return abs(hash(email)) % 1000000


async def _email_from_student_id(db, student_id: int) -> str | None:
    """Resolve student_id (from /attendance/student-list) to user email."""
    users = await db.users.find(
        {"user_role": {"$in": ["student", "Student", "STUDENT"]}},
        {"_id": 0, "email": 1},
    ).to_list(1000)
    for u in users:
        if _student_id_from_email(u.get("email", "")) == student_id:
            return u["email"]
    return None


@participation_router.post("/", response_model=StudentParticipationResponse)
async def create_participation(request: StudentParticipationRequest):
    db = get_database()
    part_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": part_id,
        "userEmail": request.userEmail,
        "courseId": request.courseId,
        "scheduleId": request.scheduleId,
        "participationScore": request.participationScore,
        "remarks": request.remarks,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.student_participation.insert_one(doc)
    return StudentParticipationResponse(**doc)


@participation_router.post("/rating")
async def set_participation_rating(request: ParticipationRatingRequest):
    """Teacher sets participation rating (1–5) for a student. Stored by userEmail for pipeline."""
    db = get_database()
    student_id = request.student_id
    teacher_rating = request.teacher_rating
    email = await _email_from_student_id(db, student_id)
    if not email:
        raise HTTPException(status_code=404, detail="Student not found")
    part_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": part_id,
        "userEmail": email,
        "courseId": "",
        "scheduleId": "",
        "participationScore": max(1.0, min(5.0, float(teacher_rating))),
        "remarks": None,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.student_participation.insert_one(doc)
    return {"student_id": student_id, "teacher_rating": doc["participationScore"]}


@participation_router.get("/student/{student_id}")
async def get_participation_for_student(student_id: int):
    """Get participation (latest or average) for a student by student_id."""
    db = get_database()
    email = await _email_from_student_id(db, student_id)
    if not email:
        raise HTTPException(status_code=404, detail="Student not found")
    cursor = db.student_participation.find({"userEmail": email, "isActive": True}).sort("createdAt", -1).limit(1)
    doc = await cursor.to_list(length=1)
    if not doc:
        return {"student_id": student_id, "teacher_rating": 0}
    return {"student_id": student_id, "teacher_rating": doc[0].get("participationScore", 0)}


@prediction_router.post("/manual", response_model=PredictionResponse)
async def predict_manual(request: PredictManualRequest):
    """
    Predict grade using the trained Logistic Regression model from model/train_model.py.

    Input features (raw, from client):
      - weeklySelfStudyHours
      - attendancePercentage
      - classParticipation
      - totalScore

    Pipeline (must match training script):
      1) MinMaxScaler on the 4 base features.
      2) Interaction features:
         - study_x_attendance
         - study_x_participation
         - attendance_x_participation
      3) LogisticRegression.predict / predict_proba
    """
    try:
        model, scaler = _load_model_and_scaler()
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500,
            detail=f"ML model not available: {exc}",
        )

    # 1) Base raw features (shape: [1, 4])
    raw_features = np.array(
        [
            [
                float(request.weeklySelfStudyHours),
                float(request.attendancePercentage),
                float(request.classParticipation),
                float(request.totalScore),
            ]
        ]
    )

    # 2) Scale with MinMaxScaler (same as in training)
    scaled = scaler.transform(raw_features)
    weekly_self_study_hours, attendance_percentage, class_participation, total_score = scaled[0]

    # 3) Interaction features (on scaled values, same as training script)
    study_x_attendance = weekly_self_study_hours * attendance_percentage
    study_x_participation = weekly_self_study_hours * class_participation
    attendance_x_participation = attendance_percentage * class_participation

    # 4) Final feature vector in the exact order used during training
    final_features = np.array(
        [
            [
                weekly_self_study_hours,
                attendance_percentage,
                class_participation,
                total_score,
                study_x_attendance,
                study_x_participation,
                attendance_x_participation,
            ]
        ]
    )

    # 5) Predict with Logistic Regression
    try:
        # Use predict_proba if available to compute confidence
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(final_features)[0]
            best_idx = int(np.argmax(proba))
            best_class = int(model.classes_[best_idx])
            grade = NUM_TO_GRADE.get(best_class, "F")
            confidence = float(proba[best_idx])
        else:
            best_class = int(model.predict(final_features)[0])
            grade = NUM_TO_GRADE.get(best_class, "F")
            confidence = None
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500,
            detail=f"Failed to run ML prediction: {exc}",
        )

    feature_payload = {
        "weeklySelfStudyHours": request.weeklySelfStudyHours,
        "attendancePercentage": request.attendancePercentage,
        "classParticipation": request.classParticipation,
        "totalScore": request.totalScore,
    }

    return PredictionResponse(
        predictedGrade=grade,
        confidence=confidence,
        features=feature_payload,
    )


def predict_grade_from_features(
    weekly_self_study_hours: float,
    attendance_percentage: float,
    class_participation: float,
    total_score: float,
):
    """
    Run ML model on the 4 raw features. Returns (grade: str, confidence: float | None, predicted_score: float).
    predicted_score is a 0-100 value derived from grade (A=92, B=82, C=72, D=62, F=45) or from proba.
    """
    model, scaler = _load_model_and_scaler()
    raw_features = np.array([[
        float(weekly_self_study_hours),
        float(attendance_percentage),
        float(class_participation),
        float(total_score),
    ]])
    scaled = scaler.transform(raw_features)
    w, a, c, t = scaled[0]
    study_x_att = w * a
    study_x_part = w * c
    att_x_part = a * c
    final = np.array([[w, a, c, t, study_x_att, study_x_part, att_x_part]])
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(final)[0]
        best_idx = int(np.argmax(proba))
        best_class = int(model.classes_[best_idx])
        grade = NUM_TO_GRADE.get(best_class, "F")
        confidence = float(proba[best_idx])
    else:
        best_class = int(model.predict(final)[0])
        grade = NUM_TO_GRADE.get(best_class, "F")
        confidence = None
    grade_to_score = {"A": 92.0, "B": 82.0, "C": 72.0, "D": 62.0, "F": 45.0}
    predicted_score = grade_to_score.get(grade, 50.0)
    return grade, confidence, predicted_score

