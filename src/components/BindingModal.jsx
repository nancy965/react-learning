import React, { useState, useEffect } from "react";
import axios from "axios";
import "./BindingModal.css";
import { API_URL } from "../config/axios.util";

const DEFAULT_USERS_DATA = [
  {
    id: 1,
    name: "Pokkie",
    email: "pokkie@gmail.com",
    user_type: "employee",
    role: "employee",
    is_active: true,
    created_at: "2026-10-12T09:30:00",
  },
  {
    id: 2,
    name: "Kitty",
    email: "kitty@gmail.com",
    user_type: "employee",
    role: "employee",
    is_active: true,
    created_at: "2026-10-11T16:15:00",
  },
  {
    id: 3,
    name: "Kavya",
    email: "kavya@gmail.com",
    user_type: "employee",
    role: "employee",
    is_active: true,
    created_at: "2026-10-10T13:20:00",
  },
  {
    id: 4,
    name: "Dhruvi",
    email: "dhruvi@gmail.com",
    user_type: "admin",
    role: "admin",
    is_active: true,
    created_at: "2026-10-09T11:45:00",
  },
  {
    id: 5,
    name: "Ruhi",
    email: "ruhi@gmail.com",
    user_type: "admin",
    role: "admin",
    is_active: true,
    created_at: "2026-10-08T15:10:00",
  },
  {
    id: 6,
    name: "Khushil",
    email: "khushil@gmail.com",
    user_type: "admin",
    role: "admin",
    is_active: true,
    created_at: "2026-10-07T09:05:00",
  },
];

const AVATAR_PALETTE = [
  { bg: "#e0f2fe", color: "#0284c7" },
  { bg: "#f3e8ff", color: "#9333ea" },
  { bg: "#e0f2fe", color: "#0284c7" },
  { bg: "#ffedd5", color: "#ea580c" },
  { bg: "#fce7f3", color: "#db2777" },
  { bg: "#dcfce7", color: "#16a34a" },
];

const PAGE_SIZE = 5;

