# HOLLY TTS Microservice - Docker Image
# Kokoro-82M Self-Hosted TTS Service
# Created for Steve "Hollywood" Dorego

FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (espeak-ng required for Kokoro)
RUN apt-get update && apt-get install -y \
    espeak-ng \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Expose port (Railway sets PORT env var)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Run the application (use PORT from Railway env)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
