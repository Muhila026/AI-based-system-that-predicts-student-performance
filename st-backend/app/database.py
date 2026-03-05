from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from app.config import get_settings
from app.password_util import encode_password

settings = get_settings()

# Default admin (created on first run if not exists)
DEFAULT_ADMIN_EMAIL = "cloudcampus2002@gmail.com"
DEFAULT_ADMIN_PASSWORD = "Muhila@2002"

client: AsyncIOMotorClient = None
db = None

# All collections that should be auto-created
COLLECTIONS = [
    "users",
    "otps",
    "teachers",
    "students",
    "courses",
    "course_lessons",
    "course_schedules",
    "course_attendance",
    "course_enquiries",
    "course_enrollments",
    "course_payments",
    "theory_topics",
    "theory_details",
    "theory_quizzes",
    "theory_quiz_results",
    "theory_completions",
    "techniques_topics",
    "techniques_details",
    "techniques_quizzes",
    "techniques_quiz_results",
    "techniques_completions",
    "choreography_videos",
    "games",
    "game_details",
    "game_user_details",
    "challenges",
    "challenge_completions",
    "online_events",
    "event_bookings",
    "reels",
    "reel_comments",
    "chats",
    "chat_members",
    "messages",
    "message_reactions",
    "message_reads",
    "notifications",
    "workout_tabs",
    "workout_videos",
    "user_preference_questions",
    "user_preference_answers",
    "user_preferences",
    "user_likes",
    # ML - Student Performance
    "student_study_logs",
    "student_participation",
    "student_predictions",
    "assignment_submissions",
    "attendance_daily",
    "assessments",
]


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB_NAME]
    print(f"[OK] Connected to MongoDB: {settings.MONGO_URL}/{settings.MONGO_DB_NAME}")

    # Auto-create all collections if they don't exist
    existing = await db.list_collection_names()
    created = []
    for col_name in COLLECTIONS:
        if col_name not in existing:
            await db.create_collection(col_name)
            created.append(col_name)

    if created:
        print(f"[OK] Auto-created {len(created)} collections: {', '.join(created)}")
    else:
        print(f"[OK] All {len(COLLECTIONS)} collections already exist")

    # Create indexes for faster queries
    await db.users.create_index("email", unique=True)
    await db.otps.create_index("email")
    await db.teachers.create_index("id", unique=True)
    await db.students.create_index("id", unique=True)
    await db.courses.create_index("id", unique=True)
    await db.courses.create_index("teacherId")
    await db.assessments.create_index("id", unique=True)
    await db.assessments.create_index("courseId")
    await db.course_lessons.create_index("courseId")
    await db.course_schedules.create_index("courseId")
    await db.course_attendance.create_index([("courseScheduleId", 1), ("userEmail", 1)])
    await db.course_enquiries.create_index("courseId")
    await db.course_enrollments.create_index([("courseId", 1), ("userEmail", 1)])
    await db.course_payments.create_index("userEmail")
    await db.theory_quiz_results.create_index("userEmail")
    await db.techniques_quiz_results.create_index("userEmail")
    await db.game_user_details.create_index("userEmail")
    await db.chats.create_index("id", unique=True)
    await db.messages.create_index("chatId")
    await db.notifications.create_index("userEmail")
    await db.student_study_logs.create_index([("userEmail", 1), ("courseId", 1)])
    await db.student_participation.create_index([("userEmail", 1), ("courseId", 1)])
    await db.student_predictions.create_index("userEmail")
    await db.assignment_submissions.create_index([("userEmail", 1), ("assignment_id", 1)])
    await db.attendance_daily.create_index([("userEmail", 1), ("date", 1)], unique=True)
    print("[OK] Database indexes created")

    # Seed default admin if not exists; migrate existing super_admin to admin
    existing = await db.users.find_one({"email": DEFAULT_ADMIN_EMAIL})
    if not existing:
        now = datetime.utcnow().isoformat()
        default_admin = {
            "email": DEFAULT_ADMIN_EMAIL,
            "firstName": "Admin",
            "lastName": "Cloud Campus",
            "password": encode_password(DEFAULT_ADMIN_PASSWORD),
            "phoneNumber": "0000000000",
            "isEmailVerified": True,
            "isActive": True,
            "user_role": "admin",
            "createdAt": now,
            "updatedAt": now,
        }
        await db.users.insert_one(default_admin)
        print(f"[OK] Default admin created: {DEFAULT_ADMIN_EMAIL}")
    else:
        if existing.get("user_role") == "super_admin":
            await db.users.update_one(
                {"email": DEFAULT_ADMIN_EMAIL},
                {"$set": {"user_role": "admin", "updatedAt": datetime.utcnow().isoformat()}},
            )
            print(f"[OK] Default user migrated from super_admin to admin: {DEFAULT_ADMIN_EMAIL}")
        else:
            print(f"[OK] Default admin already exists: {DEFAULT_ADMIN_EMAIL}")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("[CLOSED] MongoDB connection closed")


def get_database():
    return db
