"""
Speech-to-text via faster-whisper. Runs entirely locally on the backend
(CPU by default) - no external API, no API key, no per-request cost, which
keeps this consistent with the rest of the app's free-tier approach.

The model is loaded once and cached as a module-level singleton, since
loading it fresh on every request would be slow (~1-2s+ just to load
weights, on top of actual transcription time).
"""
from __future__ import annotations

import tempfile
from pathlib import Path

from faster_whisper import WhisperModel

from config import settings

_model: WhisperModel | None = None


def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(
            settings.WHISPER_MODEL_SIZE,
            device=settings.WHISPER_DEVICE,
            compute_type=settings.WHISPER_COMPUTE_TYPE,
        )
    return _model


class TranscriptionError(Exception):
    pass


def transcribe_audio_bytes(audio_bytes: bytes, filename_hint: str = "audio.webm") -> str:
    if not audio_bytes:
        raise TranscriptionError("No audio data received.")

    suffix = Path(filename_hint).suffix or ".webm"
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_path = tmp.name
    try:
        tmp.write(audio_bytes)
        tmp.close()  # release the lock BEFORE anything else opens this path

        model = _get_model()
        segments, _info = model.transcribe(tmp_path, beam_size=5, language=None)
        text = " ".join(segment.text.strip() for segment in segments).strip()
    except Exception as exc:  # noqa: BLE001 - surface as a clean domain error
        raise TranscriptionError(f"Transcription failed: {exc}") from exc
    finally:
        Path(tmp_path).unlink(missing_ok=True)  # manual cleanup, works even if transcribe failed

    if not text:
        raise TranscriptionError("Could not detect any speech in that recording.")

    return text
