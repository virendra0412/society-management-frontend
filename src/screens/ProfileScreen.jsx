import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { userApi } from "../api/resources.api";
import {
  Card, Btn, Input, Modal, Avatar, Badge, Spinner, PageHeader,
} from "../components/ui";
import { C } from "../constants/theme";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RELATION_OPTIONS = ["Spouse", "Parent", "Child", "Sibling", "Other"];

const FieldRow = ({ label, value }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: `1px solid ${C.gray100}`,
  }}>
    <span style={{ fontSize: 12, color: C.gray500, fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 14, color: C.text, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
      {value || <span style={{ color: C.gray300 }}>—</span>}
    </span>
  </div>
);

// ─── Family Member Card ────────────────────────────────────────────────────────
const FamilyCard = ({ member, onEdit, onRemove }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", background: C.gray50,
    borderRadius: 12, border: `1px solid ${C.gray100}`,
  }}>
    <Avatar name={member.name} size={36} color={C.purple} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{member.name}</div>
      <div style={{ fontSize: 11, color: C.gray500 }}>
        {member.relation}{member.age ? ` · Age ${member.age}` : ""}
      </div>
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      <button onClick={() => onEdit(member)} style={{
        background: "none", border: `1px solid ${C.gray100}`, borderRadius: 8,
        padding: "4px 8px", fontSize: 11, color: C.gray700, cursor: "pointer",
      }}>Edit</button>
      <button onClick={() => onRemove(member._id)} style={{
        background: "none", border: `1px solid ${C.red}30`, borderRadius: 8,
        padding: "4px 8px", fontSize: 11, color: C.red, cursor: "pointer",
      }}>Remove</button>
    </div>
  </div>
);

// ─── Edit Profile Modal ────────────────────────────────────────────────────────
const EditProfileModal = ({ open, onClose, user, onSave }) => {
  const [form, setForm] = useState({ name: "", phone: "", flat: "", block: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (user && open) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        flat: user.flat || "",
        block: user.block || "",
      });
    }
  }, [user, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await userApi.updateProfile(form);
      onSave(updated.data.user);
      toast.success("Profile updated!");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <Input label="Full Name" value={form.name} onChange={f("name")} placeholder="Your name" />
      <Input label="Phone" value={form.phone} onChange={f("phone")} placeholder="e.g. 9876543210" type="tel" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Input label="Flat No." value={form.flat} onChange={f("flat")} placeholder="e.g. 204" />
        <Input label="Wing / Block" value={form.block} onChange={f("block")} placeholder="e.g. A" />
      </div>
      <Btn onClick={handleSave} loading={saving} style={{ width: "100%", marginTop: 4 }}>
        Save Changes
      </Btn>
    </Modal>
  );
};

