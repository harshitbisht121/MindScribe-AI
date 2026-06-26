import asyncio
import os
import re
import time
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

from services.exceptions import (
    ProviderFailedError, NoCaptionsError, VideoUnavailableError, InvalidURLError, ProviderTimeoutError
)
from services.transcript_providers.base import TranscriptProvider, TranscriptResult

class YouTubeAPITranscriptProvider(TranscriptProvider):
    def __init__(self):
        self.timeout = float(os.getenv("YOUTUBE_API_TIMEOUT", "10.0"))

    def _extract_video_id(self, url: str) -> str:
        video_id_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
        if not video_id_match:
            raise InvalidURLError("Invalid YouTube URL")
        return video_id_match.group(1)

    async def fetch_transcript(self, url: str, language: Optional[str]) -> TranscriptResult:
        video_id = self._extract_video_id(url)
        lang = language or "en"
        
        start_time = time.time()
        
        def fetch():
            try:
                transcript_list = YouTubeTranscriptApi().list(video_id)
            except TranscriptsDisabled:
                raise NoCaptionsError(f"Transcripts are disabled for video {video_id}")
            except VideoUnavailable:
                raise VideoUnavailableError(f"Video {video_id} is unavailable")
            except Exception as e:
                raise ProviderFailedError(f"Failed to list transcripts: {str(e)}")

            try:
                transcript = transcript_list.find_transcript([lang, 'en', 'hi'])
            except NoTranscriptFound:
                try:
                    transcript = list(transcript_list)[0]
                except Exception:
                    raise NoCaptionsError(f"No usable transcript found for video {video_id}")
            except Exception as e:
                raise ProviderFailedError(f"Failed to find transcript: {str(e)}")

            try:
                data = transcript.fetch()
            except Exception as e:
                raise ProviderFailedError(f"Failed to fetch transcript data: {str(e)}")

            def get_val(obj, key): 
                return getattr(obj, key) if hasattr(obj, key) else obj.get(key, 0 if key in ['start', 'duration'] else '')
            
            full_text = ' '.join([get_val(item, 'text') for item in data])
            segments = [{"start": get_val(item, 'start'), "end": get_val(item, 'start') + get_val(item, 'duration'), "text": get_val(item, 'text')} for item in data[:50]]
            duration = get_val(data[-1], 'start') + get_val(data[-1], 'duration') if data else 0
            
            return full_text, segments, duration

        try:
            full_text, segments, duration = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, fetch),
                timeout=self.timeout
            )
        except asyncio.TimeoutError:
            raise ProviderTimeoutError(f"youtube-transcript-api timed out after {self.timeout} seconds")
            
        processing_time = time.time() - start_time
        
        return TranscriptResult(
            transcript=full_text,
            segments=segments,
            duration=duration,
            video_id=video_id,
            provider="youtube_api",
            source="captions",
            language=lang,
            processing_time=processing_time,
            fallback_used=False
        )
