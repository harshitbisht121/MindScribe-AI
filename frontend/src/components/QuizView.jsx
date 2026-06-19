import { useState } from "react";
import { colors } from "../utils/colors";
import { Icon } from "./Icon";

export const QuizView = ({ quiz, onQuizSubmit, savedScore = null, savedTotal = null }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const score = Object.entries(answers).filter(([i, a]) => quiz[+i]?.correct === a).length;

  const handleQuizSubmit = () => {
    setSubmitted(true);
    setRetrying(false);
    if (onQuizSubmit) {
      onQuizSubmit(score, quiz.length);
    }
  };

  const reset = () => { 
    setAnswers({}); 
    setSubmitted(false); 
    setRetrying(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {(submitted || (savedScore !== null && !retrying)) && (
        <div style={{ background: (submitted ? score : savedScore) >= quiz.length * 0.7 ? colors.greenDim : colors.yellowDim, border: `1px solid ${(submitted ? score : savedScore) >= quiz.length * 0.7 ? colors.green : colors.yellow}`, borderRadius: 16, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: (submitted ? score : savedScore) >= quiz.length * 0.7 ? colors.green : colors.yellow }}>
            {submitted ? score : savedScore}/{submitted ? quiz.length : savedTotal}
          </div>
          <div style={{ color: colors.text, marginTop: 4 }}>
            {(submitted ? score : savedScore) >= quiz.length * 0.7 ? "Great job! 🎉" : "Keep studying! 💪"}
            {savedScore !== null && !submitted && !retrying && " (Previous best score)"}
          </div>
          <button onClick={reset} style={{ marginTop: 12, background: colors.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 600 }}>
            Retry Quiz
          </button>
        </div>
      )}

      {(!submitted && (savedScore === null || retrying)) && (
        <>
          {quiz.map((q, i) => {
            const selected = answers[i];
            return (
              <div key={i} style={{ background: colors.surface, borderRadius: 16, padding: 20, border: `1px solid ${colors.border}` }}>
                <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Question {i + 1}</div>
                <div style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{q.question}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((opt, j) => {
                    let bg = colors.bg, borderColor = colors.border, textColor = colors.text;
                    if (selected === j) {
                      bg = colors.accentDim; borderColor = colors.accent; textColor = colors.accentLight;
                    }
                    return (
                      <button key={j} onClick={() => setAnswers({ ...answers, [i]: j })} style={{
                        background: bg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "12px 16px", color: textColor, textAlign: "left", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
                      }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, color: textColor }}>
                          {String.fromCharCode(65 + j)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button onClick={handleQuizSubmit} disabled={Object.keys(answers).length < quiz.length} style={{
            background: Object.keys(answers).length >= quiz.length ? colors.accent : colors.border,
            color: Object.keys(answers).length >= quiz.length ? "#fff" : colors.textDim,
            border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, cursor: Object.keys(answers).length >= quiz.length ? "pointer" : "not-allowed",
          }}>
            Submit Quiz ({Object.keys(answers).length}/{quiz.length} answered)
          </button>
        </>
      )}

      {submitted && quiz.map((q, i) => {
        const selected = answers[i];
        const isCorrect = selected === q.correct;
        return (
          <div key={i} style={{ background: colors.surface, borderRadius: 16, padding: 20, border: `1px solid ${isCorrect ? colors.green : selected !== undefined ? colors.red : colors.border}` }}>
            <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Question {i + 1}</div>
            <div style={{ color: colors.text, fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{q.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt, j) => {
                let bg = colors.bg, borderColor = colors.border, textColor = colors.text;
                if (j === q.correct) { bg = colors.greenDim; borderColor = colors.green; textColor = colors.green; }
                else if (j === selected && j !== q.correct) { bg = colors.redDim; borderColor = colors.red; textColor = colors.red; }
                return (
                  <button key={j} style={{
                    background: bg, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "12px 16px", color: textColor, textAlign: "left", cursor: "default", fontSize: 14, display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, color: textColor }}>
                      {String.fromCharCode(65 + j)}
                    </span>
                    {opt}
                    {j === q.correct && <Icon name="check" size={16} color={colors.green} />}
                  </button>
                );
              })}
            </div>
            {q.explanation && (
              <div style={{ marginTop: 12, background: colors.bg, borderRadius: 8, padding: 12, color: colors.textMuted, fontSize: 13, borderLeft: `3px solid ${colors.accent}` }}>
                💡 {q.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
