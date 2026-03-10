"""
Study Resources: upload (teacher: pending by subject), list by role, admin approve/reject.
Students see only approved resources for their selected subjects.
"""
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from fastapi.responses import FileResponse

from app.database import get_database
from app.auth import get_current_user, require_role
from app.routes.chat import chat_ws_manager

router = APIRouter(prefix="/study-resources", tags=["Study Resources"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "study_resources"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_REJECTED = "rejected"


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _doc_to_resource(doc: dict) -> dict:
    return {
        "id": doc.get("id"),
        "title": doc.get("title", ""),
        "class_name": doc.get("class_name", ""),
        "type": doc.get("type", "Other"),
        "description": doc.get("description"),
        "size": doc.get("size", "0 KB"),
        "uploadDate": doc.get("uploadDate", doc.get("createdAt", "")),
        "downloads": doc.get("downloads", 0),
        "fileUrl": doc.get("fileUrl", ""),
        "teacherId": doc.get("uploadedBy", ""),
        "teacherName": doc.get("teacherName", ""),
        "status": doc.get("status", STATUS_PENDING),
        "subject_id": doc.get("subject_id"),
        "subject_name": doc.get("subject_name"),
    }


async def _teacher_teaches_subject(db, teacher_email: str, subject_id: str) -> bool:
    if not teacher_email or not subject_id:
        return False
    email_regex = {"$regex": f"^{re.escape(teacher_email.strip())}$", "$options": "i"}
    doc = await db.teacher_subjects.find_one({"teacher_id": email_regex, "subject_id": str(subject_id).strip()})
    return doc is not None


async def _student_subject_ids(db, student_email: str) -> list:
    if not student_email:
        return []
    cursor = db.student_subjects.find({"student_id": student_email.strip()}, {"subject_id": 1})
    ids = []
    async for row in cursor:
        sid = row.get("subject_id")
        if sid is not None:
            ids.append(str(sid))
    return ids


@router.get("/")
@router.get("")
async def list_resources(user: dict = Depends(get_current_user)):
    """
    List study resources by role:
    - Teacher: all resources they uploaded (pending + approved).
    - Student: only approved resources for subjects they are enrolled in.
    - Admin: all active resources.
    """
    db = get_database()
    role = (user.get("role") or "").strip().lower()
    email = (user.get("email") or "").strip()

    if role == "teacher":
        cursor = db.study_resources.find(
            {"isActive": True, "uploadedBy": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"_id": 0},
        ).sort("createdAt", -1)
    elif role == "student":
        subject_ids = await _student_subject_ids(db, email)
        if not subject_ids:
            return []
        cursor = db.study_resources.find(
            {"isActive": True, "status": STATUS_APPROVED, "subject_id": {"$in": subject_ids}},
            {"_id": 0},
        ).sort("createdAt", -1)
    else:
        cursor = db.study_resources.find({"isActive": True}, {"_id": 0}).sort("createdAt", -1)

    items = []
    async for doc in cursor:
        items.append(_doc_to_resource(doc))
    return items


@router.get("/pending")
async def list_pending_resources(user: dict = Depends(require_role(["admin"]))):
    """Admin: list study resources pending approval."""
    db = get_database()
    cursor = db.study_resources.find(
        {"isActive": True, "status": STATUS_PENDING},
        {"_id": 0},
    ).sort("createdAt", -1)
    items = []
    async for doc in cursor:
        items.append(_doc_to_resource(doc))
    return items


@router.post("/")
@router.post("")
async def upload_resource(
    file: UploadFile = File(...),
    title: str = Form(...),
    class_name: str = Form(""),
    type: str = Form("Other"),
    description: str = Form(""),
    subject_id: str = Form(None),
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """
    Upload a study resource.
    Teacher: must pass subject_id for a subject they teach; resource is created as pending until admin approves.
    Admin: subject_id optional; resource is created as approved.
    """
    db = get_database()
    role = (user.get("role") or "").strip().lower()
    email = (user.get("email") or "").strip()

    if role == "teacher":
        if not subject_id or not subject_id.strip():
            raise HTTPException(status_code=400, detail="Subject is required. Select a subject you teach.")
        if not await _teacher_teaches_subject(db, email, subject_id.strip()):
            raise HTTPException(
                status_code=403,
                detail="You can only upload resources for subjects you are assigned to teach.",
            )
        status = STATUS_PENDING
        subj = await db.subjects.find_one({"_id": subject_id.strip()}, {"subject_name": 1})
        if not subj:
            subj = await db.subjects.find_one({"_id": int(subject_id)}, {"subject_name": 1}) if subject_id.isdigit() else None
        subject_name = (subj.get("subject_name") if subj else None) or subject_id.strip()
    else:
        status = STATUS_APPROVED
        subject_name = ""
        if subject_id and subject_id.strip():
            subj = await db.subjects.find_one({"_id": subject_id.strip()}, {"subject_name": 1})
            subject_name = (subj.get("subject_name") if subj else None) or subject_id.strip()
        else:
            subject_id = None

    ext = Path(file.filename or "bin").suffix or ".bin"
    resource_id = str(uuid.uuid4())
    safe_name = f"{resource_id}{ext}"
    file_path = UPLOAD_DIR / safe_name
    content = await file.read()
    file_path.write_bytes(content)
    size_kb = len(content) / 1024
    size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb / 1024:.1f} MB"
    now = _now_iso()

    teacher_name = email
    u = await db.users.find_one({"email": email}, {"_id": 0, "firstName": 1, "lastName": 1})
    if u:
        teacher_name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or email

    doc = {
        "id": resource_id,
        "title": title.strip(),
        "class_name": (class_name or "").strip() or subject_name,
        "type": (type or "Other").strip(),
        "description": (description or "").strip() or None,
        "size": size_str,
        "uploadDate": now,
        "createdAt": now,
        "downloads": 0,
        "fileUrl": f"/study-resources/files/{resource_id}",
        "fileName": safe_name,
        "uploadedBy": email,
        "teacherName": teacher_name,
        "isActive": True,
        "status": status,
        "subject_id": subject_id.strip() if subject_id else None,
        "subject_name": subject_name or None,
    }
    await db.study_resources.insert_one(doc)
    out = _doc_to_resource(doc)
    if role == "teacher":
        await chat_ws_manager.broadcast_to_role(
            "admin",
            {"type": "study_resource_pending", "resource": out},
        )
    return out


@router.patch("/{resource_id}/status")
async def set_resource_status(
    resource_id: str,
    body: dict = Body(default_factory=dict),
    user: dict = Depends(require_role(["admin"])),
):
    """Admin: approve or reject a study resource. Body: { \"status\": \"approved\" | \"rejected\" }."""
    status = (body or {}).get("status") or ""
    if status not in (STATUS_APPROVED, STATUS_REJECTED):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")
    db = get_database()
    doc = await db.study_resources.find_one({"id": resource_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    await db.study_resources.update_one(
        {"id": resource_id},
        {"$set": {"status": status, "updatedAt": _now_iso()}},
    )
    doc = await db.study_resources.find_one({"id": resource_id}, {"_id": 0})
    out = _doc_to_resource(doc)
    uploaded_by = (doc or {}).get("uploadedBy")
    payload = {
        "type": "study_resource_status",
        "resourceId": resource_id,
        "status": status,
        "resource": out,
    }
    if uploaded_by:
        await chat_ws_manager.send_to_user(uploaded_by, payload)
    await chat_ws_manager.broadcast_to_role("admin", payload)
    return out


@router.delete("/{resource_id}")
async def delete_resource(
    resource_id: str,
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """Delete (soft) a study resource. Teacher can only delete their own."""
    db = get_database()
    doc = await db.study_resources.find_one({"id": resource_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    role = (user.get("role") or "").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "teacher" and (doc.get("uploadedBy") or "").strip().lower() != email.lower():
        raise HTTPException(status_code=403, detail="You can only delete your own resources")
    await db.study_resources.update_one({"id": resource_id}, {"$set": {"isActive": False}})
    fpath = UPLOAD_DIR / (doc.get("fileName") or f"{resource_id}")
    if fpath.exists():
        try:
            fpath.unlink()
        except Exception:
            pass
    return {"success": True}


@router.get("/files/{resource_id}")
async def serve_file(
    resource_id: str,
    user: dict = Depends(get_current_user),
):
    """Serve file. Students may only access approved resources for their subjects."""
    db = get_database()
    doc = await db.study_resources.find_one({"id": resource_id, "isActive": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    role = (user.get("role") or "").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "student":
        subject_ids = await _student_subject_ids(db, email)
        if doc.get("status") != STATUS_APPROVED or (doc.get("subject_id") and doc.get("subject_id") not in subject_ids):
            raise HTTPException(status_code=403, detail="You can only access approved resources for your subjects")
    await db.study_resources.update_one({"id": resource_id}, {"$inc": {"downloads": 1}})
    fpath = UPLOAD_DIR / (doc.get("fileName") or f"{resource_id}")
    if not fpath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=str(fpath),
        filename=doc.get("title", resource_id) + Path(doc.get("fileName", "")).suffix,
        media_type="application/octet-stream",
    )


@router.post("/{resource_id}/download")
async def record_download(
    resource_id: str,
    user: dict = Depends(get_current_user),
):
    """Increment download count and return file URL. Students only for approved + their subjects."""
    db = get_database()
    doc = await db.study_resources.find_one({"id": resource_id, "isActive": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    role = (user.get("role") or "").strip().lower()
    email = (user.get("email") or "").strip()
    if role == "student":
        subject_ids = await _student_subject_ids(db, email)
        if doc.get("status") != STATUS_APPROVED or (doc.get("subject_id") and doc.get("subject_id") not in subject_ids):
            raise HTTPException(status_code=403, detail="You can only access approved resources for your subjects")
    await db.study_resources.update_one({"id": resource_id}, {"$inc": {"downloads": 1}})
    return {"url": doc.get("fileUrl", f"/study-resources/files/{resource_id}")}
