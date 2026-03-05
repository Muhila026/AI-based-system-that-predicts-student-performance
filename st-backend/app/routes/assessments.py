from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_database
from app.auth import require_role


router = APIRouter(prefix="/api/v1/assessments", tags=["Assessments"])


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _doc_to_assessment(doc: dict) -> dict:
    """Map DB assessment doc to frontend Assessment shape."""
    return {
        "assessment_id": doc.get("id"),
        "course_id": doc.get("courseId"),
        "module_id": doc.get("moduleId"),
        "assessment_type": (doc.get("assessmentType") or "ASSIGNMENT").upper(),
        "max_marks": doc.get("maxMarks", 0),
        "weightage": doc.get("weightage", 0.0),
        "title": doc.get("title"),
        "description": doc.get("description"),
        "course_name": doc.get("courseName"),
        "course_code": doc.get("courseCode"),
        "module_name": doc.get("moduleName"),
        "module_code": doc.get("moduleCode"),
        "created_at": doc.get("createdAt"),
        "updated_at": doc.get("updatedAt"),
    }


@router.get("/")
async def list_assessments(
    module_id: Optional[str] = Query(None),
    course_id: Optional[str] = Query(None),
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """
    List assessments.

    - Admin/Teacher: see all (optionally filtered by course/module).
    - Student: currently also sees all; can be filtered later by enrollment.
    """
    db = get_database()
    effective_course_id = course_id or module_id
    query: dict = {}
    if effective_course_id:
        query["courseId"] = effective_course_id

    # Teachers should only see assessments they created (by createdBy/email).
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "teacher" and email:
        query["createdBy"] = email

    cursor = db.assessments.find(query, {"_id": 0}).sort("createdAt", -1)
    items: List[dict] = []
    async for doc in cursor:
        items.append(_doc_to_assessment(doc))
    return items


@router.get("/{assessment_id}")
async def get_assessment(
    assessment_id: str,
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    db = get_database()
    doc = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return _doc_to_assessment(doc)


@router.post("/")
async def create_assessment(
    body: dict = Body(...),
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """
    Create a new assessment linked to a course.

    Expected body (from frontend AssessmentCreate):
    - course_id: string | number
    - assessment_type: 'EXAM' | 'QUIZ' | 'ASSIGNMENT'
    - max_marks: number
    - weightage: number
    - title?: string
    - description?: string
    """
    db = get_database()
    course_id = str(body.get("course_id") or "").strip()
    if not course_id:
        raise HTTPException(status_code=400, detail="course_id is required")

    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=400, detail="Course not found for given course_id")

    assessment_type = (body.get("assessment_type") or "ASSIGNMENT").upper()
    if assessment_type not in ("EXAM", "QUIZ", "ASSIGNMENT"):
        raise HTTPException(status_code=400, detail="assessment_type must be EXAM, QUIZ or ASSIGNMENT")

    try:
        max_marks = int(body.get("max_marks"))
        weightage = float(body.get("weightage"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="max_marks and weightage must be numeric")

    now = _now_iso()
    assessment_id = str(uuid.uuid4())
    doc = {
        "id": assessment_id,
        "courseId": course_id,
        "assessmentType": assessment_type,
        "maxMarks": max_marks,
        "weightage": weightage,
        "title": (body.get("title") or "").strip() or None,
        "description": (body.get("description") or "").strip() or None,
        "courseName": course.get("courseTitle") or course.get("name"),
        "courseCode": course.get("code"),
        "createdAt": now,
        "updatedAt": now,
        "createdBy": user.get("email"),
    }
    await db.assessments.insert_one(doc)
    return _doc_to_assessment(doc)


@router.put("/{assessment_id}")
async def update_assessment(
    assessment_id: str,
    body: dict = Body(...),
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Update basic fields of an assessment."""
    db = get_database()
    existing = await db.assessments.find_one({"id": assessment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Assessment not found")

    updates: dict = {"updatedAt": _now_iso()}

    if "assessment_type" in body and body["assessment_type"] is not None:
        t = str(body["assessment_type"]).upper()
        if t not in ("EXAM", "QUIZ", "ASSIGNMENT"):
            raise HTTPException(status_code=400, detail="assessment_type must be EXAM, QUIZ or ASSIGNMENT")
        updates["assessmentType"] = t

    if "max_marks" in body and body["max_marks"] is not None:
        try:
            updates["maxMarks"] = int(body["max_marks"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="max_marks must be numeric")

    if "weightage" in body and body["weightage"] is not None:
        try:
            updates["weightage"] = float(body["weightage"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="weightage must be numeric")

    if "title" in body:
        title = (body.get("title") or "").strip()
        updates["title"] = title or None

    if "description" in body:
        desc = (body.get("description") or "").strip()
        updates["description"] = desc or None

    # Optional: allow changing course_id
    if "course_id" in body and body["course_id"] is not None:
        course_id = str(body["course_id"]).strip()
        if course_id:
            course = await db.courses.find_one({"id": course_id}, {"_id": 0})
            if not course:
                raise HTTPException(status_code=400, detail="Course not found for given course_id")
            updates["courseId"] = course_id
            updates["courseName"] = course.get("courseTitle") or course.get("name")
            updates["courseCode"] = course.get("code")

    await db.assessments.update_one({"id": assessment_id}, {"$set": updates})
    doc = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    return _doc_to_assessment(doc or {})


@router.delete("/{assessment_id}")
async def delete_assessment(
    assessment_id: str,
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    db = get_database()
    result = await db.assessments.delete_one({"id": assessment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {"success": True}

