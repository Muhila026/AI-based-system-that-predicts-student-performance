from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()

SECRET_KEY = settings.JWT_SECRET
ALGORITHM = "HS256"
EXPIRATION_MINUTES = settings.JWT_EXPIRATION_MINUTES


def create_access_token(email: str, role: str = "user") -> str:
    to_encode = {
        "sub": email,
        "role": role,
        "iat": datetime.utcnow(),
    }
    if EXPIRATION_MINUTES and EXPIRATION_MINUTES > 0:
        expire = datetime.utcnow() + timedelta(minutes=EXPIRATION_MINUTES)
        to_encode["exp"] = expire
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def extract_email(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def extract_role(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("role")
    except JWTError:
        return None


def validate_token(token: str) -> bool:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub") is not None
    except JWTError:
        return False
