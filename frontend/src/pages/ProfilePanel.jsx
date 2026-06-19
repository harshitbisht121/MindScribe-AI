import { useState } from "react";
import { updateProfile } from "firebase/auth";
import { auth } from "../utils/firebase";
import { colors } from "../utils/colors";

export const ProfilePanel = ({ user, onUpdate }) => {
  const [username, setUsername] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setMessage({ text: "", type: "" });
    try {
      await updateProfile(auth.currentUser, { displayName: username.trim() });
      setMessage({ text: "Profile updated successfully!", type: "success" });
      if (onUpdate) onUpdate();
    } catch (err) {
      setMessage({ text: err.message.replace("Firebase: ", ""), type: "error" });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {message.text && (
          <div style={{
            background: message.type === "success" ? colors.greenDim : colors.redDim,
            color: message.type === "success" ? colors.green : colors.red,
            padding: 12, borderRadius: 8, fontSize: 14
          }}>
            {message.text}
          </div>
        )}
        
        <div>
          <label style={{ display: "block", marginBottom: 8, color: colors.textDim, fontSize: 13, fontWeight: 500 }}>
            Username
          </label>
          <input
            type="text"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 15 }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, color: colors.textDim, fontSize: 13, fontWeight: 500 }}>
            Email Address
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.textMuted, fontSize: 15, cursor: "not-allowed", opacity: 0.7 }}
          />
        </div>

        <button type="submit" disabled={loading || username.trim() === user?.displayName} style={{
          background: colors.accent, color: "#fff", border: "none", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: (loading || username.trim() === user?.displayName) ? "not-allowed" : "pointer", opacity: (loading || username.trim() === user?.displayName) ? 0.7 : 1, marginTop: 8
        }}>
          {loading ? "Updating..." : "Update Profile"}
        </button>
      </form>
    </div>
  );
};
