from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class TranscriptResult(BaseModel):
    transcript: str
    segments: List[Dict[str, Any]]
    duration: float
    video_id: str
    provider: str
    source: str
    language: str
    processing_time: float
    fallback_used: bool
    fallback_count: int = 0

class TranscriptProvider(ABC):
    @abstractmethod
    async def fetch_transcript(self, url: str, language: Optional[str]) -> TranscriptResult:
        """
        Fetch transcript for a given YouTube URL.
        
        Args:
            url: YouTube video URL
            language: Target language code (e.g. 'en')
            
        Returns:
            TranscriptResult containing the transcript and metadata.
            
        Raises:
            TranscriptError: Base exception for all transcript errors.
        """
        pass
