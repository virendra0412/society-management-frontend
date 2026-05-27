import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Input, Btn } from "../../components/ui";
import { C } from "../../constants/theme";

export const RegisterScreen = ({ onSwitch }) => {
  const { register } = useAuth();
  const toast        = useToast();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    societyJoinCode: "", flat: "", wing: "",
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name || form.name.length < 2)   e.name     = "Name must be at least 2 characters";
    if (!form.email)                           e.email    = "Email is required";
    if (!form.password || form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      e.password = "Must include uppercase, lowercase & a number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        societyJoinCode: form.societyJoinCode.trim().toUpperCase() || undefined,
        flat: form.flat.trim() || undefined,
        block: form.wing.trim() || undefined,
      });
      if (result.pendingApproval) {
        toast.info("Registered! Waiting for admin approval to join the society.");
      } else {
        toast.success("Account created! Welcome aboard.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed.";
      toast.error(msg);
      if (err.response?.data?.code === "EMAIL_TAKEN") {
        setErrors({ email: "This email is already registered" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, maxWidth: 480, margin: "0 auto" }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "40px 24px 32px",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏘️</div>
        <div style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
          Create account
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
          Join your society community
        </div>
      </div>

      <div style={{ padding: "28px 24px 40px" }}>
        <Input label="Full Name *"   type="text"     value={form.name}   onChange={set("name")}   placeholder="Rajesh Mehta"           error={errors.name} />
        <Input label="Email *"       type="email"    value={form.email}  onChange={set("email")}  placeholder="rajesh@example.com"     error={errors.email} />
        <Input label="Phone"         type="tel"      value={form.phone}  onChange={set("phone")}  placeholder="9876543210" />
        <Input label="Password *"    type="password" value={form.password} onChange={set("password")} placeholder="Min 8 chars, A-Z, 0-9" error={errors.password} />

        <div style={{
          background: C.amber + "12", border: `1px solid ${C.amber}40`,
          borderRadius: 10, padding: "12px 14px", marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 8, textTransform: "uppercase" }}>
            Join a Society (optional)
          </div>
          <Input label="Society Join Code" value={form.societyJoinCode} onChange={set("societyJoinCode")} placeholder="e.g. A3F0B2C1" />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Input label="Flat Number" value={form.flat} onChange={set("flat")} placeholder="e.g. B-204" />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Wing / Block" value={form.wing} onChange={set("wing")} placeholder="e.g. B" />
            </div>
          </div>
        </div>

        <Btn onClick={handleSubmit} loading={loading} style={{ width: "100%", marginTop: 8 }}>
          Create Account
        </Btn>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.gray500 }}>
          Already have an account?{" "}
          <span onClick={onSwitch} style={{ color: C.teal, fontWeight: 700, cursor: "pointer" }}>
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
};
