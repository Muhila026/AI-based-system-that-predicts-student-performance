"""
Routes for schema collections: subjects, student_subjects, teacher_subjects,
student_subject_marks (assessment marks per student per subject), predictions (ML result),
subject_assignments (assignments per subject, created by that subject's teacher).
Assignments support optional PDF upload.
"""
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime
import re
import uuid

from app.database import get_database
from app.auth import require_role, get_current_user
from app.models import (
    SubjectCreate,
    StudentSubjectCreate,
    TeacherSubjectCreate,
    StudentSubjectMarksCreate,
    PredictionCreate,
    SubjectAssignmentCreate,
)

router = APIRouter(prefix="/api/v1/schema", tags=["Schema Collections"])

# PDF uploads for assignments (teacher uploads assignment PDF)
ASSIGNMENT_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "assignments"
ASSIGNMENT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
# Student assignment submission PDFs
SUBMISSION_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "assignment_submissions"
SUBMISSION_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------- Subjects ----------
@router.get("/subjects")
async def list_subjects(user: dict = Depends(require_role(["admin", "teacher", "student"]))):
    """List all subjects (subject/course name only)."""
    db = get_database()
    cursor = db.subjects.find({}, {"_id": 1, "subject_name": 1})
    items = []
    async for doc in cursor:
        items.append({
            "_id": doc.get("_id"),
            "subject_name": doc.get("subject_name"),
        })
    return items


