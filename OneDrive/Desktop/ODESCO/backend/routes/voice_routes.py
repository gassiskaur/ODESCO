import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from auth.dependencies import get_current_user
from processing_agent.services.voice_service import TranscriptionError, transcribe_audio_bytes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["voice"])


@router.post("/transcribe")
async def transcribe(audio: UploadFile, user: dict = Depends(get_current_user)):
    audio_bytes = await audio.read()
    try:
        text = transcribe_audio_bytes(audio_bytes, filename_hint=audio.filename or "audio.webm")
    except TranscriptionError as exc:
        logger.warning("Transcription failed for user %s: %s", user["id"], exc)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    return {"text": text}
