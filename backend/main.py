import tempfile
import subprocess
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import uuid
import asyncio
import aiofiles
import httpx
import re
from datetime import datetime

# Load .env file
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv(os.path.join(os.path.dirname(base_dir), ".env"))

app = FastAPI(title="Lecture Notes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://mind-scribe-ai.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize Firebase Admin
cred_path = os.path.join(base_dir, "firebase-service-account.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    try:
        firebase_admin.initialize_app()
    except ValueError:
        pass

db = firestore.client() if len(firebase_admin._apps) > 0 else None

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

def get_lecture_doc(user_id: str, lecture_id: str):
    if not db: raise HTTPException(status_code=500, detail="Firebase not initialized. Add firebase-service-account.json")
    return db.collection("users").document(user_id).collection("lectures").document(lecture_id)

def get_lecture_data(user_id: str, lecture_id: str):
    doc = get_lecture_doc(user_id, lecture_id).get()
    return doc.to_dict() if doc.exists else None

class YouTubeRequest(BaseModel):
    url: str
    language: str = "en"
    title: Optional[str] = None

class GenerateRequest(BaseModel):
    lecture_id: str
    content_type: str
    language: str = "en"

class SearchRequest(BaseModel):
    query: str

class PatchTranscriptRequest(BaseModel):
    transcript: str

class ProgressUpdateRequest(BaseModel):
    notes_read: Optional[bool] = None
    quiz_score: Optional[int] = None
    quiz_total: Optional[int] = None
    mastered_flashcards: Optional[List[int]] = None
    completed: Optional[bool] = None

class PasteTranscriptRequest(BaseModel):
    transcript: str
    language: str = "en"
    title: Optional[str] = None

async def run_downstream_pipeline_task(user_id: str, lecture_id: str, language: str):
    doc_ref = get_lecture_doc(user_id, lecture_id)
    try:
        await generate_content_task(user_id, lecture_id, "notes", language)
        await generate_content_task(user_id, lecture_id, "mindmap", language)
        await generate_content_task(user_id, lecture_id, "flashcards", language)
        await generate_content_task(user_id, lecture_id, "quiz", language)
        doc_ref.update({"status": "complete"})
    except Exception as e:
        doc_ref.update({"status": "error", "error": str(e)})

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

async def transcribe_with_groq(audio_path: str, language: str = "en") -> dict:
    if not GROQ_API_KEY:
        return {"text": "Demo transcript", "segments": [], "language": language, "duration": 300}
    
    async with httpx.AsyncClient(timeout=120) as client:
        with open(audio_path, "rb") as audio_file:
            files = {"file": (os.path.basename(audio_path), audio_file, "audio/wav")}
            data = {"model": "whisper-large-v3", "language": language if language != "hi-en" else None, "response_format": "verbose_json"}
            if language == "hi-en":
                data["prompt"] = "This audio may contain Hindi and English mixed language (Hinglish)."
            response = await client.post(f"{GROQ_BASE_URL}/audio/transcriptions", headers={"Authorization": f"Bearer {GROQ_API_KEY}"}, files=files, data=data)
    
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {response.text}")
    return response.json()

async def generate_with_groq(prompt: str, system: str = "") -> str:
    if not GROQ_API_KEY:
        return ""
    
    max_retries = 3
    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system or "You are an expert educational content creator."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 4000
                }
            )
        if response.status_code == 429:
            await asyncio.sleep(2 ** attempt + 2)
            continue
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Generation failed: {response.text}")
        return response.json()["choices"][0]["message"]["content"]
    raise HTTPException(status_code=429, detail="Rate limit exceeded")

