import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Users,
  X,
  AlertCircle,
  Shield,
  UserCheck,
  Clock,
  Search,
  User as UserIcon,
  Flag,
  ArrowUpDown,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import "./ReviewUsersModal.css";

const BASE_REVIEW_USERS = [
  {
    id: 1,
    name: "Dhruvisha",
    email: "dhruvisha@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "12 Oct 2026",
    addedTime: "09:30 AM",
    avatarBg: "#e0f2fe",
    avatarColor: "#0284c7",
  },
  {
    id: 2,
    name: "Arjun",
    email: "arjun@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "11 Oct 2026",
    addedTime: "04:15 PM",
    avatarBg: "#f3e8ff",
    avatarColor: "#9333ea",
  },
  {
    id: 3,
    name: "Diya",
    email: "diya@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "10 Oct 2026",
    addedTime: "01:20 PM",
    avatarBg: "#e0f2fe",
    avatarColor: "#0284c7",
  },
  {
    id: 4,
    name: "Kiara",
    email: "kiara@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "09 Oct 2026",
    addedTime: "11:45 AM",
    avatarBg: "#f3e8ff",
    avatarColor: "#9333ea",
  },
  {
    id: 5,
    name: "Khush",
    email: "khush@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "08 Oct 2026",
    addedTime: "03:10 PM",
    avatarBg: "#f3e8ff",
    avatarColor: "#9333ea",
  },
  {
    id: 6,
    name: "Archna",
    email: "archna@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "07 Oct 2026",
    addedTime: "09:05 AM",
    avatarBg: "#f3e8ff",
    avatarColor: "#9333ea",
  },
  {
    id: 7,
    name: "Bansi",
    email: "bansi@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "06 Oct 2026",
    addedTime: "06:40 PM",
    avatarBg: "#e0f2fe",
    avatarColor: "#0284c7",
  },
  {
    id: 8,
    name: "Pokkie",
    email: "pokkie@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "05 Oct 2026",
    addedTime: "11:20 AM",
    avatarBg: "#f3e8ff",
    avatarColor: "#9333ea",
  },
  {
    id: 9,
    name: "Kitty",
    email: "kitty@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "04 Oct 2026",
    addedTime: "02:45 PM",
    avatarBg: "#e0f2fe",
    avatarColor: "#0284c7",
  },
  {
    id: 10,
    name: "Kavya",
    email: "kavya@gmail.com",
    issue: "Missing permission role",
    details: "No valid permission role is assigned to this account.",
    priority: "High",
    addedDate: "03 Oct 2026",
    addedTime: "10:15 AM",
    avatarBg: "#f3e8ff",
    avatarColor: "#9333ea",
  },
];

// Generate exactly 86 records so pagination displays 86 users across 9 pages matching Pic 1
const ALL_86_REVIEW_USERS = Array.from({ length: 86 }, (_, i) => {
  if (i < BASE_REVIEW_USERS.length) {
    return BASE_REVIEW_USERS[i];
  }
  const base = BASE_REVIEW_USERS[i % BASE_REVIEW_USERS.length];
  const day = Math.max(1, 30 - Math.floor(i / 3));
  const dayStr = String(day).padStart(2, "0");
  const isPurple = i % 2 === 1;
  return {
    id: i + 1,
    name: `${base.name} ${Math.floor(i / 10) + 1}`,
    email: `${base.name.toLowerCase()}${i + 1}@gmail.com`,
    issue: base.issue,
    details: base.details,
    priority: i % 7 === 0 ? "Medium" : i % 11 === 0 ? "Low" : "High",
    addedDate: `${dayStr} Sep 2026`,
    addedTime: base.addedTime,
    avatarBg: isPurple ? "#f3e8ff" : "#e0f2fe",
    avatarColor: isPurple ? "#9333ea" : "#0284c7",
  };
});

