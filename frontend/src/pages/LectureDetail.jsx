import { useState, useEffect, useCallback } from "react";
import { colors } from "../utils/colors";
import { Icon } from "../components/Icon";
import { Badge } from "../components/Badge";
import { ProgressBar } from "../components/ProgressBar";
import { Tabs } from "../components/Tabs";
import { EmptyState } from "../components/EmptyState";
import { api } from "../utils/api";
import { NotesView } from "../components/NotesView";
import { FlashcardViewer } from "../components/FlashcardViewer";
import { QuizView } from "../components/QuizView";
import { MermaidView } from "../components/MermaidView";

export const LectureDetail = ({ lectureId, onBack, fetchLectures }) => {
  const [lecture, setLecture] = useState(null);
  const [tab, setTab] = useState("notes");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const fetchLecture = useCallback(async () => {
    const data = await api.getLecture(lectureId);
    setLecture(data);
    setStatus(data.status);
    setLoading(false);
  }, [lectureId]);

  useEffect(() => {
    fetchLecture();
    const interval = setInterval(async () => {
      const s = await api.getStatus(lectureId);
      setStatus(s.status);
      if (s.status === "complete" || s.status === "error") {
        fetchLecture();
        clearInterval(interval);
      } else {
        // Update progress incrementally
        setLecture(l => l ? { ...l, progress: s.progress } : l);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [lectureId, fetchLecture]);

  const updateProgress = async (fields) => {
    try {
      const updated = await api.updateProgress(lectureId, fields);
      setLecture(l => ({ ...l, progress_tracking: updated.progress_tracking }));
      if (fetchLectures) {
        fetchLectures();
      }
    } catch (e) {
      console.error("Failed to update progress:", e);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ textAlign: "center", color: colors.textMuted }}>
        <Icon name="spinner" size={32} color={colors.accent} />
        <div style={{ marginTop: 12 }}>Loading lecture...</div>
      </div>
    </div>
  );

  const isProcessing = status === "processing" || status === "transcribed";
  const progress = lecture?.progress || {};
  const processSteps = [
    { key: "transcript", label: (!progress.transcript && lecture?.progress_message) ? lecture.progress_message : "Transcribing audio" },
    { key: "notes", label: "Generating notes" },
    { key: "flashcards", label: "Creating flashcards" },
    { key: "quiz", label: "Building quiz" },
  ];

  const completedSteps = Object.values(progress).filter(Boolean).length;
  const totalSteps = processSteps.length;
  const overallProgress = Math.round((completedSteps / totalSteps) * 100);

  const tabs = [
    { id: "notes", label: "Notes", icon: "notes", badge: lecture?.notes ? "✓" : null },
    { id: "flashcards", label: "Flashcards", icon: "card", badge: lecture?.flashcards?.length || null },
    { id: "quiz", label: "Quiz", icon: "quiz", badge: lecture?.quiz?.length || null },
    { id: "transcript", label: "Transcript", icon: "book" },
    { id: "mindmap", label: "Mind Map", icon: "chart" },
  ];

  const toggleNotesRead = () => {
    updateProgress({ notes_read: !lecture?.progress_tracking?.notes_read });
  };

  const toggleLectureCompleted = () => {
    updateProgress({ completed: !lecture?.progress_tracking?.completed });
  };

  return (
    <div>
      <div className="lecture-header no-print">
        <button onClick={onBack} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "8px 14px", color: colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Icon name="chevronLeft" size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ color: colors.text, fontWeight: 700, fontSize: 18, wordBreak: "break-word" }}>{lecture?.title}</div>
          <div className="lecture-header-badges" style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Badge color={status === "complete" ? "green" : status === "error" ? "red" : "yellow"}>
              {status === "complete" ? "Ready" : status === "error" ? "Error" : "Processing..."}
            </Badge>
            {lecture?.language && <Badge>{lecture.language === "hi" ? "Hindi" : lecture.language === "hi-en" ? "Hinglish" : "English"}</Badge>}
            {lecture?.source && <Badge color="accent">{lecture.source}</Badge>}
          </div>
        </div>
        <button onClick={() => window.print()} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "8px 14px", color: colors.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Icon name="download" size={15} /> Export
        </button>
      </div>

      {isProcessing && (
        <div style={{ background: colors.surface, borderRadius: 16, padding: 20, marginBottom: 20, border: `1px solid ${colors.border}` }} className="no-print">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ color: colors.text, fontWeight: 600 }}>AI Processing Your Lecture</div>
            <div style={{ color: colors.accent, fontWeight: 700 }}>{overallProgress}%</div>
          </div>
          <ProgressBar value={overallProgress} color={colors.accent} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            {processSteps.map(step => (
              <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 8, opacity: (progress[step.key] || (step.key === "transcript" && lecture?.progress_message)) ? 1 : 0.5, fontSize: 13 }}>
                {progress[step.key] === "error" ? (
                  <Icon name="x" size={14} color={colors.red} />
                ) : progress[step.key] === true ? (
                  <Icon name="check" size={14} color={colors.green} />
                ) : (
                  <Icon name="spinner" size={14} />
                )}
                <span style={{ color: progress[step.key] === "error" ? colors.red : (progress[step.key] === true ? colors.green : colors.textDim) }}>
                  {step.label}
                  {progress[step.key] === "error" ? " (Rate Limited)" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Tracking Banner */}
      {status === "complete" && (
        <div className="no-print" style={{ background: colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, border: `1px solid ${colors.border}`, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input 
                type="checkbox" 
                checked={!!lecture?.progress_tracking?.notes_read} 
                onChange={toggleNotesRead}
                style={{ width: 16, height: 16, accentColor: colors.accent }} 
              />
              <span>Notes Read</span>
            </label>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <Icon name="card" size={16} color={colors.yellow} />
              <span>Flashcards: {lecture?.progress_tracking?.mastered_count || 0} / {lecture?.flashcards?.length || 0} mastered</span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <Icon name="quiz" size={16} color={colors.green} />
              <span>Best Quiz Score: {lecture?.progress_tracking?.quiz_score !== null ? `${lecture.progress_tracking.quiz_score}/${lecture.progress_tracking.quiz_total}` : "Not started"}</span>
            </div>
          </div>
          
          <button 
            onClick={toggleLectureCompleted}
            style={{ 
              background: lecture?.progress_tracking?.completed ? colors.greenDim : colors.accent,
              border: `1px solid ${lecture?.progress_tracking?.completed ? colors.green : "transparent"}`,
              color: lecture?.progress_tracking?.completed ? colors.green : "#fff",
              borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 
            }}
          >
            <Icon name="check" size={14} /> {lecture?.progress_tracking?.completed ? "Completed" : "Mark Completed"}
          </button>
        </div>
      )}

      {/* Topics */}
      {lecture?.topics?.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }} className="no-print">
          <span style={{ color: colors.textMuted, fontSize: 12, alignSelf: "center" }}><Icon name="tag" size={12} /> Topics:</span>
          {lecture.topics.map((t, i) => <Badge key={i} color="accent">{t}</Badge>)}
        </div>
      )}

      <div style={{ marginBottom: 20 }} className="no-print">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <div>
        {tab === "notes" && (
          lecture?.notes
            ? <NotesView notes={lecture.notes} lectureId={lectureId} title={lecture.title} />
            : <EmptyState icon="notes" message={isProcessing ? "Generating your study notes..." : "No notes available"} processing={isProcessing} />
        )}
        {tab === "flashcards" && (
          lecture?.flashcards?.length
            ? <FlashcardViewer 
                flashcards={lecture.flashcards} 
                mastered={lecture?.progress_tracking?.mastered_flashcards}
                onUpdateMastered={(masteredList) => updateProgress({ mastered_flashcards: masteredList })}
              />
            : <EmptyState icon="card" message={isProcessing ? "Creating flashcards..." : "No flashcards available"} processing={isProcessing} />
        )}
        {tab === "quiz" && (
          lecture?.quiz?.length
            ? <QuizView 
                quiz={lecture.quiz} 
                onQuizSubmit={(score, total) => updateProgress({ quiz_score: score, quiz_total: total })}
                savedScore={lecture?.progress_tracking?.quiz_score}
                savedTotal={lecture?.progress_tracking?.quiz_total}
              />
            : <EmptyState icon="quiz" message={isProcessing ? "Building quiz questions..." : "No quiz available"} processing={isProcessing} />
        )}
        {tab === "transcript" && (
          lecture?.transcript
            ? (
              <div style={{ background: colors.surface, borderRadius: 16, padding: 24, border: `1px solid ${colors.border}` }} className="printable-content">
                <div className="print-only" style={{ display: "none", marginBottom: 20, borderBottom: "2px solid #000", paddingBottom: 10 }}>
                  <h1 style={{ margin: 0, fontSize: 24 }}>{lecture.title} - Full Transcript</h1>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 5 }}>Generated by MindScribe AI on {new Date().toLocaleDateString()}</div>
                </div>
                <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12, fontWeight: 500 }} className="no-print">FULL TRANSCRIPT</div>
                <div style={{ color: colors.text, fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{lecture.transcript}</div>
              </div>
            )
            : <EmptyState icon="book" message={isProcessing ? "Transcribing audio..." : "No transcript available"} processing={isProcessing} />
        )}
        {tab === "mindmap" && (
          lecture?.mindmap
            ? <MermaidView chart={lecture.mindmap} title={lecture.title} />
            : <EmptyState icon="chart" message={isProcessing ? "Creating mind map..." : "No mind map available"} processing={isProcessing} />
        )}
      </div>
    </div>
  );
};
