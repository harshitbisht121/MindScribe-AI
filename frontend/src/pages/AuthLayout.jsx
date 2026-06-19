import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "../utils/firebase";
import { colors } from "../utils/colors";

export const AuthLayout = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (username.trim()) {
          await updateProfile(userCredential.user, { displayName: username.trim() });
        }
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg }}>
      <div style={{ background: colors.surface, padding: 40, borderRadius: 20, width: "100%", maxWidth: 400, border: `1px solid ${colors.border}` }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: colors.text, textAlign: "center" }}>
          {isLogin ? "Welcome back" : "Create an account"}
        </h1>
        <p style={{ color: colors.textMuted, textAlign: "center", marginBottom: 32 }}>
          MindScribe AI - Transform Lectures into Knowledge
        </p>

        {error && (
          <div style={{ background: colors.redDim, color: colors.red, padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 15 }}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 15 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 15 }}
          />
          <button type="submit" disabled={loading} style={{
            background: colors.accent, color: "#fff", border: "none", padding: 14, borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1
          }}>
            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
          <div style={{ margin: "0 12px", color: colors.textMuted, fontSize: 14 }}>OR</div>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
        </div>

        <button onClick={handleGoogle} style={{
          width: "100%", background: "transparent", border: `1px solid ${colors.border}`, padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 600, color: colors.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10
        }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
          Continue with Google
        </button>

        <div style={{ marginTop: 24, textAlign: "center", color: colors.textMuted, fontSize: 14 }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setIsLogin(!isLogin)} style={{ color: colors.accent, cursor: "pointer", fontWeight: 600 }}>
            {isLogin ? "Sign up" : "Log in"}
          </span>
        </div>
      </div>
    </div>
  );
};
