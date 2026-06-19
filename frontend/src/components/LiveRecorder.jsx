import { useState, useRef } from "react";
import { colors } from "../utils/colors";
import { Icon } from "./Icon";
import { api } from "../utils/api";

export const LiveRecorder = ({ onSuccess, language }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const mediaRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.start(1000);
      setRecording(true);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

      // Use Web Speech API for live transcript
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === "hi" ? "hi-IN" : "en-US";
        recognition.onresult = (e) => {
          let final = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
          }
          if (final) setTranscript(t => t + final);
        };
        recognition.start();
        mr._recognition = recognition;
      }
    } catch (e) {
      alert("Microphone access denied: " + e.message);
    }
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setRecording(false);
    
    if (mediaRef.current) {
      if (mediaRef.current._recognition) mediaRef.current._recognition.stop();
      mediaRef.current.stop();
      mediaRef.current.stream?.getTracks().forEach(t => t.stop());
      
      // Create blob and upload
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `live_lecture_${Date.now()}.webm`, { type: "audio/webm" });
      const result = await api.uploadFile(file, language, `Live Lecture ${new Date().toLocaleString()}`);
      if (result?.lecture_id) {
        // Inject live transcript
        if (transcript) {
          try {
            await api.patchTranscript(result.lecture_id, transcript);
          } catch (e) {
            console.error("Failed to patch transcript:", e);
          }
        }
        onSuccess(result.lecture_id);
      }
    }
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: colors.bg, borderRadius: 16, padding: 24, textAlign: "center" }}>
        {recording ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: colors.redDim, border: `2px solid ${colors.red}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.5s ease infinite" }}>
              <Icon name="mic" size={28} color={colors.red} />
            </div>
            <div style={{ color: colors.red, fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(seconds)}</div>
            <div style={{ color: colors.textMuted, fontSize: 12 }}>Recording in progress...</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Icon name="mic" size={40} color={colors.textDim} />
            <div style={{ color: colors.textMuted }}>Click to start recording your live lecture</div>
          </div>
        )}
      </div>

      {transcript && (
        <div style={{ background: colors.bg, borderRadius: 12, padding: 16, maxHeight: 150, overflow: "auto" }}>
          <div style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8, fontWeight: 500 }}>LIVE TRANSCRIPT</div>
          <div style={{ color: colors.text, fontSize: 13, lineHeight: 1.6 }}>{transcript}</div>
        </div>
      )}

      <button
        onClick={recording ? stopRecording : startRecording}
        style={{
          background: recording ? colors.red : colors.accent,
          color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {recording ? <><Icon name="x" size={16} /> Stop & Process</> : <><Icon name="mic" size={16} /> Start Recording</>}
      </button>
    </div>
  );
};
