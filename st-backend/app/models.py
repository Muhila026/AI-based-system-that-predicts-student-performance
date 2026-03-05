from pydantic import BaseModel, EmailStr, Field, field_validator  # pyright: ignore[reportMissingImports]
from typing import Optional, List, Any
from datetime import datetime


# ==================== GENERIC RESPONSE ====================
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Any = None
    error: Optional[str] = None

    @classmethod
    def ok(cls, message: str, data: Any = None):
        return cls(success=True, message=message, data=data)

    @classmethod
    def fail(cls, message: str, error: Optional[str] = None):
        return cls(success=False, message=message, error=error)


# ==================== AUTH ====================
ALLOWED_REGISTER_ROLES = ("student", "teacher", "admin", "user")


class RegisterRequest(BaseModel):
    first_name: str = Field(..., alias="firstName", min_length=2, max_length=50)
    last_name: str = Field(..., alias="lastName", min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    phone_number: str = Field(..., alias="phoneNumber", min_length=10, max_length=15)
    user_role: str = Field(
        default="student",
        alias="userRole",
        description="One of: student, teacher, admin, user",
    )

    @field_validator("user_role", mode="before")
    @classmethod
    def validate_user_role(cls, v: Any) -> str:
        if v is None or v == "":
            return "student"
        val = str(v).strip().lower()
        if val not in ALLOWED_REGISTER_ROLES:
            raise ValueError(f"userRole must be one of: {', '.join(ALLOWED_REGISTER_ROLES)}")
        return val

    class Config:
        populate_by_name = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str
    firstName: str
    lastName: str
    phoneNumber: Optional[str] = None
    isEmailVerified: Optional[bool] = None
    role: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., alias="otpCode")

    class Config:
        populate_by_name = True


class VerifyOTPResponse(BaseModel):
    resetToken: str
    email: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: Optional[str] = Field(None, alias="resetToken")
    otp_code: Optional[str] = Field(None, alias="otpCode")
    new_password: str = Field(..., alias="newPassword")

    class Config:
        populate_by_name = True

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if not v or len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., alias="otpCode")

    class Config:
        populate_by_name = True


# ==================== USER ====================
class UserModel(BaseModel):
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    password: Optional[str] = None
    phoneNumber: Optional[str] = None
    isEmailVerified: Optional[bool] = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
    lastLoginAt: Optional[str] = None
    isActive: Optional[bool] = True
    user_role: Optional[str] = "user"


# ==================== TEACHER ====================
class TeacherRequest(BaseModel):
    name: str
    title: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = None
    totalStudents: Optional[int] = None
    isActive: Optional[bool] = True


class TeacherResponse(BaseModel):
    id: str
    name: Optional[str] = None
    title: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = None
    totalStudents: Optional[int] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class TeacherStatisticsResponse(BaseModel):
    id: str
    rating: Optional[float] = None
    totalStudents: Optional[int] = None
    isActive: Optional[bool] = None
    updatedAt: Optional[str] = None


# ==================== COURSE ====================
class CourseRequest(BaseModel):
    courseTitle: str
    teacherId: str
    courseDuration: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    totalLessons: Optional[int] = None
    totalEnrolledStudents: Optional[int] = None
    price: Optional[float] = None
    level: Optional[str] = None
    aboutCourse: Optional[str] = None
    status: Optional[str] = None
    isActive: Optional[bool] = True


class CourseResponse(BaseModel):
    id: str
    courseTitle: Optional[str] = None
    teacherId: Optional[str] = None
    teacherName: Optional[str] = None
    courseDuration: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    totalLessons: Optional[int] = None
    totalEnrolledStudents: Optional[int] = None
    price: Optional[float] = None
    level: Optional[str] = None
    aboutCourse: Optional[str] = None
    status: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== COURSE LESSONS ====================
class CourseLessonsRequest(BaseModel):
    lessonName: str
    courseId: str
    description: Optional[str] = None
    isActive: Optional[bool] = True


class CourseLessonsResponse(BaseModel):
    id: str
    lessonName: Optional[str] = None
    courseId: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== COURSE SCHEDULE ====================
class CourseScheduleRequest(BaseModel):
    courseId: str
    date: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    isActive: Optional[bool] = True


class CourseScheduleResponse(BaseModel):
    id: str
    courseId: Optional[str] = None
    date: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== COURSE ATTENDANCE ====================
class CourseAttendanceRequest(BaseModel):
    courseScheduleId: str
    userEmail: str
    isAttended: Optional[bool] = False


class CourseAttendanceResponse(BaseModel):
    id: str
    courseScheduleId: Optional[str] = None
    userEmail: Optional[str] = None
    isAttended: Optional[bool] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class CourseAttendanceTotalResponse(BaseModel):
    totalAttended: int
    totalAbsent: int


# ==================== COURSE USER ENQUIRE ====================
class CourseUserEnquireRequest(BaseModel):
    courseId: str
    userEmail: str
    subject: Optional[str] = None
    enquiredAt: Optional[str] = None