function BindingModal({ role, isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (isOpen && role?.id) {
      setCurrentPage(1);
      setSearch("");
      setStatusFilter("all");
      fetchRoleUsers();
    }
  }, [isOpen, role?.id]);

  const fetchRoleUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/role-permissions/roles/${role.id}/users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.data?.data && response.data.data.length > 0) {
        setUsers(response.data.data);
      } else {
        await fetchFallbackUsers(token);
      }
    } catch (err) {
      console.error("Failed to load role users:", err);
      const token = localStorage.getItem("token");
      await fetchFallbackUsers(token);
    } finally {
      setLoading(false);
    }
  };

  const fetchFallbackUsers = async (token) => {
    try {
      const res = await axios.get(`${API_URL}/users/get-all?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allUsers = res.data?.data || [];
      const matching = allUsers.filter(
        (u) =>
          u.role_id === role.id ||
          u.role?.toLowerCase() === role.name?.toLowerCase() ||
          u.permission_role === role.name,
      );
      if (matching.length > 0) {
        setUsers(matching);
      } else {
        setUsers(DEFAULT_USERS_DATA);
      }
    } catch (e) {
      console.error("Fallback error:", e);
      setUsers(DEFAULT_USERS_DATA);
    }
  };

  if (!isOpen || !role) return null;

  const userList = Array.isArray(users) ? users : [];
  const totalUsers = userList.length;
  const activeUsers = userList.filter((u) => u?.is_active !== false).length;
  const inactiveUsers = totalUsers - activeUsers;
  const roleName = role.name || "Admin";

  const filteredUsers = userList.filter((u) => {
    if (!u) return false;
    const query = String(search || "")
      .toLowerCase()
      .trim();
    const uName = String(u.name || "").toLowerCase();
    const uEmail = String(u.email || "").toLowerCase();

    const matchesSearch =
      !query || uName.includes(query) || uEmail.includes(query);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.is_active !== false) ||
      (statusFilter === "inactive" && u.is_active === false);

    return matchesSearch && matchesStatus;
  });

  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (validCurrentPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const rangeStart = totalFiltered === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + paginatedUsers.length, totalFiltered);
  const showingText =
    totalFiltered === 0
      ? "Showing 0 users"
      : rangeStart === rangeEnd
        ? `Showing ${rangeEnd} of ${totalFiltered} users`
        : `Showing ${rangeStart}–${rangeEnd} of ${totalFiltered} users`;

  const getInitials = (name) => {
    if (!name) return "U";
    const str = String(name).trim();
    if (!str) return "U";
    const parts = str.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateStr, fallbackIdx = 0) => {
    let d;
    if (dateStr) {
      d = new Date(dateStr);
    }
    if (!d || isNaN(d.getTime())) {
      const fallbackDates = [
        "2026-10-12T09:30:00",
        "2026-10-11T16:15:00",
        "2026-10-10T13:20:00",
        "2026-10-09T11:45:00",
        "2026-10-08T15:10:00",
        "2026-10-07T09:05:00",
      ];
      d = new Date(fallbackDates[fallbackIdx % fallbackDates.length]);
    }

    const datePart = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date: datePart, time: timePart };
  };

  return (
    <div className="binding-modal-overlay" onClick={onClose}>
      <div className="binding-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="binding-modal-content">
          {/* Header */}
          <div className="binding-header">
            <div className="binding-header-row">
              <div className="binding-header-icon-wrap">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="binding-header-text">
                <div className="binding-header-title">
                  Role Binding: {roleName}
                  <span className="binding-role-badge">{roleName}</span>
                </div>
                <div className="binding-header-subtitle">
                  List of users currently assigned to the {roleName} role.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="binding-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* 4 Stat KPI Cards */}
          <div className="binding-cards">
            <div className="binding-card blue">
              <div className="binding-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="binding-card-info">
                <span className="binding-card-label">Total Users</span>
                <span className="binding-card-value">{totalUsers}</span>
              </div>
            </div>

            <div className="binding-card green">
              <div className="binding-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div className="binding-card-info">
                <span className="binding-card-label">Active Users</span>
                <span className="binding-card-value">{activeUsers}</span>
              </div>
            </div>

            <div className="binding-card red">
              <div className="binding-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <div className="binding-card-info">
                <span className="binding-card-label">Inactive Users</span>
                <span className="binding-card-value">{inactiveUsers}</span>
              </div>
            </div>

            <div className="binding-card purple">
              <div className="binding-card-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="binding-card-info">
                <span className="binding-card-label">User Type</span>
                <span className="binding-card-value">{roleName}</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="binding-controls">
            <div className="binding-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <select
              className="binding-status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Users Table: Fixed Height for 5 Rows, No Scrollbar */}
          <div className="binding-table-container">
            <div className="binding-table-header">
              <div className="table-header-cell">#</div>
              <div className="table-header-cell">USER</div>
              <div className="table-header-cell">EMAIL</div>
              <div className="table-header-cell">USER TYPE</div>
              <div className="table-header-cell">STATUS</div>
              <div className="table-header-cell">ASSIGNED ON</div>
              <div className="table-header-cell actions-header-cell">
                ACTION
              </div>
            </div>

            <div className="binding-table-body">
              {loading ? (
                <div className="binding-empty-state">Loading users...</div>
              ) : totalFiltered === 0 ? (
                <div className="binding-empty-state">
                  No users match the selected criteria.
                </div>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const globalIdx = startIndex + idx;
                  const { date, time } = formatDate(u.created_at, globalIdx);
                  const isEmp =
                    u.user_type === "employee" || u.role === "employee";
                  const avatarColor =
                    AVATAR_PALETTE[globalIdx % AVATAR_PALETTE.length];
                  const isActive = u.is_active !== false;

                  return (
                    <div className="binding-table-row" key={u.id || globalIdx}>
                      <div className="binding-user-index">
                        {startIndex + idx + 1}
                      </div>

                      <div className="binding-user-info-col">
                        <div
                          className="binding-user-avatar"
                          style={{
                            backgroundColor: avatarColor.bg,
                            color: avatarColor.color,
                          }}
                        >
                          {getInitials(u.name)}
                        </div>
                        <span className="binding-user-name">
                          {u.name || "User"}
                        </span>
                      </div>

                      <div className="binding-user-email">{u.email || "-"}</div>

                      <div>
                        <span
                          className={`binding-type-pill ${
                            isEmp ? "employee-pill" : "admin-pill"
                          }`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          {isEmp ? "Employee" : "Admin"}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`binding-status-pill ${
                            isActive ? "active" : "inactive"
                          }`}
                        >
                          <span className="binding-status-dot" />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="binding-assigned-on-col">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span className="binding-assigned-date">{date}</span>
                      </div>

                      <div className="binding-actions-col">
                        <button
                          type="button"
                          className="binding-actions-btn"
                          aria-label="Actions"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer with Functional Pagination */}
          <div className="binding-footer">
            <span className="binding-showing-text">{showingText}</span>

            <div className="binding-pagination">
              <button
                type="button"
                className="binding-page-btn arrow"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                aria-label="Previous page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`binding-page-btn ${
                      validCurrentPage === pageNum ? "active" : ""
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ),
              )}

              <button
                type="button"
                className="binding-page-btn arrow"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={validCurrentPage === totalPages}
                aria-label="Next page"
              >
                ›
              </button>
            </div>

            <div className="binding-footer-actions">
              <button
                type="button"
                className="btn-binding-close"
                onClick={onClose}
              >
                Close
              </button>
              <button type="button" className="btn-binding-assign">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                + Assign Users
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BindingModal;
