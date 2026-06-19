import { useState, useRef } from "react";
import { colors } from "../utils/colors";
import { Icon } from "../components/Icon";
import { Spinner } from "../components/Spinner";
import { api } from "../utils/api";
import { LiveRecorder } from "../components/LiveRecorder";

export const UploadPanel = ({ onSuccess }) => {
  const [mode, setMode] = useState("file");
  const [file, setFile] = useState(null);
  const [ytUrl, setYtUrl] = useState("");
  const [language, setLanguage] = useState("en");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const handleUpload = async () => {
    setLoading(true);
    try {
      let result;
      if (mode === "file" && file) {
        result = await api.uploadFile(file, language, title);
      } else if (mode === "youtube" && ytUrl) {
        result = await api.processYoutube(ytUrl, language, title);
      }
      if (result?.lecture_id) onSuccess(result.lecture_id);
    } catch (e) {
      alert("Upload failed: " + e.message);
    }
    setLoading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const canSubmit = mode === "file" ? !!file : !!ytUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 4, background: colors.bg, borderRadius: 10, padding: 4 }}>
        {[{ id: "file", label: "Upload File", icon: "upload" }, { id: "youtube", label: "YouTube URL", icon: "youtube" }, { id: "live", label: "Live Lecture", icon: "mic" }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{
            flex: 1, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 500, transition: "all 0.2s",
            background: mode === m.id ? colors.accent : "transparent",
            color: mode === m.id ? "#fff" : colors.textMuted,
          }}>
            <Icon name={m.icon} size={15} /> {m.label}
          </button>
        ))}
      </div>

      {mode === "file" && (
        <div
          onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${drag ? colors.accent : colors.border}`, borderRadius: 16, padding: "48px 24px", textAlign: "center", cursor: "pointer", transition: "all 0.2s",
            background: drag ? colors.accentDim : "transparent",
          }}
        >
          <input ref={fileRef} type="file" accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a,.ogg,.webm" onChange={e => setFile(e.target.files[0])} style={{ display: "none" }} />
          <div style={{ marginBottom: 12, opacity: 0.6 }}><Icon name="upload" size={40} color={colors.accent} /></div>
          {file ? (
            <div>
              <div style={{ color: colors.text, fontWeight: 600, fontSize: 15 }}>{file.name}</div>
              <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
          ) : (
            <div>
              <div style={{ color: colors.text, fontWeight: 500 }}>Drop audio or video file here</div>
              <div style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>MP3, MP4, WAV, M4A, OGG, WEBM supported</div>
            </div>
          )}
        </div>
      )}

      {mode === "youtube" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
            style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "12px 16px", color: colors.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
          />
          <div style={{ color: colors.textMuted, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="youtube" size={14} color="#FF0000" /> Supports any YouTube lecture video with captions
          </div>
        </div>
      )}

      {mode === "live" && (
        <LiveRecorder onSuccess={onSuccess} language={language} />
      )}

      {mode !== "live" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>Title (optional)</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)} placeholder="My Lecture"
                style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 14px", color: colors.text, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ color: colors.textMuted, fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>Language</label>
              <select
                value={language} onChange={e => setLanguage(e.target.value)}
                style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 14px", color: colors.text, fontSize: 13, outline: "none", width: "100%", cursor: "pointer" }}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="hi-en">Hindi + English (Hinglish)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleUpload} disabled={!canSubmit || loading}
            style={{
              background: canSubmit && !loading ? colors.accent : colors.border,
              color: canSubmit && !loading ? "#fff" : colors.textDim,
              border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, cursor: canSubmit && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s",
            }}
          >
            {loading ? <><Spinner /> Processing...</> : <><Icon name="play" size={16} /> Start Processing</>}
          </button>
        </>
      )}
    </div>
  );
};