// ─── Family Member Modal ───────────────────────────────────────────────────────
const FamilyModal = ({ open, onClose, member, onDone }) => {
  const [form, setForm] = useState({ name: "", relation: "Spouse", age: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const isEdit = !!member;

  useEffect(() => {
    if (open) {
      setForm(member
        ? { name: member.name, relation: member.relation, age: member.age || "" }
        : { name: "", relation: "Spouse", age: "" });
    }
  }, [open, member]);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = { ...form, age: form.age ? Number(form.age) : undefined };
      let res;
      if (isEdit) {
        res = await userApi.updateFamilyMember(member._id, payload);
      } else {
        res = await userApi.addFamilyMember(payload);
      }
      onDone(res.data.familyMembers);
      toast.success(isEdit ? "Member updated" : "Member added");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Family Member" : "Add Family Member"}>
      <Input label="Name" value={form.name} onChange={f("name")} placeholder="Full name" />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 5 }}>Relation</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {RELATION_OPTIONS.map((r) => (
            <button key={r} onClick={() => setForm((p) => ({ ...p, relation: r }))} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${form.relation === r ? C.teal : C.gray100}`,
              background: form.relation === r ? C.teal + "15" : "transparent",
              color: form.relation === r ? C.teal : C.gray700, cursor: "pointer",
            }}>{r}</button>
          ))}
        </div>
      </div>
      <Input label="Age (optional)" value={form.age} onChange={f("age")} placeholder="e.g. 34" type="number" />
      <Btn onClick={handleSave} loading={saving} style={{ width: "100%", marginTop: 4 }}>
        {isEdit ? "Update" : "Add Member"}
      </Btn>
    </Modal>
  );
};

// ─── Avatar Upload Section ─────────────────────────────────────────────────────
const AvatarSection = ({ user, onAvatarUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const toast = useToast();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");

    setUploading(true);
    try {
      const res = await userApi.uploadAvatar(file);
      onAvatarUpdate(res.data);
      toast.success("Avatar updated!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 24, paddingTop: 8 }}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt="avatar"
            style={{
              width: 80, height: 80, borderRadius: "50%",
              objectFit: "cover", border: `3px solid ${C.teal}30`,
            }}
          />
        ) : (
          <Avatar name={user?.name || "?"} size={80} color={C.teal} />
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: 26, height: 26, borderRadius: "50%",
            background: C.navy, border: "2px solid #fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 12,
          }}
        >
          {uploading ? <Spinner size={12} color="#fff" /> : "✏️"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      </div>
      <div style={{ fontSize: 20, fontFamily: "Syne", fontWeight: 800, color: C.navy }}>{user?.name}</div>
      <div style={{ fontSize: 12, color: C.gray500, marginTop: 3 }}>
        {user?.role === "admin" ? "👑 Admin" : "Resident"} · {user?.society?.name || "—"}
      </div>
    </div>
  );
};

// ─── Main ProfileScreen ────────────────────────────────────────────────────────
export const ProfileScreen = () => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await userApi.getProfile();
      setProfile(res.data.user);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleProfileSave = (updatedUser) => {
    setProfile(updatedUser);
    refreshUser();
  };

  const handleAvatarUpdate = (data) => {
    setProfile((p) => ({ ...p, avatar: data.avatar }));
    refreshUser();
  };

  const handleFamilyDone = (familyMembers) => {
    setProfile((p) => ({ ...p, familyMembers }));
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await userApi.removeFamilyMember(memberId);
      setProfile((p) => ({ ...p, familyMembers: res.data.familyMembers }));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFamilyOpen(true);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 0" }}>
        <Spinner size={32} />
      </div>
    );
  }

  const p = profile || user;

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      {/* Header gradient */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a6e 100%)`,
        padding: "20px 20px 32px",
        marginBottom: -16,
      }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          My Profile
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Avatar + Name Card */}
        <Card style={{ marginBottom: 16 }}>
          <AvatarSection user={p} onAvatarUpdate={handleAvatarUpdate} />
        </Card>

        {/* Profile Info */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.gray700 }}>Personal Details</span>
            <button
              onClick={() => setEditOpen(true)}
              style={{
                background: C.teal + "15", color: C.teal, border: "none",
                borderRadius: 8, padding: "5px 12px", fontSize: 12,
                fontWeight: 700, cursor: "pointer",
              }}
            >
              ✏️ Edit
            </button>
          </div>
          <FieldRow label="Email" value={p?.email} />
          <FieldRow label="Phone" value={p?.phone} />
          <FieldRow label="Flat No." value={p?.flat} />
          <FieldRow label="Wing / Block" value={p?.block} />
          <FieldRow label="Society" value={p?.society?.name} />
          <FieldRow
            label="Account Status"
            value={
              <Badge
                label={p?.isApproved ? "Approved" : "Pending Approval"}
                bg={p?.isApproved ? "#D1FAE5" : "#FEF3C7"}
                text={p?.isApproved ? "#065F46" : "#92400E"}
                dot={p?.isApproved ? "#10B981" : "#F59E0B"}
              />
            }
          />
        </Card>

        {/* Family Members */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.gray700 }}>
              Family Members
              {p?.familyMembers?.length > 0 && (
                <span style={{
                  marginLeft: 8, background: C.teal + "20", color: C.teal,
                  borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                }}>{p.familyMembers.length}</span>
              )}
            </span>
            <button
              onClick={() => { setEditingMember(null); setFamilyOpen(true); }}
              style={{
                background: C.amber + "20", color: C.amber, border: "none",
                borderRadius: 8, padding: "5px 12px", fontSize: 12,
                fontWeight: 700, cursor: "pointer",
              }}
            >
              + Add
            </button>
          </div>
          {!p?.familyMembers?.length ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: C.gray300, fontSize: 13 }}>
              👨‍👩‍👧 No family members added yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {p.familyMembers.map((m) => (
                <FamilyCard
                  key={m._id}
                  member={m}
                  onEdit={handleEditMember}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Society Info */}
        {p?.society && (
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 10 }}>
              Society Info
            </div>
            <FieldRow label="Society Name" value={p.society.name} />
            <FieldRow label="Join Code" value={p.society.joinCode} />
            <FieldRow label="City" value={p.society.city} />
            <FieldRow label="State" value={p.society.state} />
          </Card>
        )}
      </div>

      {/* Modals */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={p}
        onSave={handleProfileSave}
      />
      <FamilyModal
        open={familyOpen}
        onClose={() => { setFamilyOpen(false); setEditingMember(null); }}
        member={editingMember}
        onDone={handleFamilyDone}
      />
    </div>
  );
};
