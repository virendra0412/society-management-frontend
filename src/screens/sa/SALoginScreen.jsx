/**
 * SALoginScreen.jsx
 * Super Admin login — visually distinct dark portal.
 * Shown when URL is /superadmin and user is not authenticated as SA.
 */
import { useState } from "react";
import { useSAAuth }                     from "../../context/SAAuthContext";
import { SA, SAInput, SABtn }            from "../../components/SAComponents";

export const SALoginScreen = () => {
  const { login }                        = useSAAuth();
  const [form,    setForm]               = useState({ email: "", password: "" });
  const [errors,  setErrors]             = useState({});
  const [loading, setLoading]            = useState(false);
  const [apiErr,  setApiErr]             = useState("");

  const set = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setApiErr("");
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const handleLogin = async () => {
    const e = {};
    if (!form.email.trim())    e.email    = "Email is required";
    if (!form.password.trim()) e.password = "Password is required";
    if (Object.keys(e).length) return setErrors(e);
    setLoading(true);
    try {
      await login(form);
    } catch (err) {
      setApiErr(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div style={{
      minHeight: "100vh", background: SA.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      {/* Subtle background grid */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: `linear-gradient(${SA.border}30 1px, transparent 1px), linear-gradient(90deg, ${SA.border}30 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

        {/* Logo mark */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: `linear-gradient(135deg, ${SA.accent}, #0099A0)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, margin: "0 auto 16px", boxShadow: `0 8px 32px ${SA.accent}30`,
          }}>
            🏢
          </div>
          <div style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, color: SA.white, marginBottom: 4 }}>
            Super Admin
          </div>
          <div style={{ fontSize: 13, color: SA.textDim }}>
            SocietyApp Platform Control
          </div>
        </div>

        {/* Form */}
        <div style={{
          background: SA.surface, borderRadius: 20,
          padding: "32px 28px", border: `1px solid ${SA.border}`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: SA.white, marginBottom: 24, fontFamily: "Syne" }}>
            Sign In
          </div>

          <SAInput
            label="Email Address"
            type="email"
            value={form.email}
            onChange={set("email")}
            onKeyDown={onKey}
            placeholder="superadmin@societyapp.com"
            error={errors.email}
          />
          <SAInput
            label="Password"
            type="password"
            value={form.password}
            onChange={set("password")}
            onKeyDown={onKey}
            placeholder="••••••••"
            error={errors.password}
          />

          {apiErr && (
            <div style={{
              background: SA.red + "15", border: `1px solid ${SA.red}30`,
              borderRadius: 8, padding: "10px 12px", marginBottom: 16,
              fontSize: 13, color: SA.red,
            }}>
              {apiErr}
            </div>
          )}

          <SABtn
            onClick={handleLogin}
            loading={loading}
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
          >
            Sign In →
          </SABtn>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: SA.textDim }}>
            Restricted to platform administrators only.
          </div>
        </div>

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a
            href="/"
            style={{ fontSize: 13, color: SA.textDim, textDecoration: "none" }}
          >
            ← Back to Society App
          </a>
        </div>
      </div>
    </div>
  );
};