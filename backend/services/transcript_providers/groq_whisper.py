import asyncio
import os
import re
import tempfile
import time
from typing import Optional

from services.exceptions import (
    ProviderFailedError, InvalidURLError, ProviderTimeoutError, WhisperFailedError
)
from services.transcript_providers.base import TranscriptProvider, TranscriptResult

class GroqWhisperTranscriptProvider(TranscriptProvider):
    def __init__(self):
        self.timeout = float(os.getenv("WHISPER_TIMEOUT", "120.0"))

    def _extract_video_id(self, url: str) -> str:
        video_id_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
        if not video_id_match:
            raise InvalidURLError("Invalid YouTube URL")
        return video_id_match.group(1)

    async def fetch_transcript(self, url: str, language: Optional[str]) -> TranscriptResult:
        video_id = self._extract_video_id(url)
        lang = language or "en"
        start_time = time.time()
        
        # Local import to prevent circular dependency with main.py
        try:
            from main import transcribe_with_groq
        except ImportError:
            raise WhisperFailedError("Could not import transcribe_with_groq from main.py")

        try:
            import yt_dlp
        except ImportError:
            raise WhisperFailedError("yt-dlp is not installed")

        def download_audio():
            temp_dir = tempfile.gettempdir()
            out_tmpl = os.path.join(temp_dir, f'{video_id}_%(id)s.%(ext)s')
            ydl_opts = {
                'format': 'worstaudio[ext=m4a]/worstaudio/bestaudio',
                'outtmpl': out_tmpl,
                'noplaylist': True,
                'quiet': True,
                'rm_cachedir': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                duration = info.get('duration', 0)
                
                # 45 mins limit (~25MB audio limit for Groq)
                if duration > 45 * 60:
                    raise ValueError(f"Video is too long ({int(duration/60)} mins). Max duration is 45 minutes for AI processing.")
                
                info = ydl.extract_info(url, download=True)
                return ydl.prepare_filename(info), duration

        try:
            audio_path, duration = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, download_audio),
                timeout=self.timeout
            )
        except asyncio.TimeoutError:
            raise ProviderTimeoutError(f"yt-dlp download timed out after {self.timeout} seconds")
        except Exception as e:
            raise ProviderFailedError(f"Audio download failed: {str(e)}")

        try:
            transcript_result = await asyncio.wait_for(
                transcribe_with_groq(audio_path, lang),
                timeout=self.timeout
            )
            
            full_text = transcript_result.get("text", "")
            segments = transcript_result.get("segments", [])
            
            processing_time = time.time() - start_time
            
            return TranscriptResult(
                transcript=full_text,
                segments=segments,
                duration=transcript_result.get("duration") or duration,
                video_id=video_id,
                provider="groq_whisper",
                source="whisper",
                language=lang,
                processing_time=processing_time,
                fallback_used=True
            )
            
        except asyncio.TimeoutError:
            raise ProviderTimeoutError(f"Groq Whisper transcription timed out after {self.timeout} seconds")
        except Exception as e:
            raise WhisperFailedError(f"Groq Whisper transcription failed: {str(e)}")
        finally:
            if os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except Exception:
                    pass
