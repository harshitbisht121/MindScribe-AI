import os
import re
from typing import Optional, Callable, Awaitable
from firebase_admin import firestore

from services.exceptions import TranscriptError
from services.transcript_providers.base import TranscriptResult
from services.transcript_providers.youtube_api import YouTubeAPITranscriptProvider
from services.transcript_providers.rapidapi import RapidAPITranscriptProvider
from services.transcript_providers.groq_whisper import GroqWhisperTranscriptProvider

class TranscriptManager:
    def __init__(self, db=None):
        self.db = db
        
        self.providers = []
        
        if os.getenv("ENABLE_YOUTUBE_API", "true").lower() == "true":
            self.providers.append({
                "name": "YouTube API",
                "instance": YouTubeAPITranscriptProvider(),
                "progress_msg": "Checking YouTube captions..."
            })
            
        if os.getenv("ENABLE_RAPIDAPI", "true").lower() == "true":
            self.providers.append({
                "name": "RapidAPI",
                "instance": RapidAPITranscriptProvider(),
                "progress_msg": "Trying backup provider..."
            })
            
        if os.getenv("ENABLE_GROQ", "true").lower() == "true":
            self.providers.append({
                "name": "Groq Whisper",
                "instance": GroqWhisperTranscriptProvider(),
                "progress_msg": "Generating transcript from audio..."
            })

    def _extract_video_id(self, url: str) -> Optional[str]:
        match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
        return match.group(1) if match else None

    async def get_transcript(
        self, 
        url: str, 
        language: Optional[str] = "en", 
        progress_callback: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> TranscriptResult:
        
        video_id = self._extract_video_id(url)
        
        # 1. Check Cache
        if self.db and video_id:
            try:
                cache_ref = self.db.collection("transcripts_cache").document(video_id)
                cache_doc = cache_ref.get()
                if cache_doc.exists:
                    data = cache_doc.to_dict()
                    if data.get("language") == language and data.get("transcript"):
                        if progress_callback:
                            await progress_callback("Loading cached transcript...")
                        print(f"[Cache] Hit for video {video_id}")
                        return TranscriptResult(
                            transcript=data["transcript"],
                            segments=data.get("segments", []),
                            duration=data.get("duration", 0),
                            video_id=video_id,
                            provider="cache",
                            source="cache",
                            language=language,
                            processing_time=0.0,
                            fallback_used=False
                        )
            except Exception as e:
                print(f"Cache read error: {e}")

        # 2. Iterate Providers
        errors = []
        fallback_count = 0
        
        for idx, provider_info in enumerate(self.providers):
            provider_name = provider_info["name"]
            provider_instance = provider_info["instance"]
            
            if progress_callback:
                msg = provider_info["progress_msg"]
                if idx > 0:
                    msg = f"Previous provider failed. {msg}"
                await progress_callback(msg)
                
            try:
                print(f"[{provider_name}] Attempting to fetch transcript...")
                result = await provider_instance.fetch_transcript(url, language)
                result.fallback_count = fallback_count
                
                print(f"[{provider_name}] Success in {result.processing_time:.2f} sec")
                
                if progress_callback:
                    await progress_callback("Transcript generated successfully.")
                
                # Update Cache
                if self.db and video_id:
                    try:
                        self.db.collection("transcripts_cache").document(video_id).set({
                            "transcript": result.transcript,
                            "segments": result.segments,
                            "duration": result.duration,
                            "language": result.language,
                            "provider": result.provider,
                            "timestamp": firestore.SERVER_TIMESTAMP if 'firestore' in globals() else None
                        })
                    except Exception as e:
                        print(f"Cache write error: {e}")
                        
                return result
                
            except TranscriptError as e:
                print(f"[{provider_name}] Failed: {str(e)}")
                errors.append(f"{provider_name}: {str(e)}")
                fallback_count += 1
                continue
                
        # 3. All providers failed
        error_msg = " | ".join(errors)
        raise TranscriptError(f"All transcript providers failed. Errors: {error_msg}")
