#!/usr/bin/env python3
"""
HOLLY TTS API - Maya1 FastAPI Service
Production-ready TTS microservice for HOLLY AI
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import os
import io
import soundfile as sf

from holly_voice_generator import HollyVoiceGenerator, HOLLY_VOICE_DESCRIPTION

# Initialize FastAPI
app = FastAPI(
    title="HOLLY TTS API",
    description="Self-hosted Maya1 TTS microservice for HOLLY AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global voice generator (lazy load)
voice_generator: Optional[HollyVoiceGenerator] = None


def get_generator() -> HollyVoiceGenerator:
    """Get or initialize the voice generator"""
    global voice_generator
    if voice_generator is None:
        voice_generator = HollyVoiceGenerator()
    return voice_generator


class TTSRequest(BaseModel):
    """TTS generation request"""
    text: str = Field(..., description="Text to synthesize", min_length=1, max_length=5000)
    description: Optional[str] = Field(
        None,
        description="Voice description (defaults to HOLLY's signature voice)"
    )
    temperature: float = Field(0.4, ge=0.1, le=1.0, description="Sampling temperature")
    top_p: float = Field(0.9, ge=0.1, le=1.0, description="Nucleus sampling threshold")


class TTSResponse(BaseModel):
    """TTS generation response metadata"""
    success: bool
    duration_seconds: float
    sample_rate: int = 24000
    message: str


@app.on_event("startup")
async def startup_event():
    """Preload model on startup"""
    print("🚀 HOLLY TTS API starting up...")
    # Optionally preload model here
    # get_generator()
    print("✅ HOLLY TTS API ready!")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "HOLLY TTS API",
        "status": "online",
        "model": "maya-research/maya1",
        "version": "1.0.0",
        "voice": "HOLLY (Female, 30s, American, confident, intelligent, warm)"
    }


@app.get("/health")
async def health():
    """Health check for monitoring"""
    return {"status": "healthy", "model_loaded": voice_generator is not None}


@app.get("/cache/stats")
async def cache_stats():
    """Get voice cache statistics"""
    try:
        generator = get_generator()
        stats = generator.get_cache_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")


@app.post("/cache/clear")
async def clear_cache():
    """Clear voice cache"""
    try:
        generator = get_generator()
        generator.clear_cache()
        return {"success": True, "message": "Voice cache cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@app.post("/generate", response_class=Response)
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using HOLLY's voice
    
    Returns WAV audio (24kHz, mono)
    """
    try:
        # Get generator
        generator = get_generator()
        
        # Generate audio
        audio = generator.generate(
            text=request.text,
            description=request.description,
            temperature=request.temperature,
            top_p=request.top_p
        )
        
        # Convert to WAV bytes
        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, audio, 24000, format='WAV')
        wav_bytes = wav_buffer.getvalue()
        
        # Return audio
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=holly_speech.wav",
                "X-Duration-Seconds": str(len(audio) / 24000),
                "X-Sample-Rate": "24000"
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@app.post("/generate/info")
async def generate_speech_info(request: TTSRequest) -> TTSResponse:
    """
    Generate speech and return metadata (without audio bytes)
    Useful for testing and monitoring
    """
    try:
        generator = get_generator()
        
        audio = generator.generate(
            text=request.text,
            description=request.description,
            temperature=request.temperature,
            top_p=request.top_p
        )
        
        duration = len(audio) / 24000
        
        return TTSResponse(
            success=True,
            duration_seconds=duration,
            message=f"Generated {len(audio)} samples ({duration:.2f}s)"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@app.get("/voice/info")
async def voice_info():
    """Get HOLLY's voice profile information"""
    return {
        "voice_name": "HOLLY",
        "description": HOLLY_VOICE_DESCRIPTION,
        "model": "maya-research/maya1",
        "sample_rate": 24000,
        "supported_emotions": [
            "laugh", "laugh_harder", "chuckle", "giggle",
            "whisper", "sigh", "gasp",
            "angry", "cry",
            "confident", "warm", "intelligent"
        ],
        "usage_example": {
            "text": "Hello Hollywood! <chuckle> Let's build something amazing.",
            "description": HOLLY_VOICE_DESCRIPTION
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("PORT", 8000))
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        workers=1,  # Maya1 is memory-intensive, use 1 worker
        log_level="info"
    )
