import { useState } from "react";
import { useAuth }  from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useT }     from "../../context/LanguageContext";
import { Input, Btn } from "../../components/ui";
import { C }          from "../../constants/theme";

export const RegisterScreen = ({ onSwitch }) => {
  const { register } = useAuth();
  const toast        = useToast();
  const t            = useT();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    societyJoinCode: "", flat: "", wing: "",
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2)
      e.name = t("err_name_min");
    if (!form.email)
      e.email = t("err_email_req");
    if (!form.password || form.password.length < 8)
      e.password = t("err_pass_min8");
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      e.password = t("err_pass_complexity");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register({
        name:            form.name.trim(),
        email:           form.email.trim().toLowerCase(),
        phone:           form.phone.trim()           || undefined,
        password:        form.password,
        societyJoinCode: form.societyJoinCode.trim().toUpperCase() || undefined,
        flat:            form.flat.trim()            || undefined,
        wing:            form.wing.trim()            || undefined,
      });
      if (result.pendingApproval) {
        toast.info(t("reg_success_pending"));
      } else {
        toast.success(t("reg_success"));
      }
    } catch (err) {
      const msg = err.response?.data?.message || t("reg_failed");
      toast.error(msg);
      if (err.response?.data?.code === "EMAIL_TAKEN") {
        setErrors({ email: t("reg_email_taken") });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, maxWidth: 480, margin: "0 auto" }}>

      {/* Top gradient header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "40px 24px 32px",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏘️</div>
        <div style={{
          fontFamily: "Syne", fontSize: 26, fontWeight: 800,
          color: "#fff", marginBottom: 6,
        }}>
          {t("reg_title")}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
          {t("reg_subtitle")}
        </div>
      </div>

      {/* Form area */}
      <div style={{ padding: "28px 24px 40px" }}>

        <Input
          label={t("reg_name")}
          type="text"
          value={form.name}
          onChange={set("name")}
          placeholder={t("reg_name_ph")}
          error={errors.name}
        />
        <Input
          label={t("reg_email")}
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder={t("reg_email_ph")}
          error={errors.email}
        />
        <Input
          label={t("reg_phone")}
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          placeholder={t("reg_phone_ph")}
        />
        <Input
          label={t("reg_password")}
          type="password"
          value={form.password}
          onChange={set("password")}
          placeholder={t("reg_password_ph")}
          error={errors.password}
        />

        {/* Society section */}
        <div style={{
          background: C.amber + "12", border: `1px solid ${C.amber}40`,
          borderRadius: 10, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.amber,
            marginBottom: 8, textTransform: "uppercase",
          }}>
            Join a Society (optional)
          </div>
          <Input
            label={t("reg_join_code")}
            value={form.societyJoinCode}
            onChange={set("societyJoinCode")}
            placeholder={t("reg_join_code_ph")}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Input
                label={t("reg_flat")}
                value={form.flat}
                onChange={set("flat")}
                placeholder={t("reg_flat_ph")}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label={t("reg_wing")}
                value={form.wing}
                onChange={set("wing")}
                placeholder={t("reg_wing_ph")}
              />
            </div>
          </div>
        </div>

        <Btn onClick={handleSubmit} loading={loading} style={{ width: "100%", marginTop: 8 }}>
          {t("reg_btn")}
        </Btn>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.gray500 }}>
          {t("reg_has_account")}{" "}
          <span
            onClick={onSwitch}
            style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}
          >
            {t("reg_login_link")}
          </span>
        </div>
      </div>
    </div>
  );
};
