import "./Notifications.css";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Loader from "../components/Loader";
import {
  getManagementNotifications,
  getManagementNotificationById,
  deleteManagementNotification,
  sendManagementNotification,
} from "../services/notificationService";
import PATHS from "../config/path.config";
import CustomSelect from "../components/CustomSelect";

function Notifications() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmSend, setConfirmSend] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const dropdownRef = useRef(null);
  const actionBtnRefs = useRef({});

  // Dynamic Show Options:
  // total <= 5: [5]
  // total 6-10: [5, 10]
  // total 11-15: [5, 10, 15]
  const perPageOptions = useMemo(() => {
    const opts = [5];
    let nextThreshold = 5;
    while (totalItems > nextThreshold) {
      nextThreshold += 5;
      opts.push(nextThreshold);
    }
    return opts;
  }, [totalItems]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getManagementNotifications({
        page: currentPage,
        limit: perPage,
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
      });

      if (res.pagination) {
        setNotifications(res.data || []);
        setTotalItems(res.pagination.total);
        setTotalPages(res.pagination.totalPages || 1);
      } else if (Array.isArray(res.data)) {
        setNotifications(res.data);
        setTotalItems(res.data.length);
        setTotalPages(Math.max(1, Math.ceil(res.data.length / perPage)));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle action menu toggle with smart positioning (opens up or down so it never cuts off)
  const handleToggleMenu = (e, notif) => {
    e.stopPropagation();
    if (openMenuId === notif.id) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 175; // 4 items (View, Edit, Send Now, Delete)
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setMenuPosition({
      right: Math.max(8, window.innerWidth - rect.right),
      top: openUp ? "auto" : `${rect.bottom + 4}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : "auto",
    });
    setOpenMenuId(notif.id);
  };

  // Close dropdown on outside click, window scroll or resize
  useEffect(() => {
    if (!openMenuId) return;

    const handleOutsideClick = (e) => {
      const clickedInsideDropdown =
        dropdownRef.current && dropdownRef.current.contains(e.target);
      const clickedOnActionBtn = Object.values(actionBtnRefs.current).some(
        (btn) => btn && btn.contains(e.target)
      );

      if (!clickedInsideDropdown && !clickedOnActionBtn) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    const handleWindowChange = () => {
      setOpenMenuId(null);
      setMenuPosition(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("resize", handleWindowChange);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("resize", handleWindowChange);
    };
  }, [openMenuId]);

  const handleOpenViewModal = async (notif) => {
    setViewModal(notif);
    try {
      const res = await getManagementNotificationById(notif.id);
      if (res && res.data) {
        setViewModal(res.data);
      }
    } catch (err) {
      console.error("Failed to load notification details:", err);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  const handleDelete = async (id) => {
    try {
      await deleteManagementNotification(id);
      showSuccess("Notification deleted successfully.");
      fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete notification.");
    } finally {
      setConfirmDelete(null);
      setOpenMenuId(null);
    }
  };

  const handleSend = async (id) => {
    try {
      setSendingId(id);
      setOpenMenuId(null);
      const res = await sendManagementNotification(id);
      const { sentCount, failedCount } = res.data || {};
      showSuccess(
        `Notification sent! ${sentCount ?? 0} delivered, ${failedCount ?? 0} failed.`,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send notification.");
    } finally {
      setSendingId(null);
      setConfirmSend(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const str = String(dateStr).slice(0, 10);
    const parts = str.split("-");
    if (parts.length === 3) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const y = parts[0];
      const m = months[parseInt(parts[1], 10) - 1];
      const d = String(parseInt(parts[2], 10)).padStart(2, "0");
      if (m && y && d) return `${d} ${m} ${y}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().slice(0, 10);
    return String(dateStr).slice(0, 10) < today;
  };

  return (
    <div className={`notif-mgmt-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      {/* Header */}
      <div className="notif-mgmt-header">
        <div className="notif-mgmt-title">
          <span className="notif-mgmt-category">ADMIN MANAGEMENT</span>
          <h1>Notifications</h1>
          <p className="notif-mgmt-subtitle">Manage and send notifications to your team</p>
        </div>
        <button
          id="create-notification-btn"
          className="notif-create-btn"
          onClick={() => navigate(PATHS.NOTIFICATION_CREATE)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Notification
        </button>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="notif-alert notif-alert-success">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="notif-alert notif-alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button className="notif-alert-close" onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Controls */}
      <div className="notif-controls">
        <div className="notif-search-wrap">
          <svg className="notif-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="notif-search-input"
            className="notif-search"
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <CustomSelect
          id="notif-status-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          minWidth="125px"
        />
        <CustomSelect
          id="notif-type-filter"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { value: "all", label: "All Types" },
            { value: "all_users", label: "All Users" },
            { value: "separate_users", label: "Separate Users" },
          ]}
          minWidth="145px"
        />
        <CustomSelect
          id="notif-per-page"
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          options={perPageOptions.map((opt) => ({
            value: opt,
            label: `Show ${opt}`,
          }))}
          minWidth="120px"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="notif-loader-wrap"><Loader /></div>
      ) : (
        <>
          <div className="notif-table-card">
            <div className="notif-table-wrap">
              <table className="notif-table">
                <thead>
                  <tr>
                    <th className="notif-col-num">#</th>
                    <th className="notif-col-title">Title</th>
                    <th className="notif-col-type">Type</th>
                    <th className="notif-col-status">Status</th>
                    <th className="notif-col-expires">Expires On</th>
                    <th className="notif-col-admins">Admins</th>
                    <th className="notif-col-employees">Employees</th>
                    <th className="notif-col-created">Created</th>
                    <th className="notif-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="notif-empty-row">
                        <div className="notif-empty">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                          <p>No notifications found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    notifications.map((n, idx) => (
                      <tr key={n.id} className={isExpired(n.expires_at) ? "notif-row-expired" : ""}>
                        <td className="notif-col-num">{(currentPage - 1) * perPage + idx + 1}</td>
                        <td className="notif-col-title">
                          <div className="notif-title-cell">
                            <span className="notif-title-main" title={n.title}>{n.title}</span>
                            {n.details && (
                              <span className="notif-title-sub" title={n.details}>
                                {n.details}
                              </span>
                            )}
                            {isExpired(n.expires_at) && (
                              <span className="notif-badge-expired">Expired</span>
                            )}
                          </div>
                        </td>
                        <td className="notif-col-type">
                          <span className={`notif-type-pill ${n.notification_type === "all_users" ? "type-pill-all" : "type-pill-sep"}`}>
                            {n.notification_type === "all_users" ? "All Users" : "Separate Users"}
                          </span>
                        </td>
                        <td className="notif-col-status">
                          <span className={`notif-status-pill status-pill-${n.status}`}>
                            <span className="status-dot">●</span>
                            {n.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className={`notif-col-expires ${isExpired(n.expires_at) ? "notif-td-expired-date" : ""}`}>
                          <div className="notif-cell-content">
                            <svg className="notif-cell-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>{formatDate(n.expires_at)}</span>
                          </div>
                        </td>
                        <td className="notif-col-admins">
                          <div className="notif-cell-content notif-cell-center">
                            <svg className="notif-cell-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>
                              {n.notification_type === "all_users"
                                ? "All"
                                : (n.selected_admin_count ?? 0)}
                            </span>
                          </div>
                        </td>
                        <td className="notif-col-employees">
                          <div className="notif-cell-content notif-cell-center">
                            <svg className="notif-cell-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>
                              {n.notification_type === "all_users"
                                ? "All"
                                : (n.selected_employee_count ?? 0)}
                            </span>
                          </div>
                        </td>
                        <td className="notif-col-created">
                          <div className="notif-cell-content">
                            <svg className="notif-cell-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <span>{formatDate(n.created_at)}</span>
                          </div>
                        </td>
                        <td className="notif-col-actions">
                          <div className="notif-action-wrap">
                            <button
                              ref={(el) => (actionBtnRefs.current[n.id] = el)}
                              id={`notif-action-btn-${n.id}`}
                              className="notif-dots-btn"
                              onClick={(e) => handleToggleMenu(e, n)}
                              disabled={sendingId === n.id}
                              title="Actions"
                              type="button"
                            >
                              {sendingId === n.id ? (
                                <span className="notif-spinner" />
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="notif-pagination">
              <span className="notif-pagination-info">
                Showing {totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1}–
                {Math.min(currentPage * perPage, totalItems)} of {totalItems}
              </span>
              <div className="notif-pagination-buttons">
                <button
                  className="notif-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  title="First page"
                >«</button>
                <button
                  className="notif-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  title="Previous page"
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - currentPage) <= 2)
                  .map((p) => (
                    <button
                      key={p}
                      className={`notif-page-btn ${p === currentPage ? "active" : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  className="notif-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  title="Next page"
                >›</button>
                <button
                  className="notif-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Last page"
                >»</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Action Menu Dropdown Portal (Prevents table scrollbar and never cuts off) */}
      {openMenuId && menuPosition && (() => {
        const activeNotif = notifications.find((item) => item.id === openMenuId);
        if (!activeNotif) return null;
        return createPortal(
          <div
            ref={dropdownRef}
            className={`notif-dropdown ${theme === "dark" ? "dark-theme" : "light-theme"}`}
            style={{
              position: "fixed",
              right: `${menuPosition.right}px`,
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              id={`notif-view-${activeNotif.id}`}
              className="notif-dropdown-item"
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
                handleOpenViewModal(activeNotif);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View
            </button>
            <button
              id={`notif-edit-${activeNotif.id}`}
              className="notif-dropdown-item"
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
                navigate(`/notifications/${activeNotif.id}/edit`);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              id={`notif-send-${activeNotif.id}`}
              className="notif-dropdown-item notif-dropdown-send"
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
                setConfirmSend(activeNotif);
              }}
              disabled={activeNotif.status !== "active" || isExpired(activeNotif.expires_at)}
              title={
                activeNotif.status !== "active"
                  ? "Only active notifications can be sent"
                  : isExpired(activeNotif.expires_at)
                  ? "This notification has expired"
                  : "Send now"
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Now
            </button>
            <div className="notif-dropdown-divider" />
            <button
              id={`notif-delete-${activeNotif.id}`}
              className="notif-dropdown-item notif-dropdown-delete"
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
                setConfirmDelete(activeNotif);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Delete
            </button>
          </div>,
          document.body
        );
      })()}

      {/* Send Confirm Modal */}
      {confirmSend && (
        <div className="notif-modal-overlay" onClick={() => !sendingId && setConfirmSend(null)}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-icon notif-modal-icon-primary">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
            <h3 className="notif-modal-title">Send Notification Now?</h3>
            <p className="notif-modal-body">
              Are you sure you want to send <strong>"{confirmSend.title}"</strong> now to its recipients?
            </p>
            <div className="notif-modal-actions">
              <button
                type="button"
                className="notif-btn notif-btn-cancel"
                onClick={() => setConfirmSend(null)}
                disabled={sendingId === confirmSend.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="notif-btn notif-btn-primary"
                onClick={() => handleSend(confirmSend.id)}
                disabled={sendingId === confirmSend.id}
              >
                {sendingId === confirmSend.id ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="notif-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-icon notif-modal-icon-danger">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </div>
            <h3 className="notif-modal-title">Delete Notification?</h3>
            <p className="notif-modal-body">
              Are you sure you want to delete <strong>"{confirmDelete.title}"</strong>? This action cannot be undone.
            </p>
            <div className="notif-modal-actions">
              <button
                className="notif-btn notif-btn-cancel"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className="notif-btn notif-btn-danger"
                onClick={() => handleDelete(confirmDelete.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="notif-modal-overlay" onClick={() => setViewModal(null)}>
          <div className="notif-modal notif-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notif-view-header">
              <div className="notif-view-header-title">
                <h2>{viewModal.title}</h2>
                <span className={`notif-status-pill status-pill-${viewModal.status}`}>
                  <span className="status-dot">●</span>
                  {viewModal.status === "active" ? "Active" : "Inactive"}
                </span>
                {isExpired(viewModal.expires_at) && (
                  <span className="notif-badge-expired">Expired</span>
                )}
              </div>
              <button className="notif-view-close" onClick={() => setViewModal(null)} title="Close">×</button>
            </div>

            <div className="notif-view-body">
              {/* Message */}
              <div className="notif-view-section">
                <span className="notif-view-label">DETAILS / MESSAGE</span>
                <p className="notif-view-text">{viewModal.details}</p>
              </div>

              {/* Grid 3 Overview Cards */}
              <div className="notif-view-overview-grid">
                <div className="notif-view-overview-card">
                  <span className="notif-view-label">TYPE</span>
                  <span className={`notif-type-pill ${viewModal.notification_type === "all_users" ? "type-pill-all" : "type-pill-sep"}`}>
                    {viewModal.notification_type === "all_users" ? "All Users" : "Separate Users"}
                  </span>
                </div>
                <div className="notif-view-overview-card">
                  <span className="notif-view-label">EXPIRES ON</span>
                  <div className="notif-cell-content">
                    <svg className="notif-cell-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span className={isExpired(viewModal.expires_at) ? "notif-td-expired-date" : ""}>
                      {formatDate(viewModal.expires_at)}
                    </span>
                  </div>
                </div>
                <div className="notif-view-overview-card">
                  <span className="notif-view-label">CREATED ON</span>
                  <div className="notif-cell-content">
                    <svg className="notif-cell-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{formatDate(viewModal.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Recipients Detailed Box */}
              <div className="notif-view-recipients-box">
                {viewModal.notification_type === "all_users" ? (
                  <div className="notif-view-all-users-info">
                    <div className="notif-view-recipient-group">
                      <span className="notif-view-label">ADMIN RECIPIENTS</span>
                      <div className="notif-view-all-badge">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>All Active Admins</span>
                      </div>
                    </div>
                    <div className="notif-view-recipient-group">
                      <span className="notif-view-label">EMPLOYEE RECIPIENTS</span>
                      <div className="notif-view-all-badge">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>All Active Employees</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Admin Recipients */}
                    <div className="notif-view-recipient-group">
                      <span className="notif-view-label">
                        ADMIN RECIPIENT ({viewModal.admins?.length ?? viewModal.selected_admin_count ?? 0})
                      </span>
                      <div className="notif-view-chips-wrap">
                        {viewModal.admins && viewModal.admins.length > 0 ? (
                          viewModal.admins.map((adm) => (
                            <span key={adm.id} className="notif-view-admin-chip">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              <strong>{adm.name}</strong>
                              {adm.email && <span className="notif-chip-email">({adm.email})</span>}
                            </span>
                          ))
                        ) : (
                          <span className="notif-view-fallback">
                            {viewModal.selected_admin_count ? `${viewModal.selected_admin_count} selected` : "No Admin selected"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Employee Recipients with Creator Admin Name */}
                    <div className="notif-view-recipient-group">
                      <span className="notif-view-label">
                        EMPLOYEE RECIPIENTS ({viewModal.employees?.length ?? viewModal.selected_employee_count ?? 0})
                      </span>
                      <div className="notif-view-employees-list">
                        {viewModal.employees && viewModal.employees.length > 0 ? (
                          viewModal.employees.map((emp) => (
                            <div key={emp.id} className="notif-view-employee-card">
                              <div className="notif-view-employee-info">
                                <svg className="notif-view-emp-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                                <span className="notif-view-emp-name">{emp.name}</span>
                                {emp.email && (
                                  <span className="notif-view-emp-email">{emp.email}</span>
                                )}
                              </div>
                              {emp.creator_admin_name && (
                                <div className="notif-view-under-admin-tag">
                                  <span className="under-label">Under Admin:</span>
                                  <span className="under-admin-name">{emp.creator_admin_name}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="notif-view-fallback">
                            {viewModal.selected_employee_count ? `${viewModal.selected_employee_count} selected` : "No Employees selected"}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;