@router.post("/subjects")
async def create_subject(
    body: SubjectCreate,
    user: dict = Depends(require_role(["admin"])),
):
    """Create a subject (admin only)."""
    db = get_database()
    existing = await db.subjects.find_one({"_id": body.id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject id '{body.id}' already exists")
    doc = {
        "_id": body.id,
        "subject_name": body.subject_name,
    }
    await db.subjects.insert_one(doc)
    return doc


@router.put("/subjects/{subject_id}")
async def update_subject(
    subject_id: str,
    body: dict,
    user: dict = Depends(require_role(["admin"])),
):
    """Update subject (admin only)."""
    db = get_database()
    updates = {k: v for k, v in body.items() if k in ("subject_name",)}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    result = await db.subjects.update_one({"_id": subject_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    doc = await db.subjects.find_one({"_id": subject_id}, {"_id": 0})
    return {"_id": subject_id, **doc}


@router.delete("/subjects/{subject_id}")
async def delete_subject(
    subject_id: str,
    user: dict = Depends(require_role(["admin"])),
):
    """Delete subject (admin only)."""
    db = get_database()
    result = await db.subjects.delete_one({"_id": subject_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"message": "Subject deleted"}


# ---------- Student Subjects ----------
def _student_id_filter(user: dict, student_id: str | None):
    """For student role, only allow viewing own enrollments. Admin/teacher can pass student_id."""
    role = (user.get("role") or "").strip().upper()
    email = (user.get("email") or user.get("sub") or "").strip()
    if role == "STUDENT" and email:
        return email  # student always sees only their own
    return student_id


@router.get("/student-subjects")
async def list_student_subjects(
    student_id: str = Query(None),
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """List student_subjects. Filter by student_id if given. Students only see their own."""
    db = get_database()
    effective_id = _student_id_filter(user, student_id)
    query = {} if not effective_id else {"student_id": effective_id}
    cursor = db.student_subjects.find(query, {"_id": 1, "student_id": 1, "subject_id": 1})
    items = []
    async for doc in cursor:
        items.append({
            "_id": doc.get("_id"),
            "student_id": doc.get("student_id"),
            "subject_id": doc.get("subject_id"),
        })
    return items


@router.post("/student-subjects")
async def create_student_subject(
    body: StudentSubjectCreate,
    user: dict = Depends(require_role(["admin"])),
):
    """Assign a subject to a student (admin only)."""
    db = get_database()
    existing = await db.student_subjects.find_one({"_id": body.id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Student subject id '{body.id}' already exists")
    doc = {
        "_id": body.id,
        "student_id": body.student_id,
        "subject_id": body.subject_id,
    }
    await db.student_subjects.insert_one(doc)
    return doc


@router.delete("/student-subjects/{record_id}")
async def delete_student_subject(
    record_id: str,
    user: dict = Depends(require_role(["admin"])),
):
    """Remove subject from student (admin only)."""
    db = get_database()
    result = await db.student_subjects.delete_one({"_id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Student subject removed"}


# ---------- Teacher Subjects ----------
# Use a separate path to avoid any conflict with /teacher-subjects/{record_id} (fixes 405)
@router.get("/my-teacher-subjects")
async def list_my_teacher_subjects(user: dict = Depends(require_role(["teacher", "admin"]))):
    """
    List subjects assigned to the current teacher (from teacher_subjects table).
    Returns each assignment with subject_id and subject_name (joined from subjects).
    teacher_id is matched case-insensitively so login email matches DB regardless of case.
    """
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Teacher email missing")
    email_regex = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
    cursor = db.teacher_subjects.find({"teacher_id": email_regex}, {"_id": 1, "teacher_id": 1, "subject_id": 1})
    items = []
    async for doc in cursor:
        subject_id = doc.get("subject_id")
        subject_name = None
        if subject_id:
            sub = await db.subjects.find_one({"_id": subject_id}, {"subject_name": 1})
            if not sub and isinstance(subject_id, str) and subject_id.isdigit():
                sub = await db.subjects.find_one({"_id": int(subject_id)}, {"subject_name": 1})
            subject_name = (sub.get("subject_name") if sub else None) or (subject_id if isinstance(subject_id, str) else str(subject_id))
        raw_id = doc.get("_id")
        items.append({
            "id": str(raw_id) if raw_id is not None else "",
            "teacher_id": doc.get("teacher_id"),
            "subject_id": str(subject_id) if subject_id is not None else "",
            "subject_name": subject_name or "",
        })
    return items


@router.get("/teacher-subjects")
async def list_teacher_subjects(
    teacher_id: str = Query(None),
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """List teacher_subjects. Filter by teacher_id if given."""
    db = get_database()
    query = {} if not teacher_id else {"teacher_id": teacher_id}
    cursor = db.teacher_subjects.find(query, {"_id": 1, "teacher_id": 1, "subject_id": 1})
    items = []
    async for doc in cursor:
        items.append({
            "_id": doc.get("_id"),
            "teacher_id": doc.get("teacher_id"),
            "subject_id": doc.get("subject_id"),
        })
    return items


@router.post("/teacher-subjects")
async def create_teacher_subject(
    body: TeacherSubjectCreate,
    user: dict = Depends(require_role(["admin"])),
):
    """Assign a subject to a teacher (admin only)."""
    db = get_database()
    existing = await db.teacher_subjects.find_one({"_id": body.id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Teacher subject id '{body.id}' already exists")
    doc = {
        "_id": body.id,
        "teacher_id": body.teacher_id,
        "subject_id": body.subject_id,
    }
    await db.teacher_subjects.insert_one(doc)
    return doc


@router.delete("/teacher-subjects/{record_id}")
async def delete_teacher_subject(
    record_id: str,
    user: dict = Depends(require_role(["admin"])),
):
    """Remove subject from teacher (admin only)."""
    db = get_database()
    result = await db.teacher_subjects.delete_one({"_id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Teacher subject removed"}


# ---------- Student Subject Marks (Assessment marks per student per subject) ----------
@router.get("/student-subject-marks")
async def list_student_subject_marks(
    student_id: str = Query(None),
    subject_id: str = Query(None),
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """List assessment marks (student_id, subject_id, assignment, quiz, mid_exam, attendance)."""
    db = get_database()
    query = {}
    if student_id:
        query["student_id"] = student_id
    if subject_id:
        query["subject_id"] = subject_id
    cursor = db.student_subject_marks.find(query)
    items = []
    async for doc in cursor:
        items.append({
            "_id": doc.get("_id"),
            "student_id": doc.get("student_id"),
            "subject_id": doc.get("subject_id"),
            "assignment": doc.get("assignment", 0),
            "quiz": doc.get("quiz", 0),
            "mid_exam": doc.get("mid_exam", 0),
            "attendance": doc.get("attendance", 0),
        })
    return items


@router.post("/student-subject-marks")
async def create_or_update_student_subject_marks(
    body: StudentSubjectMarksCreate,
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Create or replace marks for a student in a subject (admin/teacher)."""
    db = get_database()
    doc = {
        "_id": body.id,
        "student_id": body.student_id,
        "subject_id": body.subject_id,
        "assignment": body.assignment,
        "quiz": body.quiz,
        "mid_exam": body.mid_exam,
        "attendance": body.attendance,
    }
    await db.student_subject_marks.update_one(
        {"_id": body.id},
        {"$set": doc},
        upsert=True,
    )
    return doc


@router.delete("/student-subject-marks/{record_id}")
async def delete_student_subject_marks(
    record_id: str,
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Delete assessment marks record."""
    db = get_database()
    result = await db.student_subject_marks.delete_one({"_id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Marks record deleted"}


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


async def _teacher_teaches_subject(db, teacher_email: str, subject_id: str) -> bool:
    """True if this teacher is assigned to teach this subject (teacher_subjects). Case-insensitive teacher_id."""
    if not teacher_email or not subject_id:
        return False
    email_regex = {"$regex": f"^{re.escape(teacher_email.strip())}$", "$options": "i"}
    doc = await db.teacher_subjects.find_one({"teacher_id": email_regex, "subject_id": subject_id.strip()})
    return doc is not None


async def _student_enrolled_in_subject(db, student_email: str, subject_id: str) -> bool:
    """True if this student is enrolled in this subject (student_subjects)."""
    if not student_email or not subject_id:
        return False
    doc = await db.student_subjects.find_one({"student_id": student_email.strip(), "subject_id": subject_id.strip()})
    return doc is not None


# ---------- Subject Assignments (per subject; created by that subject's teacher; for students in that subject) ----------
@router.get("/assignments")
async def list_subject_assignments(
    subject_id: str = Query(None, description="Filter by subject"),
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """
    List assignments. Each assignment belongs to a subject and is created by the teacher who teaches that subject.
    - Admin: all assignments (optionally filter by subject_id).
    - Teacher: only assignments for subjects they teach.
    - Student: only assignments for subjects they are enrolled in.
    """
    db = get_database()
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()

    query = {}
    if subject_id:
        query["subject_id"] = subject_id

    if role == "teacher" and email:
        # Teacher: only subjects they teach (case-insensitive teacher_id)
        email_regex = {"$regex": f"^{re.escape(email)}$", "$options": "i"}
        teacher_subjects = await db.teacher_subjects.find({"teacher_id": email_regex}, {"subject_id": 1}).to_list(500)
        allowed_subject_ids = [t["subject_id"] for t in teacher_subjects]
        if not allowed_subject_ids:
            return []
        query["subject_id"] = query.get("subject_id") or {"$in": allowed_subject_ids}
        if subject_id and subject_id not in allowed_subject_ids:
            return []
    elif role == "student" and email:
        # Student: only subjects they are enrolled in
        student_subjects = await db.student_subjects.find({"student_id": email}, {"subject_id": 1}).to_list(500)
        allowed_subject_ids = [s["subject_id"] for s in student_subjects]
        if not allowed_subject_ids:
            return []
        query["subject_id"] = query.get("subject_id") or {"$in": allowed_subject_ids}
        if subject_id and subject_id not in allowed_subject_ids:
            return []

    cursor = db.subject_assignments.find(query, {"_id": 0}).sort("createdAt", -1)
    items = []
    async for doc in cursor:
        subj = await db.subjects.find_one({"_id": doc.get("subject_id")}, {"subject_name": 1})
        items.append({
            "id": doc.get("id"),
            "subject_id": doc.get("subject_id"),
            "subject_name": (subj or {}).get("subject_name") or doc.get("subject_id"),
            "teacher_id": doc.get("teacher_id"),
            "title": doc.get("title"),
            "description": doc.get("description"),
            "max_marks": doc.get("max_marks", 100),
            "assignment_type": doc.get("assignment_type", "ASSIGNMENT"),
            "pdf_url": doc.get("pdf_url"),
            "created_at": doc.get("createdAt"),
            "updated_at": doc.get("updatedAt"),
        })
    return items


@router.get("/assignments/{assignment_id}")
async def get_subject_assignment(
    assignment_id: str,
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """Get one assignment by id. Teacher/student see only if they teach/enrolled in that subject."""
    db = get_database()
    doc = await db.subject_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    subj_id = doc.get("subject_id")
    if role == "teacher" and email and doc.get("teacher_id") != email:
        if not await _teacher_teaches_subject(db, email, subj_id):
            raise HTTPException(status_code=403, detail="You can only view assignments for subjects you teach")
    if role == "student" and email:
        if not await _student_enrolled_in_subject(db, email, subj_id):
            raise HTTPException(status_code=403, detail="You can only view assignments for subjects you are enrolled in")
    subj = await db.subjects.find_one({"_id": subj_id}, {"subject_name": 1})
    return {
        "id": doc.get("id"),
        "subject_id": doc.get("subject_id"),
        "subject_name": (subj or {}).get("subject_name") or subj_id,
        "teacher_id": doc.get("teacher_id"),
        "title": doc.get("title"),
        "description": doc.get("description"),
        "max_marks": doc.get("max_marks", 100),
        "assignment_type": doc.get("assignment_type", "ASSIGNMENT"),
        "pdf_url": doc.get("pdf_url"),
        "created_at": doc.get("createdAt"),
        "updated_at": doc.get("updatedAt"),
    }


@router.post("/assignments/{assignment_id}/pdf")
async def upload_assignment_pdf(
    assignment_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Upload a PDF file for an assignment. Replaces existing PDF if any."""
    db = get_database()
    doc = await db.subject_assignments.find_one({"id": assignment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "teacher" and doc.get("teacher_id") != email:
        if not await _teacher_teaches_subject(db, email, doc.get("subject_id")):
            raise HTTPException(status_code=403, detail="You can only upload PDF for assignments you own")
    fn = (file.filename or "").lower()
    ct = (file.content_type or "").lower()
    if not (fn.endswith(".pdf") or ct == "application/pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    path = ASSIGNMENT_UPLOAD_DIR / f"{assignment_id}.pdf"
    path.write_bytes(content)
    pdf_url = f"/api/v1/schema/assignments/files/{assignment_id}"
    await db.subject_assignments.update_one(
        {"id": assignment_id},
        {"$set": {"pdf_url": pdf_url, "updatedAt": _now_iso()}},
    )
    return {"pdf_url": pdf_url, "message": "PDF uploaded"}


@router.get("/assignments/files/{assignment_id}")
async def serve_assignment_pdf(
    assignment_id: str,
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """Serve assignment PDF for download/view. Teacher/admin of assignment or student enrolled in subject."""
    db = get_database()
    doc = await db.subject_assignments.find_one({"id": assignment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if not doc.get("pdf_url"):
        raise HTTPException(status_code=404, detail="No PDF uploaded for this assignment")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    subj_id = doc.get("subject_id")
    if role == "teacher" and email and doc.get("teacher_id") != email:
        if not await _teacher_teaches_subject(db, email, subj_id):
            raise HTTPException(status_code=403, detail="Not allowed")
    elif role == "student" and email:
        if not await _student_enrolled_in_subject(db, email, subj_id):
            raise HTTPException(status_code=403, detail="Not allowed")
    path = ASSIGNMENT_UPLOAD_DIR / f"{assignment_id}.pdf"
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=str(path),
        filename=f"{(doc.get('title') or 'assignment')}.pdf",
        media_type="application/pdf",
    )


@router.post("/assignments")
async def create_subject_assignment(
    body: SubjectAssignmentCreate,
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """
    Create an assignment for a subject. Only the teacher who teaches that subject can create (admin can create for any).
    Students enrolled in that subject automatically "have" this assignment.
    """
    db = get_database()
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()

    subject = await db.subjects.find_one({"_id": body.subject_id}, {"_id": 1, "subject_name": 1})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if role == "teacher":
        if not email:
            raise HTTPException(status_code=401, detail="Not authenticated")
        if not await _teacher_teaches_subject(db, email, body.subject_id):
            raise HTTPException(
                status_code=403,
                detail="You can only create assignments for subjects you teach. Get assigned to this subject in Teacher Subjects first.",
            )
        teacher_id = email
    else:
        teacher_id = email or "admin"

    atype = (body.assignment_type or "ASSIGNMENT").strip().upper()
    if atype not in ("ASSIGNMENT", "QUIZ", "EXAM"):
        atype = "ASSIGNMENT"

    now = _now_iso()
    assignment_id = str(uuid.uuid4())
    doc = {
        "id": assignment_id,
        "subject_id": body.subject_id,
        "teacher_id": teacher_id,
        "title": (body.title or "").strip() or "Untitled",
        "description": (body.description or "").strip() or None,
        "max_marks": float(body.max_marks) if body.max_marks is not None else 100.0,
        "assignment_type": atype,
        "pdf_url": None,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.subject_assignments.insert_one(doc)
    return {
        "id": doc["id"],
        "subject_id": doc["subject_id"],
        "subject_name": subject.get("subject_name"),
        "teacher_id": doc["teacher_id"],
        "title": doc["title"],
        "description": doc["description"],
        "max_marks": doc["max_marks"],
        "assignment_type": doc["assignment_type"],
        "pdf_url": doc.get("pdf_url"),
        "created_at": doc["createdAt"],
        "updated_at": doc["updatedAt"],
    }


@router.put("/assignments/{assignment_id}")
async def update_subject_assignment(
    assignment_id: str,
    body: dict = Body(...),
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Update assignment. Only the teacher who created it (or admin) can update."""
    db = get_database()
    doc = await db.subject_assignments.find_one({"id": assignment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "teacher" and doc.get("teacher_id") != email:
        if not await _teacher_teaches_subject(db, email, doc.get("subject_id")):
            raise HTTPException(status_code=403, detail="You can only edit assignments for subjects you teach")

    updates = {"updatedAt": _now_iso()}
    if "title" in body and body["title"] is not None:
        updates["title"] = (str(body["title"]) or "").strip() or "Untitled"
    if "description" in body:
        updates["description"] = (str(body["description"]) or "").strip() or None
    if "max_marks" in body and body["max_marks"] is not None:
        try:
            updates["max_marks"] = float(body["max_marks"])
        except (TypeError, ValueError):
            pass
    if "assignment_type" in body and body["assignment_type"] is not None:
        t = str(body["assignment_type"]).strip().upper()
        if t in ("ASSIGNMENT", "QUIZ", "EXAM"):
            updates["assignment_type"] = t

    await db.subject_assignments.update_one({"id": assignment_id}, {"$set": updates})
    updated = await db.subject_assignments.find_one({"id": assignment_id}, {"_id": 0})
    subj = await db.subjects.find_one({"_id": updated.get("subject_id")}, {"subject_name": 1})
    return {
        "id": updated.get("id"),
        "subject_id": updated.get("subject_id"),
        "subject_name": (subj or {}).get("subject_name"),
        "teacher_id": updated.get("teacher_id"),
        "title": updated.get("title"),
        "description": updated.get("description"),
        "max_marks": updated.get("max_marks"),
        "assignment_type": updated.get("assignment_type"),
        "pdf_url": updated.get("pdf_url"),
        "created_at": updated.get("createdAt"),
        "updated_at": updated.get("updatedAt"),
    }


@router.delete("/assignments/{assignment_id}")
async def delete_subject_assignment(
    assignment_id: str,
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Delete assignment. Only the teacher who created it (or admin) can delete."""
    db = get_database()
    doc = await db.subject_assignments.find_one({"id": assignment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "teacher" and doc.get("teacher_id") != email:
        if not await _teacher_teaches_subject(db, email, doc.get("subject_id")):
            raise HTTPException(status_code=403, detail="You can only delete assignments for subjects you teach")
    pdf_path = ASSIGNMENT_UPLOAD_DIR / f"{assignment_id}.pdf"
    if pdf_path.exists():
        try:
            pdf_path.unlink()
        except Exception:
            pass
    await db.subject_assignments.delete_one({"id": assignment_id})
    return {"message": "Assignment deleted"}


@router.get("/assignments/{assignment_id}/students")
async def list_students_for_assignment(
    assignment_id: str,
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """
    List students who have this assignment (i.e. enrolled in the assignment's subject).
    Teacher: only for assignments they created / subjects they teach. Student: only themselves if enrolled.
    """
    db = get_database()
    doc = await db.subject_assignments.find_one({"id": assignment_id}, {"subject_id": 1, "teacher_id": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    subj_id = doc.get("subject_id")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()

    if role == "teacher":
        if doc.get("teacher_id") != email and not await _teacher_teaches_subject(db, email, subj_id):
            raise HTTPException(status_code=403, detail="Not allowed")
    elif role == "student":
        if not await _student_enrolled_in_subject(db, email, subj_id):
            raise HTTPException(status_code=403, detail="Not allowed")
        # Return only current student
        u = await db.users.find_one({"email": email}, {"_id": 0, "firstName": 1, "lastName": 1, "email": 1})
        name = (u.get("firstName") or "") + " " + (u.get("lastName") or "")
        name = name.strip() or email
        return [{"student_id": email, "student_name": name, "email": email}]

    # Admin or teacher: return all students enrolled in this subject
    cursor = db.student_subjects.find({"subject_id": subj_id}, {"student_id": 1})
    students = []
    async for row in cursor:
        sid = row.get("student_id")
        u = await db.users.find_one({"email": sid}, {"_id": 0, "firstName": 1, "lastName": 1, "email": 1})
        name = (u.get("firstName") or "") + " " + (u.get("lastName") or "") if u else ""
        name = name.strip() or sid
        students.append({"student_id": sid, "student_name": name, "email": sid})
    return students


def _sanitize_email_for_file(email: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", "_", (email or "").strip())[:64]


# ---------- Student assignment submission (upload PDF, teacher grades, student sees result) ----------
@router.post("/assignments/{assignment_id}/submit")
async def submit_assignment_pdf(
    assignment_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_role(["student"])),
):
    """Student uploads their assignment as PDF. One submission per student per assignment (replaces if resubmit)."""
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    doc = await db.subject_assignments.find_one({"id": assignment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if not await _student_enrolled_in_subject(db, email, doc.get("subject_id")):
        raise HTTPException(status_code=403, detail="You are not enrolled in this subject")
    fn = (file.filename or "").lower()
    ct = (file.content_type or "").lower()
    if not (fn.endswith(".pdf") or ct == "application/pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    safe_email = _sanitize_email_for_file(email)
    filename = f"{assignment_id}_{safe_email}.pdf"
    path = SUBMISSION_UPLOAD_DIR / filename
    path.write_bytes(content)
    submission_pdf_path = filename
    max_marks = float(doc.get("max_marks", 100))
    now = _now_iso()
    student_id_hash = abs(hash(email)) % 1000000
    existing = await db.assignment_submissions.find_one(
        {"assignment_id": assignment_id, "userEmail": email}
    )
    if existing:
        updates = {"submission_pdf_path": submission_pdf_path, "submitted_at": now}
        if not existing.get("id"):
            updates["id"] = str(uuid.uuid4())
        await db.assignment_submissions.update_one(
            {"assignment_id": assignment_id, "userEmail": email},
            {"$set": updates},
        )
    else:
        await db.assignment_submissions.insert_one({
            "id": str(uuid.uuid4()),
            "assignment_id": assignment_id,
            "student_id": student_id_hash,
            "userEmail": email,
            "marks": None,
            "max_marks": max_marks,
            "createdAt": now,
            "submission_pdf_path": submission_pdf_path,
            "submitted_at": now,
        })
    return {"message": "Submission uploaded", "assignment_id": assignment_id}


@router.get("/assignments/submissions/me")
async def list_my_submissions(user: dict = Depends(require_role(["student"]))):
    """List current student's assignment submissions with assignment title and subject. For student portal."""
    db = get_database()
    email = (user.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cursor = db.assignment_submissions.find({"userEmail": email}).sort("submitted_at", -1)
    items = []
    async for sub in cursor:
        aid = sub.get("assignment_id")
        if not aid:
            continue
        assign = await db.subject_assignments.find_one({"id": aid}, {"title": 1, "subject_id": 1})
        if not assign:
            continue
        subj = await db.subjects.find_one({"_id": assign.get("subject_id")}, {"subject_name": 1})
        items.append({
            "id": sub.get("id"),
            "assignment_id": aid,
            "assignment_title": assign.get("title") or "—",
            "subject_id": assign.get("subject_id"),
            "subject_name": (subj or {}).get("subject_name") or assign.get("subject_id"),
            "submitted_at": sub.get("submitted_at"),
            "marks": sub.get("marks"),
            "max_marks": sub.get("max_marks"),
            "has_pdf": bool(sub.get("submission_pdf_path")),
        })
    return items


@router.get("/assignments/{assignment_id}/submissions")
async def list_assignment_submissions(
    assignment_id: str,
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """List all submissions for an assignment. Teacher: only for subjects they teach. Admin: all."""
    db = get_database()
    doc = await db.subject_assignments.find_one({"id": assignment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "teacher" and doc.get("teacher_id") != email:
        if not await _teacher_teaches_subject(db, email, doc.get("subject_id")):
            raise HTTPException(status_code=403, detail="Not allowed")
    cursor = db.assignment_submissions.find(
        {"assignment_id": assignment_id}
    ).sort("submitted_at", -1)
    items = []
    async for sub in cursor:
        u = await db.users.find_one({"email": sub.get("userEmail")}, {"_id": 0, "firstName": 1, "lastName": 1, "email": 1})
        name = (u.get("firstName") or "") + " " + (u.get("lastName") or "") if u else ""
        name = name.strip() or sub.get("userEmail", "")
        items.append({
            "id": sub.get("id"),
            "userEmail": sub.get("userEmail"),
            "student_name": name,
            "submitted_at": sub.get("submitted_at"),
            "marks": sub.get("marks"),
            "max_marks": sub.get("max_marks"),
            "has_pdf": bool(sub.get("submission_pdf_path")),
        })
    return items


@router.put("/assignments/submissions/{submission_id}")
async def grade_submission(
    submission_id: str,
    body: dict = Body(...),
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Teacher/Admin set marks for a submission."""
    db = get_database()
    sub = await db.assignment_submissions.find_one({"id": submission_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    assign = await db.subject_assignments.find_one({"id": sub.get("assignment_id")})
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "teacher" and assign.get("teacher_id") != email:
        if not await _teacher_teaches_subject(db, email, assign.get("subject_id")):
            raise HTTPException(status_code=403, detail="Not allowed")
    marks = body.get("marks")
    if marks is not None:
        try:
            m = float(marks)
            await db.assignment_submissions.update_one(
                {"id": submission_id},
                {"$set": {"marks": m, "updatedAt": _now_iso()}},
            )
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid marks")
    updated = await db.assignment_submissions.find_one({"id": submission_id}, {"_id": 0})
    return {
        "id": updated.get("id"),
        "assignment_id": updated.get("assignment_id"),
        "userEmail": updated.get("userEmail"),
        "marks": updated.get("marks"),
        "max_marks": updated.get("max_marks"),
        "submitted_at": updated.get("submitted_at"),
    }


@router.get("/assignments/submissions/files/{submission_id}")
async def serve_submission_pdf(
    submission_id: str,
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """Download/view a submission PDF. Student can only view their own."""
    db = get_database()
    sub = await db.assignment_submissions.find_one({"id": submission_id})
    if not sub or not sub.get("submission_pdf_path"):
        raise HTTPException(status_code=404, detail="Submission or file not found")
    path = SUBMISSION_UPLOAD_DIR / sub["submission_pdf_path"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    role = (user.get("role") or "user").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "student":
        if sub.get("userEmail") != email:
            raise HTTPException(status_code=403, detail="You can only view your own submission")
    else:
        assign = await db.subject_assignments.find_one({"id": sub.get("assignment_id")})
        if not assign:
            raise HTTPException(status_code=404, detail="Assignment not found")
        if role == "teacher" and assign.get("teacher_id") != email:
            if not await _teacher_teaches_subject(db, email, assign.get("subject_id")):
                raise HTTPException(status_code=403, detail="Not allowed")
    return FileResponse(
        path=str(path),
        filename=f"submission_{submission_id}.pdf",
        media_type="application/pdf",
    )


# ---------- Predictions (ML result: student_id, subject_id, predicted_result, risk_level) ----------
@router.get("/predictions")
async def list_predictions(
    student_id: str = Query(None),
    subject_id: str = Query(None),
    user: dict = Depends(require_role(["admin", "teacher", "student"])),
):
    """List prediction records (ML result per student per subject)."""
    db = get_database()
    query = {}
    if student_id:
        query["student_id"] = student_id
    if subject_id:
        query["subject_id"] = subject_id
    cursor = db.predictions.find(query)
    items = []
    async for doc in cursor:
        items.append({
            "student_id": doc.get("student_id"),
            "subject_id": doc.get("subject_id"),
            "predicted_result": doc.get("predicted_result"),
            "risk_level": doc.get("risk_level"),
        })
    return items


@router.post("/predictions")
async def create_or_update_prediction(
    body: PredictionCreate,
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Create or update ML prediction for a student in a subject."""
    db = get_database()
    doc = {
        "student_id": body.student_id,
        "subject_id": body.subject_id,
        "predicted_result": body.predicted_result,
        "risk_level": body.risk_level,
    }
    await db.predictions.update_one(
        {"student_id": body.student_id, "subject_id": body.subject_id},
        {"$set": doc},
        upsert=True,
    )
    return doc


@router.delete("/predictions")
async def delete_prediction(
    student_id: str = Query(..., description="Student id"),
    subject_id: str = Query(..., description="Subject id"),
    user: dict = Depends(require_role(["admin", "teacher"])),
):
    """Delete prediction for a student in a subject."""
    db = get_database()
    result = await db.predictions.delete_one({
        "student_id": student_id,
        "subject_id": subject_id,
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return {"message": "Prediction deleted"}
