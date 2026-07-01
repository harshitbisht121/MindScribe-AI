import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from backend.services.transcript_manager import TranscriptManager

async def test():
    manager = TranscriptManager()
    
    async def progress(msg):
        print(f"Progress: {msg}")
        
    try:
        url = "https://youtu.be/vhfRArT11jc"
        result = await manager.get_transcript(url, "en", progress)
        print(f"SUCCESS with provider: {result.provider}")
        print(f"Transcript length: {len(result.transcript)}")
    except Exception as e:
        print(f"FINAL ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(test())
