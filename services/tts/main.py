"""
HOLLY TTS Microservice - Self-Hosted Kokoro-82M
FastAPI service for production-grade text-to-speech
Created for Steve "Hollywood" Dorego
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from kokoro import KPipeline
import io
import soundfile as sf
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="HOLLY TTS Service",
    description="Self-hosted Kokoro-82M TTS microservice",
    version="1.0.0"
)

# CORS middleware - allow requests from HOLLY frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://holly.nexamusicgroup.com",
        "https://holly-ai-agent.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Kokoro pipeline (load once at startup)
logger.info("Initializing Kokoro-82M pipeline...")
try:
    pipeline = KPipeline(lang_code='a')  # 'a' = American English
    logger.info("✅ Kokoro-82M pipeline initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize Kokoro pipeline: {e}")
    pipeline = None


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"  # HOLLY's signature voice


class HealthResponse(BaseModel):
    status: str
    service: str
    model: str
    voice: str
    ready: bool


@app.get("/")
async def root():
    """Root endpoint - service info"""
    return {
        "service": "HOLLY TTS Microservice",
        "model": "Kokoro-82M",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "generate": "/tts/generate"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    is_ready = pipeline is not None
    
    return HealthResponse(
        status="healthy" if is_ready else "unhealthy",
        service="HOLLY TTS",
        model="Kokoro-82M (af_heart)",
        voice="af_heart",
        ready=is_ready
    )


@app.post("/tts/generate")
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using Kokoro-82M
    
    Args:
        request: TTSRequest with text and voice
        
    Returns:
        Audio file (WAV format, 24kHz)
    """
    try:
        # Validate pipeline is loaded
        if pipeline is None:
            raise HTTPException(
                status_code=503,
                detail="TTS pipeline not initialized"
            )
        
        # Validate input
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="Text cannot be empty"
            )
        
        if len(request.text) > 5000:
            raise HTTPException(
                status_code=400,
                detail="Text too long (max 5000 characters)"
            )
        
        logger.info(f"Generating speech for {len(request.text)} characters with voice: {request.voice}")
        
        # Generate audio using Kokoro
        generator = pipeline(request.text, voice=request.voice)
        
        # Collect all audio chunks
        audio_chunks = []
        for i, (gs, ps, audio) in enumerate(generator):
            audio_chunks.append(audio)
            logger.debug(f"Generated chunk {i}: gs={gs}, ps={ps}")
        
        if not audio_chunks:
            raise HTTPException(
                status_code=500,
                detail="No audio generated"
            )
        
        # Concatenate audio chunks
        import numpy as np
        full_audio = np.concatenate(audio_chunks)
        
        # Convert to WAV format in memory
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, full_audio, 24000, format='WAV')
        audio_buffer.seek(0)
        
        logger.info(f"✅ Generated {len(full_audio)} samples at 24kHz")
        
        # Return audio file
        return Response(
            content=audio_buffer.read(),
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=holly_speech.wav"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ TTS generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"TTS generation failed: {str(e)}"
        )


@app.get("/voices")
async def list_voices():
    """List available voices"""
    return {
        "voices": [
            {
                "id": "af_heart",
                "name": "Heart (Female)",
                "description": "HOLLY's signature voice - warm, confident, intelligent",
                "language": "en-US",
                "gender": "female",
                "recommended": True
            },
            {
                "id": "af_sky",
                "name": "Sky (Female)",
                "description": "Clear and professional",
                "language": "en-US",
                "gender": "female"
            },
            {
                "id": "af_bella",
                "name": "Bella (Female)",
                "description": "Warm and friendly",
                "language": "en-US",
                "gender": "female"
            },
            {
                "id": "af_sarah",
                "name": "Sarah (Female)",
                "description": "Articulate and precise",
                "language": "en-US",
                "gender": "female"
            },
            {
                "id": "am_adam",
                "name": "Adam (Male)",
                "description": "Deep and authoritative",
                "language": "en-US",
                "gender": "male"
            }
        ],
        "default": "af_heart"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
