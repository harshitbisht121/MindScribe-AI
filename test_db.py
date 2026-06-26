import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.main import db

def test_db():
    if not db:
        print("No db")
        return
        
    users = db.collection("users").stream()
    for user in users:
        print(f"User: {user.id}")
        lectures = db.collection("users").document(user.id).collection("lectures").order_by("created_at", direction="DESCENDING").limit(1).stream()
        for doc in lectures:
            data = doc.to_dict()
            print(f"Lecture: {data.get('title')}")
            print(f"Quiz field type: {type(data.get('quiz'))}")
            print(f"Quiz field: {data.get('quiz')}")
            print(f"Quiz progress: {data.get('progress', {}).get('quiz')}")

if __name__ == "__main__":
    test_db()
