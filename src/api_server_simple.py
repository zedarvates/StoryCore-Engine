"""
StoryCore API Server v2.0 - Serveur Autonome Simplifié
Routes: Media Intelligence, Audio Remix, Transcription

⚠️ DEPRECATED: This file is deprecated and will be removed in a future version.
           The routes have been merged into src/api_server_fastapi.py (FastAPI v2.0).

Deprecated: 2026-02-15
Migration: Use `python -m src.api_server_fastapi` or `uvicorn src.api_server_fastapi:app`
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Any, Dict, List
import uvicorn
import time
from datetime import datetime

# Create FastAPI app
app = FastAPI(
    title="StoryCore API v2.0",
    version="2.0.0",
    description="Media Intelligence, Audio Remix, Transcription"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# IN-MEMORY STORAGE
# ============================================

media_index: Dict[str, Dict] = {}
transcripts: Dict[str, Dict] = {}

# ============================================
# HELPER FUNCTIONS
# ============================================

async def parse_json_body(request: Request) -> Dict[str, Any]:
    """Parse JSON body or return empty dict"""
    try:
        return await request.json()
    except:
        return {}

# ============================================
# ROOT & HEALTH
# ============================================

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "StoryCore API v2.0",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "media": "/api/v1/media",
            "audio": "/api/v1/audio", 
            "transcription": "/api/v1/transcription"
        }
    }

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ============================================
# MEDIA INTELLIGENCE
# ============================================

@app.get("/api/v1/media/types")
async def media_types():
    """Get supported media types"""
    return {
        "types": ["image", "video", "audio", "text"],
        "modes": ["semantic", "keyword", "hybrid"]
    }

@app.get("/api/v1/media/stats")
async def media_stats():
    """Get media index statistics"""
    return {
        "total_assets": len(media_index),
        "indexed_assets": len(media_index),
        "index_size_mb": 0.0,
        "last_indexed": datetime.now().isoformat()
    }

@app.post("/api/v1/media/search")
async def media_search(request: Request):
    """Search for media assets"""
    body = await parse_json_body(request)
    query = body.get("query", "")
    
    # Simulate search results
    results = [
        {
            "asset_id": "asset_001",
            "asset_type": "video",
            "file_name": "video_sample.mp4",
            "similarity_score": 0.95,
            "match_type": "semantic"
        },
        {
            "asset_id": "asset_002", 
            "asset_type": "image",
            "file_name": "image_sample.jpg",
            "similarity_score": 0.87,
            "match_type": "keyword"
        }
    ]
    
    return {
        "query": query,
        "results_count": len(results),
        "processing_time": 0.1,
        "results": results
    }

@app.post("/api/v1/media/index")
async def media_index_endpoint(request: Request):
    """Index project assets"""
    body = await parse_json_body(request)
    project_id = body.get("project_id", "default")
    
    indexed_count = 5
    media_index[project_id] = {
        "project_id": project_id,
        "indexed_assets": indexed_count,
        "indexed_at": datetime.now().isoformat()
    }
    
    return {
        "project_id": project_id,
        "indexed_assets": indexed_count,
        "duration_seconds": 0.5
    }

# ============================================
# AUDIO REMIX
# ============================================

@app.get("/api/v1/audio/styles")
async def audio_styles():
    """Get available remix styles"""
    return {
        "styles": [
            {"id": "smooth", "name": "Smooth", "description": "Crossfade fluide"},
            {"id": "beat-cut", "name": "Beat Cut", "description": "Coupures sur beats"},
            {"id": "structural", "name": "Structural", "description": "Structure préservée"},
            {"id": "dynamic", "name": "Dynamic", "description": "Adaptation dynamique"}
        ]
    }

@app.get("/api/v1/audio/analyze/{music_url:path}")
async def analyze_structure(music_url: str):
    """Analyze music structure"""
    return {
        "music_url": music_url,
        "duration": 180.0,
        "tempo": 120.0,
        "key": "C major",
        "sections": [
            {"name": "intro", "start": 0.0, "end": 15.0},
            {"name": "verse", "start": 15.0, "end": 75.0},
            {"name": "chorus", "start": 75.0, "end": 105.0},
            {"name": "bridge", "start": 105.0, "end": 125.0},
            {"name": "outro", "start": 125.0, "end": 140.0}
        ]
    }

@app.post("/api/v1/audio/remix")
async def audio_remix(request: Request):
    """Remix audio to target duration"""
    body = await parse_json_body(request)
    
    music_url = body.get("music_url", "")
    target_duration = body.get("target_duration", 30.0)
    style = body.get("style", "smooth")
    
    original_duration = 180.0
    cuts = [
        {"start_time": 60.0, "end_time": 90.0, "reason": "Removed verse 2"},
        {"start_time": 120.0, "end_time": 125.0, "reason": "Removed bridge transition"}
    ]
    crossfades = [
        {"start_time": 55.0, "end_time": 60.0, "duration": 5.0}
    ]
    
    return {
        "music_url": music_url,
        "original_duration": original_duration,
        "target_duration": target_duration,
        "style": style,
        "remix_url": f"/output/remix_{int(time.time())}.mp3",
        "cuts": cuts,
        "crossfades": crossfades,
        "processing_time": 2.5
    }

# ============================================
# TRANSCRIPTION
# ============================================

@app.get("/api/v1/transcription/languages")
async def transcription_languages():
    """Get supported languages"""
    return {
        "languages": [
            {"code": "fr", "name": "Français"},
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Español"},
            {"code": "de", "name": "Deutsch"},
            {"code": "it", "name": "Italiano"}
        ]
    }

@app.post("/api/v1/transcription/transcribe")
async def transcribe_audio(request: Request):
    """Transcribe audio to text"""
    body = await parse_json_body(request)
    
    audio_url = body.get("audio_url", "")
    language = body.get("language", "fr")
    
    transcript_id = f"transcript_{int(time.time())}"
    
    segments = [
        {
            "segment_id": f"{transcript_id}_001",
            "start_time": 0.0,
            "end_time": 5.0,
            "text": "Bonjour et bienvenue dans cette vidéo.",
            "speaker": {"speaker_id": "speaker_1", "speaker_label": "Speaker 1"},
            "confidence": 0.95
        },
        {
            "segment_id": f"{transcript_id}_002",
            "start_time": 5.0,
            "end_time": 10.0,
            "text": "Aujourd'hui, nous allons parler de StoryCore.",
            "speaker": {"speaker_id": "speaker_1", "speaker_label": "Speaker 1"},
            "confidence": 0.92
        }
    ]
    
    transcripts[transcript_id] = {
        "transcript_id": transcript_id,
        "audio_url": audio_url,
        "language": language,
        "segments": segments
    }
    
    return {
        "transcript_id": transcript_id,
        "audio_url": audio_url,
        "language": language,
        "duration": 120.0,
        "word_count": 250,
        "speaker_count": 1,
        "segments": segments,
        "processing_time": 5.2
    }

@app.get("/api/v1/transcription/{transcript_id}")
async def get_transcript(transcript_id: str):
    """Get transcript by ID"""
    if transcript_id not in transcripts:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return transcripts[transcript_id]

@app.post("/api/v1/transcription/generate-montage")
async def generate_montage(request: Request):
    """Generate montage from transcript"""
    body = await parse_json_body(request)
    
    transcript_id = body.get("transcript_id", "")
    style = body.get("style", "chronological")
    
    shots = [
        {
            "shot_id": "shot_001",
            "source_start": 0.0,
            "source_end": 5.0,
            "text": "Bonjour et bienvenue dans cette vidéo."
        },
        {
            "shot_id": "shot_002",
            "source_start": 5.0,
            "source_end": 10.0,
            "text": "Aujourd'hui, nous allons parler de StoryCore."
        }
    ]
    
    return {
        "transcript_id": transcript_id,
        "style": style,
        "total_duration": 10.0,
        "shots": shots,
        "summary": f"Montage généré avec {len(shots)} plans en style {style}"
    }

# ============================================
# RUN SERVER
# ============================================

if __name__ == "__main__":
    PORT = 8001
    
    print(f"""
╔══════════════════════════════════════════════════════════════════════╗
║          StoryCore API v2.0 - Serveur Démarré                    ║
╠══════════════════════════════════════════════════════════════════════╣
║  Health:      http://localhost:{PORT}/health                   ║
║  Root:        http://localhost:{PORT}/                         ║
║  Media:       http://localhost:{PORT}/api/v1/media            ║
║  Audio:       http://localhost:{PORT}/api/v1/audio            ║
║  Transcription: http://localhost:{PORT}/api/v1/transcription║
╚══════════════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=PORT)
