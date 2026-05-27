import { useState, useEffect, useCallback, useRef } from "react";
import { issuesApi } from "../api/resources.api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Card, Badge, Modal, Input, Select, Btn,
  Spinner, EmptyState, ErrorState, PageHeader,
} from "../components/ui";
import { C, STATUS_COLOR, PRIORITY_COLOR, CATEGORY_ICON, ISSUE_CATEGORIES, PRIORITIES } from "../constants/theme";
import { timeAgo } from "../utils/timeago";

const FILTERS = ["All", "Open", "In Progress", "Resolved"];
const EMPTY_FORM = { title: "", description: "", category: "Water", priority: "Medium", isAnonymous: false };
const EMPTY_VENDOR = { name: "", phone: "", note: "" };

// ─── Small toggle pill ────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, label }) => (
  <div
    onClick={() => onChange(!value)}
    style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer", userSelect: "none" }}
  >
    <div style={{
      width: 38, height: 22, borderRadius: 11,
      background: value ? C.teal : C.gray300,
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 3, left: value ? 19 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      }} />
    </div>
    <span style={{ fontSize: 13, color: C.gray700, fontWeight: 600 }}>{label}</span>
  </div>
);

// ─── Photo strip (thumbnail row) ──────────────────────────────────────────────
const PhotoStrip = ({ urls }) => {
  if (!urls?.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>
        📷 Photos ({urls.length})
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {urls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url} alt={`photo-${i + 1}`}
              style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
            />
          </a>
        ))}
      </div>
    </div>
  );
};

