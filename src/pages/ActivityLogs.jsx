import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import "./ActivityLogs.css";
import { usePermission } from "../context/PermissionContext";
import { useTheme } from "../context/ThemeContext";
import Modal from "../components/Modal";
import ActivityDetailsView from "../components/ActivityDetailsView";
import CustomSelect from "../components/CustomSelect";
import CustomDatePicker from "../components/CustomDatePicker";
import { API_URL } from "../config/axios.util";

function ActivityLogs() {
  const { theme } = useTheme();
  const { hasPermission, loading: permissionsLoading } = usePermission();

  const canViewActivityLogs = hasPermission("activity_logs.view");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter input states (live)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedTargetUser, setSelectedTargetUser] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Applied filter states
  const [appliedFilters, setAppliedFilters] = useState({
    search: "",
    action: "all",
    targetUser: "all",
    user: "all",
    startDate: "",
    endDate: "",
  });

  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedLog, setSelectedLog] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  const exportRef = useRef(null);
  const dateRangeRef = useRef(null);
  const isInitialMount = useRef(true);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
      if (dateRangeRef.current && !dateRangeRef.current.contains(e.target)) {
        setDateRangeOpen(false);
      }
      if (!e.target.closest(".activity-row-action-wrapper")) {
        setOpenRowMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchActivityLogs = useCallback(
    async (retries = 2) => {
      if (!canViewActivityLogs) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/activity-logs/get-all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const rawLogs = response.data?.data || response.data || [];
        const logsWithIndex = rawLogs.map((log, index) => ({
          ...log,
          _displayIndex: rawLogs.length - index,
        }));
        setLogs(logsWithIndex);
      } catch (err) {
        console.error("Error fetching activity logs:", err);
        if (retries > 0) {
          setTimeout(() => {
            fetchActivityLogs(retries - 1);
          }, 350);
          return;
        }

        if (err.response?.status === 401) {
          setError("Unauthorized. Please login again.");
        } else if (err.response?.status === 403) {
          setError("You do not have permission to view activity logs.");
        } else {
          setError("Failed to load activity logs.");
        }
      } finally {
        setLoading(false);
      }
    },
    [canViewActivityLogs],
  );

  useEffect(() => {
    if (permissionsLoading || !canViewActivityLogs) {
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchActivityLogs();
    }
  }, [permissionsLoading, canViewActivityLogs, fetchActivityLogs]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const totalActivities = logs.length;

    const uniqueUsersSet = new Set();
    const distinctActionsSet = new Set();

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    let todayCount = 0;

    logs.forEach((log) => {
      const performer = log.performed_by_name || log.performed_by;
      if (performer) uniqueUsersSet.add(String(performer).trim());

      if (log.action) distinctActionsSet.add(String(log.action).trim());

      if (log.created_at) {
        const d = new Date(log.created_at);
        if (
          d.getFullYear() === todayYear &&
          d.getMonth() === todayMonth &&
          d.getDate() === todayDate
        ) {
          todayCount++;
        }
      }
    });

    return {
      total: totalActivities,
      uniqueUsers: uniqueUsersSet.size,
      distinctActions: distinctActionsSet.size,
      todayActivities: todayCount,
    };
  }, [logs]);

  // Dynamic filter options based on all logs
  const actionOptions = useMemo(() => {
    const actions = Array.from(
      new Set(logs.map((l) => l.action).filter(Boolean)),
    ).sort();
    return [
      { value: "all", label: "All Actions" },
      ...actions.map((act) => ({ value: act, label: act })),
    ];
  }, [logs]);

  const targetUserOptions = useMemo(() => {
    const targets = Array.from(
      new Set(
        logs
          .map(
            (l) =>
              l.target_user_name ||
              (l.target_user !== null && l.target_user !== undefined
                ? String(l.target_user)
                : ""),
          )
          .filter(Boolean),
      ),
    ).sort();
    return [
      { value: "all", label: "All Target Users" },
      ...targets.map((tgt) => ({ value: tgt, label: tgt })),
    ];
  }, [logs]);

  const userOptions = useMemo(() => {
    const users = Array.from(
      new Set(
        logs
          .map(
            (l) =>
              l.performed_by_name ||
              (l.performed_by !== null && l.performed_by !== undefined
                ? String(l.performed_by)
                : ""),
          )
          .filter(Boolean),
      ),
    ).sort();
    return [
      { value: "all", label: "All Users" },
      ...users.map((u) => ({ value: u, label: u })),
    ];
  }, [logs]);

  // Handle Apply & Reset
  const handleApplyFilters = () => {
    setAppliedFilters({
      search: searchTerm.trim(),
      action: selectedAction,
      targetUser: selectedTargetUser,
      user: selectedUser,
      startDate: startDate,
      endDate: endDate,
    });
    setCurrentPage(1);
    setDateRangeOpen(false);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedAction("all");
    setSelectedTargetUser("all");
    setSelectedUser("all");
    setStartDate("");
    setEndDate("");
    setAppliedFilters({
      search: "",
      action: "all",
      targetUser: "all",
      user: "all",
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
    setDateRangeOpen(false);
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search term
      if (appliedFilters.search) {
        const query = appliedFilters.search.toLowerCase();
        const performer = String(
          log.performed_by_name || log.performed_by || "",
        ).toLowerCase();
        const action = String(log.action || "").toLowerCase();
        const target = String(
          log.target_user_name || log.target_user || "",
        ).toLowerCase();
        const detailsStr = JSON.stringify(log.details || {}).toLowerCase();

        if (
          !performer.includes(query) &&
          !action.includes(query) &&
          !target.includes(query) &&
          !detailsStr.includes(query)
        ) {
          return false;
        }
      }

      // 2. Action filter
      if (appliedFilters.action !== "all") {
        if (String(log.action) !== String(appliedFilters.action)) {
          return false;
        }
      }

      // 3. Target User filter
      if (appliedFilters.targetUser !== "all") {
        const targetStr = String(log.target_user_name || log.target_user || "");
        if (targetStr !== String(appliedFilters.targetUser)) {
          return false;
        }
      }

      // 4. Performed by user filter
      if (appliedFilters.user !== "all") {
        const userStr = String(log.performed_by_name || log.performed_by || "");
        if (userStr !== String(appliedFilters.user)) {
          return false;
        }
      }

      // 5. Date range filter
      if (appliedFilters.startDate) {
        const start = new Date(appliedFilters.startDate);
        start.setHours(0, 0, 0, 0);
        const logDate = new Date(log.created_at);
        if (logDate < start) return false;
      }

      if (appliedFilters.endDate) {
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        const logDate = new Date(log.created_at);
        if (logDate > end) return false;
      }

      return true;
    });
  }, [logs, appliedFilters]);

  // Pagination calculations
  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
  const startIndex =
    totalEntries === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, totalEntries);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, currentPage, rowsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }
    return pages;
  };

  // Format Date and Time
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Export handlers
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      "#",
      "Performed By",
      "Role",
      "Action",
      "Target User",
      "Details",
      "Date & Time",
    ];
    const rows = filteredLogs.map((log, index) => [
      index + 1,
      `"${log.performed_by_name || log.performed_by || "-"}"`,
      `"${log.performed_by_role || "General Admin"}"`,
      `"${log.action || "-"}"`,
      `"${log.target_user_name || log.target_user || "-"}"`,
      `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
      `"${formatDateTime(log.created_at)}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportOpen(false);
  };

  const handleExportJSON = () => {
    if (filteredLogs.length === 0) return;

    const jsonStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute(
      "download",
      `activity_logs_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportOpen(false);
  };

  if (permissionsLoading) {
    return (
      <div className={`activity-logs-container ${theme}-theme`}>
        <div className="activity-logs-loading-card">
          <div className="activity-logs-message">Loading activity logs...</div>
        </div>
      </div>
    );
  }

  if (!canViewActivityLogs) {
    if (permissionsLoading) {
      return (
        <div
          style={{
            height: "60vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#64748b" }}>Loading activity logs...</div>
        </div>
      );
    }
    return (
      <div
        className={`activity-logs-container ${theme}-theme`}
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <h2>Access Denied</h2>
        <p>You do not have permission to view activity logs.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`activity-logs-container ${theme}-theme`}>
        <div className="activity-logs-error-card">
          <h2>Unable to load activity logs</h2>
          <p>{error}</p>
          <button
            type="button"
            className="activity-filter-btn apply"
            style={{ marginTop: "16px", cursor: "pointer" }}
            onClick={() => fetchActivityLogs()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Date Range label
  const dateRangeLabel =
    startDate || endDate
      ? `${startDate ? startDate.slice(5) : "Start"} to ${endDate ? endDate.slice(5) : "End"}`
      : "Select Date Range";

  return (
    <div className={`activity-logs-container ${theme}-theme`}>
      <div className="activity-logs-content">
        {/* Header Section */}
        <div className="activity-logs-header">
          <div className="activity-title-area">
            <span className="activity-breadcrumb-tag">ACTIVITY MANAGEMENT</span>
            <h1 className="activity-title">Activity Log</h1>
            <p className="activity-subtitle">
              Monitor all system activities and user actions.
            </p>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="activity-kpi-grid">
          {/* Card 1: Total Activities */}
          <div className="activity-kpi-card">
            <div className="activity-kpi-icon-box blue">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="activity-kpi-info">
              <span className="activity-kpi-label">Total Activities</span>
              <span className="activity-kpi-value">{kpiStats.total}</span>
            </div>
          </div>

          {/* Card 2: Unique Users */}
          <div className="activity-kpi-card">
            <div className="activity-kpi-icon-box green">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
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
            <div className="activity-kpi-info">
              <span className="activity-kpi-label">Unique Users</span>
              <span className="activity-kpi-value">{kpiStats.uniqueUsers}</span>
            </div>
          </div>

          {/* Card 3: Distinct Actions */}
          <div className="activity-kpi-card">
            <div className="activity-kpi-icon-box orange">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div className="activity-kpi-info">
              <span className="activity-kpi-label">Distinct Actions</span>
              <span className="activity-kpi-value">
                {kpiStats.distinctActions}
              </span>
            </div>
          </div>

          {/* Card 4: Today's Activities */}
          <div className="activity-kpi-card">
            <div className="activity-kpi-icon-box purple">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9333ea"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="activity-kpi-info">
              <span className="activity-kpi-label">Today's Activities</span>
              <span className="activity-kpi-value">
                {kpiStats.todayActivities}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="activity-filters-row">
          {/* Search Box */}
          <div className="activity-search-box">
            <span className="activity-search-icon">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by user name, action or target user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              className="activity-search-field"
            />
          </div>

          {/* All Actions Dropdown */}
          <CustomSelect
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            options={actionOptions}
            minWidth="145px"
            placeholder="All Actions"
          />

          {/* All Users Dropdown */}
          <CustomSelect
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            options={userOptions}
            minWidth="140px"
            placeholder="All Users"
          />

          {/* Date Range Picker Button & Popover */}
          <div className="activity-date-range-wrapper" ref={dateRangeRef}>
            <button
              type="button"
              className="activity-date-range-btn"
              onClick={() => setDateRangeOpen((prev) => !prev)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{dateRangeLabel}</span>
            </button>

            {dateRangeOpen && (
              <div className="activity-date-range-popover">
                <div className="activity-date-popover-title">
                  Date Range Filter
                </div>
                <div className="activity-date-inputs">
                  <div className="activity-date-group">
                    <label>From Date</label>
                    <CustomDatePicker
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="dd-mm-yyyy"
                    />
                  </div>
                  <div className="activity-date-group">
                    <label>To Date</label>
                    <CustomDatePicker
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      placeholder="dd-mm-yyyy"
                    />
                  </div>
                </div>
                <div className="activity-date-popover-actions">
                  <button
                    type="button"
                    className="activity-date-clear-btn"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="activity-date-apply-btn"
                    onClick={handleApplyFilters}
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Apply Button */}
          <button
            type="button"
            className="activity-filter-btn apply"
            onClick={handleApplyFilters}
          >
            Apply
          </button>

          {/* Reset Button */}
          <button
            type="button"
            className="activity-filter-btn reset"
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </div>

        {/* Table Section */}
        <div className="activity-table-card">
          <div className="activity-table-container">
            <table className="activity-custom-table">
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>#</th>
                  <th style={{ width: "230px" }}>PERFORMED BY</th>
                  <th>ACTION</th>
                  <th>TARGET USER</th>
                  <th style={{ width: "120px" }}>DETAILS</th>
                  <th style={{ width: "200px" }}>DATE & TIME</th>
                  <th style={{ width: "60px", textAlign: "center" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="activity-table-empty">
                      Loading activity logs...
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="activity-table-empty">
                      No activity logs found.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, index) => {
                    const rowNumber =
                      (currentPage - 1) * rowsPerPage + index + 1;
                    const performerName =
                      log.performed_by_name || log.performed_by || "Unknown";
                    const performerRole =
                      log.performed_by_role || "General Admin";
                    const avatarLetter =
                      String(performerName).charAt(0).toUpperCase() || "U";
                    const isRowMenuOpen = openRowMenuId === log.id;

                    return (
                      <tr key={log.id || index}>
                        {/* Index */}
                        <td className="activity-cell-index">{rowNumber}</td>

                        {/* Performed By with Avatar */}
                        <td>
                          <div className="activity-performer-cell">
                            <div className="activity-performer-avatar">
                              {avatarLetter}
                            </div>
                            <div className="activity-performer-details">
                              <span className="activity-performer-name">
                                {performerName}
                              </span>
                              <span className="activity-performer-role">
                                {performerRole}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="activity-cell-action-text">
                          {log.action || "-"}
                        </td>

                        {/* Target User */}
                        <td className="activity-cell-target-text">
                          {log.target_user_name || log.target_user || "-"}
                        </td>

                        {/* Details */}
                        <td>
                          <button
                            type="button"
                            className="activity-details-link"
                            onClick={() => setSelectedLog(log)}
                          >
                            View Details &rarr;
                          </button>
                        </td>

                        {/* Date & Time */}
                        <td>
                          <div className="activity-datetime-cell">
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
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
                            <span>{formatDateTime(log.created_at)}</span>
                          </div>
                        </td>

                        {/* Row Action menu */}
                        <td style={{ textAlign: "center" }}>
                          <div className="activity-row-action-wrapper">
                            <button
                              type="button"
                              className="activity-row-action-btn"
                              onClick={() =>
                                setOpenRowMenuId((prev) =>
                                  prev === log.id ? null : log.id,
                                )
                              }
                              title="Actions"
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
                                <circle cx="12" cy="5" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="12" cy="19" r="1.5" />
                              </svg>
                            </button>

                            {isRowMenuOpen && (
                              <div className="activity-row-action-menu">
                                <button
                                  type="button"
                                  className="activity-row-menu-item"
                                  onClick={() => {
                                    setOpenRowMenuId(null);
                                    setSelectedLog(log);
                                  }}
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
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  <span>View Details</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="activity-pagination-footer">
            <div className="activity-pagination-info">
              Showing {startIndex} to {endIndex} of {totalEntries} entries
            </div>

            <div className="activity-pagination-controls">
              <div className="activity-rows-per-page">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="activity-rows-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="activity-page-buttons">
                <button
                  type="button"
                  className="activity-page-btn arrow"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  &lsaquo;
                </button>

                {getPaginationPages().map((page, idx) =>
                  page === "..." ? (
                    <span key={`dots-${idx}`} className="activity-page-dots">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      className={`activity-page-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  className="activity-page-btn arrow"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  &rsaquo;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        className="activity-details-modal-box"
      >
        <div className="activity-details-modal-content">
          {selectedLog && <ActivityDetailsView log={selectedLog} />}
        </div>
      </Modal>
    </div>
  );
}

export default ActivityLogs;
