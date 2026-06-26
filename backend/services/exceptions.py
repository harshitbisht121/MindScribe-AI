class TranscriptError(Exception):
    """Base exception for transcript-related errors."""
    pass

class InvalidURLError(TranscriptError):
    """Raised when the YouTube URL is invalid."""
    pass

class VideoUnavailableError(TranscriptError):
    """Raised when the video is unavailable, private, or age-restricted."""
    pass

class NoCaptionsError(TranscriptError):
    """Raised when the video does not have any captions."""
    pass

class RateLimitError(TranscriptError):
    """Raised when a transcript provider hits a rate limit."""
    pass

class ProviderTimeoutError(TranscriptError):
    """Raised when a transcript provider times out."""
    pass

class ProviderFailedError(TranscriptError):
    """Raised when a transcript provider fails for an unknown reason."""
    pass

class WhisperFailedError(TranscriptError):
    """Raised when the Groq Whisper fallback fails."""
    pass