class CourseUserEnquireResponse(BaseModel):
    id: str
    courseId: Optional[str] = None
    userEmail: Optional[str] = None
    subject: Optional[str] = None
    enquiredAt: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== COURSE USER ENROLL ====================
class CourseUserEnrollRequest(BaseModel):
    courseId: str
    userEmail: str
    classCount: Optional[int] = None
    enrolledAt: Optional[str] = None


class CourseUserEnrollResponse(BaseModel):
    id: str
    courseId: Optional[str] = None
    userEmail: Optional[str] = None
    classCount: Optional[int] = None
    enrolledAt: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== COURSE USER PAYMENTS ====================
class CourseUserPaymentsRequest(BaseModel):
    courseId: str
    userEmail: str
    amount: Optional[float] = None
    type: Optional[str] = None
    status: Optional[str] = None
    paidAt: Optional[str] = None


class CourseUserPaymentsResponse(BaseModel):
    id: str
    courseId: Optional[str] = None
    userEmail: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None
    status: Optional[str] = None
    paidAt: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== COURSE VIDEOS ====================
class CourseVideoRequest(BaseModel):
    courseId: str
    teacherId: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    videoUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    views: Optional[int] = 0
    likes: Optional[int] = 0
    orderSequence: Optional[int] = None
    isPremium: Optional[bool] = False
    isActive: Optional[bool] = True
    tags: Optional[str] = None
    metadata: Optional[str] = None


class CourseVideoResponse(BaseModel):
    id: str
    courseId: Optional[str] = None
    teacherId: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    videoUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    duration: Optional[int] = None
    level: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    orderSequence: Optional[int] = None
    isPremium: Optional[bool] = None
    isActive: Optional[bool] = None
    tags: Optional[str] = None
    metadata: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== CHALLENGES ====================
class ChallengeDetailsRequest(BaseModel):
    challengeName: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    points: Optional[int] = None
    isActive: Optional[bool] = True


class ChallengeDetailsResponse(BaseModel):
    id: str
    challengeName: Optional[str] = None
    description: Optional[str] = None
    level: Optional[str] = None
    points: Optional[int] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ChallengesUserCompletionRequest(BaseModel):
    challengeId: str
    userEmail: str


class ChallengesUserCompletionResponse(BaseModel):
    id: str
    challengeId: Optional[str] = None
    userEmail: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== CHATS ====================