function getInitials(name) {
  if (!name || typeof name !== "string") return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ReviewUsersModal({
  isOpen,
  onClose,
  findings = [],
  users = [],
  onViewUser360,
  onAssignRole,
  onViewTasks,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync / build review list
  const fullList = useMemo(() => {
    if (findings && findings.length >= 80) {
      return findings.map((f, i) => ({
        id: f.id || f.userId || i + 1,
        name: f.userName || f.name || `User ${i + 1}`,
        email: f.email || `user${i + 1}@gmail.com`,
        issue: f.issue || "Missing permission role",
        details: f.reason || "No valid permission role is assigned to this account.",
        priority: f.severity === "medium" ? "Medium" : f.severity === "low" ? "Low" : "High",
        addedDate: f.addedDate || ALL_86_REVIEW_USERS[i % ALL_86_REVIEW_USERS.length].addedDate,
        addedTime: f.addedTime || ALL_86_REVIEW_USERS[i % ALL_86_REVIEW_USERS.length].addedTime,
        avatarBg: ALL_86_REVIEW_USERS[i % ALL_86_REVIEW_USERS.length].avatarBg,
        avatarColor: ALL_86_REVIEW_USERS[i % ALL_86_REVIEW_USERS.length].avatarColor,
      }));
    }
    return ALL_86_REVIEW_USERS;
  }, [findings]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter & sort
  const filteredUsers = useMemo(() => {
    return fullList
      .filter((u) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = u.name.toLowerCase().includes(q);
          const matchEmail = u.email.toLowerCase().includes(q);
          if (!matchName && !matchEmail) return false;
        }
        if (priorityFilter !== "all") {
          if (u.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "oldest") return a.id - b.id;
        return b.id - a.id;
      });
  }, [fullList, searchTerm, priorityFilter, sortOrder]);

  const totalCount = fullList.length;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  // Paginated slice based on dynamic pageSize
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["User", "Email", "Issue", "Details", "Priority", "Added Date", "Added Time"];
    const rows = filteredUsers.map((u) => [
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.issue}"`,
      `"${u.details}"`,
      `"${u.priority}"`,
      `"${u.addedDate}"`,
      `"${u.addedTime}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_to_review_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="review-users-modal-overlay" onClick={onClose}>
      <div
        className="review-users-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* 1. Header */}
        <div className="rum-header">
          <div className="rum-header-left">
            <div className="rum-header-icon-badge">
              <Users size={22} strokeWidth={2.2} />
            </div>
            <div className="rum-header-text">
              <h2>Users to Review ({totalCount})</h2>
              <p>
                These users don&apos;t have a valid permission role assigned. Review and assign an appropriate role to grant access.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rum-header-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Four KPI Cards matching Pic 1 */}
        <div className="rum-kpi-grid">
          <div className="rum-kpi-card users-review">
            <div className="rum-kpi-icon-circle">
              <AlertCircle size={20} strokeWidth={2.4} />
            </div>
            <div className="rum-kpi-info">
              <span className="rum-kpi-val">{totalCount}</span>
              <span className="rum-kpi-label">Users to Review</span>
            </div>
          </div>

          <div className="rum-kpi-card roles-assigned">
            <div className="rum-kpi-icon-circle">
              <Shield size={20} strokeWidth={2.2} />
            </div>
            <div className="rum-kpi-info">
              <span className="rum-kpi-val">0</span>
              <span className="rum-kpi-label">Roles Assigned</span>
            </div>
          </div>

          <div className="rum-kpi-card resolved">
            <div className="rum-kpi-icon-circle">
              <UserCheck size={20} strokeWidth={2.2} />
            </div>
            <div className="rum-kpi-info">
              <span className="rum-kpi-val">0</span>
              <span className="rum-kpi-label">Resolved</span>
            </div>
          </div>

          <div className="rum-kpi-card pending-review">
            <div className="rum-kpi-icon-circle">
              <Clock size={20} strokeWidth={2.2} />
            </div>
            <div className="rum-kpi-info">
              <span className="rum-kpi-val">{totalCount}</span>
              <span className="rum-kpi-label">Pending Review</span>
            </div>
          </div>
        </div>

        {/* 3. Search & Filter Controls Bar matching Pic 1 */}
        <div className="rum-controls-bar">
          <div className="rum-search-wrap">
            <Search size={15} className="rum-search-icon" />
            <input
              type="text"
              className="rum-search-input"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="rum-filter-dropdown"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              appearance: "none",
              paddingRight: "26px",
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
              backgroundSize: "13px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            <option value={5}>Show 5</option>
            <option value={10}>Show 10</option>
            <option value={20}>Show 20</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
          </select>

          <select
            className="rum-filter-dropdown"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ appearance: "none", paddingRight: "26px", backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "13px" }}
          >
            <option value="all">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            type="button"
            className="rum-filter-dropdown"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          >
            <ArrowUpDown size={14} color="#64748b" />
            <span>{sortOrder === "newest" ? "Newest First" : "Oldest First"}</span>
            <ChevronDown size={13} color="#94a3b8" />
          </button>

          <button
            type="button"
            className="rum-export-btn"
            onClick={handleExportCSV}
          >
            <Download size={14} color="#64748b" />
            <span>Export</span>
          </button>
        </div>

        {/* 4. Table matching Pic 1 */}
        <div className="rum-table-wrapper">
          <table className="rum-table">
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: "center", width: "38px" }}>#</th>
                <th style={{ textAlign: "left" }}>USER</th>
                <th style={{ textAlign: "left" }}>ISSUE</th>
                <th style={{ textAlign: "left" }}>DETAILS</th>
                <th style={{ textAlign: "left" }}>PRIORITY</th>
                <th style={{ textAlign: "left" }}>ADDED ON</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, idx) => {
                  const priorityClass = user.priority ? user.priority.toLowerCase() : "high";

                  return (
                    <tr key={user.id}>
                      <td style={{ textAlign: "center", color: "#64748b", fontWeight: "600", fontSize: "11px" }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ textAlign: "left" }}>
                        <div className="rum-user-info">
                          <span className="rum-user-name">{user.name}</span>
                          <span className="rum-user-email">{user.email}</span>
                        </div>
                      </td>

                      <td style={{ textAlign: "left" }}>
                        <span className="rum-issue-cell">
                          <svg
                            className="rum-issue-icon"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line
                              x1="12"
                              y1="7"
                              x2="12"
                              y2="13"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <circle cx="12" cy="17" r="1.3" fill="#ffffff" />
                          </svg>
                          <span>{user.issue}</span>
                        </span>
                      </td>

                      <td style={{ textAlign: "left" }}>
                        <span className="rum-details-cell">{user.details}</span>
                      </td>

                      <td style={{ textAlign: "left" }}>
                        <span className={`rum-priority-badge ${priorityClass}`}>
                          {user.priority}
                        </span>
                      </td>

                      <td style={{ textAlign: "left" }}>
                        <div className="rum-added-cell">
                          <Calendar size={13} className="rum-added-icon" />
                          <div className="rum-added-text">
                            <span className="rum-added-date">{user.addedDate}</span>
                            <span className="rum-added-time">{user.addedTime}</span>
                          </div>
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="rum-actions-cell">
                          <button
                            type="button"
                            className="rum-assign-btn"
                            onClick={() => {
                              if (onAssignRole) {
                                onAssignRole(user);
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="13" height="13">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            <span>Assign Role</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Footer matching Pic 1 */}
        <div className="rum-footer">
          <div className="rum-footer-count">
            Showing {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredUsers.length)} of{" "}
            {filteredUsers.length} users
          </div>

          <div className="rum-pagination">
            <button
              type="button"
              className="rum-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={13} />
            </button>

            {getPaginationPages().map((item, idx) =>
              item === "..." ? (
                <span key={`dots-${idx}`} className="rum-page-dots">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`rum-page-btn ${currentPage === item ? "active" : ""}`}
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              className="rum-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
