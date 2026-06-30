import asyncio
import os
import re
import time
from typing import Optional
import httpx

from services.exceptions import (
    ProviderFailedError, InvalidURLError, ProviderTimeoutError, RateLimitError
)
from services.transcript_providers.base import TranscriptProvider, TranscriptResult

class RapidAPITranscriptProvider(TranscriptProvider):
    def __init__(self):
        self.api_key = os.getenv("RAPIDAPI_KEY")
        self.api_host = os.getenv("RAPIDAPI_HOST")
        self.timeout = float(os.getenv("RAPIDAPI_TIMEOUT", "20.0"))
        self.max_retries = 3

    def _extract_video_id(self, url: str) -> str:
        video_id_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
        if not video_id_match:
            raise InvalidURLError("Invalid YouTube URL")
        return video_id_match.group(1)

    async def fetch_transcript(self, url: str, language: Optional[str]) -> TranscriptResult:
        if not self.api_key or not self.api_host:
            raise ProviderFailedError("RapidAPI configuration is missing (RAPIDAPI_KEY or RAPIDAPI_HOST)")

        video_id = self._extract_video_id(url)
        lang = language or "en"
        start_time = time.time()
        
        headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": self.api_host
        }
        
        # Using the youtube-transcript3 structure:
        endpoint = f"https://{self.api_host}/api/transcript"
        params = {"videoId": video_id}

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(endpoint, headers=headers, params=params)
                    
                    if response.status_code == 429:
                        if attempt < self.max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        raise RateLimitError("RapidAPI rate limit exceeded")
                        
                    if response.status_code != 200:
                        raise ProviderFailedError(f"RapidAPI returned status {response.status_code}: {response.text}")

                    data = response.json()
                    
                    # Adaptively parse the response based on common RapidAPI structures
                    full_text = ""
                    segments = []
                    duration = 0.0

                    if isinstance(data, list):
                        items = data
                    elif isinstance(data, dict):
                        items = data.get("transcript") or data.get("captions") or data.get("data") or []
                    else:
                        items = []

                    if items and isinstance(items, list):
                        if isinstance(items[0], dict) and "text" in items[0]:
                            full_text = " ".join([item.get("text", "") for item in items])
                            segments = items[:50]  # Just taking the first 50 for segments
                            duration = float(items[-1].get("offset", items[-1].get("start", 0)))
                        else:
                            # If it's a list of strings
                            full_text = " ".join(str(item) for item in items)
                    elif isinstance(data, dict) and "text" in data:
                        full_text = data["text"]
                        
                    if not full_text:
                        raise ProviderFailedError("Could not extract transcript text from RapidAPI response")

                    processing_time = time.time() - start_time
                    
                    return TranscriptResult(
                        transcript=full_text,
                        segments=segments,
                        duration=duration,
                        video_id=video_id,
                        provider="rapidapi",
                        source="captions",
                        language=lang,
                        processing_time=processing_time,
                        fallback_used=True
                    )

            except httpx.TimeoutException:
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise ProviderTimeoutError(f"RapidAPI timed out after {self.timeout} seconds")
            except httpx.RequestError as e:
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise ProviderFailedError(f"RapidAPI request failed: {str(e)}")
            except Exception as e:
                raise ProviderFailedError(f"RapidAPI processing failed: {str(e)}")

        raise ProviderFailedError("RapidAPI failed after maximum retries")
