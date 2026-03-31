"""
HOLLY Kokoro TTS Server
=======================
OpenAI-compatible /v1/audio/speech endpoint powered by kokoro-onnx.
Runs on CPU, no Docker, no GPU credits — $0 forever.

Usage:
    python3 server.py

Endpoint:
    POST http://localhost:8880/v1/audio/speech
    GET  http://localhost:8880/health
    GET  http://localhost:8880/v1/audio/voices
"""

import io
import os
import sys
import logging
import numpy as np
import soundfile as sf

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("kokoro-tts")

# ── Download model weights on first run ──────────────────────────────────────
log.info("Loading Kokoro ONNX model (downloads ~80MB on first run)...")

try:
    from kokoro_onnx import Kokoro
    kokoro = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
    log.info("Kokoro model loaded successfully.")
except Exception as e:
    log.error(f"Failed to load Kokoro: {e}")
    log.info("Trying alternate model filenames...")
    try:
        kokoro = Kokoro.from_session("kokoro-v1_0.onnx", "voices-v1_0.bin")
        log.info("Kokoro model loaded (alternate).")
    except Exception as e2:
        log.error(f"Still failed: {e2}")
        kokoro = None

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="HOLLY Kokoro TTS", version="1.0.0")

# Available voices (Kokoro-82M)
VOICES = [
    "af_heart", "af_bella", "af_sky", "af_sarah", "af_nicole",
    "af_alloy", "af_aoede", "af_kore", "af_river",
    "bf_emma", "bf_isabella",
    "am_adam", "bm_lewis",
]
DEFAULT_VOICE = os.getenv("KOKORO_VOICE", "af_heart")

class SpeechRequest(BaseModel):
    model: str = "kokoro"
    input: str
    voice: str = DEFAULT_VOICE
    response_format: str = "wav"
    speed: float = 1.0

@app.get("/health")
def health():
    return {
        "status": "ok" if kokoro else "model_load_failed",
        "model": "kokoro-82M",
        "voices": VOICES,
        "default_voice": DEFAULT_VOICE,
    }

@app.get("/v1/audio/voices")
def list_voices():
    return {"voices": [{"voice_id": v, "name": v} for v in VOICES]}

@app.post("/v1/audio/speech")
def synthesize(req: SpeechRequest):
    if not kokoro:
        raise HTTPException(status_code=503, detail="Kokoro model not loaded")

    text = req.input.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Input text is empty")

    # Handle voice mixing syntax: "af_heart(2)+af_bella(1)" → use first voice
    voice = req.voice.split("+")[0].strip()
    if "(" in voice:
        voice = voice.split("(")[0].strip()
    if voice not in VOICES:
        log.warning(f"Unknown voice '{voice}', falling back to {DEFAULT_VOICE}")
        voice = DEFAULT_VOICE

    log.info(f"Synthesising {len(text)} chars with voice={voice}")

    try:
        samples, sample_rate = kokoro.create(
            text,
            voice=voice,
            speed=req.speed,
            lang="en-us",
        )

        # Convert to WAV bytes
        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
        wav_bytes = buf.getvalue()

        log.info(f"Generated {len(wav_bytes)} bytes @ {sample_rate}Hz")

        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "X-Voice-Provider": "kokoro",
                "X-Voice-Model": "kokoro-82M",
                "X-Kokoro-Voice": voice,
                "X-Sample-Rate": str(sample_rate),
            },
        )

    except Exception as e:
        log.error(f"Synthesis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8880))
    log.info(f"Starting HOLLY Kokoro TTS server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
