"""
Assignment submissions: teacher bulk upload → total_score = (sum(marks)/sum(max_marks))*100 per student.
Pipeline uses this for ML total_score (by userEmail).
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import uuid

from app.database import get_database
from app.auth import get_current_user, require_role
from app.models import (
    AssignmentSubmissionBulkRequest,
    StudentTotalScoreResponse,
)

router = APIRouter(prefix="/api/v1/assignment-submissions", tags=["Assignment Submissions"])


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


@router.post("/bulk")
async def bulk_upload_marks(
    request: AssignmentSubmissionBulkRequest,
    user: dict = Depends(require_role(["TEACHER", "ADMIN"])),
):
    """
    Teacher uploads marks per student. Store by userEmail when provided so pipeline can aggregate by current user.
    total_score per student is computed on read as (sum(marks)/sum(max_marks))*100.
    """
    db = get_database()
    for sub in request.submissions:
        if sub.max_marks <= 0:
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "assignment_id": request.assignment_id,
            "student_id": sub.student_id,
            "userEmail": sub.userEmail,
            "marks": sub.marks,
            "max_marks": sub.max_marks,
            "createdAt": _now_iso(),
        }
        await db.assignment_submissions.insert_one(doc)
    return {"message": "Marks uploaded", "count": len(request.submissions)}


@router.get("/me/total-score", response_model=StudentTotalScoreResponse)
async def get_my_total_score(user: dict = Depends(get_current_user)):
    """
    Current student's total_score = (sum(marks)/sum(max_marks))*100 across all assignment submissions.
    Uses userEmail to match; if submissions were stored without userEmail, returns 0.
    """
    db = get_database()
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cursor = db.assignment_submissions.find({"userEmail": email})
    total_marks = 0.0
    total_max = 0.0
    count = 0
    async for doc in cursor:
        total_marks += float(doc.get("marks", 0))
        total_max += float(doc.get("max_marks", 0))
        count += 1
    if total_max <= 0:
        total_score = 0.0
    else:
        total_score = (total_marks / total_max) * 100.0
    return StudentTotalScoreResponse(
        student_id=None,
        total_score=round(total_score, 2),
        total_marks=total_marks,
        total_max_marks=total_max,
        submission_count=count,
    )
