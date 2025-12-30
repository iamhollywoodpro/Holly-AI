"""
AURA Analysis Worker Server
FastAPI server that processes music analysis jobs
"""

import os
import logging
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from aura_analyzer import analyze_track

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="AURA Analysis Worker", version="2.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
WORKER_TOKEN = os.getenv("AURA_WORKER_TOKEN", "")
DATABASE_URL = os.getenv("DATABASE_URL", "")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")


class AnalyzeRequest(BaseModel):
    jobId: str
    audioUrl: str
    lyricsText: Optional[str] = None
    referenceTrack: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    message: str


def verify_token(authorization: Optional[str] = Header(None)) -> bool:
    """Verify authorization token"""
    if not WORKER_TOKEN:
        return True  # No token required if not configured
    
    if not authorization:
        return False
    
    try:
        scheme, token = authorization.split()
        return scheme.lower() == "bearer" and token == WORKER_TOKEN
    except ValueError:
        return False


async def update_progress(job_id: str, progress: int):
    """Update job progress via API"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{API_BASE_URL}/api/aura/progress",
                json={"jobId": job_id, "progress": progress},
                timeout=10.0
            )
    except Exception as e:
        logger.error(f"Failed to update progress: {e}")


async def update_result(job_id: str, result: Dict[str, Any]):
    """Update job result via API"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{API_BASE_URL}/api/aura/complete",
                json={"jobId": job_id, "result": result},
                timeout=30.0
            )
    except Exception as e:
        logger.error(f"Failed to update result: {e}")


async def update_error(job_id: str, error: str):
    """Update job error via API"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{API_BASE_URL}/api/aura/error",
                json={"jobId": job_id, "error": error},
                timeout=10.0
            )
    except Exception as e:
        logger.error(f"Failed to update error: {e}")


async def process_analysis(job_id: str, data: AnalyzeRequest):
    """Process analysis job in background"""
    try:
        logger.info(f"Processing job {job_id}")
        
        # Progress callback
        def progress_callback(progress: int):
            import asyncio
            asyncio.create_task(update_progress(job_id, progress))
        
        # Run analysis
        result = analyze_track(
            audio_url=data.audioUrl,
            lyrics_text=data.lyricsText,
            reference_track=data.referenceTrack,
            progress_callback=progress_callback
        )
        
        # Update result
        await update_result(job_id, result)
        
        logger.info(f"Job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}", exc_info=True)
        await update_error(job_id, str(e))


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.1.0",
        "message": "AURA Analysis Worker is running"
    }


@app.post("/analyze")
async def analyze(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None)
):
    """Submit analysis job"""
    
    # Verify authorization
    if not verify_token(authorization):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Queue background task
    background_tasks.add_task(process_analysis, request.jobId, request)
    
    return {
        "jobId": request.jobId,
        "status": "queued",
        "message": "Analysis job queued successfully"
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    
    logger.info(f"Starting AURA Worker on port {port}")
    
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
