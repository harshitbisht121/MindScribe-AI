import { useState, useEffect } from "react";
import { colors } from "../utils/colors";
import { Icon } from "./Icon";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";

export const FlashcardViewer = ({ flashcards, mastered = [], onUpdateMastered }) => {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");

  const known = new Set(mastered);

  // Get unique list of topics
  const topics = ["all", ...new Set(flashcards.map(c => c.topic).filter(Boolean))];

  // Apply topic filtering first
  const topicFiltered = selectedTopic === "all" 
    ? flashcards 
    : flashcards.filter(c => c.topic === selectedTopic);

  // Apply mastery filtering
  const filtered = filter === "known" 
    ? topicFiltered.filter(c => known.has(flashcards.indexOf(c))) 
    : filter === "unknown" 
    ? topicFiltered.filter(c => !known.has(flashcards.indexOf(c))) 
    : topicFiltered;

  const card = filtered[idx];
  const progress = Math.round((known.size / flashcards.length) * 100);

  // Reset index when filter changes
  useEffect(() => {
    setIdx(0);
    setFlipped(false);
  }, [filter, selectedTopic]);

  const next = () => { setFlipped(false); setTimeout(() => setIdx((idx + 1) % filtered.length), 150); };
  const prev = () => { setFlipped(false); setTimeout(() => setIdx((idx - 1 + filtered.length) % filtered.length), 150); };
  
  const toggleKnown = () => {
    if (!card) return;
    const realIdx = flashcards.indexOf(card);
    let newList;
    if (known.has(realIdx)) {
      newList = mastered.filter(i => i !== realIdx);
    } else {
      newList = [...mastered, realIdx];
    }
    if (onUpdateMastered) {
      onUpdateMastered(newList);
    }
  };

  if (!card) return <div style={{ color: colors.textMuted, textAlign: "center", padding: 40 }}>No cards match this filter</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "known", "unknown"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
              background: filter === f ? colors.accent : colors.bg, color: filter === f ? "#fff" : colors.textMuted,
            }}>
              {f === "all" ? `All (${topicFiltered.length})` : f === "known" ? `Known (${topicFiltered.filter(c => known.has(flashcards.indexOf(c))).length})` : `To Learn (${topicFiltered.filter(c => !known.has(flashcards.indexOf(c))).length})`}
            </button>
          ))}
        </div>
        
        <div className="flashcard-filters" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {topics.length > 1 && (
            <select 
              value={selectedTopic} 
              onChange={e => setSelectedTopic(e.target.value)}
              style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: "6px 12px", color: colors.text, fontSize: 12, outline: "none", cursor: "pointer" }}
            >
              <option value="all">All Topics</option>
              {topics.filter(t => t !== "all").map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <div className="flashcard-progress" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: colors.textMuted, fontSize: 12 }}>{progress}% mastered</span>
            <div className="flashcard-progress-bar" style={{ width: 80 }}><ProgressBar value={progress} color={colors.green} /></div>
          </div>
        </div>
      </div>

      <div style={{ perspective: 1000 }}>
        <div
          onClick={() => setFlipped(!flipped)}
          style={{
            minHeight: 240, borderRadius: 20, background: flipped ? colors.accentDim : colors.surface,
            border: `1px solid ${flipped ? colors.accent : colors.border}`,
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 32, textAlign: "center", transition: "all 0.3s ease", position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 14, left: 16 }}>
            <Badge color={flipped ? "accent" : "yellow"}>{flipped ? "Answer" : "Question"}</Badge>
          </div>
          {card.topic && (
            <div style={{ position: "absolute", top: 14, right: 16 }}>
              <Badge color="green">{card.topic}</Badge>
            </div>
          )}
          <div style={{ fontSize: 18, color: colors.text, fontWeight: 500, lineHeight: 1.6, marginTop: 20 }}>
            {flipped ? card.back : card.front}
          </div>
          <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 16, opacity: 0.7 }}>Click to {flipped ? "see question" : "reveal answer"}</div>
        </div>
      </div>

      <div className="flashcard-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={prev} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 16px", color: colors.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="chevronLeft" size={16} /> Prev
        </button>
        <div className="flashcard-nav-center" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: colors.textMuted, fontSize: 13, whiteSpace: "nowrap" }}>Card {idx + 1} of {filtered.length}</span>
          <button onClick={toggleKnown} style={{
            background: known.has(flashcards.indexOf(card)) ? colors.greenDim : colors.surface,
            border: `1px solid ${known.has(flashcards.indexOf(card)) ? colors.green : colors.border}`,
            borderRadius: 10, padding: "10px 16px", color: known.has(flashcards.indexOf(card)) ? colors.green : colors.textMuted,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13,
          }}>
            <Icon name="check" size={14} /> {known.has(flashcards.indexOf(card)) ? "Known" : "Mark Known"}
          </button>
        </div>
        <button onClick={next} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 16px", color: colors.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          Next <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
};