async def get_youtube_transcript(url: str, language: str = "en") -> dict:
    video_id_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
    if not video_id_match:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")
    video_id = video_id_match.group(1)
    
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        def fetch():
            transcript_list = YouTubeTranscriptApi().list(video_id)
            try:
                transcript = transcript_list.find_transcript([language, 'en', 'hi'])
            except Exception:
                transcript = list(transcript_list)[0]
            data = transcript.fetch()
            def get_val(obj, key): return getattr(obj, key) if hasattr(obj, key) else obj.get(key, 0 if key in ['start', 'duration'] else '')
            full_text = ' '.join([get_val(item, 'text') for item in data])
            segments = [{"start": get_val(item, 'start'), "end": get_val(item, 'start') + get_val(item, 'duration'), "text": get_val(item, 'text')} for item in data[:50]]
            return {"text": full_text, "segments": segments, "video_id": video_id, "duration": get_val(data[-1], 'start') if data else 0}
        return await asyncio.get_event_loop().run_in_executor(None, fetch)
    except Exception as e:
        if not GROQ_API_KEY:
            return {"text": f"Demo YouTube transcript for {video_id}", "segments": [], "video_id": video_id, "duration": 600, "source": "demo"}
            
        # FALLBACK: Use yt-dlp + Groq transcription
        try:
            import yt_dlp
            
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
                    
            audio_path, duration = await asyncio.get_event_loop().run_in_executor(None, download_audio)
            
            try:
                transcript_result = await transcribe_with_groq(audio_path, language)
                transcript_result["video_id"] = video_id
                if not transcript_result.get("duration"):
                    transcript_result["duration"] = duration
                return transcript_result
            finally:
                if os.path.exists(audio_path):
                    try:
                        os.remove(audio_path)
                    except Exception:
                        pass
        except Exception as fallback_e:
            raise HTTPException(status_code=400, detail=f"Could not retrieve transcript directly, and fallback transcription failed. Error: {str(fallback_e)}")

@app.get("/")
async def root():
    return {"message": "Lecture Notes API Running", "version": "1.0.0"}

@app.get("/api/lectures")
async def get_lectures(user_id: str = Depends(get_current_user)):
    if not db: return []
    docs = db.collection("users").document(user_id).collection("lectures").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    lectures = []
    for doc in docs:
        lecture = doc.to_dict()
        lectures.append({
            "id": doc.id,
            "title": lecture.get("title", "Untitled"),
            "created_at": lecture.get("created_at"),
            "duration": lecture.get("duration", 0),
            "source": lecture.get("source", "upload"),
            "has_notes": bool(lecture.get("notes")),
            "has_flashcards": bool(lecture.get("flashcards")),
            "has_quiz": bool(lecture.get("quiz")),
            "flashcard_count": len(lecture.get("flashcards")) if lecture.get("flashcards") else 0,
            "quiz_count": len(lecture.get("quiz")) if lecture.get("quiz") else 0,
            "language": lecture.get("language", "en"),
            "word_count": len(lecture.get("transcript", "").split()) if lecture.get("transcript") else 0,
            "progress_tracking": lecture.get("progress_tracking", {"notes_read": False, "quiz_score": None, "quiz_total": None, "mastered_flashcards": [], "mastered_count": 0, "completed": False})
        })
    return lectures

@app.get("/api/lectures/{lecture_id}")
async def get_lecture(lecture_id: str, user_id: str = Depends(get_current_user)):
    data = get_lecture_data(user_id, lecture_id)
    if not data: raise HTTPException(status_code=404, detail="Lecture not found")
    data["id"] = lecture_id
    return data

@app.post("/api/upload")
async def upload_lecture(background_tasks: BackgroundTasks, file: UploadFile = File(...), language: str = "en", title: str = "", user_id: str = Depends(get_current_user)):
    lecture_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{lecture_id}{file_ext}")
    
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
        
    doc_ref = get_lecture_doc(user_id, lecture_id)
    doc_ref.set({
        "title": title or file.filename,
        "filename": file.filename,
        "file_path": file_path,
        "language": language,
        "source": "upload",
        "created_at": datetime.now().isoformat(),
        "status": "processing",
        "progress": {"transcript": False, "notes": False, "flashcards": False, "quiz": False},
        "progress_tracking": {"notes_read": False, "quiz_score": None, "quiz_total": None, "mastered_flashcards": [], "mastered_count": 0, "completed": False}
    })
    
    background_tasks.add_task(process_transcription, user_id, lecture_id, file_path, language)
    return {"lecture_id": lecture_id, "status": "processing"}

