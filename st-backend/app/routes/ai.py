import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ai", tags=["AI Chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    sender: str = "bot"


# Deprecated model names that are no longer supported by the API; map to a working model.
_GEMINI_MODEL_ALIASES = {
    "gemini-pro": "gemini-flash-latest",
    "gemini-1.0-pro": "gemini-flash-latest",
    "gemini-1.5-flash": "gemini-flash-latest",
}


def _get_gemini_model():
    settings = get_settings()
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured in environment or .env file")
    model_name = (settings.GEMINI_MODEL or "gemini-flash-latest").strip() or "gemini-flash-latest"
    model_name = _GEMINI_MODEL_ALIASES.get(model_name, model_name)
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


def _extract_text_from_result(result) -> str:
    """Safely get text from Gemini response. Handles blocked content and non-simple responses."""
    try:
        if hasattr(result, "text") and result.text:
            return (result.text or "").strip()
    except (ValueError, AttributeError):
        pass
    if not getattr(result, "candidates", None):
        return ""
    for candidate in result.candidates or []:
        content = getattr(candidate, "content", None)
        if not content or not getattr(content, "parts", None):
            continue
        parts = content.parts or []
        texts = []
        for part in parts:
            if hasattr(part, "text") and part.text:
                texts.append(part.text.strip())
        if texts:
            return " ".join(texts).strip()
    return ""


# Project context for the chatbot so it can answer about this platform
_PROJECT_SYSTEM_PROMPT = """You are the AI assistant for Cloud Campus — a Student Performance Predictor platform used by students, teachers, and admins.

**About the platform:**
- Students can view their dashboard (total score, study hours, attendance, class participation), performance predictor, modules, assessments, assignments, study resources (approved by admin), chat with teachers, and chatbot support.
- Study hours are calculated automatically from login to logout time and shown on the student dashboard (last 7 days).
- Teachers can manage students, upload study resources (by subject, pending admin approval), view results, upload attendance, and chat with students.
- Admins can manage users (students/teachers), approve or reject study resources, and access subjects & marks.

**Your role:** Help users with questions about using the platform, studying, grades, assignments, attendance, study resources, or general study tips. Be friendly, clear, and concise. If asked about something outside the platform, answer helpfully but briefly. Do not make up features that do not exist; stick to what the platform offers."""


def _call_gemini_sync(message: str) -> str:
    """Blocking Gemini call (run in thread). Returns response text or raises."""
    model = _get_gemini_model()
    prompt = _PROJECT_SYSTEM_PROMPT + "\n\nUser: " + message
    result = model.generate_content(prompt)
    text = _extract_text_from_result(result)
    if not text:
        return "I'm not sure how to respond. Could you rephrase or ask something else?"
    return text


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(payload: ChatRequest):
    """
    AI chat using Gemini. Runs the blocking API call in a thread so the event loop is not blocked.
    """
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        text = await asyncio.to_thread(_call_gemini_sync, message)
        return ChatResponse(response=text)
    except RuntimeError as e:
        msg = str(e).strip()
        if "GEMINI_API_KEY" in msg:
            logger.warning("AI chat: %s", msg)
            return ChatResponse(
                response="AI is not configured. Please set GEMINI_API_KEY in the server environment."
            )
        logger.exception("AI chat RuntimeError")
        return ChatResponse(response=f"AI service configuration error: {msg}")
    except Exception as e:
        logger.exception("AI chat error: %s", e)
        err_msg = str(e).strip() or type(e).__name__
        
        # Check for specific error types
        if "API key" in err_msg or "invalid" in err_msg.lower() or "403" in err_msg:
            return ChatResponse(
                response="AI service access error. Please check the API key and try again."
            )
        if "quota" in err_msg.lower() or "429" in err_msg:
            return ChatResponse(
                response="AI is busy right now (quota exceeded). Please try again in a minute."
            )
        if "404" in err_msg or "not found" in err_msg.lower():
            return ChatResponse(
                response="AI model not found. The configured model might be deprecated. Please check the server logs."
            )
            
        return ChatResponse(
            response=f"I encountered an error: {err_msg[:100]}. Please try again or rephrase your question."
        )
