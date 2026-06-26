import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

async def generate_with_groq_debug(prompt: str, system: str = "") -> str:
    import httpx
    if not os.getenv("GROQ_API_KEY"):
        return ""
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
            }
        )
        return response.text

async def test():
    res = await generate_with_groq_debug("Hello")
    print("Raw Response:", res)

if __name__ == "__main__":
    asyncio.run(test())
