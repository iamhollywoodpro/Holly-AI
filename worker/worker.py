#!/usr/bin/env python3
"""
AURA Analysis Worker
Polls PostgreSQL for queued analysis jobs and processes them
"""

import os
import sys
import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Import AURA analysis functions
from aura_analyzer import analyze_track

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection string
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable not set")
    sys.exit(1)

# Worker configuration
POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', '5'))  # seconds
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))


def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def fetch_queued_job(conn) -> Optional[Dict[str, Any]]:
    """Fetch the oldest queued job"""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT * FROM "AuraAnalysis"
            WHERE status = 'queued'
            ORDER BY "createdAt" ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        """)
        return cur.fetchone()


def update_job_status(conn, job_id: str, status: str, progress: int = 0, **kwargs):
    """Update job status and progress"""
    set_clauses = ['"status" = %s', '"progress" = %s', '"updatedAt" = NOW()']
    params = [status, progress]
    
    if kwargs:
        for key, value in kwargs.items():
            set_clauses.append(f'"{key}" = %s')
            params.append(value)
    
    params.append(job_id)
    
    with conn.cursor() as cur:
        query = f"""
            UPDATE "AuraAnalysis"
            SET {', '.join(set_clauses)}
            WHERE "jobId" = %s
        """
        cur.execute(query, params)
    conn.commit()


def process_job(conn, job: Dict[str, Any]):
    """Process a single analysis job"""
    job_id = job['jobId']
    logger.info(f"Processing job {job_id}: {job['trackTitle']} by {job['artistName']}")
    
    try:
        # Update status to processing
        update_job_status(conn, job_id, 'processing', progress=0)
        
        # Extract job data
        audio_url = job['audioUrl']
        lyrics_text = job.get('lyricsText')
        reference_track = job.get('referenceTrack')
        
        # Run analysis
        start_time = time.time()
        result = analyze_track(
            audio_url=audio_url,
            lyrics_text=lyrics_text,
            reference_track=reference_track,
            progress_callback=lambda p: update_job_status(conn, job_id, 'processing', progress=p)
        )
        processing_time = int((time.time() - start_time) * 1000)
        
        # Save results
        update_job_status(
            conn,
            job_id,
            'completed',
            progress=100,
            hitFactor=result['hit_factor'],
            audioScore=result['scores']['audio'],
            lyricsScore=result['scores']['lyrics'],
            brandScore=result['scores']['brand'],
            marketScore=result['scores']['market'],
            recommendations=json.dumps(result['recommendations']),
            similarHits=json.dumps(result['similar_hits']),
            fullReport=json.dumps(result),
            modelVersion=result.get('model_version', 'AURA-v2.1'),
            processingTime=processing_time,
            completedAt=datetime.utcnow()
        )
        
        logger.info(f"Job {job_id} completed successfully (Hit Factor: {result['hit_factor']})")
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {str(e)}", exc_info=True)
        update_job_status(
            conn,
            job_id,
            'failed',
            progress=0,
            errorMessage=str(e)
        )


def main():
    """Main worker loop"""
    logger.info("AURA Analysis Worker starting...")
    logger.info(f"Poll interval: {POLL_INTERVAL}s")
    
    while True:
        try:
            # Connect to database
            conn = get_db_connection()
            
            # Fetch queued job
            job = fetch_queued_job(conn)
            
            if job:
                # Process job
                process_job(conn, job)
            else:
                # No jobs available
                logger.debug("No queued jobs found")
            
            # Close connection
            conn.close()
            
            # Wait before next poll
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Worker stopped by user")
            break
        except Exception as e:
            logger.error(f"Worker error: {str(e)}", exc_info=True)
            time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
