# AURA Analysis Worker

Python worker that processes AURA music analysis jobs from the PostgreSQL queue.

## Architecture

```
PostgreSQL Queue
    ↓
Worker polls for jobs
    ↓
Downloads audio file
    ↓
Runs ML analysis (librosa)
    ↓
Updates progress in database
    ↓
Saves results to database
```

## Features

- **Job Queue Processing**: Polls PostgreSQL for queued jobs
- **Audio Analysis**: Uses librosa for feature extraction
- **Progress Tracking**: Updates database with real-time progress
- **Error Handling**: Automatic retries and error logging
- **Scalable**: Can run multiple workers in parallel

## Local Development

### Prerequisites

- Python 3.9+
- PostgreSQL database
- Audio files accessible via URL

### Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/holly
POLL_INTERVAL=5
```

4. Run worker:
```bash
python worker.py
```

## Railway Deployment

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your Holly-AI repository
5. Select the `worker` directory as root

### Step 2: Configure Environment Variables

Add these environment variables in Railway dashboard:

```
DATABASE_URL=<your-postgresql-connection-string>
POLL_INTERVAL=5
MAX_RETRIES=3
LOG_LEVEL=INFO
```

**Get DATABASE_URL**:
- From Vercel: Project Settings → Environment Variables
- Should start with `postgresql://` or `postgres://`

### Step 3: Deploy

Railway will automatically:
1. Detect Python project
2. Install dependencies from `requirements.txt`
3. Run `python worker.py`
4. Restart on failure

### Step 4: Monitor

- View logs in Railway dashboard
- Check for "AURA Analysis Worker starting..." message
- Monitor job processing logs

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `POLL_INTERVAL` | Seconds between queue polls | 5 |
| `MAX_RETRIES` | Max retries for failed jobs | 3 |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | INFO |

## How It Works

### 1. Job Polling

Worker polls PostgreSQL every `POLL_INTERVAL` seconds:

```sql
SELECT * FROM "AuraAnalysis"
WHERE status = 'queued'
ORDER BY "createdAt" ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

`FOR UPDATE SKIP LOCKED` ensures:
- Only one worker processes each job
- No race conditions with multiple workers

### 2. Job Processing

For each job:

1. **Update status to 'processing'**
   ```python
   update_job_status(conn, job_id, 'processing', progress=0)
   ```

2. **Download audio file**
   ```python
   audio_path = download_audio(audio_url)
   ```

3. **Extract audio features**
   - Tempo (BPM)
   - Spectral features
   - MFCC coefficients
   - RMS energy

4. **Analyze lyrics** (if provided)
   - Word count
   - Simple scoring

5. **Calculate Hit Factor**
   - Audio score (35% weight)
   - Lyrics score (25% weight)
   - Brand score (20% weight)
   - Market score (20% weight)

6. **Generate recommendations**
   - Production feedback
   - Arrangement suggestions
   - Marketing advice

7. **Find similar hits**
   - (Placeholder - would use vector database)

8. **Save results**
   ```python
   update_job_status(
       conn, job_id, 'completed',
       hitFactor=result['hit_factor'],
       recommendations=json.dumps(result['recommendations']),
       ...
   )
   ```

### 3. Progress Updates

Worker updates progress throughout analysis:

- 0%: Job started
- 10%: Audio downloaded
- 20%: Audio loaded
- 30-50%: Feature extraction
- 60%: Lyrics analyzed
- 70%: Scores calculated
- 80%: Recommendations generated
- 90%: Similar hits found
- 100%: Complete

Frontend polls `/api/aura/status/:jobId` to display progress.

## Analysis Algorithm

### Audio Score (35% weight)

Based on:
- **Tempo**: 90-130 BPM is commercial sweet spot (+15 points)
- **Energy**: RMS > 0.08 indicates good energy (+10 points)
- **Base score**: 70 points

### Lyrics Score (25% weight)

Based on:
- **Word count**: More words = higher score
- **Has lyrics**: Bonus for having lyrics
- **Base score**: 50 points (neutral)

### Brand Score (20% weight)

Currently simplified to 75 points. In production would analyze:
- Artist brand consistency
- Visual identity
- Social media presence

### Market Score (20% weight)

Currently simplified to 70 points. In production would analyze:
- Current trends
- Genre popularity
- Streaming data

### Hit Factor Formula

```python
hit_factor = (
    audio_score * 0.35 +
    lyrics_score * 0.25 +
    brand_score * 0.20 +
    market_score * 0.20
)
```

## Scaling

### Single Worker (Free Tier)

- Handles ~10-20 jobs/hour
- Sufficient for MVP and testing
- Railway free tier: $5/month credit

### Multiple Workers (Production)

To scale, deploy multiple worker instances:

1. Each worker polls independently
2. `FOR UPDATE SKIP LOCKED` prevents conflicts
3. Jobs distributed automatically
4. Linear scaling (2 workers = 2x throughput)

### Optimization

- **Batch processing**: Process multiple jobs per poll
- **Caching**: Cache audio features for similar tracks
- **GPU acceleration**: Use GPU for faster feature extraction
- **Parallel processing**: Process multiple tracks simultaneously

## Monitoring

### Health Checks

Worker logs:
- Startup message
- Job processing start/end
- Errors and exceptions
- Queue status

### Metrics to Track

- Jobs processed per hour
- Average processing time
- Error rate
- Queue depth

### Alerts

Set up alerts for:
- Worker crashes
- High error rate
- Queue backlog
- Long processing times

## Troubleshooting

### Worker not starting

- Check `DATABASE_URL` is correct
- Verify database is accessible
- Check Python version (3.9+)

### Jobs not processing

- Check worker logs for errors
- Verify jobs are in 'queued' status
- Check audio URLs are accessible

### Slow processing

- Check CPU/memory usage
- Verify audio files aren't too large
- Consider adding more workers

### Database connection errors

- Check `DATABASE_URL` format
- Verify SSL mode if required
- Check firewall rules

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic audio analysis
- ✅ Simple scoring algorithm
- ✅ Progress tracking

### Phase 2 (Next)
- [ ] Advanced ML models (PyTorch)
- [ ] Vector database for similar tracks (Pinecone)
- [ ] Real-time genre classification
- [ ] Vocal isolation and analysis

### Phase 3 (Future)
- [ ] Multi-track analysis (albums)
- [ ] A/B testing recommendations
- [ ] Trend prediction
- [ ] Market opportunity scoring

## License

Proprietary - Part of HOLLY AI system
