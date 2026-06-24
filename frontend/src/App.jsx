import { useState, useEffect, useCallback } from "react";
import { colors } from "./utils/colors";
import { api } from "./utils/api";
import { Icon } from "./components/Icon";
import { Dashboard } from "./pages/Dashboard";
import { UploadPanel } from "./pages/UploadPanel";
import { SearchPanel } from "./pages/SearchPanel";
import { LectureDetail } from "./pages/LectureDetail";
import { AuthLayout } from "./pages/AuthLayout";
import { ProfilePanel } from "./pages/ProfilePanel";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./utils/firebase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ===== MAIN APP =====
export default function App() {
  const [lectures, setLectures] = useState([]);
  const [view, setView] = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [backendOk, setBackendOk] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchLectures = useCallback(async () => {
    try {
      const data = await api.getLectures();
      setLectures(data);
    } catch {}
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Check backend
    fetch(`${API_BASE}/`).then(() => setBackendOk(true)).catch(() => setBackendOk(false));
    if (user) {
      fetchLectures();
      const interval = setInterval(fetchLectures, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchLectures, user]);

  const handleUploadSuccess = (lectureId) => {
    setSelectedId(lectureId);
    setView("detail");
    fetchLectures();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this lecture?")) return;
    await api.deleteLecture(id);
    fetchLectures();
  };

  if (authLoading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg, color: colors.text }}>Loading...</div>;
  }

  if (!user) {
    return <AuthLayout />;
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .printable-content {
            background: white !important;
            color: black !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            width: 100% !important;
          }
          /* Force page background adjustments for print rendering */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }} className="no-print header-container">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${colors.accent}, #A855F7)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="book" size={18} color="white" />
          </div>
          <div>
            <div className="header-title" style={{ fontWeight: 800, fontSize: 16, background: `linear-gradient(90deg, ${colors.accentLight}, #C084FC)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MindScribe AI</div>
            <div className="header-tagline" style={{ color: colors.textDim, fontSize: 10, marginTop: -2 }}>Transform Lectures into Knowledge</div>
          </div>
        </div>

        <div className="desktop-nav">
          {[
            { id: "home", label: "My Lectures", icon: "book" },
            { id: "upload", label: "New Lecture", icon: "upload" },
            { id: "search", label: "Search", icon: "search" },
            { id: "profile", label: "Profile", icon: "user" },
          ].map(v => (
            <button key={v.id} onClick={() => { setView(v.id); if (v.id !== "detail") setSelectedId(null); }} style={{
              background: view === v.id ? colors.accentDim : "transparent", color: view === v.id ? colors.accentLight : colors.textMuted,
              border: `1px solid ${view === v.id ? colors.accent : "transparent"}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, transition: "all 0.2s",
            }}>
              <Icon name={v.icon} size={15} /> {v.label}
            </button>
          ))}
        </div>

        <div className="desktop-nav" style={{ alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: backendOk === true ? colors.green : backendOk === false ? colors.red : colors.yellow }} />
          <span style={{ color: colors.textDim, fontSize: 12, marginRight: 16 }}>{backendOk === true ? "Backend Connected" : backendOk === false ? "Backend Offline" : "Connecting..."}</span>
          {user?.displayName && (
            <span style={{ color: colors.text, fontSize: 13, marginRight: 12, fontWeight: 500 }}>
              Hi, {user.displayName}
            </span>
          )}
          <button onClick={() => signOut(auth)} style={{ background: "transparent", border: `1px solid ${colors.border}`, color: colors.textMuted, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
            Sign Out
          </button>
        </div>

        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        {menuOpen && (
          <div className="mobile-nav-overlay no-print">
            {[
              { id: "home", label: "My Lectures", icon: "book" },
              { id: "upload", label: "New Lecture", icon: "upload" },
              { id: "search", label: "Search", icon: "search" },
              { id: "profile", label: "Profile", icon: "user" },
            ].map(v => (
              <button key={v.id} onClick={() => { setView(v.id); if (v.id !== "detail") setSelectedId(null); setMenuOpen(false); }} style={{
                background: view === v.id ? colors.accentDim : "transparent", color: view === v.id ? colors.accentLight : colors.textMuted,
                border: `1px solid ${view === v.id ? colors.accent : "transparent"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontSize: 15, fontWeight: 500, width: "100%", justifyContent: "flex-start"
              }}>
                <Icon name={v.icon} size={18} /> {v.label}
              </button>
            ))}
            <div style={{ height: 1, background: colors.border, margin: "8px 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: backendOk === true ? colors.green : backendOk === false ? colors.red : colors.yellow }} />
              <span style={{ color: colors.textDim, fontSize: 12 }}>{backendOk === true ? "Backend Connected" : backendOk === false ? "Backend Offline" : "Connecting..."}</span>
            </div>
            {user?.displayName && (
              <div style={{ color: colors.text, fontSize: 13, padding: "0 16px 8px 16px", fontWeight: 500 }}>
                Hi, {user.displayName}
              </div>
            )}
            <button onClick={() => { signOut(auth); setMenuOpen(false); }} style={{ background: "transparent", border: `1px solid ${colors.border}`, color: colors.textMuted, padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontSize: 14, width: "100%", textAlign: "left" }}>
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="app-container" style={{ maxWidth: 900, margin: "0 auto" }}>
        {view === "home" && (
          <div className="no-print">
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.text }}>My Lectures</h1>
              <p style={{ color: colors.textMuted, margin: "6px 0 0", fontSize: 14 }}>All your transcribed and analyzed lectures</p>
            </div>
            <Dashboard lectures={lectures} onSelect={(id) => { setSelectedId(id); setView("detail"); }} onDelete={handleDelete} />
          </div>
        )}

        {view === "upload" && (
          <div className="no-print">
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.text }}>New Lecture</h1>
              <p style={{ color: colors.textMuted, margin: "6px 0 0", fontSize: 14 }}>Upload audio/video, paste a YouTube URL, or record live</p>
            </div>
            <div style={{ background: colors.surface, borderRadius: 20, padding: 28, border: `1px solid ${colors.border}` }}>
              <UploadPanel onSuccess={handleUploadSuccess} />
            </div>

            {backendOk === false && (
              <div style={{ marginTop: 20, background: colors.yellowDim, border: `1px solid ${colors.yellow}`, borderRadius: 16, padding: 20 }}>
                <div style={{ color: colors.yellow, fontWeight: 700, marginBottom: 8 }}>⚡ Backend Not Connected — Demo Mode</div>
                <div style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.7 }}>
                  The backend isn't running. To start it:<br/>
                  <code style={{ background: colors.bg, padding: "4px 8px", borderRadius: 6, display: "inline-block", marginTop: 8, fontSize: 12 }}>
                    cd backend && pip install -r requirements.txt && uvicorn main:app --reload
                  </code><br/>
                  <span style={{ marginTop: 8, display: "block" }}>Set <code style={{ background: colors.bg, padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>GROQ_API_KEY</code> env var for real transcription (free at console.groq.com)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "search" && (
          <div className="no-print">
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.text }}>Search Lectures</h1>
              <p style={{ color: colors.textMuted, margin: "6px 0 0", fontSize: 14 }}>Search across transcripts, notes, and summaries</p>
            </div>
            <div style={{ background: colors.surface, borderRadius: 20, padding: 24, border: `1px solid ${colors.border}` }}>
              <SearchPanel lectures={lectures} />
            </div>
          </div>
        )}

        {view === "detail" && selectedId && (
          <LectureDetail lectureId={selectedId} onBack={() => { setView("home"); setSelectedId(null); }} fetchLectures={fetchLectures} />
        )}

        {view === "profile" && (
          <div className="no-print">
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.text }}>Profile Settings</h1>
              <p style={{ color: colors.textMuted, margin: "6px 0 0", fontSize: 14 }}>Manage your account details</p>
            </div>
            <div style={{ background: colors.surface, borderRadius: 20, padding: 24, border: `1px solid ${colors.border}` }}>
              <ProfilePanel user={user} onUpdate={() => setUser({ ...auth.currentUser })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}