export const IssuesScreen = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [issues,          setIssues]         = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState(null);
  const [filter,          setFilter]         = useState("All");
  const [selected,        setSelected]       = useState(null);
  const [comments,        setComments]       = useState([]);
  const [showNew,         setShowNew]        = useState(false);
  const [form,            setForm]           = useState(EMPTY_FORM);
  const [submitting,      setSubmitting]     = useState(false);
  const [commentBody,     setCommentBody]    = useState("");
  const [commentLoading,  setCommentLoading] = useState(false);
  const [statusLoading,   setStatusLoading]  = useState(false);

  // Photo upload (new issue form)
  const [photoFiles,  setPhotoFiles]  = useState([]); // File objects
  const [photoPreviews, setPhotoPreviews] = useState([]); // blob URLs
  const photoInputRef = useRef();

  // Vendor assign (admin, detail modal)
  const [showVendor,    setShowVendor]    = useState(false);
  const [vendorForm,    setVendorForm]    = useState(EMPTY_VENDOR);
  const [vendorLoading, setVendorLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchIssues = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { sort: "-createdAt", limit: 50 };
      if (filter !== "All") params.status = filter;
      const res = await issuesApi.getAll(params);
      setIssues(res.data?.issues || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load issues.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  // ── Open detail ───────────────────────────────────────────────────────────
  const openDetail = async (issue) => {
    setSelected(issue);
    setComments([]);
    try {
      const res = await issuesApi.getOne(issue._id);
      const full = res.data?.issue;
      setSelected(full);
      setComments(full?.comments || []);
    } catch { /* fall back to list version */ }
  };

  // ── Create issue + upload photos ──────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error("Title is required.");
    setSubmitting(true);
    try {
      const res = await issuesApi.create(form);
      const created = res.data.issue;

      // Upload each selected photo sequentially
      for (const file of photoFiles) {
        try { await issuesApi.uploadPhoto(created._id, file); }
        catch { /* non-fatal — continue with next photo */ }
      }

      setIssues((p) => [created, ...p]);
      setForm(EMPTY_FORM);
      setPhotoFiles([]); setPhotoPreviews([]);
      setShowNew(false);
      toast.success("Issue reported.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to report issue.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Photo picker ──────────────────────────────────────────────────────────
  const handlePhotoSelect = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 5 - photoFiles.length);
    setPhotoFiles((p) => [...p, ...picked]);
    setPhotoPreviews((p) => [...p, ...picked.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removePhoto = (i) => {
    setPhotoFiles((p) => p.filter((_, j) => j !== i));
    setPhotoPreviews((p) => p.filter((_, j) => j !== i));
  };

  // ── Status change (admin) ─────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (!selected) return;
    setStatusLoading(true);
    try {
      const res = await issuesApi.update(selected._id, { status: newStatus });
      const updated = res.data.issue;
      setSelected(updated);
      setIssues((p) => p.map((i) => i._id === updated._id ? updated : i));
      toast.success(`Status → "${newStatus}".`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed.");
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Add comment ───────────────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    setCommentLoading(true);
    try {
      const res = await issuesApi.addComment(selected._id, commentBody.trim());
      setComments(res.data.comments || []);
      setCommentBody("");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to add comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  // ── Assign vendor (admin) ─────────────────────────────────────────────────
  const handleAssignVendor = async () => {
    if (!vendorForm.name.trim() || !vendorForm.phone.trim())
      return toast.error("Vendor name and phone are required.");
    setVendorLoading(true);
    try {
      const res = await issuesApi.assignVendor(selected._id, vendorForm);
      const updated = res.data.issue;
      setSelected(updated);
      setIssues((p) => p.map((i) => i._id === updated._id ? updated : i));
      setShowVendor(false);
      setVendorForm(EMPTY_VENDOR);
      toast.success("Vendor assigned.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to assign vendor.");
    } finally {
      setVendorLoading(false);
    }
  };

  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setV = (k) => (e) => setVendorForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Issues"
        action={<Btn small onClick={() => setShowNew(true)}>+ Report</Btn>}
      />

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 14px", overflowX: "auto" }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 20, border: "none",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            fontFamily: "Plus Jakarta Sans", whiteSpace: "nowrap",
            background: filter === f ? C.navy : C.gray100,
            color:      filter === f ? "#fff" : C.gray700,
            transition: "all 0.15s",
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Issue list */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading  && [1,2,3].map((k) => <div key={k} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
        {error    && <ErrorState message={error} onRetry={fetchIssues} />}
        {!loading && !error && issues.length === 0 && <EmptyState icon="✅" message="No issues found." />}
        {!loading && !error && issues.map((issue) => (
          <Card key={issue._id} onClick={() => openDetail(issue)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{CATEGORY_ICON[issue.category] || "📋"}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
                    {issue.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.gray500, marginTop: 2 }}>
                    {issue.isAnonymous ? "Anonymous" : (issue.flat || issue.reporter?.flat || "—")}
                    {" · "}{timeAgo(issue.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <Badge label={issue.status}   {...(STATUS_COLOR[issue.status]     || {})} />
              <Badge label={issue.priority} {...(PRIORITY_COLOR[issue.priority] || {})} />
              {issue.isAnonymous          && <Badge label="Anonymous" bg={C.gray100}    text={C.gray500} />}
              {issue.assignedVendor?.name && <Badge label={`🔧 ${issue.assignedVendor.name}`} bg={C.teal + "15"} text={C.teal} />}
              {issue.photos?.length > 0   && <Badge label={`📷 ${issue.photos.length}`} bg={C.gray100} text={C.gray700} />}
              {issue.isEscalated          && <Badge label="Escalated" bg="#FEE2E2" text={C.red} />}
              <span style={{ marginLeft: "auto", fontSize: 11, color: C.gray500 }}>
                💬 {issue.commentCount ?? issue.comments?.length ?? 0}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setCommentBody(""); }} title="Issue Detail">
        {selected && (
          <div>
            {/* Header */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 28 }}>{CATEGORY_ICON[selected.category] || "📋"}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, lineHeight: 1.3 }}>
                  {selected.title}
                </div>
                <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>
                  {selected.isAnonymous ? "Anonymous" : (selected.flat || selected.reporter?.flat || "—")}
                  {" · "}{timeAgo(selected.createdAt)}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <Badge label={selected.status}   {...(STATUS_COLOR[selected.status]     || {})} />
              <Badge label={selected.priority} {...(PRIORITY_COLOR[selected.priority] || {})} />
              <Badge label={selected.category} bg={C.gray100} text={C.gray700} />
              {selected.isAnonymous && <Badge label="Anonymous" bg={C.gray100} text={C.gray500} />}
            </div>

            {/* Description */}
            {selected.description && (
              <div style={{ background: C.gray50, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: C.gray700, lineHeight: 1.6 }}>{selected.description}</p>
              </div>
            )}

            {/* Photos */}
            <PhotoStrip urls={selected.photos} />

            {/* Assigned vendor */}
            {selected.assignedVendor?.name && (
              <div style={{
                background: C.teal + "10", borderRadius: 10, padding: "10px 14px",
                marginBottom: 14, borderLeft: `3px solid ${C.teal}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginBottom: 3 }}>🔧 Assigned Vendor</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{selected.assignedVendor.name}</div>
                <div style={{ fontSize: 12, color: C.gray500 }}>
                  {selected.assignedVendor.phone}
                  {selected.assignedVendor.note ? ` · ${selected.assignedVendor.note}` : ""}
                </div>
              </div>
            )}

            {/* Admin controls */}
            {isAdmin && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 8 }}>Update Status</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {["Open", "In Progress", "Resolved"].map((s) => (
                    <button key={s} onClick={() => handleStatusChange(s)} disabled={statusLoading}
                      style={{
                        flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        fontFamily: "Plus Jakarta Sans",
                        background: selected.status === s ? STATUS_COLOR[s]?.bg : C.gray100,
                        color:      selected.status === s ? STATUS_COLOR[s]?.text : C.gray500,
                        opacity: statusLoading ? 0.7 : 1, transition: "all 0.15s",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
                <Btn small variant="outline" onClick={() => setShowVendor(true)} style={{ width: "100%" }}>
                  🔧 {selected.assignedVendor?.name ? "Change Vendor" : "Assign Vendor"}
                </Btn>
              </div>
            )}

            {/* Comments */}
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 8 }}>
              Comments ({comments.length})
            </div>
            {comments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, maxHeight: 200, overflowY: "auto" }}>
                {comments.map((c) => (
                  <div key={c._id} style={{
                    background: c.isAdminReply ? C.teal + "10" : C.gray50,
                    borderRadius: 10, padding: "10px 12px",
                    borderLeft: c.isAdminReply ? `3px solid ${C.teal}` : "none",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c.isAdminReply ? C.teal : C.gray700, marginBottom: 4 }}>
                      {c.author?.name || "User"}{c.isAdminReply ? " · Admin" : ""} · {timeAgo(c.createdAt)}
                    </div>
                    <div style={{ fontSize: 13, color: C.text }}>{c.body}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a comment…"
                style={{
                  flex: 1, border: `1.5px solid ${C.gray100}`, borderRadius: 10,
                  padding: "9px 12px", fontSize: 13, fontFamily: "Plus Jakarta Sans",
                  color: C.text, outline: "none", background: C.gray50,
                }}
              />
              <Btn small onClick={handleAddComment} loading={commentLoading}>Send</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Vendor Assign Modal (admin) ───────────────────────────────────── */}
      <Modal open={showVendor} onClose={() => { setShowVendor(false); setVendorForm(EMPTY_VENDOR); }} title="Assign to Vendor">
        <Input label="Vendor Name *"  value={vendorForm.name}  onChange={setV("name")}  placeholder="e.g. SpeedLift Services" />
        <Input label="Vendor Phone *" value={vendorForm.phone} onChange={setV("phone")} placeholder="+91 99887 76655" type="tel" />
        <Input label="Note"           value={vendorForm.note}  onChange={setV("note")}  placeholder="Visit scheduled for Friday 10 AM" multiline />
        <Btn onClick={handleAssignVendor} loading={vendorLoading} style={{ width: "100%" }}>
          Assign Vendor
        </Btn>
      </Modal>

      {/* ── New Issue Modal ───────────────────────────────────────────────── */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setPhotoFiles([]); setPhotoPreviews([]); setForm(EMPTY_FORM); }} title="Report an Issue">
        <Input label="Issue Title *" value={form.title}       onChange={setF("title")}       placeholder="e.g. Lift not working in Block A" />
        <Input label="Description"   value={form.description} onChange={setF("description")} placeholder="Describe the issue in detail…" multiline />
        <Select label="Category"     value={form.category}    onChange={setF("category")}    options={ISSUE_CATEGORIES} />
        <Select label="Priority"     value={form.priority}    onChange={setF("priority")}    options={PRIORITIES} />

        {/* Anonymous toggle */}
        <Toggle
          value={form.isAnonymous}
          onChange={(v) => setForm((p) => ({ ...p, isAnonymous: v }))}
          label="Submit anonymously"
        />

        {/* Photo picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 6 }}>
            Photos (optional, max 5)
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {photoPreviews.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={src} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover" }} />
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    background: C.red, color: "#fff", border: "none",
                    borderRadius: "50%", width: 18, height: 18,
                    cursor: "pointer", fontSize: 12, lineHeight: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >×</button>
              </div>
            ))}
            {photoPreviews.length < 5 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                style={{
                  width: 60, height: 60, borderRadius: 10, flexShrink: 0,
                  border: `2px dashed ${C.gray300}`, background: C.gray50,
                  cursor: "pointer", fontSize: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.gray500,
                }}
              >📷</button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            style={{ display: "none" }}
          />
        </div>

        <Btn onClick={handleCreate} loading={submitting} style={{ width: "100%" }}>
          Submit Issue
        </Btn>
      </Modal>
    </div>
  );
};
