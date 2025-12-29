"""
Aura AI Worker - Flask API
Railway deployment wrapper for aura_analyzer.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from aura_analyzer import analyze_track

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'aura-ai-worker',
        'version': '2.1.0'
    })

# Main analysis endpoint
@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Analyze a music track
    
    Request body:
    {
        "audioUrl": "https://example.com/track.mp3",
        "lyrics": "optional lyrics text",
        "referenceTrack": "optional reference track URL"
    }
    
    Response:
    {
        "success": true,
        "analysis": {
            "hit_factor": 78,
            "scores": {...},
            "recommendations": [...],
            "similar_hits": [...],
            "features": {...}
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        audio_url = data.get('audioUrl')
        lyrics = data.get('lyrics')
        reference_track = data.get('referenceTrack')
        
        if not audio_url:
            return jsonify({
                'success': False,
                'error': 'audioUrl is required'
            }), 400
        
        logger.info(f'Analyzing track: {audio_url}')
        
        # Run analysis
        result = analyze_track(
            audio_url=audio_url,
            lyrics_text=lyrics,
            reference_track=reference_track
        )
        
        logger.info(f'Analysis complete: Hit Factor = {result["hit_factor"]}')
        
        return jsonify({
            'success': True,
            'analysis': result
        })
        
    except Exception as e:
        logger.error(f'Analysis failed: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'service': 'Aura AI Worker',
        'version': '2.1.0',
        'endpoints': {
            'health': '/health',
            'analyze': '/analyze (POST)'
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