class ChatsRequest(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    avatarUrl: Optional[str] = None
    createdBy: Optional[str] = None
    isActive: Optional[bool] = True


class ChatsResponse(BaseModel):
    id: str
    type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    avatarUrl: Optional[str] = None
    createdBy: Optional[str] = None
    lastMessageAt: Optional[str] = None
    isArcheived: Optional[bool] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ChatMemberRequest(BaseModel):
    chatId: str
    userEmail: str
    role: Optional[str] = "member"


class ChatMemberResponse(BaseModel):
    id: str
    chatId: Optional[str] = None
    userEmail: Optional[str] = None
    role: Optional[str] = None
    joinedAt: Optional[str] = None
    leftAt: Optional[str] = None
    unreadCount: Optional[int] = None
    lastReadMessageId: Optional[str] = None
    lastReadAt: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ChatMemberJoinRequest(BaseModel):
    chatId: str
    userEmail: str
    role: Optional[str] = "member"


class ChatMemberActionRequest(BaseModel):
    chatId: str
    userEmail: str


class ChatMemberMarkReadRequest(BaseModel):
    chatId: str
    userEmail: str
    messageId: str


class ChatMemberUnreadCountRequest(BaseModel):
    chatId: str
    userEmail: str


# ==================== MESSAGES ====================
class MessagesRequest(BaseModel):
    chatId: str
    senderEmail: Optional[str] = None
    messageType: Optional[str] = "text"
    content: Optional[str] = None
    mediaUrl: Optional[str] = None
    mediaThumbnailUrl: Optional[str] = None
    mediaSize: Optional[int] = None
    mediaDuration: Optional[int] = None
    replyToMessageId: Optional[str] = None


class MessagesResponse(BaseModel):
    id: str
    chatId: Optional[str] = None
    senderEmail: Optional[str] = None
    messageType: Optional[str] = None
    content: Optional[str] = None
    mediaUrl: Optional[str] = None
    mediaThumbnailUrl: Optional[str] = None
    mediaSize: Optional[int] = None
    mediaDuration: Optional[int] = None
    replyToMessageId: Optional[str] = None
    isEdited: Optional[bool] = None
    editedAt: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class MessageReactionRequest(BaseModel):
    messageId: str
    userEmail: str
    reaction: Optional[str] = None


class MessageReactionResponse(BaseModel):
    id: str
    messageId: Optional[str] = None
    userEmail: Optional[str] = None
    reaction: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class MessageReactionCountResponse(BaseModel):
    reaction: str
    count: int


class MessageReadRequest(BaseModel):
    messageId: str
    userEmail: str


class MessageReadResponse(BaseModel):
    id: str
    messageId: Optional[str] = None
    userEmail: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== NOTIFICATIONS ====================
class NotificationResponse(BaseModel):
    id: str
    userEmail: Optional[str] = None
    type: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[str] = None
    isRead: Optional[bool] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== USER PREFERENCE ====================
class UserPreferenceQuestionRequest(BaseModel):
    question: str
    isActive: Optional[bool] = True


class UserPreferenceQuestionResponse(BaseModel):
    id: str
    question: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class UserPreferenceAnswerRequest(BaseModel):
    questionId: str
    answer: str
    isActive: Optional[bool] = True


class UserPreferenceAnswerResponse(BaseModel):
    id: str
    questionId: Optional[str] = None
    answer: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class UserPreferenceRequest(BaseModel):
    userEmail: str
    questionId: str
    selectedAnswerId: str


class UserPreferenceResponse(BaseModel):
    id: str
    userEmail: Optional[str] = None
    questionId: Optional[str] = None
    selectedAnswerId: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class BulkUserPreferenceRequest(BaseModel):
    userEmail: str
    preferences: List[dict]


class UserPreferenceCompleteResponse(BaseModel):
    id: str
    userEmail: Optional[str] = None
    questionId: Optional[str] = None
    questionText: Optional[str] = None
    selectedAnswerId: Optional[str] = None
    answerText: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# ==================== USER LIKES ====================
class UserLikesRequest(BaseModel):
    userEmail: str
    targetType: str
    targetId: str


class UserLikesResponse(BaseModel):
    id: str
    userEmail: Optional[str] = None
    targetType: Optional[str] = None
    targetId: Optional[str] = None
    createdAt: Optional[str] = None


# ==================== ADMIN USERS ====================
class AdminCreateUserRequest(BaseModel):
    name: str
    email: EmailStr
    role: str  # Student, Teacher, Admin
    status: Optional[str] = "Active"
    password: Optional[str] = None

    class Config:
        populate_by_name = True


class AdminUpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None  # Student, Teacher, Admin
    status: Optional[str] = None  # Active, Inactive

    class Config:
        populate_by_name = True


# ==================== DASHBOARD ====================
class DashboardStatisticsResponse(BaseModel):
    totalEarnings: Optional[float] = 0.0
    totalCourseRequests: Optional[int] = 0
    pendingClasses: Optional[int] = 0


# ==================== STUDENT PERFORMANCE (ML) ====================
class StudentStudyLogRequest(BaseModel):
    userEmail: str
    courseId: str
    studyHours: float
    studyDate: str
    notes: Optional[str] = None


class StudentStudyLogResponse(BaseModel):
    id: str
    userEmail: Optional[str] = None
    courseId: Optional[str] = None
    studyHours: Optional[float] = None
    studyDate: Optional[str] = None
    notes: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class StudentParticipationRequest(BaseModel):
    userEmail: str
    courseId: str
    scheduleId: str
    participationScore: float
    remarks: Optional[str] = None


class StudentParticipationResponse(BaseModel):
    id: str
    userEmail: Optional[str] = None
    courseId: Optional[str] = None
    scheduleId: Optional[str] = None
    participationScore: Optional[float] = None
    remarks: Optional[str] = None
    isActive: Optional[bool] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class PredictManualRequest(BaseModel):
    weeklySelfStudyHours: float
    attendancePercentage: float
    classParticipation: float
    totalScore: float


class PredictionResponse(BaseModel):
    predictedGrade: str
    confidence: Optional[float] = None
    features: Optional[dict] = None


class StudentPerformanceResponse(BaseModel):
    userEmail: str
    courseId: str
    weeklySelfStudyHours: float
    attendancePercentage: float
    classParticipation: float
    totalScore: float
    predictedGrade: str
    confidence: Optional[float] = None
    breakdown: Optional[dict] = None


# ==================== ASSIGNMENT SUBMISSIONS (ML total_score) ====================
class AssignmentSubmissionItem(BaseModel):
    student_id: int
    marks: float
    max_marks: float
    userEmail: Optional[str] = None  # required for pipeline aggregation by current user


class AssignmentSubmissionBulkRequest(BaseModel):
    assignment_id: int
    submissions: List[AssignmentSubmissionItem]


class StudentTotalScoreResponse(BaseModel):
    student_id: Optional[int] = None
    total_score: float
    total_marks: float
    total_max_marks: float
    submission_count: int


# ==================== ATTENDANCE (ML attendance_percentage) ====================
class AttendanceMeResponse(BaseModel):
    total_days: int
    present_days: int
    attendance_percentage: float


class AttendanceDailyRequest(BaseModel):
    present_student_ids: List[int]
    date: Optional[str] = None


# ==================== PARTICIPATION RATING ====================
class ParticipationRatingRequest(BaseModel):
    student_id: int
    teacher_rating: float


# ==================== PIPELINE (ML features + predicted grade) ====================
class PipelineMlFeaturesResponse(BaseModel):
    weekly_self_study_hours: float
    attendance_percentage: float
    class_participation: float
    total_score: float
