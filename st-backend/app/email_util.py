import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()


def send_email(to: str, subject: str, body: str):
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.MAIL_USER
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(settings.MAIL_HOST, settings.MAIL_PORT) as server:
            server.starttls()
            server.login(settings.MAIL_USER, settings.MAIL_PASS)
            server.send_message(msg)

        logger.info(f"Email sent successfully to: {to}")
    except Exception as e:
        logger.error(f"Error sending email to {to}: {e}")
        raise RuntimeError(f"Failed to send email: {e}")


def send_otp_email(email: str, otp_code: str):
    subject = "Email Verification - Cloud Campus"
    body = f"""Dear User,

Thank you for registering with Cloud Campus!

Please use the following OTP code to verify your email address:

OTP Code: {otp_code}

This code will expire in 10 minutes.

If you did not request this verification, please ignore this email.

Best regards,
Cloud Campus Team"""
    send_email(email, subject, body)


def send_password_reset_otp_email(email: str, otp_code: str):
    subject = "Password Reset OTP - Cloud Campus"
    body = f"""Dear User,

You have requested to reset your password for your Cloud Campus account.

Please use the following OTP code to verify your identity:

OTP Code: {otp_code}

This code will expire in 10 minutes.

After verifying the OTP, you will be able to reset your password.

If you did not request this password reset, please ignore this email.

Best regards,
Cloud Campus Team"""
    send_email(email, subject, body)


def send_welcome_email(email: str, first_name: str):
    subject = "Welcome to Cloud Campus!"
    body = f"""Dear {first_name},

Welcome to Cloud Campus! We're excited to have you join our community.

Your account has been successfully created. You can now start exploring the platform.

Best regards,
Cloud Campus Team"""
    send_email(email, subject, body)


def send_password_reset_email(email: str, reset_token: str):
    subject = "Password Reset Request - Cloud Campus"
    body = f"""Dear User,

You have requested to reset your password for your Cloud Campus account.

Please use the following token to reset your password:
{reset_token}

This token will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
Cloud Campus Team"""
    send_email(email, subject, body)
