import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getEmails,
  getMailboxStats,
  getEmailById,
  toggleStar,
  toggleRead,
  markAllAsRead,
  moveToTrash,
  restoreFromTrash,
  deletePermanently,
  archiveEmail,
  bulkArchiveEmails,
  cancelScheduledEmail,
  getFilterContacts,
  snoozeEmail,
  unsnoozeEmail,
} from "../services/emailService";
import SnoozeEmailModal from "../components/SnoozeEmailModal";
import { useEmailCompose } from "../context/EmailComposeContext";
import API_URL from "../config/axios.util";
import "./EmailCenter.css";

function EmailCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialFolder = location.state?.folder || "inbox";
  const [currentFolder, setCurrentFolder] = useState(initialFolder);
  const [filterType, setFilterType] = useState("all"); // "all" | "read" | "unread" | "starred"
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState({
    inbox: { total: 0, unread: 0 },
    sent: 0,
    drafts: 0,
    starred: 0,
    trash: 0,
    scheduled: 0,
    snoozed: 0,
  });

  const [snoozeModalEmail, setSnoozeModalEmail] = useState(null);
  const [snoozeAnchorRect, setSnoozeAnchorRect] = useState(null);

  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Email Detail View (Reading Pane)
  const [activeEmail, setActiveEmail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const currentUserEmail = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return (u?.email || "").toLowerCase();
    } catch {
      return "";
    }
  }, []);

  // Global persistent compose modal
  const { openCompose } = useEmailCompose();

  // Feedback Notification Toast with Undo support matching Gmail
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    onUndo: null,
  });
  const toastTimerRef = useRef(null);

  const showToast = (message, onUndo = null, duration = 6500) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ visible: true, message, onUndo });
    toastTimerRef.current = setTimeout(() => {
      setToast({ visible: false, message: "", onUndo: null });
    }, duration);
  };

  const hideToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ visible: false, message: "", onUndo: null });
  };

  const showAlert = (msg) => {
    showToast(msg);
  };

  // Toolbar More Menu (3 dots) & Refreshing State
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const moreMenuRef = useRef(null);

  // Filter Dropdown State (matching Pic 3)
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  // Search Filter Tune states (matching Pic 2)
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchTime, setSearchTime] = useState("any");
  const [hasAttachment, setHasAttachment] = useState(false);
  const [activeChipDropdown, setActiveChipDropdown] = useState(null);
  const [tempFromInput, setTempFromInput] = useState("");
  const [tempToInput, setTempToInput] = useState("");
  const chipDropdownRef = useRef(null);
  const [filterContacts, setFilterContacts] = useState({
    senders: [],
    recipients: [],
  });

  // Fetch distinct senders and recipients for search filter dropdowns
  const loadFilterContacts = useCallback(async () => {
    try {
      const res = await getFilterContacts();
      if (res && res.success) {
        setFilterContacts({
          senders: res.senders || [],
          recipients: res.recipients || [],
        });
      }
    } catch (err) {
      console.warn("Could not load filter contacts:", err);
    }
  }, []);

  useEffect(() => {
    loadFilterContacts();
  }, [loadFilterContacts]);

  // Combined senders list (from API + current emails in memory)
  const availableSenders = useMemo(() => {
    const map = new Map();
    (filterContacts.senders || []).forEach((s) => {
      if (s.email) {
        map.set(s.email.toLowerCase(), {
          name: s.name || s.email.split("@")[0],
          email: s.email,
        });
      }
    });
    emails.forEach((em) => {
      if (em.sender_email && !map.has(em.sender_email.toLowerCase())) {
        map.set(em.sender_email.toLowerCase(), {
          name: em.sender_name || em.sender_email.split("@")[0],
          email: em.sender_email,
        });
      }
    });
    return Array.from(map.values());
  }, [filterContacts.senders, emails]);

  // Combined recipients list (from API + current emails in memory)
  const availableRecipients = useMemo(() => {
    const map = new Map();
    (filterContacts.recipients || []).forEach((r) => {
      if (r.email) {
        map.set(r.email.toLowerCase(), {
          name: r.name || r.email.split("@")[0],
          email: r.email,
        });
      }
    });
    emails.forEach((em) => {
      (em.recipients || []).forEach((r) => {
        if (r.email && !map.has(r.email.toLowerCase())) {
          map.set(r.email.toLowerCase(), {
            name: r.name || r.email.split("@")[0],
            email: r.email,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [filterContacts.recipients, emails]);

  // Filtered senders based on search input
  const filteredSenders = useMemo(() => {
    const q = (tempFromInput || "").trim().toLowerCase();
    if (!q) return availableSenders;
    return availableSenders.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)),
    );
  }, [availableSenders, tempFromInput]);

  // Filtered recipients based on search input
  const filteredRecipients = useMemo(() => {
    const q = (tempToInput || "").trim().toLowerCase();
    if (!q) return availableRecipients;
    return availableRecipients.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)),
    );
  }, [availableRecipients, tempToInput]);

  // Vibrant gradient avatar generator matching current UI
  const getAvatarGradient = (str = "") => {
    const gradients = [
      "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", // Blue
      "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", // Purple
      "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", // Orange
      "linear-gradient(135deg, #059669 0%, #047857 100%)", // Emerald
      "linear-gradient(135deg, #db2777 0%, #be185d 100%)", // Pink
      "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)", // Cyan
      "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", // Indigo
      "linear-gradient(135deg, #d97706 0%, #b45309 100%)", // Amber
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  const filterOptions = [
    { value: "all", label: "All Mail" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
  ];
  const currentFilterLabel =
    filterOptions.find((o) => o.value === filterType)?.label || "All Mail";

  // Fetch emails for current folder and search
  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getEmails({
        folder: currentFolder,
        search: searchQuery,
        page: currentPage,
        limit: 20,
        filter: filterType,
        searchFrom,
        searchTo,
        searchTime,
        hasAttachment,
      });

      if (res.success) {
        setEmails(res.messages || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalRecords(res.pagination?.total || 0);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Failed to load emails:", err);
      showAlert("Error loading emails. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    currentFolder,
    searchQuery,
    currentPage,
    filterType,
    searchFrom,
    searchTo,
    searchTime,
    hasAttachment,
  ]);

  // Fetch stats / unread counts
  const loadStats = useCallback(async () => {
    try {
      const res = await getMailboxStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn("Could not fetch mailbox stats:", err);
    }
  }, []);

  useEffect(() => {
    loadEmails();
    loadStats();
  }, [loadEmails, loadStats]);

  // Refresh email list & stats when an email is sent
  useEffect(() => {
    const handleEmailSent = () => {
      loadEmails();
      loadStats();
    };
    window.addEventListener("email-sent", handleEmailSent);
    return () => window.removeEventListener("email-sent", handleEmailSent);
  }, [loadEmails, loadStats]);

  // Close toolbar more menu, filter dropdown, and search chip popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target)
      ) {
        setIsFilterDropdownOpen(false);
      }
      if (
        chipDropdownRef.current &&
        !chipDropdownRef.current.contains(e.target)
      ) {
        setActiveChipDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Folder Change
  const handleFolderSelect = (folderKey) => {
    if (folderKey !== currentFolder) {
      setCurrentFolder(folderKey);
      setCurrentPage(1);
      setActiveEmail(null);
      setSelectedIds([]);
    }
  };

  // Open email detail on separate page or open draft in composer
  const handleEmailClick = (emailItem) => {
    if (emailItem.is_draft || currentFolder === "drafts") {
      const recipientsList = emailItem.recipients || [];
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
        draftId: emailItem.id,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject: emailItem.subject,
        bodyHtml: emailItem.body_html,
        bodyText: emailItem.body_text,
      });
      return;
    }

    // Open email view on dedicated page
    navigate(`/emails/${emailItem.id}`, {
      state: { fromFolder: currentFolder },
    });
  };

  // Toggle Star
  const handleToggleStar = async (e, id) => {
    e.stopPropagation();
    try {
      await toggleStar(id);
      setEmails((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_starred: !item.is_starred } : item,
        ),
      );
      if (activeEmail && activeEmail.id === id) {
        setActiveEmail((prev) => ({
          ...prev,
          is_starred: !prev.is_starred,
        }));
      }
      loadStats();
    } catch (err) {
      console.error("Star toggle error:", err);
    }
  };

  // Toggle Read / Unread
  const handleToggleRead = async (e, id, currentRead) => {
    if (e) e.stopPropagation();
    try {
      await toggleRead(id, !currentRead);
      setEmails((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: !currentRead } : item,
        ),
      );
      loadStats();
      showAlert(!currentRead ? "Marked as read." : "Marked as unread.");
    } catch (err) {
      console.error("Read toggle error:", err);
    }
  };

  // Move to Trash
  const handleMoveToTrash = async (e, id) => {
    if (e) e.stopPropagation();
    try {
      await moveToTrash(id);
      setEmails((prev) => prev.filter((item) => item.id !== id));
      if (activeEmail && activeEmail.id === id) {
        setActiveEmail(null);
      }
      loadStats();
      showAlert("Moved to Trash.");
    } catch (err) {
      console.error("Move to trash error:", err);
    }
  };

  const handleSingleArchive = async (e, id) => {
    if (e) e.stopPropagation();
    if (currentFolder === "all") return;
    // Optimistically remove from current list
    setEmails((prev) => prev.filter((item) => item.id !== id));
    if (activeEmail && activeEmail.id === id) {
      setActiveEmail(null);
    }

    try {
      await archiveEmail(id, true);
      loadStats();
    } catch (err) {
      console.error("Archive error:", err);
      showAlert("Could not archive email.");
      loadEmails();
      return;
    }

    showToast("Conversation archived", async () => {
      try {
        await archiveEmail(id, false);
        showToast("Action undone.");
        loadEmails();
        loadStats();
      } catch (err) {
        console.error("Undo archive error:", err);
        showAlert("Could not undo archive.");
      }
    });
  };

  const handleRowDelete = (e, id) => {
    if (e) e.stopPropagation();
    if (currentFolder === "trash") {
      handleDeletePermanently(id);
    } else {
      handleMoveToTrash(e, id);
    }
  };

  // Snooze Email handlers
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
      if (activeEmail && activeEmail.id === id) {
        setActiveEmail(null);
      }
      loadEmails();
      loadStats();
    } catch (err) {
      console.error("Snooze error:", err);
      showAlert("Failed to snooze email.");
    }
  };

  const handleUnsnooze = async (id) => {
    try {
      await unsnoozeEmail(id);
      showToast("Email unsnoozed and returned to Inbox. 📥");
      if (activeEmail && activeEmail.id === id) {
        setActiveEmail(null);
      }
      loadEmails();
      loadStats();
    } catch (err) {
      console.error("Unsnooze error:", err);
      showAlert("Failed to unsnooze email.");
    }
  };

  // Bulk Cancel Scheduled Emails (reverts to Draft)
  const handleBulkCancelScheduled = async () => {
    if (selectedIds.length === 0) return;
    try {
      const scheduledToCancel = emails
        .filter(
          (e) =>
            selectedIds.includes(e.id) &&
            (currentFolder === "scheduled" || e.is_scheduled)
        )
        .map((e) => e.id);

      const targetIds =
        scheduledToCancel.length > 0 ? scheduledToCancel : selectedIds;

      for (const id of targetIds) {
        await cancelScheduledEmail(id);
      }

      setSelectedIds([]);
      showToast(
        targetIds.length === 1
          ? "Scheduled email cancelled and reverted to Draft."
          : `${targetIds.length} scheduled emails cancelled and reverted to Draft.`
      );
      loadEmails();
      loadStats();
    } catch (err) {
      console.error("Bulk cancel scheduled error:", err);
      showAlert("Failed to cancel scheduled email(s).");
    }
  };

  // Cancel Scheduled Email handler
  const handleCancelScheduled = async (e, id) => {
    if (e) e.stopPropagation();
    try {
      const res = await cancelScheduledEmail(id);
      if (res.success) {
        showToast("Scheduled email cancelled and reverted to Draft.");
        loadEmails();
        loadStats();
      }
    } catch (err) {
      console.error("Cancel schedule error:", err);
      showAlert("Failed to cancel scheduled email.");
    }
  };

  // Restore from Trash
  const handleRestore = async (id) => {
    try {
      await restoreFromTrash(id);
      setEmails((prev) => prev.filter((item) => item.id !== id));
      if (activeEmail && activeEmail.id === id) {
        setActiveEmail(null);
      }
      loadStats();
      showAlert("Restored from Trash.");
    } catch (err) {
      console.error("Restore error:", err);
    }
  };

  // Delete Permanently
  const handleDeletePermanently = async (id) => {
    if (
      !window.confirm("Delete this email permanently? This cannot be undone.")
    ) {
      return;
    }
    try {
      await deletePermanently(id);
      setEmails((prev) => prev.filter((item) => item.id !== id));
      if (activeEmail && activeEmail.id === id) {
        setActiveEmail(null);
      }
      loadStats();
      showAlert("Email deleted forever.");
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(emails.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkMoveToTrash = async () => {
    if (selectedIds.length === 0) {
      showAlert("Please select at least one email first.");
      return;
    }
    try {
      for (const id of selectedIds) {
        await moveToTrash(id);
      }
      setEmails((prev) =>
        prev.filter((item) => !selectedIds.includes(item.id)),
      );
      showAlert(`Moved ${selectedIds.length} item(s) to Trash.`);
      setSelectedIds([]);
      loadStats();
    } catch (err) {
      console.error("Bulk trash error:", err);
    }
  };

  const handleBulkMarkRead = async (isRead) => {
    if (selectedIds.length === 0) {
      showAlert("Please select at least one email first.");
      return;
    }
    try {
      for (const id of selectedIds) {
        await toggleRead(id, isRead);
      }
      setEmails((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.id) ? { ...item, is_read: isRead } : item,
        ),
      );
      showAlert(
        `Marked ${selectedIds.length} item(s) as ${isRead ? "read" : "unread"}.`,
      );
      loadStats();
    } catch (err) {
      console.error("Bulk read error:", err);
    }
  };

  const handleBulkArchive = async () => {
    if (currentFolder === "all") return;
    if (selectedIds.length === 0) return;
    const idsToArchive = [...selectedIds];
    setSelectedIds([]);
    setEmails((prev) => prev.filter((item) => !idsToArchive.includes(item.id)));

    try {
      await bulkArchiveEmails(idsToArchive, true);
      loadStats();
    } catch (err) {
      console.error("Bulk archive error:", err);
      showAlert("Could not archive emails.");
      loadEmails();
      return;
    }

    showToast(
      idsToArchive.length === 1
        ? "Conversation archived"
        : `${idsToArchive.length} conversations archived`,
      async () => {
        try {
          await bulkArchiveEmails(idsToArchive, false);
          showToast("Action undone.");
          loadEmails();
          loadStats();
        } catch (err) {
          console.error("Undo bulk archive error:", err);
          showAlert("Could not undo archive.");
        }
      },
    );
  };

  const allSelectedAreRead =
    selectedIds.length > 0 &&
    emails.filter((m) => selectedIds.includes(m.id)).every((m) => m.is_read);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadEmails(), loadStats()]);
      showAlert("Mailbox refreshed.");
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleMarkAllAsReadInFolder = async () => {
    setShowMoreMenu(false);
    try {
      await markAllAsRead();
      setEmails((prev) => prev.map((item) => ({ ...item, is_read: true })));
      loadStats();
      showAlert("All messages marked as read.");
    } catch (err) {
      console.error("Mark all as read error:", err);
      // Fallback
      const unread = emails.filter((m) => !m.is_read);
      for (const m of unread) {
        await toggleRead(m.id, true);
      }
      setEmails((prev) => prev.map((item) => ({ ...item, is_read: true })));
      loadStats();
      showAlert("All messages marked as read.");
    }
  };

  // Reply or Forward
  const handleReply = (emailItem) => {
    setComposeInitialData({
      to: [emailItem.sender_email],
      subject: emailItem.subject.startsWith("Re:")
        ? emailItem.subject
        : `Re: ${emailItem.subject}`,
      bodyHtml: `<br/><br/><blockquote>On ${new Date(
        emailItem.created_at,
      ).toLocaleString()}, ${emailItem.sender_name} wrote:<br/>${
        emailItem.body_html || emailItem.body_text
      }</blockquote>`,
    });
    setIsComposeOpen(true);
  };

  const handleForward = (emailItem) => {
    setComposeInitialData({
      to: [],
      subject: emailItem.subject.startsWith("Fwd:")
        ? emailItem.subject
        : `Fwd: ${emailItem.subject}`,
      bodyHtml: `<br/><br/><blockquote>---------- Forwarded message ---------<br/>From: ${
        emailItem.sender_name
      } &lt;${emailItem.sender_email}&gt;<br/>Date: ${new Date(
        emailItem.created_at,
      ).toLocaleString()}<br/>Subject: ${emailItem.subject}<br/><br/>${
        emailItem.body_html || emailItem.body_text
      }</blockquote>`,
    });
    setIsComposeOpen(true);
  };

  // Formatting timestamp
  const formatEmailDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Open attachment in new tab for preview / viewing (seen)
  const handleViewAttachment = (att, e) => {
    if (e) e.preventDefault();
    const fileUrl = `${API_URL}${att.file_path}`;
    window.open(fileUrl, "_blank", "noopener,noreferrer");
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

  return (
    <div className="email-center-page">
      {/* Toast Alert matching Gmail Conversation archived + Undo */}
      {toast.visible && (
        <div className="gmail-toast-alert">
          <span className="toast-message-text">{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              className="toast-undo-action-btn"
              onClick={() => {
                const undoFn = toast.onUndo;
                hideToast();
                if (undoFn) undoFn();
              }}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            className="toast-close-action-btn"
            onClick={hideToast}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Page Header (Title Left, Searchbar Middle) */}
      <div className="email-center-top-header">
        {/* Left Side: Title & Short Subtitle */}
        <div className="email-header-title-block">
          <h1 className="email-page-title">Email Center</h1>
          <p className="email-page-subtitle">Workspace Mail</p>
        </div>

        {/* Middle: Gmail-style Search Bar matching image */}
        {/* Middle: Gmail-style Search Bar matching image */}
        <div className="email-header-search-wrapper" ref={chipDropdownRef}>
          <div
            className={`email-round-search-bar ${isSearchFocused ? "focused" : ""}`}
          >
            {/* Search Icon */}
            <svg
              className="search-leading-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#444746"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {/* Input matching image "Search mail" */}
            <input
              type="text"
              placeholder="Search mail"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />

            {/* Right icons: Clear button if search query exists */}
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn-round"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}

            {/* Filter Tune Icon */}
            <button
              type="button"
              className={`search-filter-tune-btn ${showSearchFilters ? "active" : ""}`}
              title="Search options"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setShowSearchFilters((prev) => !prev);
                setActiveChipDropdown(null);
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
          </div>

          {/* Filter Chips Bar (matching Pic 2) directly below search bar */}
          {showSearchFilters && (
            <div className="search-filter-chips-row">
              {/* 1. Has attachment chip (Pic 2 active style) */}
              <button
                type="button"
                className={`filter-chip-btn ${hasAttachment ? "active" : ""}`}
                onClick={() => {
                  setHasAttachment((prev) => !prev);
                  setCurrentPage(1);
                }}
              >
                {hasAttachment && (
                  <svg
                    className="filter-chip-check-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>Has attachment</span>
              </button>

              {/* 2. From chip */}
              <div className="filter-chip-container">
                <button
                  type="button"
                  className={`filter-chip-btn ${searchFrom ? "active" : ""}`}
                  onClick={() => {
                    setTempFromInput("");
                    setActiveChipDropdown((prev) =>
                      prev === "from" ? null : "from",
                    );
                  }}
                >
                  <span>{searchFrom ? `From: ${searchFrom}` : "From"}</span>
                  <svg
                    className="filter-chip-arrow-icon"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {activeChipDropdown === "from" && (
                  <div className="filter-chip-popover contact-picker-popover">
                    {/* Search Input Box */}
                    <div className="contact-picker-search-box">
                      <svg
                        className="contact-search-icon"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        className="contact-picker-input"
                        placeholder="Search name or email..."
                        value={tempFromInput}
                        onChange={(e) => setTempFromInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tempFromInput.trim()) {
                            setSearchFrom(tempFromInput.trim());
                            setActiveChipDropdown(null);
                            setCurrentPage(1);
                          }
                        }}
                        autoFocus
                      />
                      {tempFromInput && (
                        <button
                          type="button"
                          className="contact-picker-clear-search"
                          onClick={() => setTempFromInput("")}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Header with count & Clear Filter action */}
                    <div className="contact-picker-header">
                      <span className="contact-picker-section-title">
                        SENDERS{" "}
                        {filteredSenders.length > 0 &&
                          `(${filteredSenders.length})`}
                      </span>
                      {searchFrom && (
                        <button
                          type="button"
                          className="contact-picker-reset-btn"
                          onClick={() => {
                            setSearchFrom("");
                            setTempFromInput("");
                            setActiveChipDropdown(null);
                            setCurrentPage(1);
                          }}
                        >
                          Clear filter
                        </button>
                      )}
                    </div>

                    {/* Senders List */}
                    <div className="contact-picker-list">
                      {filteredSenders.length > 0 ? (
                        filteredSenders.map((sender) => {
                          const isSelected =
                            searchFrom &&
                            (searchFrom.toLowerCase() ===
                              sender.email.toLowerCase() ||
                              searchFrom.toLowerCase() ===
                                (sender.name || "").toLowerCase());
                          const initial = (sender.name || sender.email || "?")
                            .charAt(0)
                            .toUpperCase();
                          const avatarBg = getAvatarGradient(
                            sender.email || sender.name,
                          );

                          return (
                            <div
                              key={sender.email}
                              className={`contact-picker-item ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                setSearchFrom(sender.name || sender.email);
                                setActiveChipDropdown(null);
                                setCurrentPage(1);
                              }}
                            >
                              <div
                                className="contact-picker-avatar"
                                style={{ background: avatarBg }}
                              >
                                {initial}
                              </div>
                              <div className="contact-picker-info">
                                <span className="contact-picker-name">
                                  {sender.name || sender.email.split("@")[0]}
                                </span>
                                <span className="contact-picker-email">
                                  {sender.email}
                                </span>
                              </div>
                              {isSelected && (
                                <svg
                                  className="contact-selected-check"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#2563eb"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="contact-picker-empty">
                          <p className="contact-empty-text">
                            No senders matching &quot;{tempFromInput}&quot;
                          </p>
                          {tempFromInput.trim() && (
                            <button
                              type="button"
                              className="contact-picker-custom-search-btn"
                              onClick={() => {
                                setSearchFrom(tempFromInput.trim());
                                setActiveChipDropdown(null);
                                setCurrentPage(1);
                              }}
                            >
                              Filter by &quot;{tempFromInput}&quot; ↵
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Any time chip */}
              <div className="filter-chip-container">
                <button
                  type="button"
                  className={`filter-chip-btn ${searchTime !== "any" ? "active" : ""}`}
                  onClick={() => {
                    setActiveChipDropdown((prev) =>
                      prev === "time" ? null : "time",
                    );
                  }}
                >
                  <span>
                    {searchTime === "week"
                      ? "Past week"
                      : searchTime === "month"
                        ? "Past month"
                        : searchTime === "6months"
                          ? "Past 6 months"
                          : searchTime === "year"
                            ? "Past year"
                            : "Any time"}
                  </span>
                  <svg
                    className="filter-chip-arrow-icon"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {activeChipDropdown === "time" && (
                  <div className="filter-chip-popover time-popover">
                    {[
                      { value: "any", label: "Any time" },
                      { value: "week", label: "Past week" },
                      { value: "month", label: "Past month" },
                      { value: "6months", label: "Past 6 months" },
                      { value: "year", label: "Past year" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`filter-chip-menu-item ${searchTime === opt.value ? "selected" : ""}`}
                        onClick={() => {
                          setSearchTime(opt.value);
                          setActiveChipDropdown(null);
                          setCurrentPage(1);
                        }}
                      >
                        <span>{opt.label}</span>
                        {searchTime === opt.value && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#041e49"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. To chip */}
              <div className="filter-chip-container">
                <button
                  type="button"
                  className={`filter-chip-btn ${searchTo ? "active" : ""}`}
                  onClick={() => {
                    setTempToInput("");
                    setActiveChipDropdown((prev) =>
                      prev === "to" ? null : "to",
                    );
                  }}
                >
                  <span>{searchTo ? `To: ${searchTo}` : "To"}</span>
                  <svg
                    className="filter-chip-arrow-icon"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {activeChipDropdown === "to" && (
                  <div className="filter-chip-popover contact-picker-popover">
                    {/* Search Input Box */}
                    <div className="contact-picker-search-box">
                      <svg
                        className="contact-search-icon"
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        className="contact-picker-input"
                        placeholder="Search name or email..."
                        value={tempToInput}
                        onChange={(e) => setTempToInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && tempToInput.trim()) {
                            setSearchTo(tempToInput.trim());
                            setActiveChipDropdown(null);
                            setCurrentPage(1);
                          }
                        }}
                        autoFocus
                      />
                      {tempToInput && (
                        <button
                          type="button"
                          className="contact-picker-clear-search"
                          onClick={() => setTempToInput("")}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Header with count & Clear Filter action */}
                    <div className="contact-picker-header">
                      <span className="contact-picker-section-title">
                        RECIPIENTS{" "}
                        {filteredRecipients.length > 0 &&
                          `(${filteredRecipients.length})`}
                      </span>
                      {searchTo && (
                        <button
                          type="button"
                          className="contact-picker-reset-btn"
                          onClick={() => {
                            setSearchTo("");
                            setTempToInput("");
                            setActiveChipDropdown(null);
                            setCurrentPage(1);
                          }}
                        >
                          Clear filter
                        </button>
                      )}
                    </div>

                    {/* Recipients List */}
                    <div className="contact-picker-list">
                      {filteredRecipients.length > 0 ? (
                        filteredRecipients.map((recipient) => {
                          const isSelected =
                            searchTo &&
                            (searchTo.toLowerCase() ===
                              recipient.email.toLowerCase() ||
                              searchTo.toLowerCase() ===
                                (recipient.name || "").toLowerCase());
                          const initial = (
                            recipient.name ||
                            recipient.email ||
                            "?"
                          )
                            .charAt(0)
                            .toUpperCase();
                          const avatarBg = getAvatarGradient(
                            recipient.email || recipient.name,
                          );

                          return (
                            <div
                              key={recipient.email}
                              className={`contact-picker-item ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                setSearchTo(recipient.name || recipient.email);
                                setActiveChipDropdown(null);
                                setCurrentPage(1);
                              }}
                            >
                              <div
                                className="contact-picker-avatar"
                                style={{ background: avatarBg }}
                              >
                                {initial}
                              </div>
                              <div className="contact-picker-info">
                                <span className="contact-picker-name">
                                  {recipient.name ||
                                    recipient.email.split("@")[0]}
                                </span>
                                <span className="contact-picker-email">
                                  {recipient.email}
                                </span>
                              </div>
                              {isSelected && (
                                <svg
                                  className="contact-selected-check"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#2563eb"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="contact-picker-empty">
                          <p className="contact-empty-text">
                            No recipients matching &quot;{tempToInput}&quot;
                          </p>
                          {tempToInput.trim() && (
                            <button
                              type="button"
                              className="contact-picker-custom-search-btn"
                              onClick={() => {
                                setSearchTo(tempToInput.trim());
                                setActiveChipDropdown(null);
                                setCurrentPage(1);
                              }}
                            >
                              Filter by &quot;{tempToInput}&quot; ↵
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Reset all filters button if any filter is active */}
              {(hasAttachment ||
                searchFrom ||
                searchTo ||
                searchTime !== "any") && (
                <button
                  type="button"
                  className="filter-chip-clear-all"
                  onClick={() => {
                    setHasAttachment(false);
                    setSearchFrom("");
                    setSearchTo("");
                    setSearchTime("any");
                    setTempFromInput("");
                    setTempToInput("");
                    setCurrentPage(1);
                  }}
                  title="Clear all filters"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side spacer to keep search bar in the middle */}
        <div className="email-header-right-spacer" />
      </div>

      {/* Main Mail Container */}
      <div className="mail-app-shell">
        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="mail-sidebar">
          {/* Ultra-Premium Modern Compose Button */}
          <div className="compose-btn-container">
            <button
              type="button"
              className="btn-pic1-compose"
              onClick={() => openCompose(null)}
            >
              <div className="compose-icon-wrap">
                <svg
                  className="compose-icon-svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <span className="compose-btn-text">Compose</span>
            </button>
          </div>

          {/* Folder Navigation Menu matching Pic 1 & Pic 2 */}
          <nav className="folder-nav-list">
            {/* Inbox */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "inbox" ? "active" : ""}`}
              onClick={() => handleFolderSelect("inbox")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={currentFolder === "inbox" ? "#ea580c" : "#64748b"}
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
                <span
                  className={`folder-badge ${currentFolder === "inbox" ? "active-badge" : ""}`}
                >
                  {stats.inbox.unread}
                </span>
              )}
            </button>

            {/* Starred */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "starred" ? "active" : ""}`}
              onClick={() => handleFolderSelect("starred")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={currentFolder === "starred" ? "#f97316" : "#f59e0b"}
                  stroke={currentFolder === "starred" ? "#f97316" : "#f59e0b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="folder-name">Starred</span>
              </div>
              {(stats.starred || 0) > 0 && (
                <span
                  className={`folder-badge ${currentFolder === "starred" ? "active-badge" : ""}`}
                >
                  {stats.starred}
                </span>
              )}
            </button>

            {/* Sent */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "sent" ? "active" : ""}`}
              onClick={() => handleFolderSelect("sent")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={currentFolder === "sent" ? "#ea580c" : "#64748b"}
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
                <span
                  className={`folder-badge ${currentFolder === "sent" ? "active-badge" : ""}`}
                >
                  {stats.sent}
                </span>
              )}
            </button>

            {/* Scheduled */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "scheduled" ? "active" : ""}`}
              onClick={() => handleFolderSelect("scheduled")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={currentFolder === "scheduled" ? "#ea580c" : "#64748b"}
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
                <span className={`folder-badge ${currentFolder === "scheduled" ? "active-badge" : ""}`}>
                  {stats.scheduled}
                </span>
              )}
            </button>

            {/* Snoozed */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "snoozed" ? "active" : ""}`}
              onClick={() => handleFolderSelect("snoozed")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={currentFolder === "snoozed" ? "#ea580c" : "#64748b"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="folder-name">Snoozed</span>
              </div>
              {(stats.snoozed || 0) > 0 && (
                <span className={`folder-badge ${currentFolder === "snoozed" ? "active-badge" : ""}`}>
                  {stats.snoozed}
                </span>
              )}
            </button>
            {/* Drafts */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "drafts" ? "active" : ""}`}
              onClick={() => handleFolderSelect("drafts")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={currentFolder === "drafts" ? "#ea580c" : "#64748b"}
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
                <span
                  className={`folder-badge ${currentFolder === "drafts" ? "active-badge" : ""}`}
                >
                  {stats.drafts}
                </span>
              )}
            </button>

            {/* All Mail (After Drafts) */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "all" ? "active" : ""}`}
              onClick={() => handleFolderSelect("all")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={currentFolder === "all" ? "#ea580c" : "#64748b"}
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
                <span
                  className={`folder-badge ${currentFolder === "all" ? "active-badge" : ""}`}
                >
                  {stats.all}
                </span>
              )}
            </button>

            {/* Trash */}
            <button
              type="button"
              className={`folder-item ${currentFolder === "trash" ? "active" : ""}`}
              onClick={() => handleFolderSelect("trash")}
            >
              <div className="folder-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={currentFolder === "trash" ? "#ea580c" : "#64748b"}
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
                <span
                  className={`folder-badge ${currentFolder === "trash" ? "active-badge" : ""}`}
                >
                  {stats.trash}
                </span>
              )}
            </button>
          </nav>
        </aside>

        {/* ================= RIGHT MAIN AREA ================= */}
        <main className="mail-main-content">
          {/* Action Toolbar (Row 1 of main content) */}
          <div className="mail-actions-row-pic1">
            <div className="actions-left-group">
              {/* Checkbox */}
              <label className="checkbox-container-pic1" title="Select all">
                <input
                  type="checkbox"
                  checked={
                    emails.length > 0 && selectedIds.length === emails.length
                  }
                  onChange={handleSelectAll}
                />
              </label>

              {/* Action Icons visible when checkbox is clicked / emails are selected */}
              {selectedIds.length > 0 && (
                <div className="selected-actions-group">
                  {/* Archive */}
                  <button
                    type="button"
                    className="toolbar-action-icon-btn"
                    title={
                      currentFolder === "all"
                        ? "Archive is disabled in All Mail"
                        : "Archive"
                    }
                    disabled={currentFolder === "all"}
                    onClick={handleBulkArchive}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="21 8 21 21 3 21 3 8" />
                      <rect x="1" y="3" width="22" height="5" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    className="toolbar-action-icon-btn delete"
                    title="Delete"
                    onClick={handleBulkMoveToTrash}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>

                  {/* Cancel send button visible on left side of Refresh when scheduled emails are selected */}
                  {selectedIds.length > 0 &&
                    (currentFolder === "scheduled" ||
                      emails.some(
                        (e) => selectedIds.includes(e.id) && (e.is_scheduled || currentFolder === "scheduled")
                      )) && (
                      <button
                        type="button"
                        className="toolbar-cancel-send-btn"
                        title="Cancel scheduled send"
                        onClick={handleBulkCancelScheduled}
                      >
                        Cancel send
                      </button>
                    )}
                  {/* Mark as read / unread */}
                  <button
                    type="button"
                    className="toolbar-action-icon-btn"
                    title={
                      allSelectedAreRead ? "Mark as unread" : "Mark as read"
                    }
                    onClick={() => handleBulkMarkRead(!allSelectedAreRead)}
                  >
                    {allSelectedAreRead ? (
                      /* Closed envelope = Mark as unread */
                      <svg
                        width="17"
                        height="17"
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
                    ) : (
                      /* Open envelope = Mark as read */
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {/* Refresh Button */}
              <button
                type="button"
                className={`toolbar-action-icon-btn ${isRefreshing ? "refreshing-spin" : ""}`}
                title="Refresh"
                onClick={handleRefresh}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>

              {/* 3 dots button (More) - Hidden when emails are selected */}
              {selectedIds.length === 0 && (
                <div className="toolbar-more-menu-wrapper" ref={moreMenuRef}>
                  <button
                    type="button"
                    className={`toolbar-action-icon-btn ${showMoreMenu ? "active" : ""}`}
                    title="More"
                    onClick={() => setShowMoreMenu((prev) => !prev)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  {showMoreMenu && (
                    <div className="toolbar-more-dropdown">
                      <button
                        type="button"
                        className="toolbar-dropdown-item"
                        onClick={handleMarkAllAsReadInFolder}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Mark all as read</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side: All Mail filter dropdown matching Pic 3 & Pagination */}
            <div className="mail-actions-right-group">
              <div
                className="custom-dropdown-container"
                ref={filterDropdownRef}
              >
                <button
                  type="button"
                  className="custom-dropdown-trigger"
                  onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                  aria-expanded={isFilterDropdownOpen}
                >
                  <span className="custom-dropdown-label">
                    {currentFilterLabel}
                  </span>
                  <svg
                    className={`custom-dropdown-arrow ${isFilterDropdownOpen ? "open" : ""}`}
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </button>

                {isFilterDropdownOpen && (
                  <div className="custom-dropdown-menu">
                    {filterOptions.map((opt) => {
                      const isSelected = filterType === opt.value;
                      return (
                        <div
                          key={opt.value}
                          className={`custom-dropdown-option ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setFilterType(opt.value);
                            setCurrentPage(1);
                            setIsFilterDropdownOpen(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mail-pagination-pic1">
                <span className="pagination-text-pic1">
                  {totalRecords === 0
                    ? "0 of 0"
                    : `${(currentPage - 1) * 20 + 1}-${Math.min(
                        currentPage * 20,
                        totalRecords,
                      )} of ${totalRecords}`}
                </span>

                <button
                  type="button"
                  className="pag-btn-pic1"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous 20 emails"
                  aria-label="Previous page"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="pag-btn-pic1"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  title="Next 20 emails"
                  aria-label="Next page"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Table Column Headers (Row 3 of Pic 1) */}
          <div className="mail-table-header-row-pic1">
            <div className="header-cell select-cell">
              <input
                type="checkbox"
                checked={
                  emails.length > 0 && selectedIds.length === emails.length
                }
                onChange={handleSelectAll}
              />
            </div>
            <div className="header-cell star-cell" />
            <div className="header-cell from-cell">
              <span>FROM</span>
            </div>
            <div className="header-cell subject-cell">
              <span>SUBJECT</span>
            </div>
          </div>

          {/* ================= READING VIEW (If an email is clicked) ================= */}
          {activeEmail ? (
            <div className="email-reading-pane">
              {/* Top back bar */}
              <div className="reading-top-bar">
                <button
                  type="button"
                  className="btn-back-to-list"
                  onClick={() => setActiveEmail(null)}
                >
                  ← Back to {currentFolder}
                </button>

                <div className="reading-quick-actions">
                  <button
                    type="button"
                    className={`reading-tool-btn ${activeEmail.is_starred ? "starred" : ""}`}
                    title={activeEmail.is_starred ? "Unstar" : "Star"}
                    aria-label={activeEmail.is_starred ? "Unstar" : "Star"}
                    onClick={(e) => handleToggleStar(e, activeEmail.id)}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={activeEmail.is_starred ? "#f59e0b" : "none"}
                      stroke={
                        activeEmail.is_starred ? "#f59e0b" : "currentColor"
                      }
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="reading-tool-btn"
                    title="Mark as unread"
                    aria-label="Mark as unread"
                    onClick={() => {
                      handleToggleRead(null, activeEmail.id, true);
                      setActiveEmail(null);
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
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </button>

                  {currentFolder === "trash" ? (
                    <>
                      <button
                        type="button"
                        className="reading-tool-btn"
                        title="Restore"
                        aria-label="Restore"
                        onClick={() => handleRestore(activeEmail.id)}
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
                        className="reading-tool-btn danger"
                        title="Delete Forever"
                        aria-label="Delete Forever"
                        onClick={() => handleDeletePermanently(activeEmail.id)}
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
                      className="reading-tool-btn danger"
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => handleMoveToTrash(null, activeEmail.id)}
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

              {/* Subject Headline */}
              <div className="reading-subject-row">
                <h2>{activeEmail.subject || "(No Subject)"}</h2>
                <span className="folder-pill">{currentFolder}</span>
              </div>

              {/* Sender & Recipient Meta Header */}
              <div className="reading-meta-row">
                <div className="sender-avatar">
                  {activeEmail.sender_name?.charAt(0).toUpperCase() || "S"}
                </div>

                <div className="sender-info">
                  <div className="sender-name-line">
                    <span className="sender-name">
                      {activeEmail.sender_name}
                    </span>
                    <span className="sender-email">
                      &lt;{activeEmail.sender_email}&gt;
                    </span>
                  </div>
                  <div className="recipient-line">
                    to{" "}
                    {(() => {
                      const allRec = activeEmail.recipients || [];
                      const toRec = allRec.filter(
                        (r) =>
                          (r.recipient_type || r.type || "to").toLowerCase() ===
                          "to",
                      );
                      if (toRec.length === 0) return "me";
                      return toRec
                        .map((r) => {
                          const emailStr = (
                            r.recipient_email ||
                            r.email ||
                            ""
                          ).toLowerCase();
                          if (
                            currentUserEmail &&
                            emailStr === currentUserEmail
                          ) {
                            return "me";
                          }
                          return r.recipient_email || r.email;
                        })
                        .join(", ");
                    })()}
                  </div>
                  {/* CC Line */}
                  {(() => {
                    const allRec = activeEmail.recipients || [];
                    const ccRec = allRec.filter(
                      (r) =>
                        (r.recipient_type || r.type || "").toLowerCase() ===
                        "cc",
                    );
                    if (ccRec.length === 0) return null;
                    return (
                      <div className="recipient-line">
                        cc{" "}
                        {ccRec
                          .map((r) => r.recipient_email || r.email)
                          .join(", ")}
                      </div>
                    );
                  })()}
                  {/* BCC Line (Sender only) */}
                  {(() => {
                    const isSender =
                      currentFolder === "sent" ||
                      (currentUserEmail &&
                        activeEmail.sender_email &&
                        activeEmail.sender_email.toLowerCase() ===
                          currentUserEmail);
                    if (!isSender) return null;
                    const allRec = activeEmail.recipients || [];
                    const bccRec = allRec.filter(
                      (r) =>
                        (r.recipient_type || r.type || "").toLowerCase() ===
                        "bcc",
                    );
                    if (bccRec.length === 0) return null;
                    return (
                      <div className="recipient-line">
                        bcc{" "}
                        {bccRec
                          .map((r) => r.recipient_email || r.email)
                          .join(", ")}
                      </div>
                    );
                  })()}
                </div>

                <div className="reading-time">
                  {new Date(activeEmail.created_at).toLocaleString()}
                </div>
              </div>

              {/* Email Content Body Container matching Gmail Card style (Pic 3) */}
              <div className="reading-body-card">
                <div
                  className="reading-body-content"
                  dangerouslySetInnerHTML={{
                    __html:
                      activeEmail.body_html ||
                      `<p>${activeEmail.body_text || ""}</p>`,
                  }}
                />
              </div>

              {/* Attachments Section */}
              {activeEmail.attachments &&
                activeEmail.attachments.length > 0 && (
                  <div className="reading-attachments-section">
                    <div className="attachments-title">
                      Attachments ({activeEmail.attachments.length})
                    </div>
                    <div className="attachments-grid">
                      {activeEmail.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="attachment-card"
                          onClick={(e) => handleViewAttachment(att, e)}
                          title={`Click to view "${att.original_name}"`}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="att-icon">📄</div>
                          <div className="att-info">
                            <div className="att-name" title={att.original_name}>
                              {att.original_name}
                            </div>
                            <div className="att-size">
                              {formatFileSize(att.file_size)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="att-download-arrow"
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

              {/* Reply / Forward Footer Actions */}
              <div className="reading-bottom-actions">
                <button
                  type="button"
                  className="btn-reply"
                  onClick={() => handleReply(activeEmail)}
                >
                  ↩ Reply
                </button>
                <button
                  type="button"
                  className="btn-forward"
                  onClick={() => handleForward(activeEmail)}
                >
                  ↪ Forward
                </button>
              </div>
            </div>
          ) : (
            /* ================= LIST VIEW (Table of Emails) ================= */
            <div className="mail-list-container">
              {loading ? (
                <div className="mail-loading-state">
                  <div className="mail-spinner" />
                  <span>Loading {currentFolder}...</span>
                </div>
              ) : emails.length === 0 ? (
                /* Empty state matching Pic 1 exactly */
                <div className="mail-empty-state-pic1">
                  <div className="empty-tray-illustration">
                    <svg
                      width="72"
                      height="72"
                      viewBox="0 0 64 64"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Orange rays on top matching Pic 1 */}
                      <line
                        x1="32"
                        y1="4"
                        x2="32"
                        y2="12"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1="16"
                        y1="10"
                        x2="22"
                        y2="16"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <line
                        x1="48"
                        y1="10"
                        x2="42"
                        y2="16"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />

                      {/* Tray box body */}
                      <path
                        d="M10 28L16 52H48L54 28"
                        fill="#e2e8f0"
                        stroke="#94a3b8"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                      />
                      {/* Front flap cutout */}
                      <path
                        d="M8 28H23L26 37H38L41 28H56"
                        fill="#cbd5e1"
                        stroke="#94a3b8"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3 className="empty-title-pic1">
                    No emails in {currentFolder}
                  </h3>
                  <p className="empty-desc-pic1">
                    {searchQuery
                      ? "No results matching your search query."
                      : `Your ${currentFolder} is currently clean.`}
                  </p>
                </div>
              ) : (
                <div className="mail-table">
                  {emails.map((email) => {
                    const isSelected = selectedIds.includes(email.id);
                    const isUnread = !email.is_read;

                    return (
                      <div
                        key={email.id}
                        className={`mail-row-pic1 ${isUnread ? "unread" : "read"} ${
                          isSelected ? "selected" : ""
                        }`}
                        onClick={() => handleEmailClick(email)}
                      >
                        {/* Select checkbox */}
                        <div
                          className="mail-row-cell select-cell"
                          onClick={(e) => handleSelectRow(e, email.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                          />
                        </div>

                        {/* Star column matching Pic 2 */}
                        <div
                          className="mail-row-cell star-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={`star-btn-pic2 ${email.is_starred ? "starred" : ""}`}
                            title={email.is_starred ? "Starred" : "Not starred"}
                            onClick={(e) => handleToggleStar(e, email.id)}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill={email.is_starred ? "#f59e0b" : "none"}
                              stroke={email.is_starred ? "#f59e0b" : "#747775"}
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        </div>

                        {/* From column */}
                        <div className="mail-row-cell from-cell">
                          <span className="sender-display-name">
                            {currentFolder === "sent" ||
                            (currentFolder === "all" && email.is_sender)
                              ? (email.recipients || [])
                                  .map((r) => r.name || r.email)
                                  .join(", ") || "Recipient"
                              : email.sender_name || email.sender_email}
                          </span>
                        </div>

                        {/* Subject column */}
                        <div className="mail-row-cell subject-cell">
                          <div className="subject-content-wrapper">
                            <span className="subject-title">
                              {email.subject || "(No Subject)"}
                            </span>
                            <span className="subject-snippet-divider"> - </span>
                            <span className="subject-snippet-text">
                              {email.snippet || ""}
                            </span>
                          </div>
                          {email.attachment_count > 0 && (
                            <span
                              className="clip-indicator"
                              title={`${email.attachment_count} attachment(s)`}
                            >
                              📎
                            </span>
                          )}
                        </div>

                        {/* Date column & hover quick-actions (Archive, Delete, Mark as Read/Unread) */}
                        <div className="mail-row-cell date-cell">
                          <span className="mail-date-text">
                            {currentFolder === "snoozed" && email.snoozed_until
                              ? `🕒 ${new Date(email.snoozed_until).toLocaleDateString([], { month: "short", day: "numeric" })} ${new Date(email.snoozed_until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : currentFolder === "scheduled" && email.scheduled_at
                              ? `🕒 ${new Date(email.scheduled_at).toLocaleDateString([], { month: "short", day: "numeric" })} ${new Date(email.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                              : formatEmailDate(email.created_at)}
                          </span>
                          <div className="mail-hover-actions">
                            {/* Snooze */}
                            <button
                              type="button"
                              className="mail-hover-btn"
                              title={email.snoozed_until ? "Change snooze / Unsnooze" : "Snooze email"}
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
                                setSnoozeModalEmail(email);
                              }}
                            >
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                            </button>
                            {/* Archive */}
                            <button
                              type="button"
                              className="mail-hover-btn"
                              title={
                                currentFolder === "all"
                                  ? "Archive is disabled in All Mail"
                                  : "Archive"
                              }
                              disabled={currentFolder === "all"}
                              onClick={(e) => handleSingleArchive(e, email.id)}
                            >
                              <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="21 8 21 21 3 21 3 8" />
                                <rect x="1" y="3" width="22" height="5" />
                                <line x1="10" y1="12" x2="14" y2="12" />
                              </svg>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              className="mail-hover-btn delete"
                              title="Delete"
                              onClick={(e) => handleRowDelete(e, email.id)}
                            >
                              <svg
                                width="17"
                                height="17"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>

                            {/* Mark as read / unread */}
                            <button
                              type="button"
                              className="mail-hover-btn"
                              title={
                                email.is_read
                                  ? "Mark as unread"
                                  : "Mark as read"
                              }
                              onClick={(e) =>
                                handleToggleRead(e, email.id, email.is_read)
                              }
                            >
                              {email.is_read ? (
                                /* Closed envelope = Mark as unread */
                                <svg
                                  width="17"
                                  height="17"
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
                              ) : (
                                /* Open envelope = Mark as read */
                                <svg
                                  width="17"
                                  height="17"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect
                                    x="2"
                                    y="4"
                                    width="20"
                                    height="16"
                                    rx="2"
                                  />
                                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {/* Snooze Email Modal Dialog */}
      {snoozeModalEmail && (
        <SnoozeEmailModal
          isOpen={Boolean(snoozeModalEmail)}
          email={snoozeModalEmail}
          anchorRect={snoozeAnchorRect}
          onClose={() => {
            setSnoozeModalEmail(null);
            setSnoozeAnchorRect(null);
          }}
          onSnooze={handleSnooze}
          onUnsnooze={handleUnsnooze}
          onSnoozed={(snoozeResult) => {
            setSnoozeModalEmail(null);
            setSnoozeAnchorRect(null);
            loadEmails();
            loadStats();
            showToast(`Conversation snoozed.`);
          }}
        />
      )}
    </div>
  );
}

export default EmailCenter;
