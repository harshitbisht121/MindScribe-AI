import { colors } from "../utils/colors";
import { Icon } from "../components/Icon";
import { Badge } from "../components/Badge";

export const Dashboard = ({ lectures, onSelect, onDelete }) => {
  const stats = {
    total: lectures.length,
    complete: lectures.filter(l => l.progress_tracking?.completed).length,
    flashcards: lectures.reduce((a, l) => a + (l.progress_tracking?.mastered_count > 0 ? 1 : 0), 0),
  };

  if (lectures.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: colors.textMuted }}>
      <Icon name="book" size={56} color={colors.textDim} />
      <div style={{ fontSize: 18, fontWeight: 600, color: colors.text, marginTop: 16 }}>No lectures yet</div>
      <div style={{ marginTop: 8, fontSize: 14 }}>Upload an audio/video file or add a YouTube URL to get started</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="grid-3-col">
        {[
          { label: "Total Lectures", value: stats.total, icon: "book", color: colors.accent },
          { label: "Completed Lectures", value: stats.complete, icon: "check", color: colors.green },
          { label: "Mastering Cards", value: stats.flashcards, icon: "card", color: colors.yellow },
        ].map(s => (
          <div key={s.label} style={{ background: colors.surface, borderRadius: 14, padding: 16, border: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name={s.icon} size={16} color={s.color} />
              <span style={{ color: colors.textMuted, fontSize: 12 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lectures.map(l => (
          <div key={l.id} className="lecture-list-item" style={{ background: colors.surface, borderRadius: 16, padding: 18, border: `1px solid ${colors.border}`, cursor: "pointer", transition: "border-color 0.2s", display: "flex", alignItems: "center", gap: 14 }} onClick={() => onSelect(l.id)} onMouseEnter={e => e.currentTarget.style.borderColor = colors.accent} onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: colors.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={l.source === "youtube" ? "youtube" : l.source === "live" ? "mic" : "upload"} size={20} color={colors.accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: colors.text, fontWeight: 600, fontSize: 14, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
              <div className="lecture-list-item-badges" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {l.has_notes && <Badge color={l.progress_tracking?.notes_read ? "green" : "accent"}>{l.progress_tracking?.notes_read ? "Notes Read" : "Notes"}</Badge>}
                {l.flashcard_count > 0 && (
                  <Badge color={l.progress_tracking?.mastered_count === l.flashcard_count ? "green" : "yellow"}>
                    Cards: {l.progress_tracking?.mastered_count || 0}/{l.flashcard_count}
                  </Badge>
                )}
                {l.quiz_count > 0 && (
                  <Badge color={l.progress_tracking?.quiz_score !== null ? "green" : "accent"}>
                    {l.progress_tracking?.quiz_score !== null ? `Quiz: ${l.progress_tracking.quiz_score}/${l.progress_tracking.quiz_total}` : "Quiz"}
                  </Badge>
                )}
                {l.progress_tracking?.completed && <Badge color="green">Completed</Badge>}
                {l.word_count > 0 && <span style={{ color: colors.textDim, fontSize: 11 }}>{l.word_count.toLocaleString()} words</span>}
              </div>
            </div>
            <div style={{ display: "flex", align: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ color: colors.textDim, fontSize: 11, textAlign: "right" }}>
                {new Date(l.created_at).toLocaleDateString()}
              </div>
              <button onClick={e => { e.stopPropagation(); onDelete(l.id); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: colors.textDim, padding: 4, borderRadius: 6, display: "flex" }} onMouseEnter={e => e.currentTarget.style.color = colors.red} onMouseLeave={e => e.currentTarget.style.color = colors.textDim}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
