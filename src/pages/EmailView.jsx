import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getEmailById,
  getMailboxStats,
  toggleStar,
  toggleRead,
  moveToTrash,
  restoreFromTrash,
  deletePermanently,
  cancelScheduledEmail,
} from "../services/emailService";
import { useAuth } from "../context/AuthContext";
import { useEmailCompose } from "../context/EmailComposeContext";
import SnoozeEmailModal from "../components/SnoozeEmailModal";
import API_URL from "../config/axios.util";
import "./EmailView.css";

function EmailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromFolder = location.state?.fromFolder || "inbox";

  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    inbox: { total: 0, unread: 0 },
    sent: 0,
    drafts: 0,
    starred: 0,
    trash: 0,
    scheduled: 0,
  });

  // Compose Modal (for Reply / Forward)
  const { openCompose } = useEmailCompose();
  const { user: authUser } = useAuth();

  const currentUserEmail = useMemo(() => {
    if (authUser?.email) return authUser.email.toLowerCase();
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return (u?.email || "").toLowerCase();
    } catch {
      return "";
    }
  }, [authUser]);

  const isSender = useMemo(() => {
    if (!email) return false;
    if (fromFolder === "sent") return true;
    if (
      currentUserEmail &&
      email.sender_email &&
      email.sender_email.toLowerCase() === currentUserEmail
    ) {
      return true;
    }
    if (authUser?.id && email.sender_id && String(email.sender_id) === String(authUser.id)) {
      return true;
    }
    return false;
  }, [email, fromFolder, currentUserEmail, authUser]);

  // Toast Banner
  const [toastMessage, setToastMessage] = useState("");
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeAnchorRect, setSnoozeAnchorRect] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Load email details
  const loadEmailData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const res = await getEmailById(id);
      if (res.success && res.email) {
        setEmail(res.email);
        // Automatically mark as read if not already
        if (!res.email.is_read) {
          try {
            await toggleRead(id, true);
          } catch (e) {
            console.warn("Could not mark as read:", e);
          }
        }
      } else {
        setError(res.message || "Email not found");
      }
    } catch (err) {
      console.error("Load email error:", err);
      setError("Failed to load email details. It may have been deleted.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res = await getMailboxStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (e) {
      console.warn("Stats load error:", e);
    }
  }, []);

  useEffect(() => {
    loadEmailData();
    loadStats();
  }, [loadEmailData, loadStats]);

  // Navigate to folder
  const handleFolderSelect = (folderKey) => {
    navigate("/emails", { state: { folder: folderKey } });
  };

  // Toggle Star
  const handleToggleStar = async () => {
    if (!email) return;
    try {
      await toggleStar(email.id);
      setEmail((prev) => ({ ...prev, is_starred: !prev.is_starred }));
      showToast(email.is_starred ? "Removed from Starred." : "Added to Starred.");
      loadStats();
    } catch (err) {
      console.error("Toggle star error:", err);
    }
  };

  // Toggle Read / Unread
  const handleToggleRead = async () => {
    if (!email) return;
    try {
      await toggleRead(email.id, false);
      showToast("Marked as unread.");
      navigate("/emails", { state: { folder: fromFolder } });
    } catch (err) {
      console.error("Toggle read error:", err);
    }
  };

  // Move to Trash
  const handleMoveToTrash = async () => {
    if (!email) return;
    try {
      await moveToTrash(email.id);
      showToast("Email moved to trash.");
      navigate("/emails", { state: { folder: fromFolder } });
    } catch (err) {
      console.error("Move to trash error:", err);
    }
  };

  // Restore from Trash
  const handleRestore = async () => {
    if (!email) return;
    try {
      await restoreFromTrash(email.id);
      showToast("Email restored to Inbox.");
      navigate("/emails", { state: { folder: "inbox" } });
    } catch (err) {
      console.error("Restore error:", err);
    }
  };

  // Delete Permanently
  const handleDeletePermanently = async () => {
    if (!email) return;
    if (!window.confirm("Are you sure you want to permanently delete this email? This cannot be undone.")) {
      return;
    }
    try {
      await deletePermanently(email.id);
      showToast("Email permanently deleted.");
      navigate("/emails", { state: { folder: "trash" } });
    } catch (err) {
      console.error("Delete permanently error:", err);
    }
  };

  // Cancel Scheduled Send
  const handleCancelSchedule = async () => {
    if (!email) return;
    try {
      const res = await cancelScheduledEmail(email.id);
      if (res.success) {
        showToast("Scheduled email cancelled and reverted to Draft.");
        const recipientsList = email.recipients || [];
        const toRecipients = recipientsList
          .filter((r) => r.type === "to")
          .map((r) => r.email);
        const ccRecipients = recipientsList
          .filter((r) => r.type === "cc")
          .map((r) => r.email);
        const bccRecipients = recipientsList
          .filter((r) => r.type === "bcc")
          .map((r) => r.email);

        openCompose({
          draftId: email.id,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject: email.subject,
          bodyHtml: email.body_html,
          bodyText: email.body_text,
        });
        navigate("/emails", { state: { folder: "scheduled" } });
      }
    } catch (err) {
      console.error("Cancel schedule error:", err);
      showToast("Failed to cancel scheduled email.");
    }
  };

  // Snooze handler
  const handleSnooze = async (id, targetIsoString) => {
    try {
      await snoozeEmail(id, targetIsoString);
      const dateStr = new Date(targetIsoString).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      showToast(`Email snoozed until ${dateStr} 🕒`);
      setTimeout(() => {
        navigate("/emails", { state: { folder: "snoozed" } });
      }, 600);
    } catch (err) {
      console.error("Snooze error:", err);
      showToast("Failed to snooze email.");
    }
  };

  // Unsnooze handler
  const handleUnsnooze = async (id) => {
    try {
      await unsnoozeEmail(id);
      showToast("Email unsnoozed and returned to Inbox. 📥");
      setEmail((prev) => (prev ? { ...prev, snoozed_until: null } : prev));
    } catch (err) {
      console.error("Unsnooze error:", err);
      showToast("Failed to unsnooze email.");
    }
  };

  // Reply handler
  const handleReply = () => {
    if (!email) return;
    const recipient = email.sender_email;
    const subjectPrefix = email.subject?.toLowerCase().startsWith("re:")
      ? email.subject
      : `Re: ${email.subject || ""}`;

    const quotedContent = `
      <br/><br/>
      <div style="border-left: 2px solid #cbd5e1; padding-left: 12px; margin-top: 16px; color: #64748b; font-size: 13px;">
        <p><strong>On ${new Date(email.created_at).toLocaleString()}, ${email.sender_name} &lt;${email.sender_email}&gt; wrote:</strong></p>
        ${email.body_html || `<p>${email.body_text || ""}</p>`}
      </div>
    `;

    openCompose({
      to: [recipient],
      cc: [],
      bcc: [],
      subject: subjectPrefix,
      bodyHtml: `<p></p>${quotedContent}`,
      bodyText: "",
    });
  };

  // Forward handler
  const handleForward = () => {
    if (!email) return;
    const subjectPrefix = email.subject?.toLowerCase().startsWith("fwd:")
      ? email.subject
      : `Fwd: ${email.subject || ""}`;

    const forwardHeader = `
      <br/><br/>
      <div style="border-left: 2px solid #ea580c; padding-left: 12px; margin-top: 16px; color: #475569; font-size: 13px;">
        <p><strong>---------- Forwarded message ---------</strong><br/>
        <strong>From:</strong> ${email.sender_name} &lt;${email.sender_email}&gt;<br/>
        <strong>Date:</strong> ${new Date(email.created_at).toLocaleString()}<br/>
        <strong>Subject:</strong> ${email.subject}<br/>
        <strong>To:</strong> ${(email.recipients || []).map((r) => r.recipient_email || r.email).join(", ")}</p>
        ${email.body_html || `<p>${email.body_text || ""}</p>`}
      </div>
    `;

    openCompose({
      to: [],
      cc: [],
      bcc: [],
      subject: subjectPrefix,
      bodyHtml: `<p></p>${forwardHeader}`,
      bodyText: "",
    });
  };


  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Open in-browser lightbox preview
  const handleViewAttachment = (att, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPreviewAttachment(att);
  };

  // Download attachment directly to user's computer
  const handleDownloadAttachment = async (att, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const token = localStorage.getItem("token");
    const fileUrl = `${API_URL}${att.file_path}`;

    try {
      const response = await fetch(fileUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = att.original_name || att.file_name || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.warn("Direct blob download failed, trying download route:", err);
      const downloadUrl = att.id
        ? `${API_URL}/emails/attachments/${att.id}/download?token=${encodeURIComponent(token || "")}`
        : fileUrl;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = att.original_name || att.file_name || "attachment";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getToRecipientChips = () => {
    if (!email || !email.recipients) return <span className="recipient-pill">me</span>;
    const toList = email.recipients.filter(
      (r) => (r.recipient_type || r.type || "to").toLowerCase() === "to"
    );
    if (toList.length === 0) {
      return <span className="recipient-pill">me</span>;
    }
    return toList.map((r, i) => {
      const emailStr = (r.recipient_email || r.email || "").toLowerCase();
      const isMe = currentUserEmail && emailStr === currentUserEmail;
      return (
        <span key={`to-${i}`} className="recipient-pill">
          {isMe ? "me" : (r.recipient_email || r.email)}
          {i < toList.length - 1 ? ", " : ""}
        </span>
      );
    });
  };

  const getCcRecipientChips = () => {
    if (!email || !email.recipients) return null;
    const ccList = email.recipients.filter(
      (r) => (r.recipient_type || r.type || "").toLowerCase() === "cc"
    );
    if (ccList.length === 0) return null;
    return ccList.map((r, i) => {
      const emailStr = r.recipient_email || r.email || "";
      return (
        <span key={`cc-${i}`} className="recipient-pill">
          {emailStr}
          {i < ccList.length - 1 ? ", " : ""}
        </span>
      );
    });
  };

  const getBccRecipientChips = () => {
    if (!email || !email.recipients) return null;
    const bccList = email.recipients.filter(
      (r) => (r.recipient_type || r.type || "").toLowerCase() === "bcc"
    );
    if (bccList.length === 0) return null;
    return bccList.map((r, i) => {
      const emailStr = r.recipient_email || r.email || "";
      return (
        <span key={`bcc-${i}`} className="recipient-pill">
          {emailStr}
          {i < bccList.length - 1 ? ", " : ""}
        </span>
      );
    });
  };

  return (
    <div className="email-view-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="gmail-toast-alert">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Mail Container Shell */}
      <div className="mail-app-shell">
        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="mail-sidebar">
          {/* Compose Button */}
          <div className="compose-btn-container">
            <button
              type="button"
              className="btn-pic1-compose"
              onClick={() => openCompose()}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>Compose</span>
            </button>
          </div>

          {/* Folder Navigation Menu */}
          <nav className="folder-nav-list">
            {/* Inbox */}
            <button
              type="button"
              className={`folder-item ${fromFolder === "inbox" ? "active" : ""}`}
              onClick={() => handleFolderSelect("inbox")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={fromFolder === "inbox" ? "#ea580c" : "#64748b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span className="folder-name">Inbox</span>
              </div>
              {(stats.inbox?.unread || 0) > 0 && (
                <span className={`folder-badge ${fromFolder === "inbox" ? "active-badge" : ""}`}>
                  {stats.inbox.unread}
                </span>
              )}
            </button>

            {/* Starred */}
            <button
              type="button"
              className={`folder-item ${fromFolder === "starred" ? "active" : ""}`}
              onClick={() => handleFolderSelect("starred")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={fromFolder === "starred" ? "#f97316" : "#f59e0b"}
                  stroke={fromFolder === "starred" ? "#f97316" : "#f59e0b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="folder-name">Starred</span>
              </div>
              {(stats.starred || 0) > 0 && (
                <span className={`folder-badge ${fromFolder === "starred" ? "active-badge" : ""}`}>
                  {stats.starred}
                </span>
              )}
            </button>

            {/* Sent */}
            <button
              type="button"
              className={`folder-item ${fromFolder === "sent" ? "active" : ""}`}
              onClick={() => handleFolderSelect("sent")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={fromFolder === "sent" ? "#ea580c" : "#64748b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span className="folder-name">Sent</span>
              </div>
              {(stats.sent || 0) > 0 && (
                <span className={`folder-badge ${fromFolder === "sent" ? "active-badge" : ""}`}>
                  {stats.sent}
                </span>
              )}
            </button>

            {/* Scheduled */}
            <button
              type="button"
              className={`folder-item ${fromFolder === "scheduled" ? "active" : ""}`}
              onClick={() => handleFolderSelect("scheduled")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={fromFolder === "scheduled" ? "#ea580c" : "#64748b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="folder-name">Scheduled</span>
              </div>
              {(stats.scheduled || 0) > 0 && (
                <span className={`folder-badge ${fromFolder === "scheduled" ? "active-badge" : ""}`}>
                  {stats.scheduled}
                </span>
              )}
            </button>

            {/* Drafts */}
            <button
              type="button"
              className={`folder-item ${fromFolder === "drafts" ? "active" : ""}`}
              onClick={() => handleFolderSelect("drafts")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={fromFolder === "drafts" ? "#ea580c" : "#64748b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span className="folder-name">Drafts</span>
              </div>
              {(stats.drafts || 0) > 0 && (
                <span className={`folder-badge ${fromFolder === "drafts" ? "active-badge" : ""}`}>
                  {stats.drafts}
                </span>
              )}
            </button>

            {/* All Mail (After Drafts) */}
            <button
              type="button"
              className={`folder-item ${fromFolder === "all" ? "active" : ""}`}
              onClick={() => handleFolderSelect("all")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={fromFolder === "all" ? "#ea580c" : "#64748b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
                </svg>
                <span className="folder-name">All Mail</span>
              </div>
              {(stats.all || 0) > 0 && (
                <span className={`folder-badge ${fromFolder === "all" ? "active-badge" : ""}`}>
                  {stats.all}
                </span>
              )}
            </button>

            {/* Trash */}
            <button
              type="button"
              className={`folder-item ${fromFolder === "trash" ? "active" : ""}`}
              onClick={() => handleFolderSelect("trash")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={fromFolder === "trash" ? "#ea580c" : "#64748b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span className="folder-name">Trash</span>
              </div>
              {(stats.trash || 0) > 0 && (
                <span className={`folder-badge ${fromFolder === "trash" ? "active-badge" : ""}`}>
                  {stats.trash}
                </span>
              )}
            </button>
          </nav>


        </aside>

        {/* ================= RIGHT MAIN AREA (EMAIL DETAIL VIEW) ================= */}
        <main className="mail-main-content">
          {loading ? (
            <div className="email-view-loading">
              <div className="mail-spinner" />
              <span>Loading email message...</span>
            </div>
          ) : error ? (
            <div className="email-view-error">
              <div className="error-icon">⚠️</div>
              <h3>Message Not Available</h3>
              <p>{error}</p>
              <button
                type="button"
                className="btn-return-inbox"
                onClick={() => navigate("/emails")}
              >
                ← Return to Email Center
              </button>
            </div>
          ) : email ? (
            <div className="email-view-container">
              {/* Top Navigation & Toolbar Bar */}
              <div className="email-view-top-toolbar">
                <button
                  type="button"
                  className="btn-back-to-folder"
                  onClick={() => navigate("/emails", { state: { folder: fromFolder } })}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Back to {fromFolder.charAt(0).toUpperCase() + fromFolder.slice(1)}</span>
                </button>

                <div className="email-view-action-group">
                  {/* Star Toggle */}
                  <button
                    type="button"
                    className={`tool-action-btn ${email.is_starred ? "starred" : ""}`}
                    title={email.is_starred ? "Unstar" : "Star"}
                    aria-label={email.is_starred ? "Unstar" : "Star"}
                    onClick={handleToggleStar}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={email.is_starred ? "#f59e0b" : "none"}
                      stroke={email.is_starred ? "#f59e0b" : "currentColor"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>

                  {/* Mark Unread */}
                  <button
                    type="button"
                    className="tool-action-btn"
                    title="Mark as unread"
                    aria-label="Mark as unread"
                    onClick={handleToggleRead}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </button>

                  {/* Snooze Button */}
                  <button
                    type="button"
                    className="tool-action-btn"
                    title="Snooze email"
                    aria-label="Snooze email"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSnoozeAnchorRect({
                        top: rect.top,
                        bottom: rect.bottom,
                        left: rect.left,
                        right: rect.right,
                        width: rect.width,
                        height: rect.height,
                      });
                      setShowSnoozeModal(true);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </button>

                  {/* Delete / Restore */}
                  {fromFolder === "trash" ? (
                    <>
                      <button
                        type="button"
                        className="tool-action-btn"
                        title="Restore to Inbox"
                        aria-label="Restore to Inbox"
                        onClick={handleRestore}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="tool-action-btn danger"
                        title="Delete Forever"
                        aria-label="Delete Forever"
                        onClick={handleDeletePermanently}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="tool-action-btn danger"
                      title="Delete"
                      aria-label="Delete"
                      onClick={handleMoveToTrash}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Email Content Container */}
              <div className="email-view-scroll-content">
                {/* Scheduled Send Banner */}
                {email.is_scheduled && (
                  <div className="email-scheduled-banner">
                    <div className="email-scheduled-banner-left">
                      <div className="scheduled-banner-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div className="scheduled-banner-text">
                        <div className="scheduled-banner-title">Send scheduled</div>
                        <div className="scheduled-banner-desc">
                          This message is scheduled to send on <strong>{new Date(email.scheduled_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong>.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-cancel-scheduled-send"
                      onClick={handleCancelSchedule}
                    >
                      Cancel send &amp; edit
                    </button>
                  </div>
                )}
                {/* Subject Header */}
                <div className="email-view-subject-section">
                  <h1 className="email-view-subject">
                    {email.subject || "(No Subject)"}
                  </h1>
                  <span className="email-folder-tag">{fromFolder}</span>
                </div>

                {/* Sender & Recipient Information Card */}
                <div className="email-view-meta-card">
                  <div className="meta-avatar">
                    {email.sender_name?.charAt(0).toUpperCase() || "S"}
                  </div>

                  <div className="meta-details">
                    <div className="meta-sender-line">
                      <span className="sender-strong">{email.sender_name}</span>
                      <span className="sender-email-address">&lt;{email.sender_email}&gt;</span>
                    </div>

                    {/* To Line */}
                    <div className="meta-recipients-line">
                      <span className="to-label">to:</span> {getToRecipientChips()}
                    </div>

                    {/* CC Line */}
                    {getCcRecipientChips() && (
                      <div className="meta-recipients-line">
                        <span className="to-label">cc:</span> {getCcRecipientChips()}
                      </div>
                    )}

                    {/* BCC Line (Only visible for sender) */}
                    {isSender && getBccRecipientChips() && (
                      <div className="meta-recipients-line">
                        <span className="to-label">bcc:</span> {getBccRecipientChips()}
                      </div>
                    )}
                  </div>

                  <div className="meta-date-badge">
                    {new Date(email.created_at).toLocaleString([], {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* Email Content Body Container matching Gmail Card style (Pic 3) */}
                <div className="email-view-body-card">
                  <div
                    className="email-view-body"
                    dangerouslySetInnerHTML={{
                      __html: email.body_html || `<p>${email.body_text || ""}</p>`,
                    }}
                  />
                </div>

                {/* Attachments Section */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="email-view-attachments-box">
                    <div className="attachments-header-row">
                      <div className="attachments-title">
                        📎 Attachments ({email.attachments.length})
                      </div>
                    </div>

                    <div className="attachments-grid-cards">
                      {email.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="attachment-download-card"
                          onClick={(e) => handleViewAttachment(att, e)}
                          title={`Click to view "${att.original_name}"`}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="att-type-icon">📄</div>
                          <div className="att-file-info">
                            <span className="att-file-name" title={att.original_name}>
                              {att.original_name}
                            </span>
                            <span className="att-file-meta">
                              {formatFileSize(att.file_size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="att-download-glyph"
                            title={`Download "${att.original_name}"`}
                            onClick={(e) => handleDownloadAttachment(att, e)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Reply & Forward Section */}
                <div className="email-view-reply-section">
                  <div className="reply-actions-row">
                    <button
                      type="button"
                      className="btn-action-reply"
                      onClick={handleReply}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="9 17 4 12 9 7" />
                        <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                      </svg>
                      <span>Reply to {email.sender_name}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-action-forward"
                      onClick={handleForward}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="15 17 20 12 15 7" />
                        <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                      </svg>
                      <span>Forward</span>
                    </button>
                  </div>


                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Snooze Email Modal */}
      {showSnoozeModal && email && (
        <SnoozeEmailModal
          isOpen={showSnoozeModal}
          email={email}
          anchorRect={snoozeAnchorRect}
          onClose={() => {
            setShowSnoozeModal(false);
            setSnoozeAnchorRect(null);
          }}
          onSnooze={handleSnooze}
          onUnsnooze={handleUnsnooze}
        />
      )}
    </div>
  );
}

export default EmailView;
