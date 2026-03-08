from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai  # Requires: pip install google-generativeai

from app.config import get_settings


router = APIRouter(prefix="/api/v1/ai", tags=["AI Chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    sender: str = "bot"


def _get_gemini_model():
    settings = get_settings()
    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured in environment or .env file")
    model_name = (settings.GEMINI_MODEL or "gemini-1.5-flash").strip() or "gemini-1.5-flash"
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(payload: ChatRequest):
    """
    General-purpose AI chat (Gemini). Responds helpfully to any user message.
    """
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        model = _get_gemini_model()
        prompt = (
            "You are a helpful, friendly AI assistant. Answer the user clearly and concisely. "
            "Be polite and helpful for any topic.\n\nUser: " + message
        )
        result = model.generate_content(prompt)
        text = (result.text or "").strip()
        if not text:
            text = "I'm not sure how to respond. Could you rephrase or ask something else?"
        return ChatResponse(response=text)
    except RuntimeError:
        return ChatResponse(
            response="I can't reach the AI service right now. Please check GEMINI_API_KEY and try again."
        )
    except Exception as e:
        print(f"[AI_CHAT_ERROR] {e!r}")
        return ChatResponse(response="Something went wrong. Please try again in a moment.")
