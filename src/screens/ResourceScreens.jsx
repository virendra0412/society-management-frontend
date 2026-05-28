import { useState, useEffect, useCallback } from "react";
import { helpApi, noticesApi, pollsApi, contactsApi } from "../api/resources.api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Card, Badge, Tag, Avatar, Modal, Input, Select, Btn,
  EmptyState, ErrorState, PageHeader, Spinner,
} from "../components/ui";
import {
  C, PRIORITY_COLOR, HELP_CAT_ICON, HELP_CATEGORIES,
  NOTICE_TAG_COLOR, NOTICE_TAG_ICON, NOTICE_TAGS,
  CONTACT_GROUPS,
} from "../constants/theme";
import { timeAgo } from "../utils/timeago";

// ─── Help Screen ─────────────────────────────────────────────────────────────
export const HelpScreen = () => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [posts,        setPosts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [catFilter,    setCatFilter]    = useState("All");
  const [showNew,      setShowNew]      = useState(false);
  const [form,         setForm]         = useState({ title: "", description: "", category: "Plumber" });
  const [submitting,   setSubmitting]   = useState(false);
  // Detail view
  const [detailPost,   setDetailPost]   = useState(null);
  const [detailLoad,   setDetailLoad]   = useState(false);
  const [replyBody,    setReplyBody]    = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyIsVendor, setReplyIsVendor] = useState(false);  // vendor contact toggle
  const [replyVendorPhone, setReplyVendorPhone] = useState(""); // vendor phone
  const [upvoting,     setUpvoting]     = useState({});   // replyId → bool
  const [closing,      setClosing]      = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { sort: "-createdAt", limit: 50 };
      if (catFilter !== "All") params.category = catFilter;
      const res = await helpApi.getAll(params);
      setPosts(res.data?.posts || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load help posts.");
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Open detail — fetch full post with all replies
  const openDetail = async (post) => {
    setDetailPost(post);
    setDetailLoad(true);
    setReplyBody("");
    try {
      const res = await helpApi.getOne(post._id);
      setDetailPost(res.data?.post);
    } catch { /* keep list version */ }
    finally { setDetailLoad(false); }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error("Title is required.");
    setSubmitting(true);
    try {
      const res = await helpApi.create(form);
      setPosts((p) => [res.data.post, ...p]);
      setForm({ title: "", description: "", category: "Plumber" });
      setShowNew(false);
      toast.success("Help request posted.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !detailPost) return;
    if (replyIsVendor && !replyVendorPhone.trim()) return toast.error("Enter a vendor phone number.");
    setReplyLoading(true);
    try {
      const payload = { body: replyBody.trim() };
      if (replyIsVendor) {
        payload.isVendorContact = true;
        payload.vendorPhone = replyVendorPhone.trim();
      }
      const res = await helpApi.addReply(detailPost._id, payload);
      setDetailPost((p) => ({ ...p, replies: res.data.replies }));
      setReplyBody("");
      setReplyIsVendor(false);
      setReplyVendorPhone("");
      fetchPosts();
      toast.success("Reply posted.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to reply.");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleUpvote = async (replyId) => {
    if (!detailPost || upvoting[replyId]) return;
    setUpvoting((u) => ({ ...u, [replyId]: true }));
    try {
      await helpApi.upvoteReply(detailPost._id, replyId);
      // Patch upvotes array locally — toggle current user in/out
      setDetailPost((prev) => {
        if (!prev) return prev;
        const updatedReplies = prev.replies.map((r) => {
          if (r._id !== replyId) return r;
          const uid = user._id;
          const alreadyVoted = r.upvotes?.some(
            (id) => (id?._id || id)?.toString() === uid?.toString()
          );
          const newUpvotes = alreadyVoted
            ? r.upvotes.filter((id) => (id?._id || id)?.toString() !== uid?.toString())
            : [...(r.upvotes || []), uid];
          return { ...r, upvotes: newUpvotes };
        });
        return { ...prev, replies: updatedReplies };
      });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setUpvoting((u) => ({ ...u, [replyId]: false }));
    }
  };

  const handleClose = async () => {
    if (!detailPost) return;
    setClosing(true);
    try {
      await helpApi.closePost(detailPost._id);
      setDetailPost((p) => ({ ...p, isClosed: true }));
      setPosts((p) => p.map((h) => h._id === detailPost._id ? { ...h, isClosed: true } : h));
      toast.success("Help post closed.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setClosing(false);
    }
  };

  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const ALL_CATS = ["All", ...HELP_CATEGORIES];

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Community Help"
        action={<Btn small variant="amber" onClick={() => setShowNew(true)}>+ Ask</Btn>}
      />

      {/* Category filter */}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 16px 12px" }}>
        {ALL_CATS.map((c) => (
          <div key={c} onClick={() => setCatFilter(c)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, cursor: "pointer" }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, fontSize: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: catFilter === c ? C.amber + "30" : C.amber + "15",
              border: catFilter === c ? `2px solid ${C.amber}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              {c === "All" ? "🔍" : HELP_CAT_ICON[c]}
            </div>
            <span style={{ fontSize: 10, color: catFilter === c ? C.amber : C.gray500, fontWeight: 600 }}>{c}</span>
          </div>
        ))}
      </div>

      {/* Post list */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading  && [1,2,3].map((k) => <div key={k} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        {error    && <ErrorState message={error} onRetry={fetchPosts} />}
        {!loading && !error && posts.length === 0 && <EmptyState icon="🤝" message="No help posts yet. Be the first to ask!" />}
        {!loading && !error && posts.map((h) => (
          <Card key={h._id} onClick={() => openDetail(h)}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.amber + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {HELP_CAT_ICON[h.category] || "🤝"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, flex: 1, lineHeight: 1.3 }}>{h.title}</div>
                  {h.isClosed && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.gray500, background: C.gray100, borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>
                      Closed
                    </span>
                  )}
                </div>
                {h.description && (
                  <div style={{ fontSize: 12, color: C.gray500, marginBottom: 6 }}>{h.description.slice(0, 72)}…</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar name={h.author?.name || "U"} size={20} color={C.purple} />
                    <span style={{ fontSize: 11, color: C.gray500 }}>
                      {h.flat || h.author?.flat} · {timeAgo(h.createdAt)}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: C.teal, fontWeight: 600 }}>
                    💬 {h.replyCount ?? h.replies?.length ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Detail modal (all replies + upvote + close + vendor contact) ──── */}
      <Modal
        open={!!detailPost}
        onClose={() => { setDetailPost(null); setReplyBody(""); setReplyIsVendor(false); setReplyVendorPhone(""); }}
        title="Help Post"
      >
        {detailPost && (
          <div>
            {/* Post header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.amber + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {HELP_CAT_ICON[detailPost.category] || "🤝"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, lineHeight: 1.3, marginBottom: 3 }}>
                  {detailPost.title}
                </div>
                <div style={{ fontSize: 12, color: C.gray500 }}>
                  {detailPost.flat || detailPost.author?.flat} · {timeAgo(detailPost.createdAt)}
                  {detailPost.isClosed && (
                    <span style={{ marginLeft: 8, background: C.gray100, color: C.gray500, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                      Closed
                    </span>
                  )}
                </div>
              </div>
            </div>

            {detailPost.description && (
              <div style={{ background: C.gray50, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: C.gray700, lineHeight: 1.6 }}>{detailPost.description}</p>
              </div>
            )}

            {/* Close post — author or admin, if not already closed */}
            {!detailPost.isClosed && (detailPost.author?._id === user?._id || isAdmin) && (
              <Btn small variant="ghost" loading={closing} onClick={handleClose} style={{ width: "100%", marginBottom: 14 }}>
                ✓ Mark as Resolved / Close Post
              </Btn>
            )}

            {/* Replies */}
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, marginBottom: 10 }}>
              {detailLoad ? "Loading replies…" : `Replies (${detailPost.replies?.length ?? 0})`}
            </div>

            {detailLoad && (
              <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                <Spinner />
              </div>
            )}

            {!detailLoad && (detailPost.replies || []).length === 0 && (
              <div style={{ fontSize: 13, color: C.gray500, textAlign: "center", padding: "12px 0" }}>
                No replies yet. Be the first!
              </div>
            )}

            {!detailLoad && (detailPost.replies || []).map((r) => {
              const upvoteCount = r.upvotes?.length ?? 0;
              const isBusy      = !!upvoting[r._id];
              const iVoted      = r.upvotes?.some(
                (id) => (id?._id || id)?.toString() === user?._id?.toString()
              );
              return (
                <div key={r._id} style={{
                  background: C.gray50, borderRadius: 12,
                  padding: "10px 14px", marginBottom: 10,
                }}>
                  {/* Reply meta + upvote */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={r.author?.name || "U"} size={26} color={C.teal} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray700 }}>
                          {r.author?.name || "User"}
                        </div>
                        <div style={{ fontSize: 10, color: C.gray300 }}>{timeAgo(r.createdAt)}</div>
                      </div>
                    </div>
                    {/* Upvote button — teal when current user has voted */}
                    <button
                      onClick={() => handleUpvote(r._id)}
                      disabled={isBusy}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: iVoted ? C.teal + "15" : C.gray100,
                        border: `1.5px solid ${iVoted ? C.teal : C.gray100}`,
                        borderRadius: 8, padding: "4px 10px",
                        cursor: isBusy ? "default" : "pointer",
                        fontSize: 12, fontWeight: 700,
                        color: iVoted ? C.teal : C.gray500,
                        transition: "all 0.15s",
                      }}
                    >
                      {isBusy ? <Spinner size={10} /> : "▲"}{" "}{upvoteCount}
                    </button>
                  </div>

                  {/* Reply body */}
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{r.body}</div>

                  {/* Vendor contact tap-to-call */}
                  {r.isVendorContact && r.vendorPhone && (
                    <a
                      href={`tel:${r.vendorPhone}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        marginTop: 8, background: C.green + "15", color: C.green,
                        borderRadius: 8, padding: "5px 12px",
                        fontSize: 12, fontWeight: 700, textDecoration: "none",
                      }}
                    >
                      📞 {r.vendorPhone}
                    </a>
                  )}
                </div>
              );
            })}

            {/* Reply input (only if post not closed) */}
            {!detailPost.isClosed && (
              <div style={{ marginTop: 4 }}>
                {/* Vendor contact toggle */}
                <button
                  onClick={() => { setReplyIsVendor((v) => !v); setReplyVendorPhone(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: replyIsVendor ? C.green + "15" : C.gray100,
                    border: `1px solid ${replyIsVendor ? C.green + "40" : C.gray100}`,
                    borderRadius: 8, padding: "5px 12px",
                    fontSize: 11, fontWeight: 700,
                    color: replyIsVendor ? C.green : C.gray500,
                    cursor: "pointer", marginBottom: 8, transition: "all 0.15s",
                  }}
                >
                  📞 {replyIsVendor ? "Vendor contact (on)" : "Add vendor contact?"}
                </button>

                {/* Vendor phone field — shown when toggle is on */}
                {replyIsVendor && (
                  <input
                    value={replyVendorPhone}
                    onChange={(e) => setReplyVendorPhone(e.target.value)}
                    placeholder="Vendor phone number (e.g. 9876543210)"
                    type="tel"
                    style={{
                      width: "100%", border: `1.5px solid ${C.green}40`, borderRadius: 10,
                      padding: "9px 12px", fontSize: 13, fontFamily: "Plus Jakarta Sans",
                      color: C.text, outline: "none", background: C.green + "08",
                      boxSizing: "border-box", marginBottom: 8,
                    }}
                  />
                )}

                {/* Reply text + send */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                    placeholder={replyIsVendor ? "Describe this vendor…" : "Write a reply…"}
                    style={{
                      flex: 1, border: `1.5px solid ${C.gray100}`, borderRadius: 10,
                      padding: "9px 12px", fontSize: 13, fontFamily: "Plus Jakarta Sans",
                      color: C.text, outline: "none", background: C.gray50,
                    }}
                  />
                  <Btn small loading={replyLoading} onClick={handleReply}>Reply</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New help post modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Ask for Help">
        <Input label="What do you need? *" value={form.title}       onChange={setF("title")}       placeholder="e.g. Need a good plumber urgently" />
        <Input label="More details"         value={form.description} onChange={setF("description")} placeholder="Describe your requirement…" multiline />
        <Select label="Category"            value={form.category}    onChange={setF("category")}    options={HELP_CATEGORIES} />
        <Btn onClick={handleCreate} loading={submitting} variant="amber" style={{ width: "100%" }}>Post Request</Btn>
      </Modal>
    </div>
  );
};

// ─── Notices Screen ───────────────────────────────────────────────────────────
export const NoticesScreen = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [notices,    setNotices]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showNew,    setShowNew]    = useState(false);
  const [form,       setForm]       = useState({ title: "", body: "", tag: "Notice" });
  const [submitting, setSubmitting] = useState(false);
  const [pinBusy,    setPinBusy]    = useState({}); // noticeId → bool
  const [delBusy,    setDelBusy]    = useState({}); // noticeId → bool

  const fetchNotices = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await noticesApi.getAll({ limit: 30 });
      setNotices(res.data?.notices || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const handlePost = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and message are required.");
    setSubmitting(true);
    try {
      const res = await noticesApi.create(form);
      setNotices((p) => [res.data.notice, ...p]);
      setForm({ title: "", body: "", tag: "Notice" });
      setShowNew(false);
      toast.success("Notice posted.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to post notice.");
    } finally {
      setSubmitting(false);
    }
  };

  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleTogglePin = async (notice) => {
    if (pinBusy[notice._id]) return;
    setPinBusy((p) => ({ ...p, [notice._id]: true }));
    try {
      const next = !notice.isPinned;
      await noticesApi.setPinned(notice._id, next);
      setNotices((list) => {
        const updated = list.map((n) => n._id === notice._id ? { ...n, isPinned: next } : n);
        return [...updated.filter((n) => n.isPinned), ...updated.filter((n) => !n.isPinned)];
      });
      toast.success(next ? "Notice pinned." : "Notice unpinned.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update pin.");
    } finally {
      setPinBusy((p) => ({ ...p, [notice._id]: false }));
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (delBusy[noticeId]) return;
    setDelBusy((d) => ({ ...d, [noticeId]: true }));
    try {
      await noticesApi.remove(noticeId);
      setNotices((list) => list.filter((n) => n._id !== noticeId));
      toast.success("Notice deleted.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete notice.");
    } finally {
      setDelBusy((d) => ({ ...d, [noticeId]: false }));
    }
  };

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Notices"
        action={isAdmin && <Btn small onClick={() => setShowNew(true)}>+ Post</Btn>}
      />
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && [1,2,3].map((k) => <div key={k} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        {error   && <ErrorState message={error} onRetry={fetchNotices} />}
        {!loading && !error && notices.length === 0 && <EmptyState icon="📢" message="No notices posted yet." />}
        {!loading && !error && notices.map((notice) => {
          const tagColor = NOTICE_TAG_COLOR[notice.tag] || C.teal;
          const icon     = NOTICE_TAG_ICON[notice.tag]  || "📋";
          return (
            <Card key={notice._id}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Icon with optional pin dot */}
                <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: tagColor + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    {icon}
                  </div>
                  {notice.isPinned && (
                    <div style={{
                      position: "absolute", top: -4, right: -4,
                      width: 16, height: 16, borderRadius: "50%",
                      background: C.amber, border: "2px solid #fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8,
                    }}>📌</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3, flex: 1 }}>
                      {notice.isPinned && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.amber, background: C.amber + "18", borderRadius: 4, padding: "1px 6px", marginRight: 6 }}>
                          PINNED
                        </span>
                      )}
                      {notice.title}
                    </div>
                    <Tag label={notice.tag} color={tagColor} />
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: C.gray500, lineHeight: 1.5 }}>{notice.body}</p>
                  <div style={{ fontSize: 11, color: C.gray300, marginBottom: isAdmin ? 8 : 0 }}>
                    Posted by {notice.postedBy?.name || "Admin"} · {timeAgo(notice.createdAt)}
                  </div>
                  {/* Admin actions */}
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => handleTogglePin(notice)}
                        disabled={!!pinBusy[notice._id]}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          background: notice.isPinned ? C.amber + "20" : C.gray100,
                          border: `1px solid ${notice.isPinned ? C.amber + "50" : C.gray100}`,
                          borderRadius: 7, padding: "4px 10px",
                          fontSize: 11, fontWeight: 700,
                          color: notice.isPinned ? C.amber : C.gray600,
                          cursor: pinBusy[notice._id] ? "not-allowed" : "pointer",
                        }}
                      >
                        {pinBusy[notice._id] ? <Spinner size={10} /> : "📌"}{" "}
                        {notice.isPinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(notice._id)}
                        disabled={!!delBusy[notice._id]}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          background: C.red + "10",
                          border: `1px solid ${C.red}25`,
                          borderRadius: 7, padding: "4px 10px",
                          fontSize: 11, fontWeight: 700, color: C.red,
                          cursor: delBusy[notice._id] ? "not-allowed" : "pointer",
                        }}
                      >
                        {delBusy[notice._id] ? <Spinner size={10} /> : "🗑"} Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Post a Notice">
        <Input label="Title *"   value={form.title} onChange={setF("title")} placeholder="e.g. Water shutdown on Thursday" />
        <Input label="Message *" value={form.body}  onChange={setF("body")}  placeholder="Full notice details…" multiline />
        <Select label="Tag" value={form.tag} onChange={setF("tag")} options={NOTICE_TAGS} />
        <Btn onClick={handlePost} loading={submitting} style={{ width: "100%" }}>Post Notice</Btn>
      </Modal>
    </div>
  );
};

