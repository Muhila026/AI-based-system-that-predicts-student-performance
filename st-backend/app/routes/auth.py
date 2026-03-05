from fastapi import APIRouter, Depends, HTTPException, Query
from app.models import (
    ApiResponse, RegisterRequest, LoginRequest, LoginResponse,
    ForgotPasswordRequest, VerifyOTPRequest, VerifyOTPResponse,
    ResetPasswordRequest, VerifyEmailRequest, UserModel,
)
from app.database import get_database
from app.password_util import encode_password, verify_password
from app.jwt_util import create_access_token
from app.email_util import send_otp_email, send_password_reset_otp_email
from app.auth import get_current_user, require_role
from datetime import datetime
import uuid
import random
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# In-memory reset tokens (same as Java version)
reset_tokens: dict = {}


@router.post("/register")
async def register(request: RegisterRequest):
    db = get_database()
    logger.info(f"Register endpoint called for email: {request.email}")

    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail=f"User with email {request.email} already exists")

    now = datetime.utcnow().isoformat()
    user = {
        "email": request.email,
        "firstName": request.first_name,
        "lastName": request.last_name,
        "password": encode_password(request.password),
        "phoneNumber": request.phone_number,
        "isEmailVerified": False,
        "isActive": True,
        "user_role": request.user_role,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.users.insert_one(user)

    # Send OTP for email verification
    try:
        otp_code = str(random.randint(1000, 9999))
        otp = {
            "otp_id": str(uuid.uuid4()),
            "email": request.email,
            "otp_code": otp_code,
            "createdAt": now,
            "expiresAt": datetime.utcnow().__add__(__import__('datetime').timedelta(minutes=10)).isoformat(),
            "is_used": False,
        }
        await db.otps.insert_one(otp)
        send_otp_email(request.email, otp_code)
    except Exception as e:
        logger.warning(f"Failed to send OTP email to {request.email}: {e}")

    return ApiResponse.ok("User registered successfully. Please check your email for OTP verification.")


@router.post("/login")
async def login(request: LoginRequest):
    db = get_database()
    logger.info(f"Login attempt for email: {request.email}")

    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found with email: {request.email}")

    if not user.get("isActive", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")

    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")

    role = user.get("user_role", "user")
    token = create_access_token(user["email"], role)

    now = datetime.utcnow().isoformat()
    await db.users.update_one(
        {"email": request.email},
        {"$set": {"lastLoginAt": now, "updatedAt": now}}
    )

    login_response = LoginResponse(
        token=token,
        email=user["email"],
        firstName=user.get("firstName", ""),
        lastName=user.get("lastName", ""),
        phoneNumber=user.get("phoneNumber"),
        isEmailVerified=user.get("isEmailVerified"),
        role=role,
    )
    return ApiResponse.ok("Login successful", login_response.model_dump())


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    db = get_database()
    logger.info(f"Forgot password request for email: {request.email}")

    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found with email: {request.email}")

    otp_code = str(random.randint(1000, 9999))
    now = datetime.utcnow()
    otp = {
        "otp_id": str(uuid.uuid4()),
        "email": request.email,
        "otp_code": otp_code,
        "createdAt": now.isoformat(),
        "expiresAt": (now + __import__('datetime').timedelta(minutes=10)).isoformat(),
        "is_used": False,
    }
    await db.otps.insert_one(otp)

    try:
        send_password_reset_otp_email(request.email, otp_code)
        logger.info(f"Password reset OTP sent to: {request.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset OTP to {request.email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send password reset OTP")

    return ApiResponse.ok("Password reset OTP sent successfully to your email")


@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    db = get_database()
    logger.info(f"Verifying OTP for email: {request.email}")

    valid_otps = await db.otps.find({"email": request.email, "is_used": False}).to_list(100)
    if not valid_otps:
        raise HTTPException(status_code=400, detail="No valid OTP found for this email")

    latest_otp = max(valid_otps, key=lambda x: x.get("createdAt", ""))

    now = datetime.utcnow()
    expires_at = datetime.fromisoformat(latest_otp["expiresAt"])
    if now > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if latest_otp["otp_code"] != request.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    await db.otps.update_one({"otp_id": latest_otp["otp_id"]}, {"$set": {"is_used": True}})

    reset_token = str(uuid.uuid4())
    reset_tokens[reset_token] = request.email

    response = VerifyOTPResponse(resetToken=reset_token, email=request.email)
    return ApiResponse.ok("OTP verified successfully. You can now reset your password.", response.model_dump())


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    db = get_database()
    logger.info(f"Password reset request for email: {request.email}")

    email_from_token = None
    if request.reset_token:
        email_from_token = reset_tokens.get(request.reset_token)
        if not email_from_token or email_from_token != request.email:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token. Please verify OTP again.")
    elif request.otp_code:
        valid_otps = await db.otps.find({"email": request.email, "is_used": False}).to_list(100)
        if not valid_otps:
            raise HTTPException(status_code=400, detail="No valid OTP found for this email")
        latest_otp = max(valid_otps, key=lambda x: x.get("createdAt", ""))
        now = datetime.utcnow()
        expires_at = datetime.fromisoformat(latest_otp["expiresAt"])
        if now > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        if latest_otp["otp_code"] != request.otp_code:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
        await db.otps.update_one({"otp_id": latest_otp["otp_id"]}, {"$set": {"is_used": True}})
        email_from_token = request.email
    else:
        raise HTTPException(
            status_code=422,
            detail="Provide either resetToken (from verify-otp) or otpCode (4-digit OTP from email)",
        )

    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found with email: {request.email}")

    now = datetime.utcnow().isoformat()
    await db.users.update_one(
        {"email": request.email},
        {"$set": {"password": encode_password(request.new_password), "updatedAt": now}}
    )
    if request.reset_token:
        reset_tokens.pop(request.reset_token, None)

    return ApiResponse.ok("Password reset successfully")


@router.post("/verify-email")
async def verify_email(request: VerifyEmailRequest):
    db = get_database()
    logger.info(f"Verifying email with OTP for: {request.email}")

    valid_otps = await db.otps.find({"email": request.email, "is_used": False}).to_list(100)
    if not valid_otps:
        raise HTTPException(status_code=400, detail="No valid OTP found for this email")

    latest_otp = max(valid_otps, key=lambda x: x.get("createdAt", ""))

    now = datetime.utcnow()
    expires_at = datetime.fromisoformat(latest_otp["expiresAt"])
    if now > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if latest_otp["otp_code"] != request.otp_code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    await db.otps.update_one({"otp_id": latest_otp["otp_id"]}, {"$set": {"is_used": True}})

    await db.users.update_one(
        {"email": request.email},
        {"$set": {"isEmailVerified": True, "updatedAt": now.isoformat()}}
    )

    return ApiResponse.ok("Email verified successfully")


@router.post("/resend-otp")
async def resend_otp(email: str = Query(...)):
    db = get_database()
    logger.info(f"Resend OTP endpoint called for email: {email}")

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found with email: {email}")

    otp_code = str(random.randint(1000, 9999))
    now = datetime.utcnow()
    otp = {
        "otp_id": str(uuid.uuid4()),
        "email": email,
        "otp_code": otp_code,
        "createdAt": now.isoformat(),
        "expiresAt": (now + __import__('datetime').timedelta(minutes=10)).isoformat(),
        "is_used": False,
    }
    await db.otps.insert_one(otp)

    try:
        send_otp_email(email, otp_code)
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email")

    return ApiResponse.ok("OTP sent successfully to your email")


@router.get("/users")
async def get_all_users():
    db = get_database()
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return ApiResponse.ok("Users retrieved successfully", users)


@router.get("/users/{email}")
async def get_user_by_email(email: str, user: dict = Depends(get_current_user)):
    db = get_database()
    found = await db.users.find_one({"email": email}, {"_id": 0, "password": 0})
    if not found:
        raise HTTPException(status_code=404, detail=f"User not found with email: {email}")
    return ApiResponse.ok("User retrieved successfully", found)


@router.get("/health")
async def health():
    return ApiResponse.ok("Cloud Campus Backend is running!")
