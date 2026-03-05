"""
Student Results API: CRUD over assignment_submissions for the Teacher Student Results page.
Result = one assignment_submissions doc; assessment_id in API = assignment_id in DB.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_database
from app.auth import require_role, get_current_user

router = APIRouter(prefix="/api/v1/results", tags=["Results"])


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _student_id_from_email(email: str) -> int:
    return abs(hash(email)) % 1000000


def _grade_from_marks(marks: float, max_marks: float) -> str:
    if max_marks <= 0:
        return "F"
    pct = (marks / max_marks) * 100
    if pct >= 90:
        return "A+"
    if pct >= 80:
        return "A"
    if pct >= 70:
        return "B+"
    if pct >= 60:
        return "B"
    if pct >= 50:
        return "C+"
    if pct >= 40:
        return "C"
    return "F"


async def _student_id_to_email(db) -> dict:
    """Build map student_id (int) -> email for all students."""
    users = await db.users.find(
        {"user_role": {"$in": ["student", "Student", "STUDENT"]}},
        {"_id": 0, "email": 1},
    ).to_list(1000)
    return {_student_id_from_email(u["email"]): u["email"] for u in users}


@router.get("/me")
async def list_my_results(
    user: dict = Depends(get_current_user),
):
    """
    List results for the current user (student). Returns only their assignment submissions.
    """
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    items: List[dict] = []
    async for doc in db.assignment_submissions.find({"userEmail": email}, {"_id": 0}).sort("createdAt", -1):
        marks = float(doc.get("marks", 0))
        max_marks = float(doc.get("max_marks", 0))
        aid = doc.get("assignment_id")
        items.append({
            "result_id": doc.get("id"),
            "student_id": _student_id_from_email(email),
            "assessment_id": aid,
            "marks_obtained": marks,
            "grade": _grade_from_marks(marks, max_marks),
            "student_name": None,
            "student_email": email,
            "assessment_title": f"Assignment {aid}" if aid is not None else "—",
            "module_name": None,
            "module_code": None,
            "max_marks": max_marks,
            "created_at": doc.get("createdAt"),
            "updated_at": doc.get("updatedAt"),
        })
    return items


@router.get("/")
async def list_results(
    student_id: Optional[int] = Query(None),
    assessment_id: Optional[str] = Query(None),
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """
    List results (assignment submissions) with student names and assessment titles.
    Optional filters: student_id (numeric hash), assessment_id (= assignment_id).
    """
    db = get_database()
    query: dict = {}
    if student_id is not None:
        users = await db.users.find(
            {"user_role": {"$in": ["student", "Student", "STUDENT"]}},
            {"_id": 0, "email": 1, "firstName": 1, "lastName": 1},
        ).to_list(1000)
        emails_for_student = [u["email"] for u in users if _student_id_from_email(u["email"]) == student_id]
        if not emails_for_student:
            return []
        query["userEmail"] = {"$in": emails_for_student}
    if assessment_id is not None:
        try:
            aid = int(assessment_id)
            query["assignment_id"] = aid
        except (TypeError, ValueError):
            query["assignment_id"] = assessment_id

    items: List[dict] = []
    async for doc in db.assignment_submissions.find(query, {"_id": 0}).sort("createdAt", -1):
        email = doc.get("userEmail") or ""
        name = "—"
        if email:
            u = await db.users.find_one({"email": email}, {"_id": 0, "firstName": 1, "lastName": 1})
            if u:
                name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or email
        marks = float(doc.get("marks", 0))
        max_marks = float(doc.get("max_marks", 0))
        grade = _grade_from_marks(marks, max_marks)
        aid = doc.get("assignment_id")
        items.append({
            "result_id": doc.get("id"),
            "student_id": _student_id_from_email(email) if email else 0,
            "assessment_id": aid,
            "marks_obtained": marks,
            "grade": grade,
            "student_name": name,
            "student_email": email,
            "assessment_title": f"Assignment {aid}" if aid is not None else "—",
            "module_name": None,
            "module_code": None,
            "max_marks": max_marks,
            "created_at": doc.get("createdAt"),
            "updated_at": doc.get("updatedAt"),
        })
    return items


@router.get("/{result_id}")
async def get_result(
    result_id: str,
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """Get one result by id (submission document id)."""
    db = get_database()
    doc = await db.assignment_submissions.find_one({"id": result_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Result not found")
    email = doc.get("userEmail") or ""
    name = "—"
    if email:
        u = await db.users.find_one({"email": email}, {"_id": 0, "firstName": 1, "lastName": 1})
        if u:
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or email
    marks = float(doc.get("marks", 0))
    max_marks = float(doc.get("max_marks", 0))
    aid = doc.get("assignment_id")
    return {
        "result_id": doc.get("id"),
        "student_id": _student_id_from_email(email) if email else 0,
        "assessment_id": aid,
        "marks_obtained": marks,
        "grade": _grade_from_marks(marks, max_marks),
        "student_name": name,
        "student_email": email,
        "assessment_title": f"Assignment {aid}" if aid is not None else "—",
        "max_marks": max_marks,
        "created_at": doc.get("createdAt"),
        "updated_at": doc.get("updatedAt"),
    }


@router.post("/")
async def create_result(
    body: dict,
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """
    Create a result (one assignment_submissions document).
    Body: student_id (int, resolved to email) OR userEmail (str); assessment_id (assignment_id);
    marks_obtained; max_marks (optional, default 100).
    """
    db = get_database()
    user_email: Optional[str] = None
    if body.get("userEmail"):
        user_email = str(body["userEmail"]).strip()
    if not user_email and body.get("student_id") is not None:
        id_to_email = await _student_id_to_email(db)
        try:
            sid = int(body["student_id"])
            user_email = id_to_email.get(sid)
        except (TypeError, ValueError):
            if isinstance(body.get("student_id"), str) and "@" in str(body["student_id"]):
                user_email = str(body["student_id"]).strip()
    if not user_email:
        raise HTTPException(status_code=400, detail="Provide userEmail or a valid student_id (email or numeric)")

    assessment_id = body.get("assessment_id")
    if assessment_id is None:
        raise HTTPException(status_code=400, detail="assessment_id is required")
    try:
        assignment_id = int(assessment_id)
    except (TypeError, ValueError):
        assignment_id = assessment_id

    marks_obtained = float(body.get("marks_obtained", 0))
    max_marks = float(body.get("max_marks", 100))
    if max_marks <= 0:
        max_marks = 100.0

    doc = {
        "id": str(uuid.uuid4()),
        "assignment_id": assignment_id,
        "student_id": _student_id_from_email(user_email),
        "userEmail": user_email,
        "marks": marks_obtained,
        "max_marks": max_marks,
        "createdAt": _now_iso(),
    }
    await db.assignment_submissions.insert_one(doc)
    grade = _grade_from_marks(marks_obtained, max_marks)
    u = await db.users.find_one({"email": user_email}, {"_id": 0, "firstName": 1, "lastName": 1})
    name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or user_email if u else user_email
    return {
        "result_id": doc["id"],
        "student_id": doc["student_id"],
        "assessment_id": assignment_id,
        "marks_obtained": marks_obtained,
        "grade": grade,
        "student_name": name,
        "student_email": user_email,
        "assessment_title": f"Assignment {assignment_id}",
        "max_marks": max_marks,
        "created_at": doc["createdAt"],
        "updated_at": None,
    }


@router.put("/{result_id}")
async def update_result(
    result_id: str,
    body: dict,
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """Update marks/grade for a result (submission)."""
    db = get_database()
    doc = await db.assignment_submissions.find_one({"id": result_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Result not found")
    updates: dict = {"updatedAt": _now_iso()}
    if "marks_obtained" in body and body["marks_obtained"] is not None:
        updates["marks"] = float(body["marks_obtained"])
    if "max_marks" in body and body["max_marks"] is not None:
        updates["max_marks"] = float(body["max_marks"])
    if len(updates) > 1:
        await db.assignment_submissions.update_one({"id": result_id}, {"$set": updates})
    doc = await db.assignment_submissions.find_one({"id": result_id}, {"_id": 0})
    email = doc.get("userEmail") or ""
    name = "—"
    if email:
        u = await db.users.find_one({"email": email}, {"_id": 0, "firstName": 1, "lastName": 1})
        if u:
            name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or email
    marks = float(doc.get("marks", 0))
    max_marks = float(doc.get("max_marks", 0))
    aid = doc.get("assignment_id")
    return {
        "result_id": doc.get("id"),
        "student_id": _student_id_from_email(email) if email else 0,
        "assessment_id": aid,
        "marks_obtained": marks,
        "grade": _grade_from_marks(marks, max_marks),
        "student_name": name,
        "student_email": email,
        "assessment_title": f"Assignment {aid}" if aid is not None else "—",
        "max_marks": max_marks,
        "created_at": doc.get("createdAt"),
        "updated_at": doc.get("updatedAt"),
    }


@router.delete("/{result_id}")
async def delete_result(
    result_id: str,
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """Delete a result (submission)."""
    db = get_database()
    result = await db.assignment_submissions.delete_one({"id": result_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Result not found")
    return {"success": True}
