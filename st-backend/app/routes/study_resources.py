"""
Study Resources: upload, list, delete, download.
Served under both /teachers/study-resources and /students/study-resources.
"""
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse

from app.database import get_database
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/study-resources", tags=["Study Resources"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "study_resources"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
    }


@router.get("/")
@router.get("")
async def list_resources(user: dict = Depends(get_current_user)):
    """List all study resources (student, teacher, admin)."""
    db = get_database()
    cursor = db.study_resources.find({"isActive": True}, {"_id": 0}).sort("createdAt", -1)
    items = []
    async for doc in cursor:
        items.append(_doc_to_resource(doc))
    return items


@router.post("/")
@router.post("")
async def upload_resource(
    file: UploadFile = File(...),
    title: str = Form(...),
    class_name: str = Form(...),
    type: str = Form("Other"),
    description: str = Form(""),
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """Upload a study resource (teacher or admin)."""
    db = get_database()
    ext = Path(file.filename or "bin").suffix or ".bin"
    resource_id = str(uuid.uuid4())
    safe_name = f"{resource_id}{ext}"
    file_path = UPLOAD_DIR / safe_name
    content = await file.read()
    file_path.write_bytes(content)
    size_kb = len(content) / 1024
    size_str = f"{size_kb:.1f} KB" if size_kb < 1024 else f"{size_kb / 1024:.1f} MB"
    now = _now_iso()
    # Resolve teacher display name from DB if available
    teacher_name = user.get("email", "")
    try:
        u = await db.users.find_one({"email": user.get("email")}, {"_id": 0, "firstName": 1, "lastName": 1})
        if u:
            teacher_name = f"{u.get('firstName', '')} {u.get('lastName', '')}".strip() or teacher_name
    except Exception:
        pass
    doc = {
        "id": resource_id,
        "title": title.strip(),
        "class_name": class_name.strip(),
        "type": (type or "Other").strip(),
        "description": (description or "").strip() or None,
        "size": size_str,
        "uploadDate": now,
        "createdAt": now,
        "downloads": 0,
        "fileUrl": f"/study-resources/files/{resource_id}",
        "fileName": safe_name,
        "uploadedBy": user.get("email", ""),
        "teacherName": teacher_name,
        "isActive": True,
    }
    await db.study_resources.insert_one(doc)
    return _doc_to_resource(doc)


@router.delete("/{resource_id}")
async def delete_resource(
    resource_id: str,
    user: dict = Depends(require_role(["teacher", "admin"])),
):
    """Delete a study resource (teacher or admin)."""
    db = get_database()
    doc = await db.study_resources.find_one({"id": resource_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
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
    """Serve file for download (any authenticated user). Increments download count."""
    db = get_database()
    doc = await db.study_resources.find_one({"id": resource_id, "isActive": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
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
    """Increment download count and return file URL for client-side download."""
    db = get_database()
    doc = await db.study_resources.find_one({"id": resource_id, "isActive": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    await db.study_resources.update_one({"id": resource_id}, {"$inc": {"downloads": 1}})
    return {"url": doc.get("fileUrl", f"/study-resources/files/{resource_id}")}