// ─── Contacts Screen ──────────────────────────────────────────────────────────
export const ContactsScreen = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [grouped,    setGrouped]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showNew,    setShowNew]    = useState(false);
  const [editTarget, setEditTarget] = useState(null); // contact being edited, or null for add
  const [form,       setForm]       = useState({ name: "", phone: "", group: "Emergency", designation: "", icon: "📞" });
  const [submitting, setSubmitting] = useState(false);
  const [delBusy,    setDelBusy]    = useState({}); // contactId → bool

  const GROUP_COLORS = { Emergency: C.red, Committee: C.navy, Vendor: C.amber, Other: C.teal };

  const fetchContacts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await contactsApi.getAll();
      setGrouped(res.data?.contacts || {});
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", phone: "", group: "Emergency", designation: "", icon: "📞" });
    setShowNew(true);
  };

  const openEdit = (contact) => {
    setEditTarget(contact);
    setForm({
      name:        contact.name        || "",
      phone:       contact.phone       || "",
      group:       contact.group       || "Emergency",
      designation: contact.designation || "",
      icon:        contact.icon        || "📞",
    });
    setShowNew(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required.");
    setSubmitting(true);
    try {
      if (editTarget) {
        const res = await contactsApi.update(editTarget._id, form);
        // Patch updated contact directly in grouped state — no flicker refetch
        const updated = res.data?.contact;
        if (updated) {
          setGrouped((prev) => {
            const next = {};
            Object.entries(prev).forEach(([grp, items]) => {
              next[grp] = items.map((c) => c._id === updated._id ? updated : c);
            });
            // If group changed, rebuild fully via refetch
            if (updated.group !== editTarget.group) {
              fetchContacts();
              return prev;
            }
            return next;
          });
        } else {
          fetchContacts();
        }
        toast.success("Contact updated.");
      } else {
        await contactsApi.create(form);
        toast.success("Contact added.");
        fetchContacts();
      }
      setShowNew(false);
      setEditTarget(null);
      setForm({ name: "", phone: "", group: "Emergency", designation: "", icon: "📞" });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save contact.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (delBusy[contactId]) return;
    setDelBusy((d) => ({ ...d, [contactId]: true }));
    try {
      await contactsApi.remove(contactId);
      // Remove from local grouped state immediately — no refetch delay
      setGrouped((prev) => {
        const next = {};
        Object.entries(prev).forEach(([grp, items]) => {
          const filtered = items.filter((c) => c._id !== contactId);
          if (filtered.length) next[grp] = filtered;
        });
        return next;
      });
      toast.success("Contact deleted.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete contact.");
    } finally {
      setDelBusy((d) => ({ ...d, [contactId]: false }));
    }
  };

  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Contacts"
        action={isAdmin && <Btn small onClick={openAdd}>+ Add</Btn>}
      />
      {loading && <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[1,2,3].map((k) => <div key={k} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}
      </div>}
      {error   && <ErrorState message={error} onRetry={fetchContacts} />}
      {!loading && !error && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.keys(grouped).length === 0 && <EmptyState icon="📞" message="No contacts added yet." />}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {group}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((c) => {
                  const color = GROUP_COLORS[c.group] || C.teal;
                  return (
                    <Card key={c._id} style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 11, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                          {c.icon || "📞"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: C.gray500, marginTop: 1 }}>
                            {c.designation ? `${c.designation} · ` : ""}📞 {c.phone}
                          </div>
                        </div>
                        {isAdmin ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              onClick={() => openEdit(c)}
                              style={{
                                background: C.teal + "15", border: `1px solid ${C.teal}30`,
                                borderRadius: 8, padding: "6px 10px",
                                fontSize: 13, color: C.teal, cursor: "pointer",
                              }}
                              title="Edit contact"
                            >✏️</button>
                            <button
                              onClick={() => handleDeleteContact(c._id)}
                              disabled={!!delBusy[c._id]}
                              style={{
                                background: C.red + "12", border: `1px solid ${C.red}25`,
                                borderRadius: 8, padding: "6px 10px",
                                fontSize: 13, color: C.red,
                                cursor: delBusy[c._id] ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center",
                              }}
                              title="Delete contact"
                            >
                              {delBusy[c._id] ? <Spinner size={10} /> : "🗑"}
                            </button>
                            <a href={`tel:${c.phone}`} style={{ width: 36, height: 36, borderRadius: 10, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16, flexShrink: 0 }}>
                              📞
                            </a>
                          </div>
                        ) : (
                          <a href={`tel:${c.phone}`} style={{ width: 36, height: 36, borderRadius: 10, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 16, flexShrink: 0 }}>
                            📞
                          </a>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => { setShowNew(false); setEditTarget(null); }} title={editTarget ? "Edit Contact" : "Add Contact"}>
        <Input label="Name *"        value={form.name}        onChange={setF("name")}        placeholder="Raju Electrician" />
        <Input label="Phone *"       value={form.phone}       onChange={setF("phone")}       placeholder="9876543210" />
        <Input label="Designation"   value={form.designation} onChange={setF("designation")} placeholder="Committee Treasurer" />
        <Input label="Icon (emoji)"  value={form.icon}        onChange={setF("icon")}        placeholder="⚡" />
        <Select label="Group" value={form.group} onChange={setF("group")} options={CONTACT_GROUPS} />
        <Btn onClick={handleSave} loading={submitting} style={{ width: "100%" }}>{editTarget ? "Save Changes" : "Add Contact"}</Btn>
      </Modal>
    </div>
  );
};

// ─── Polls Screen ─────────────────────────────────────────────────────────────
export const PollsScreen = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [polls,      setPolls]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showNew,    setShowNew]    = useState(false);
  const [voting,     setVoting]     = useState({}); // pollId → true when voting in progress
  const [closeBusy,  setCloseBusy]  = useState({}); // pollId → true when closing
  const [form,       setForm]       = useState({ question: "", options: [{ label: "" }, { label: "" }], closesAt: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchPolls = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await pollsApi.getAll();
      setPolls(res.data?.polls || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load polls.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolls(); }, [fetchPolls]);

  const handleVote = async (pollId, optionId) => {
    if (voting[pollId]) return;
    setVoting((v) => ({ ...v, [pollId]: true }));
    try {
      const res = await pollsApi.vote(pollId, optionId);
      setPolls((p) => p.map((poll) => poll._id === pollId ? res.data.poll : poll));
      toast.success("Vote recorded!");
    } catch (e) {
      const code = e.response?.data?.code;
      if (code === "ALREADY_VOTED") toast.warning("You've already voted in this poll.");
      else toast.error(e.response?.data?.message || "Voting failed.");
    } finally {
      setVoting((v) => ({ ...v, [pollId]: false }));
    }
  };

  const handleClosePoll = async (pollId) => {
    if (closeBusy[pollId]) return;
    setCloseBusy((b) => ({ ...b, [pollId]: true }));
    try {
      await pollsApi.closePoll(pollId);
      setPolls((p) => p.map((poll) => poll._id === pollId ? { ...poll, isClosed: true } : poll));
      toast.success("Poll closed.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to close poll.");
    } finally {
      setCloseBusy((b) => ({ ...b, [pollId]: false }));
    }
  };

  const handleCreatePoll = async () => {
    if (!form.question.trim()) return toast.error("Question is required.");
    const opts = form.options.filter((o) => o.label.trim());
    if (opts.length < 2) return toast.error("At least 2 options are required.");
    setSubmitting(true);
    try {
      const payload = { question: form.question, options: opts };
      if (form.closesAt) payload.closesAt = form.closesAt;
      const res = await pollsApi.create(payload);
      setPolls((p) => [res.data.poll, ...p]);
      setForm({ question: "", options: [{ label: "" }, { label: "" }], closesAt: "" });
      setShowNew(false);
      toast.success("Poll created.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create poll.");
    } finally {
      setSubmitting(false);
    }
  };

  const addOption    = () => setForm((f) => ({ ...f, options: [...f.options, { label: "" }] }));
  const setOption    = (i, val) => setForm((f) => { const o = [...f.options]; o[i] = { label: val }; return { ...f, options: o }; });
  const removeOption = (i) => setForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }));

  return (
    <div className="screen-enter" style={{ paddingBottom: 24 }}>
      <PageHeader
        title="Polls & Voting"
        action={isAdmin && <Btn small onClick={() => setShowNew(true)}>+ Create</Btn>}
      />
      {loading && [1,2].map((k) => <div key={k} className="skeleton" style={{ height: 160, borderRadius: 14, margin: "0 16px 10px" }} />)}
      {error   && <ErrorState message={error} onRetry={fetchPolls} />}
      {!loading && !error && polls.length === 0 && <EmptyState icon="🗳️" message="No polls yet." />}

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {!loading && !error && polls.map((poll) => {
          const max     = Math.max(...poll.options.map((o) => o.votes), 0);
          const isVoting = !!voting[poll._id];
          return (
            <Card key={poll._id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, flex: 1, marginRight: 8, lineHeight: 1.4 }}>
                  {poll.question}
                </div>
                {poll.isClosed && <Tag label="Closed" color={C.gray500} />}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {poll.options.map((opt) => {
                  const pct      = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                  const isWinner = opt.votes === max && poll.totalVotes > 0;
                  const canVote  = !poll.isClosed && !isVoting;

                  return (
                    <div key={opt._id}
                      onClick={() => canVote && handleVote(poll._id, opt._id)}
                      style={{
                        borderRadius: 10, overflow: "hidden",
                        cursor: canVote ? "pointer" : "default",
                        border: `1.5px solid ${isWinner && poll.totalVotes > 0 ? C.teal : C.gray100}`,
                        position: "relative", transition: "all 0.15s",
                      }}
                    >
                      {/* Vote bar */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, bottom: 0,
                        width: `${pct}%`,
                        background: isWinner ? C.teal + "18" : C.gray50,
                        transition: "width 0.5s ease",
                      }} />
                      <div style={{ position: "relative", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: isWinner ? 700 : 500, color: isWinner ? C.teal : C.text }}>
                          {opt.label}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {poll.totalVotes > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: isWinner ? C.teal : C.gray500 }}>{pct}%</span>
                          )}
                          {isVoting && <Spinner size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 }}>
                <div style={{ fontSize: 11, color: C.gray500 }}>
                  {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""} ·{" "}
                  {poll.isClosed ? "Poll closed" : "Tap an option to vote"}
                  {poll.closesAt && !poll.isClosed && ` · Closes ${timeAgo(poll.closesAt)}`}
                </div>
                {isAdmin && !poll.isClosed && (
                  <button
                    onClick={() => handleClosePoll(poll._id)}
                    disabled={!!closeBusy[poll._id]}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                      background: C.gray100, border: `1px solid ${C.gray100}`,
                      borderRadius: 7, padding: "4px 10px",
                      fontSize: 11, fontWeight: 700, color: C.gray600,
                      cursor: closeBusy[poll._id] ? "not-allowed" : "pointer",
                    }}
                  >
                    {closeBusy[poll._id] ? <Spinner size={10} /> : "🔒"}{" "}Close Poll
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create poll modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create a Poll">
        <Input
          label="Question *"
          value={form.question}
          onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          placeholder="e.g. Should we add CCTV in parking?"
        />
        <div style={{ fontSize: 12, fontWeight: 600, color: C.gray700, marginBottom: 8 }}>Options (min 2)</div>
        {form.options.map((opt, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={opt.label}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              style={{ flex: 1, border: `1.5px solid ${C.gray100}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: "Plus Jakarta Sans", color: C.text, outline: "none", background: C.gray50 }}
            />
            {form.options.length > 2 && (
              <button onClick={() => removeOption(i)} style={{ background: C.red + "18", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer", color: C.red, fontSize: 18 }}>×</button>
            )}
          </div>
        ))}
        {form.options.length < 6 && (
          <button onClick={addOption} style={{ fontSize: 13, color: C.teal, background: "none", border: `1px dashed ${C.teal}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "Plus Jakarta Sans", fontWeight: 600, width: "100%", marginBottom: 14 }}>
            + Add option
          </button>
        )}
        <Input
          label="Closing date (optional)"
          type="datetime-local"
          value={form.closesAt}
          onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value }))}
        />
        <Btn onClick={handleCreatePoll} loading={submitting} style={{ width: "100%" }}>Create Poll</Btn>
      </Modal>
    </div>
  );
};
