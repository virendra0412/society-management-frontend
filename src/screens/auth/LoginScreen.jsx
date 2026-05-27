import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authExtrasApi } from "../../api/resources.api";
import { Input, Btn } from "../../components/ui";
import { C } from "../../constants/theme";

// ─── Forgot Password (inline two-step flow) ───────────────────────────────────
const ForgotPasswordView = ({ onBack }) => {
  const toast = useToast();
  const [step,    setStep]    = useState(1);        // 1 = email, 2 = otp + new pass
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [devOtp,  setDevOtp]  = useState("");       // pre-filled from backend in dev
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const requestOTP = async () => {
    if (!email.trim()) return setErrors({ email: "Email is required" });
    setErrors({});
    setLoading(true);
    try {
      const res = await authExtrasApi.forgotPassword(email.trim().toLowerCase());
      if (res.devOtp) setDevOtp(res.devOtp); // dev only — never shown in prod
      setStep(2);
      toast.info("OTP sent — check your email.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const e = {};
    if (otp.trim().length !== 6) e.otp = "Enter the 6-digit OTP";
    if (newPass.length < 8)      e.newPass = "Min 8 characters";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPass))
      e.newPass = "Must include uppercase, lowercase & number";
    if (Object.keys(e).length) return setErrors(e);
    setErrors({});
    setLoading(true);
    try {
      await authExtrasApi.resetPassword(email, otp.trim(), newPass);
      toast.success("Password reset! Please sign in.");
      onBack();
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 20, color: C.gray500, lineHeight: 1, padding: 0,
        }}>←</button>
        <span style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 800, color: C.navy }}>
          {step === 1 ? "Forgot password?" : "Enter OTP"}
        </span>
      </div>

      {step === 1 ? (
        <>
          <p style={{ fontSize: 13, color: C.gray500, marginTop: 0, marginBottom: 20, lineHeight: 1.6 }}>
            Enter your registered email. We'll send a one-time password.
          </p>
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={errors.email}
          />
          <Btn onClick={requestOTP} loading={loading} style={{ width: "100%" }}>
            Send OTP
          </Btn>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: C.gray500, marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
            OTP sent to <strong>{email}</strong>.
          </p>

          {/* Dev helper — only visible when backend returns devOtp */}
          {devOtp && (
            <div style={{
              background: C.amber + "18", border: `1px solid ${C.amber}50`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 4 }}>
                🛠 DEV — OTP
              </div>
              <div style={{ fontSize: 22, fontFamily: "monospace", fontWeight: 800, color: C.amber, letterSpacing: 6 }}>
                {devOtp}
              </div>
            </div>
          )}

          <Input
            label="6-digit OTP *"
            type="number"
            value={otp}
            onChange={(e) => setOtp(e.target.value.slice(0, 6))}
            placeholder="123456"
            error={errors.otp}
          />
          <Input
            label="New password *"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="Min 8 chars, A-Z, 0-9"
            error={errors.newPass}
          />
          <Btn onClick={resetPassword} loading={loading} style={{ width: "100%" }}>
            Reset Password
          </Btn>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span
              onClick={() => { setStep(1); setOtp(""); setDevOtp(""); setNewPass(""); }}
              style={{ fontSize: 13, color: C.teal, cursor: "pointer", fontWeight: 600 }}
            >
              Resend OTP
            </span>
          </div>
        </>
      )}
    </>
  );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
export const LoginScreen = ({ onSwitch }) => {
  const { login } = useAuth();
  const toast     = useToast();

  const [showForgot, setShowForgot] = useState(false);
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = "Email is required";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form);
      toast.success("Welcome back!");
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
      toast.error(msg);
      if (err.response?.status === 401) setErrors({ password: "Invalid email or password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: C.bg, maxWidth: 480, margin: "0 auto",
    }}>
      {/* Top gradient */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "48px 24px 40px",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏘️</div>
        <div style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
          Sign in to your society account
        </div>
      </div>

      {/* Form area */}
      <div style={{ padding: "32px 24px", flex: 1 }}>
        {showForgot ? (
          <ForgotPasswordView onBack={() => setShowForgot(false)} />
        ) : (
          <>
            <Input
              label="Email address"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              error={errors.email}
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              error={errors.password}
            />

            {/* Forgot password link — right-aligned under the password field */}
            <div style={{ textAlign: "right", marginTop: -8, marginBottom: 20 }}>
              <span
                onClick={() => setShowForgot(true)}
                style={{ fontSize: 13, color: C.teal, fontWeight: 600, cursor: "pointer" }}
              >
                Forgot password?
              </span>
            </div>

            <Btn onClick={handleSubmit} loading={loading} style={{ width: "100%" }}>
              Sign In
            </Btn>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.gray500 }}>
              Don't have an account?{" "}
              <span onClick={onSwitch} style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}>
                Register here
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
