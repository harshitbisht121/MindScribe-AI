import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.main import generate_with_groq, GROQ_API_KEY

async def test():
    if not GROQ_API_KEY:
        print("No GROQ_API_KEY")
        return
        
    transcript = "DNS stands for Domain Name System. It translates human readable domain names to IP addresses. The process involves recursive resolvers, root servers, TLD servers, and authoritative nameservers."
    lang_instruction = ""
    prompt = f"Create 5-8 multiple choice quiz questions from this lecture.\n\n{lang_instruction}\n\nReturn ONLY a JSON array like:\n[\n  {{\n    \"question\": \"Question text\",\n    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n    \"correct\": 0,\n    \"explanation\": \"Why this answer is correct\"\n  }}\n]\n\nTranscript:\n{transcript[:3000]}"
    
    try:
        result = await generate_with_groq(prompt, "You are an expert at creating educational quizzes. Always respond with valid JSON only.")
        print("RESULT:")
        print(result)
        
        import json
        import re
        cleaned = result.strip()
        if "```" in cleaned: cleaned = re.sub(r'```(?:json)?\n?', '', cleaned).strip().rstrip('`')
        try: quiz = json.loads(cleaned)
        except:
            match = re.search(r'\[.*\]', cleaned, re.DOTALL)
            quiz = json.loads(match.group()) if match else []
        print("PARSED:", len(quiz))
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test())
