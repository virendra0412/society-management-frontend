import { useState } from "react";
import { useAuth }  from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT }     from "../../context/LanguageContext";
import { authExtrasApi } from "../../api/resources.api";
import { Input, Btn }    from "../../components/ui";
import { C }             from "../../constants/theme";

// ─── Forgot / Reset password (inline two-step flow) ──────────────────────────
const ForgotPasswordView = ({ onBack }) => {
  const toast = useToast();
  const t     = useT();

  const [step,    setStep]    = useState(1);    // 1 = email, 2 = otp + new pass
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState("");
  const [devOtp,  setDevOtp]  = useState("");   // pre-filled in dev from backend
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const requestOTP = async () => {
    if (!email.trim()) return setErrors({ email: t("err_email_required") });
    setErrors({});
    setLoading(true);
    try {
      const res = await authExtrasApi.forgotPassword(email.trim().toLowerCase());
      if (res.data?.devOtp) setDevOtp(res.data.devOtp);
      setStep(2);
      toast.info(t("forgot_otp_sent"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("forgot_req_failed"));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const e = {};
    if (otp.trim().length !== 6)                            e.otp     = t("err_otp_digits");
    if (newPass.length < 8)                                 e.newPass = t("err_pass_min");
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPass))  e.newPass = t("err_pass_pattern");
    if (Object.keys(e).length) return setErrors(e);
    setErrors({});
    setLoading(true);
    try {
      await authExtrasApi.resetPassword(email, otp.trim(), newPass);
      toast.success(t("reset_success"));
      onBack();
    } catch (err) {
      toast.error(err.response?.data?.message || t("reset_failed"));
    } finally {
      setLoading(false);
    }
  };

  const goBackToStep1 = () => {
    setStep(1);
    setOtp("");
    setDevOtp("");
    setNewPass("");
    setErrors({});
  };

  return (
    <>
      {/* Back + title row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: C.gray500, lineHeight: 1, padding: 0,
          }}
        >
          ←
        </button>
        <span style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 800, color: C.navy }}>
          {step === 1 ? t("forgot_title") : t("reset_title")}
        </span>
      </div>

      {step === 1 ? (
        <>
          <p style={{ fontSize: 13, color: C.gray500, marginTop: 0, marginBottom: 20, lineHeight: 1.6 }}>
            {t("forgot_subtitle")}
          </p>
          <Input
            label={t("login_email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("login_email_ph")}
            error={errors.email}
          />
          <Btn onClick={requestOTP} loading={loading} style={{ width: "100%" }}>
            {t("forgot_btn_send")}
          </Btn>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: C.gray500, marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
            {t("reset_otp_sent_to")} <strong>{email}</strong>.
          </p>

          {/* Dev helper — only shown when backend returns devOtp */}
          {devOtp && (
            <div style={{
              background: C.amber + "18", border: `1px solid ${C.amber}50`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 4 }}>
                {t("forgot_dev_label")}
              </div>
              <div style={{
                fontSize: 22, fontFamily: "monospace", fontWeight: 800,
                color: C.amber, letterSpacing: 6,
              }}>
                {devOtp}
              </div>
            </div>
          )}

          <Input
            label={t("reset_otp_label")}
            type="number"
            value={otp}
            onChange={(e) => setOtp(e.target.value.slice(0, 6))}
            placeholder={t("reset_otp_ph")}
            error={errors.otp}
          />
          <Input
            label={t("reset_pass_label")}
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder={t("reset_pass_ph")}
            error={errors.newPass}
          />
          <Btn onClick={resetPassword} loading={loading} style={{ width: "100%" }}>
            {t("reset_btn")}
          </Btn>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span
              onClick={goBackToStep1}
              style={{ fontSize: 13, color: C.teal, cursor: "pointer", fontWeight: 600 }}
            >
              {t("reset_resend")}
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
  const t         = useT();

  const [showForgot, setShowForgot] = useState(false);
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = t("err_email_required");
    if (!form.password) e.password = t("err_pass_required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form);
      toast.success(t("login_success"));
    } catch (err) {
      const msg = err.response?.data?.message || t("login_failed");
      toast.error(msg);
      if (err.response?.status === 401) setErrors({ password: t("login_invalid") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: C.bg, maxWidth: 480, margin: "0 auto",
    }}>

      {/* Top gradient header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "48px 24px 40px",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏘️</div>
        <div style={{
          fontFamily: "Syne", fontSize: 28, fontWeight: 800,
          color: "#fff", marginBottom: 6,
        }}>
          {t("login_title")}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
          {t("login_subtitle")}
        </div>
      </div>

      {/* Form area */}
      <div style={{ padding: "32px 24px", flex: 1 }}>
        {showForgot ? (
          <ForgotPasswordView onBack={() => setShowForgot(false)} />
        ) : (
          <>
            <Input
              label={t("login_email")}
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder={t("login_email_ph")}
              error={errors.email}
            />
            <Input
              label={t("login_password")}
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={t("login_password_ph")}
              error={errors.password}
            />

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginTop: -8, marginBottom: 20 }}>
              <span
                onClick={() => setShowForgot(true)}
                style={{ fontSize: 13, color: C.teal, fontWeight: 600, cursor: "pointer" }}
              >
                {t("login_forgot")}
              </span>
            </div>

            <Btn onClick={handleSubmit} loading={loading} style={{ width: "100%" }}>
              {t("login_btn")}
            </Btn>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.gray500 }}>
              {t("login_no_account")}{" "}
              <span
                onClick={onSwitch}
                style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}
              >
                {t("login_register_link")}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
