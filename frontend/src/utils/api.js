import { auth } from "./firebase";

const API_BASE = "http://localhost:8000";

const getHeaders = async (isJson = true) => {
  const headers = {};
  if (isJson) headers["Content-Type"] = "application/json";
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async getLectures() {
    const r = await fetch(`${API_BASE}/api/lectures`, { headers: await getHeaders(false) });
    return r.json();
  },
  async getLecture(id) {
    const r = await fetch(`${API_BASE}/api/lectures/${id}`, { headers: await getHeaders(false) });
    return r.json();
  },
  async getStatus(id) {
    const r = await fetch(`${API_BASE}/api/lectures/${id}/status`, { headers: await getHeaders(false) });
    return r.json();
  },
  async uploadFile(file, language, title) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("language", language);
    fd.append("title", title || file.name);
    const r = await fetch(`${API_BASE}/api/upload`, { 
      method: "POST", 
      headers: await getHeaders(false),
      body: fd 
    });
    return r.json();
  },
  async processYoutube(url, language, title) {
    const r = await fetch(`${API_BASE}/api/youtube`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ url, language, title }),
    });
    return r.json();
  },
  async generate(lectureId, contentType, language = "en") {
    const r = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ lecture_id: lectureId, content_type: contentType, language }),
    });
    return r.json();
  },
  async search(query) {
    const r = await fetch(`${API_BASE}/api/search`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ query }),
    });
    return r.json();
  },
  async deleteLecture(id) {
    const r = await fetch(`${API_BASE}/api/lectures/${id}`, { 
      method: "DELETE",
      headers: await getHeaders(false) 
    });
    return r.json();
  },
  async updateProgress(id, progress) {
    const r = await fetch(`${API_BASE}/api/lectures/${id}/progress`, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(progress),
    });
    return r.json();
  },
  async patchTranscript(id, transcript) {
    const r = await fetch(`${API_BASE}/api/lectures/${id}/transcript`, {
      method: "PATCH",
      headers: await getHeaders(),
      body: JSON.stringify({ transcript }),
    });
    return r.json();
  },
};

