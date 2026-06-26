import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from backend.main import generate_content_task, get_lecture_doc

async def test():
    # Use existing lecture from the screenshot: vhfRArT11jc 
    # Or just try to generate a mock notes.
    # The lecture_id might be different. Let's just create a dummy one or list the lectures to find it.
    from backend.main import db
    
    users = db.collection("users").stream()
    for user in users:
        lectures = db.collection("users").document(user.id).collection("lectures").stream()
        for l in lectures:
            data = l.to_dict()
            print(f"Found lecture! User: {user.id}, Lecture: {l.id}")
            
            # Let's try to run generate_content_task manually
            try:
                await generate_content_task(user.id, l.id, "notes", "en")
                print("Task completed!")
            except Exception as e:
                print("Error:", e)
            return

if __name__ == "__main__":
    asyncio.run(test())
