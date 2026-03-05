from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import uuid

from app.database import get_database
from app.models import (
    CourseLessonsRequest,
    CourseLessonsResponse,
    CourseScheduleRequest,
    CourseScheduleResponse,
    CourseAttendanceRequest,
    CourseAttendanceResponse,
    CourseAttendanceTotalResponse,
    CourseUserEnquireRequest,
    CourseUserEnquireResponse,
    CourseUserEnrollRequest,
    CourseUserEnrollResponse,
    CourseUserPaymentsRequest,
    CourseUserPaymentsResponse,
)


def _now_iso() -> str:
  return datetime.utcnow().isoformat()


lessons_router = APIRouter(
    prefix="/api/v1/course-lessons", tags=["Course Lessons"]
)


@lessons_router.get("/", response_model=List[CourseLessonsResponse])
async def list_lessons(courseId: str):
    db = get_database()
    docs = await db.course_lessons.find(
        {"courseId": courseId}, {"_id": 0}
    ).to_list(1000)
    return docs


@lessons_router.post("/", response_model=CourseLessonsResponse)
async def create_lesson(request: CourseLessonsRequest):
    db = get_database()
    lesson_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": lesson_id,
        "lessonName": request.lessonName,
        "courseId": request.courseId,
        "description": request.description,
        "isActive": request.isActive,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.course_lessons.insert_one(doc)
    return CourseLessonsResponse(**doc)


schedule_router = APIRouter(
    prefix="/api/v1/course-schedules", tags=["Course Schedule"]
)


@schedule_router.get("/", response_model=List[CourseScheduleResponse])
async def list_schedule(courseId: str):
    db = get_database()
    docs = await db.course_schedules.find(
        {"courseId": courseId}, {"_id": 0}
    ).to_list(1000)
    return docs


@schedule_router.post("/", response_model=CourseScheduleResponse)
async def create_schedule(request: CourseScheduleRequest):
    db = get_database()
    schedule_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": schedule_id,
        "courseId": request.courseId,
        "date": request.date,
        "startTime": request.startTime,
        "endTime": request.endTime,
        "isActive": request.isActive,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.course_schedules.insert_one(doc)
    return CourseScheduleResponse(**doc)


attendance_router = APIRouter(
    prefix="/api/v1/course-attendance", tags=["Course Attendance"]
)


@attendance_router.get("/", response_model=List[CourseAttendanceResponse])
async def list_attendance(scheduleId: str):
    db = get_database()
    docs = await db.course_attendance.find(
        {"courseScheduleId": scheduleId}, {"_id": 0}
    ).to_list(1000)
    return docs


@attendance_router.get("/summary/{scheduleId}", response_model=CourseAttendanceTotalResponse)
async def attendance_summary(scheduleId: str):
    db = get_database()
    total_attended = await db.course_attendance.count_documents(
        {"courseScheduleId": scheduleId, "isAttended": True}
    )
    total_absent = await db.course_attendance.count_documents(
        {"courseScheduleId": scheduleId, "isAttended": False}
    )
    return CourseAttendanceTotalResponse(
        totalAttended=total_attended, totalAbsent=total_absent
    )


@attendance_router.post("/", response_model=CourseAttendanceResponse)
async def mark_attendance(request: CourseAttendanceRequest):
    db = get_database()
    attend_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": attend_id,
        "courseScheduleId": request.courseScheduleId,
        "userEmail": request.userEmail,
        "isAttended": request.isAttended,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.course_attendance.insert_one(doc)
    return CourseAttendanceResponse(**doc)


enquire_router = APIRouter(
    prefix="/api/v1/course-enquiries", tags=["Course Enquiries"]
)


@enquire_router.get("/", response_model=List[CourseUserEnquireResponse])
async def list_enquiries(courseId: str):
    db = get_database()
    docs = await db.course_enquiries.find(
        {"courseId": courseId}, {"_id": 0}
    ).to_list(1000)
    return docs


@enquire_router.post("/", response_model=CourseUserEnquireResponse)
async def create_enquiry(request: CourseUserEnquireRequest):
    db = get_database()
    enquiry_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": enquiry_id,
        "courseId": request.courseId,
        "userEmail": request.userEmail,
        "subject": request.subject,
        "enquiredAt": request.enquiredAt or now,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.course_enquiries.insert_one(doc)
    return CourseUserEnquireResponse(**doc)


enroll_router = APIRouter(
    prefix="/api/v1/course-enrollments", tags=["Course Enrollments"]
)


@enroll_router.get("/", response_model=List[CourseUserEnrollResponse])
async def list_enrollments(courseId: str):
    db = get_database()
    docs = await db.course_enrollments.find(
        {"courseId": courseId}, {"_id": 0}
    ).to_list(1000)
    return docs


@enroll_router.post("/", response_model=CourseUserEnrollResponse)
async def create_enrollment(request: CourseUserEnrollRequest):
    db = get_database()
    enroll_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": enroll_id,
        "courseId": request.courseId,
        "userEmail": request.userEmail,
        "classCount": request.classCount,
        "enrolledAt": request.enrolledAt or now,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.course_enrollments.insert_one(doc)
    return CourseUserEnrollResponse(**doc)


payments_router = APIRouter(
    prefix="/api/v1/course-payments", tags=["Course Payments"]
)


@payments_router.get("/", response_model=List[CourseUserPaymentsResponse])
async def list_payments(userEmail: str):
    db = get_database()
    docs = await db.course_payments.find(
        {"userEmail": userEmail}, {"_id": 0}
    ).to_list(1000)
    return docs


@payments_router.post("/", response_model=CourseUserPaymentsResponse)
async def create_payment(request: CourseUserPaymentsRequest):
    db = get_database()
    payment_id = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": payment_id,
        "courseId": request.courseId,
        "userEmail": request.userEmail,
        "amount": request.amount,
        "type": request.type,
        "status": request.status,
        "paidAt": request.paidAt or now,
        "isActive": True,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.course_payments.insert_one(doc)
    return CourseUserPaymentsResponse(**doc)

