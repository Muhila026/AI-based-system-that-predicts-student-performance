from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import google.generativeai as genai  # Requires: pip install google-generativeai

from app.auth import get_current_user
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
    # For this deprecated SDK, gemini-1.5-flash is a safe, supported chat model.
    model_name = "gemini-1.5-flash"
    print(f"[AI_MODEL] Using Gemini model: {model_name!r}")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(payload: ChatRequest):
    """
    Study‑only chat endpoint backed by Google Gemini.

    - Only answers academic / study questions (school, university, courses).
    - If the question is clearly unrelated to learning, the bot refuses politely.
    """
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    try:
        model = _get_gemini_model()

        system_prompt = (
            "You are an AI study assistant for university students.\n"
            "- ONLY answer questions related to studying, courses, homework, exams, or academic skills.\n"
            "- If the user asks about anything non‑academic (e.g., politics, finance, adult topics, "
            "personal advice unrelated to studying), reply:\n"
            "  \"I’m designed to help only with study‑related questions. Please ask me about your subjects, "
            "assignments, or exams.\"\n"
            "- Keep answers clear, concise, and beginner‑friendly.\n"
            "- When helpful, break explanations into short steps or bullet points.\n"
        )

        prompt = f"{system_prompt}\n\nStudent question:\n{message}"

        result = model.generate_content(prompt)
        text = (result.text or "").strip()
        if not text:
            raise RuntimeError("Empty response from Gemini model")

        return ChatResponse(response=text)
    except RuntimeError as e:
        # Configuration / model issues – surface a friendly message to the user
        return ChatResponse(
            response="I'm sorry, I can't reach the AI service right now. "
            f"Configuration issue: {e}"
        )
    except Exception as e:  # pragma: no cover - defensive
        # Log and return graceful fallback instead of 500
        print(f"[AI_CHAT_ERROR] {e!r}")
        return ChatResponse(
            response=(
                "I'm sorry, I'm having trouble answering right now. "
                "Please try again in a moment."
            )
        )