@app.post("/api/youtube")
async def process_youtube(request: YouTubeRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    lecture_id = str(uuid.uuid4())
    title = request.title if request.title else f"YouTube: {request.url[:50]}..."
    
    doc_ref = get_lecture_doc(user_id, lecture_id)
    doc_ref.set({
        "title": title,
        "url": request.url,
        "language": request.language,
        "source": "youtube",
        "created_at": datetime.now().isoformat(),
        "status": "processing",
        "progress": {"transcript": False, "notes": False, "flashcards": False, "quiz": False},
        "progress_tracking": {"notes_read": False, "quiz_score": None, "quiz_total": None, "mastered_flashcards": [], "mastered_count": 0, "completed": False}
    })
    
    background_tasks.add_task(process_youtube_transcript, user_id, lecture_id, request.url, request.language)
    return {"lecture_id": lecture_id, "status": "processing"}

@app.post("/api/paste")
async def process_paste(request: PasteTranscriptRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    lecture_id = str(uuid.uuid4())
    title = request.title if request.title else "Pasted Transcript"
    
    doc_ref = get_lecture_doc(user_id, lecture_id)
    doc_ref.set({
        "title": title,
        "transcript": request.transcript,
        "language": request.language,
        "source": "manual_transcript",
        "created_at": datetime.now().isoformat(),
        "status": "transcribed",
        "progress": {"transcript": True, "notes": False, "flashcards": False, "quiz": False},
        "progress_tracking": {"notes_read": False, "quiz_score": None, "quiz_total": None, "mastered_flashcards": [], "mastered_count": 0, "completed": False}
    })
    
    background_tasks.add_task(run_downstream_pipeline_task, user_id, lecture_id, request.language)
    return {"lecture_id": lecture_id, "status": "processing"}

@app.patch("/api/lectures/{lecture_id}/transcript")
async def patch_transcript(lecture_id: str, request: PatchTranscriptRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    doc_ref = get_lecture_doc(user_id, lecture_id)
    lecture = get_lecture_data(user_id, lecture_id)
    if not lecture: raise HTTPException(status_code=404, detail="Lecture not found")
    
    progress = lecture.get("progress", {})
    progress["transcript"] = True
    doc_ref.update({"transcript": request.transcript, "status": "transcribed", "progress": progress})
    
    language = lecture.get("language", "en")
    
    background_tasks.add_task(run_downstream_pipeline_task, user_id, lecture_id, language)
    return {"lecture_id": lecture_id, "status": "processing"}

@app.post("/api/lectures/{lecture_id}/progress")
async def update_progress(lecture_id: str, request: ProgressUpdateRequest, user_id: str = Depends(get_current_user)):
    doc_ref = get_lecture_doc(user_id, lecture_id)
    lecture = get_lecture_data(user_id, lecture_id)
    if not lecture: raise HTTPException(status_code=404, detail="Lecture not found")
    
    pt = lecture.get("progress_tracking", {"notes_read": False, "quiz_score": None, "quiz_total": None, "mastered_flashcards": [], "mastered_count": 0, "completed": False})
    
    if request.notes_read is not None: pt["notes_read"] = request.notes_read
    if request.quiz_score is not None: pt["quiz_score"] = request.quiz_score
    if request.quiz_total is not None: pt["quiz_total"] = request.quiz_total
    if request.mastered_flashcards is not None: 
        pt["mastered_flashcards"] = request.mastered_flashcards
        pt["mastered_count"] = len(request.mastered_flashcards)
    if request.completed is not None: pt["completed"] = request.completed
        
    doc_ref.update({"progress_tracking": pt})
    return {"status": "success", "progress_tracking": pt}

@app.post("/api/generate")
async def generate_content(request: GenerateRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    lecture = get_lecture_data(user_id, request.lecture_id)
    if not lecture: raise HTTPException(status_code=404, detail="Lecture not found")
    if not lecture.get("transcript"): raise HTTPException(status_code=400, detail="Transcription not complete yet")
    
    background_tasks.add_task(generate_content_task, user_id, request.lecture_id, request.content_type, request.language)
    return {"status": "generating", "content_type": request.content_type}

@app.post("/api/search")
async def search_lectures(request: SearchRequest, user_id: str = Depends(get_current_user)):
    query = request.query.lower()
    results = []
    
    docs = db.collection("users").document(user_id).collection("lectures").stream()
    for doc in docs:
        lecture = doc.to_dict()
        matches = []
        if lecture.get("transcript"):
            text = lecture["transcript"].lower()
            if query in text:
                idx = text.find(query)
                start = max(0, idx - 100)
                end = min(len(text), idx + 200)
                matches.append({"type": "transcript", "context": lecture["transcript"][start:end], "position": idx})
        if lecture.get("notes") and query in lecture["notes"].lower():
            matches.append({"type": "notes", "context": "Found in study notes"})
        
        if matches:
            results.append({"lecture_id": doc.id, "title": lecture.get("title"), "created_at": lecture.get("created_at"), "matches": matches[:3]})
    return {"results": results, "total": len(results)}

@app.get("/api/lectures/{lecture_id}/status")
async def get_status(lecture_id: str, user_id: str = Depends(get_current_user)):
    lecture = get_lecture_data(user_id, lecture_id)
    if not lecture: raise HTTPException(status_code=404, detail="Lecture not found")
    return {
        "status": lecture.get("status"),
        "progress": lecture.get("progress", {}),
        "has_transcript": bool(lecture.get("transcript")),
        "has_notes": bool(lecture.get("notes")),
        "has_flashcards": bool(lecture.get("flashcards")),
        "has_quiz": bool(lecture.get("quiz"))
    }

@app.get("/api/lectures/{lecture_id}/download")
async def download_notes(lecture_id: str, format: str = "md", user_id: str = Depends(get_current_user)):
    lecture = get_lecture_data(user_id, lecture_id)
    if not lecture: raise HTTPException(status_code=404, detail="Lecture not found")
    
    notes = lecture.get("notes", "No notes generated yet")
    title = lecture.get("title", "Lecture Notes")
    
    if format == "md":
        content = f"# {title}\n\n{notes}"
        path = os.path.join(UPLOAD_DIR, f"{lecture_id}_notes.md")
        with open(path, "w") as f: f.write(content)
        return FileResponse(path, filename=f"{title}_notes.md", media_type="text/markdown")
    return JSONResponse({"content": notes, "title": title})

@app.delete("/api/lectures/{lecture_id}")
async def delete_lecture(lecture_id: str, user_id: str = Depends(get_current_user)):
    doc_ref = get_lecture_doc(user_id, lecture_id)
    lecture = doc_ref.get()
    if not lecture.exists: raise HTTPException(status_code=404, detail="Lecture not found")
    
    lecture_data = lecture.to_dict()
    if lecture_data.get("file_path") and os.path.exists(lecture_data["file_path"]):
        os.remove(lecture_data["file_path"])
    
    doc_ref.delete()
    return {"status": "deleted"}

# ===== BACKGROUND TASKS =====

async def process_transcription(user_id: str, lecture_id: str, file_path: str, language: str):
    doc_ref = get_lecture_doc(user_id, lecture_id)
    try:
        lecture = doc_ref.get().to_dict()
        if lecture.get("transcript"): return
            
        result = await transcribe_with_groq(file_path, language)
        
        lecture = doc_ref.get().to_dict()
        if lecture.get("transcript"): return
            
        progress = lecture.get("progress", {})
        progress["transcript"] = True
        doc_ref.update({"transcript": result.get("text", ""), "segments": result.get("segments", []), "duration": result.get("duration", 0), "status": "transcribed", "progress": progress})
        
        await generate_content_task(user_id, lecture_id, "notes", language)
        await generate_content_task(user_id, lecture_id, "mindmap", language)
        await generate_content_task(user_id, lecture_id, "flashcards", language)
        await generate_content_task(user_id, lecture_id, "quiz", language)
        
        doc_ref.update({"status": "complete"})
    except Exception as e:
        doc_ref.update({"status": "error", "error": str(e)})

async def process_youtube_transcript(user_id: str, lecture_id: str, url: str, language: str):
    doc_ref = get_lecture_doc(user_id, lecture_id)
    try:
        result = await get_youtube_transcript(url, language)
        
        video_id = result.get("video_id", "")
        current_title = doc_ref.get().to_dict().get("title", "")
        new_title = f"YouTube Lecture ({video_id})" if current_title.startswith("YouTube: ") and video_id else current_title
            
        progress = doc_ref.get().to_dict().get("progress", {})
        progress["transcript"] = True
        doc_ref.update({"transcript": result.get("text", ""), "segments": result.get("segments", []), "duration": result.get("duration", 0), "title": new_title, "status": "transcribed", "progress": progress})
        
        await generate_content_task(user_id, lecture_id, "notes", language)
        await generate_content_task(user_id, lecture_id, "mindmap", language)
        await generate_content_task(user_id, lecture_id, "flashcards", language)
        await generate_content_task(user_id, lecture_id, "quiz", language)
        
        doc_ref.update({"status": "complete"})
    except Exception as e:
        doc_ref.update({"status": "error", "error": str(e)})

async def generate_content_task(user_id: str, lecture_id: str, content_type: str, language: str = "en"):
    doc_ref = get_lecture_doc(user_id, lecture_id)
    try:
        lecture = doc_ref.get().to_dict()
        transcript = lecture.get("transcript", "")
        lang_instruction = "Respond in Hindi (Devanagari script) where appropriate." if language == "hi" else ""
        
        if content_type == "notes":
            prompt = f"Create comprehensive, well-structured study notes from this lecture transcript.\n\n{lang_instruction}\n\nFormat with:\n- Main topic headings (##)\n- Subheadings (###)\n- Bullet points for key concepts\n- Bold important terms\n- Tables where appropriate\n- Exam tips at the end\n\nTranscript:\n{transcript[:3000]}"
            result = await generate_with_groq(prompt, "You are an expert educational content creator specializing in creating structured study notes.")
            progress = lecture.get("progress", {})
            progress["notes"] = True
            doc_ref.update({"notes": result, "progress": progress})
            
        elif content_type == "flashcards":
            prompt = f"Create 8-12 study flashcards from this lecture transcript.\n\n{lang_instruction}\n\nReturn ONLY a JSON array (no markdown, no explanation) like:\n[\n  {{\"front\": \"Question or concept\", \"back\": \"Answer or explanation\", \"topic\": \"Topic name\"}},\n  ...\n]\n\nTranscript:\n{transcript[:3000]}"
            result = await generate_with_groq(prompt, "You are an expert at creating educational flashcards. Always respond with valid JSON only.")
            cleaned = result.strip()
            if "```" in cleaned: cleaned = re.sub(r'```(?:json)?\n?', '', cleaned).strip().rstrip('`')
            
            flashcards = []
            try:
                parsed = json.loads(cleaned)
                if isinstance(parsed, dict):
                    for v in parsed.values():
                        if isinstance(v, list):
                            flashcards = v
                            break
                elif isinstance(parsed, list):
                    flashcards = parsed
            except:
                pass
                
            if not flashcards:
                match = re.search(r'\[.*\]', cleaned, re.DOTALL)
                try:
                    flashcards = json.loads(match.group()) if match else [{"front": "Concept", "back": "See transcript for details", "topic": "General"}]
                except:
                    flashcards = [{"front": "Concept", "back": "See transcript for details", "topic": "General"}]
                    
            progress = lecture.get("progress", {})
            progress["flashcards"] = True
            doc_ref.update({"flashcards": flashcards, "progress": progress})
            
        elif content_type == "quiz":
            prompt = f"Create 5-8 multiple choice quiz questions from this lecture.\n\n{lang_instruction}\n\nReturn ONLY a JSON array like:\n[\n  {{\n    \"question\": \"Question text\",\n    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n    \"correct\": 0,\n    \"explanation\": \"Why this answer is correct\"\n  }}\n]\n\nTranscript:\n{transcript[:3000]}"
            result = await generate_with_groq(prompt, "You are an expert at creating educational quizzes. Always respond with valid JSON only.")
            cleaned = result.strip()
            if "```" in cleaned: cleaned = re.sub(r'```(?:json)?\n?', '', cleaned).strip().rstrip('`')
            
            quiz = []
            try:
                parsed = json.loads(cleaned)
                if isinstance(parsed, dict):
                    for v in parsed.values():
                        if isinstance(v, list):
                            quiz = v
                            break
                elif isinstance(parsed, list):
                    quiz = parsed
            except:
                pass
                
            if not quiz:
                match = re.search(r'\[.*\]', cleaned, re.DOTALL)
                try:
                    quiz = json.loads(match.group()) if match else []
                except:
                    quiz = []
                    
            progress = lecture.get("progress", {})
            progress["quiz"] = True
            doc_ref.update({"quiz": quiz, "progress": progress})
            
        elif content_type == "mindmap":
            prompt = f"Create a Mermaid.js mind map visualization of this lecture transcript.\n\n{lang_instruction}\n\nOutput ONLY valid Mermaid.js mindmap syntax starting with `mindmap` followed by nodes. Do NOT wrap it in markdown code blocks or add any other text.\nCRITICAL: A Mermaid mindmap MUST have exactly ONE root node directly under the `mindmap` keyword, and ALL other nodes MUST be indented as children of that single root node. Do not create multiple root nodes or disjoint trees.\n\nExample format:\nmindmap\n  root((Main Topic))\n    Subtopic 1\n      Detail A\n      Detail B\n    Subtopic 2\n\nTranscript:\n{transcript[:3000]}"
            result = await generate_with_groq(prompt, "You are an expert at generating Mermaid.js diagram syntax. Always output valid Mermaid.js syntax only.")
            if "```mermaid" in result: result = result.replace("```mermaid", "").replace("```", "").strip()
            elif "```" in result: result = result.replace("```", "").strip()
            
            progress = lecture.get("progress", {})
            progress["mindmap"] = True
            doc_ref.update({"mindmap": result, "progress": progress})
            
            topics_prompt = f"Extract 3-6 main topics from this lecture transcript. \nReturn ONLY a JSON array of strings: [\"Topic 1\", \"Topic 2\", ...]\n\nTranscript: {transcript[:1000]}"
            try:
                topics_result = await generate_with_groq(topics_prompt)
                topics_cleaned = topics_result.strip()
                if "```" in topics_cleaned: topics_cleaned = re.sub(r'```(?:json)?\n?', '', topics_cleaned).strip().rstrip('`')
                topics = json.loads(topics_cleaned)
            except Exception as e:
                print(f"Failed to extract topics: {e}")
                topics = ["Introduction", "Main Concepts", "Key Takeaways"]
            doc_ref.update({"topics": topics})
            
    except Exception as e:
        print(f"Content generation error for {lecture_id}/{content_type}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)