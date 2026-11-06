import { useState, useEffect, useCallback, useMemo } from "react";
import { Navigate } from "react-router-dom";
import {
  getMyApprovalRequests,
  createApprovalRequest,
  getApprovalRequestById,
  cancelApprovalRequest,
  getApprovalStats,
  getApprovalRules,
} from "../services/approvalService";
import { getCommonMasterByType } from "../services/commonMasterService";
import ApprovalStepper from "../components/ApprovalStepper";
import TicketAttachmentsView from "../components/TicketAttachmentsView";
import SuccessToast from "../components/SuccessToast";
import CustomSelect from "../components/CustomSelect";
import { useAuth } from "../context/AuthContext";
import "./MyRequests.css";

const formatDateTime = (dateStr) => {
  if (!dateStr) return { date: "-", time: "" };
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { date, time };
};

const formatCurrency = (amt) => {
  if (amt === null || amt === undefined || amt === "") return "-";
  const num = Number(amt);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

export default function MyRequests() {
  const { user } = useAuth();
  const isGeneralAdmin =
    user?.role === "general_admin" ||
    user?.role === "super_admin" ||
    (user?.role_name || "").toLowerCase() === "general admin" ||
    (user?.roleName || "").toLowerCase() === "general admin" ||
    user?.baseRole === "general_admin" ||
    user?.email === "nency@gmail.com";

  if (isGeneralAdmin) {
    return <Navigate to="/approvals/inbox" replace />;
  }

  // State
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [rules, setRules] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    request_type: "",
    amount: "",
    description: "",
  });
  const [formFiles, setFormFiles] = useState([]);
  const [formError, setFormError] = useState("");

  // Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await getApprovalStats();
      if (res.success && res.data?.myStats) {
        setStats(res.data.myStats);
      }
    } catch (err) {
      console.error("Failed to load approval stats:", err);
    }
  }, []);

  // Fetch Rules & Common Master Request Types
  const loadRules = useCallback(async () => {
    try {
      const [rulesRes, masterRes] = await Promise.all([
        getApprovalRules().catch(() => null),
        getCommonMasterByType("approval_request_type").catch(() => null),
      ]);
      if (rulesRes?.success && rulesRes.data) {
        setRules(rulesRes.data);
      }
      if (masterRes?.success && Array.isArray(masterRes.data) && masterRes.data.length > 0) {
        setRequestTypes(masterRes.data.map((item) => item.name));
      } else if (rulesRes?.success && rulesRes.data) {
        setRequestTypes(rulesRes.data.map((r) => r.request_type));
      }
    } catch (err) {
      console.error("Failed to load rules:", err);
    }
  }, []);

  // Fetch Requests List
  const fetchRequests = useCallback(
    async (page = 1, limit = pageSize) => {
      setLoading(true);
      console.log(`[MyRequests API] Calling getMyApprovalRequests page=${page}&limit=${limit}`);
      try {
        const params = {
          page,
          limit,
          search: search.trim() || undefined,
          status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
          request_type: typeFilter && typeFilter !== "all" ? typeFilter : undefined,
        };

        const res = await getMyApprovalRequests(params);
        if (res.success) {
          setRequests(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalRecords(res.pagination?.total || 0);
          setCurrentPage(res.pagination?.page || page);
        }
      } catch (err) {
        console.error("Failed to fetch requests:", err);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, search, statusFilter, typeFilter]
  );

  useEffect(() => {
    loadStats();
    loadRules();
  }, [loadStats, loadRules]);

  useEffect(() => {
    fetchRequests(1, pageSize);
  }, [fetchRequests, pageSize]);

  // Handle Page Size Change (Show 5, Show 10, etc.)
  const handlePageSizeChange = (valOrEvent) => {
    const rawVal = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    const newSize = Number(rawVal) || 5;
    setPageSize(newSize);
    setCurrentPage(1);
    fetchRequests(1, newSize);
  };

  // Handle Filter Changes
  const handleTypeFilterChange = (valOrEvent) => {
    const rawVal = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    setTypeFilter(rawVal);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (valOrEvent) => {
    const rawVal = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    setStatusFilter(rawVal);
    setCurrentPage(1);
  };

  // Handle Page Navigation
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchRequests(newPage, pageSize);
  };

  // Dynamic page size calculation (e.g., 3 items -> Show 5; 7 items -> Show 5, Show 10; 14 items -> Show 5, Show 10, Show 15; 16 items -> Show 5, Show 10, Show 15, Show 20)
  const getPageSizeOptions = (totalCount) => {
    const count = Number(totalCount) || 0;
    const maxLimit = Math.max(5, Math.ceil(count / 5) * 5);
    const options = [];
    for (let i = 5; i <= maxLimit; i += 5) {
      options.push({ value: i, label: `Show ${i}` });
    }
    return options;
  };

  const currentTotal = totalRecords > 0 ? totalRecords : (stats?.total || requests.length || 0);
  const pageSizeOptions = useMemo(() => getPageSizeOptions(currentTotal), [currentTotal]);

  useEffect(() => {
    const availableSizes = pageSizeOptions.map((o) => o.value);
    if (availableSizes.length > 0 && !availableSizes.includes(pageSize)) {
      setPageSize(5);
    }
  }, [pageSizeOptions, pageSize]);

  // Open Create Modal
  const handleOpenCreate = () => {
    if (isGeneralAdmin) return;
    const defaultType =
      requestTypes.length > 0
        ? requestTypes[0]
        : rules.length > 0
        ? rules[0].request_type
        : "Laptop / Hardware Purchase";
    setFormData({
      title: "",
      request_type: defaultType,
      amount: "",
      description: "",
    });
    setFormFiles([]);
    setFormError("");
    setShowCreateModal(true);
  };

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  // Handle Files
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formFiles.length > 5) {
      setFormError("You can upload a maximum of 5 files.");
      return;
    }
    setFormFiles((prev) => [...prev, ...files].slice(0, 5));
    setFormError("");
  };

  const removeFile = (index) => {
    setFormFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit New Request
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Request title is required.");
      return;
    }
    if (!formData.request_type) {
      setFormError("Please select a request type.");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Detailed explanation is required.");
      return;
    }

    setSubmitting(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append("title", formData.title.trim());
      dataPayload.append("request_type", formData.request_type);
      dataPayload.append("description", formData.description.trim());
      if (formData.amount) {
        dataPayload.append("amount", formData.amount);
      }

      if (formFiles && formFiles.length > 0) {
        formFiles.forEach((file) => {
          dataPayload.append("files", file);
        });
      }

      const res = await createApprovalRequest(dataPayload);
      if (res.success) {
        setShowCreateModal(false);
        setToastMessage(`Approval Request ${res.data.request_code} submitted successfully!`);
        loadStats();
        fetchRequests(1, pageSize);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Details Modal
  const handleViewDetails = async (reqItem) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await getApprovalRequestById(reqItem.id);
      if (res.success) {
        setActiveRequest(res.data);
      } else {
        setActiveRequest(reqItem);
      }
    } catch (err) {
      console.error("Failed to load request details:", err);
      setActiveRequest(reqItem);
    } finally {
      setDetailLoading(false);
    }
  };

  // Cancel Request
  const handleCancel = async (id, code) => {
    if (!window.confirm(`Are you sure you want to cancel request ${code}?`)) return;
    try {
      const res = await cancelApprovalRequest(id);
      if (res.success) {
        setToastMessage(`Request ${code} was cancelled.`);
        loadStats();
        fetchRequests(currentPage, pageSize);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel request.");
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  // Options for Dropdowns
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Pending", label: "Pending Review" },
    { value: "In Review", label: "In Review" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  const availableRequestTypes =
    requestTypes.length > 0
      ? requestTypes
      : rules.map((r) => r.request_type);

  const typeOptions = [
    { value: "all", label: "All Request Types" },
    ...availableRequestTypes.map((t) => ({ value: t, label: t })),
  ];

  return (
    <div className="my-requests-page" id="my-requests-view">
      {/* Toast Notification */}
      {toastMessage && (
        <SuccessToast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* 1. Header */}
      <div className="requests-header-row">
        <div className="requests-header-titles">
          <span className="requests-eyebrow">APPROVAL WORKFLOW</span>
          <h1>My Approval Requests</h1>
          <p className="requests-subtitle">
            Submit requests, track workflow review progress, and communicate decisions with authorized approvers.
          </p>
        </div>

        <div className="requests-header-actions-area">
          {!isGeneralAdmin && (
            <button
              type="button"
              className="btn-create-request"
              id="btn-create-request"
              onClick={handleOpenCreate}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Submit New Request
            </button>
          )}

          {/* Floating Illustration Card */}
          <div className="inbox-header-illustration" aria-hidden="true">
            <div className="illustration-card-bg"></div>
            <div className="illustration-card-front">
              <div className="illus-card-clock">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="illus-card-bars">
                <div className="illus-bar bar-long"></div>
                <div className="illus-bar bar-med"></div>
                <div className="illus-bar bar-short"></div>
              </div>
              <div className="illus-card-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Stats Grid (Unclickable, no hover effect) */}
      <div className="requests-stats-grid">
        {/* Card 1: Total Submitted */}
        <div className="stat-card card-blue">
          <div className="stat-icon total">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Requests</span>
            <span className="stat-value">{stats.total || 0}</span>
            <span className="stat-subtext-muted">Lifetime submissions</span>
          </div>
          <div className="stat-corner-chart blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" opacity="0.6" />
              <rect x="7.5" y="11" width="3.5" height="11" rx="1" opacity="0.75" />
              <rect x="13" y="6" width="3.5" height="16" rx="1" opacity="0.9" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" opacity="1" />
            </svg>
          </div>
        </div>

        {/* Card 2: Pending In Review */}
        <div className="stat-card card-amber">
          <div className="stat-icon open">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">In Review</span>
            <span className="stat-value">{stats.pending || 0}</span>
            <span className="stat-subtext-muted">Awaiting decision</span>
          </div>
          <div className="stat-corner-chart amber">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" opacity="0.6" />
              <rect x="7.5" y="11" width="3.5" height="11" rx="1" opacity="0.75" />
              <rect x="13" y="6" width="3.5" height="16" rx="1" opacity="0.9" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" opacity="1" />
            </svg>
          </div>
        </div>

        {/* Card 3: Fully Approved */}
        <div className="stat-card card-green">
          <div className="stat-icon resolved">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Approved</span>
            <span className="stat-value">{stats.approved || 0}</span>
            <span className="stat-subtext-muted">Sign-off completed</span>
          </div>
          <div className="stat-corner-chart green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" opacity="0.6" />
              <rect x="7.5" y="11" width="3.5" height="11" rx="1" opacity="0.75" />
              <rect x="13" y="6" width="3.5" height="16" rx="1" opacity="0.9" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" opacity="1" />
            </svg>
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="stat-card card-rose">
          <div className="stat-icon" style={{ background: "#fef2f2", color: "#e11d48", border: "1px solid #ffe4e6" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Rejected</span>
            <span className="stat-value">{stats.rejected || 0}</span>
            <span className="stat-subtext-muted">Requires revision</span>
          </div>
          <div className="stat-corner-chart rose">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" opacity="0.6" />
              <rect x="7.5" y="11" width="3.5" height="11" rx="1" opacity="0.75" />
              <rect x="13" y="6" width="3.5" height="16" rx="1" opacity="0.9" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" opacity="1" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Controls Row (NO white container card across line) */}
      <div className="inbox-controls-row">
        {/* Standalone Search Bar */}
        <div className="inbox-search-wrapper">
          <span className="inbox-search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="inbox-search-input"
            id="requests-search-input"
            placeholder="Search by code, title, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="clear-search-btn" onClick={() => setSearch("")}>
              &times;
            </button>
          )}
        </div>

        {/* Filter Dropdowns on the right including Show Dropdown */}
        <div className="inbox-filters-group">
          <CustomSelect
            value={pageSize}
            onChange={handlePageSizeChange}
            options={pageSizeOptions}
            minWidth="110px"
          />

          <CustomSelect
            options={typeOptions}
            value={typeFilter}
            onChange={handleTypeFilterChange}
            placeholder="All Request Types"
            minWidth="160px"
            isClearable={true}
          />

          <CustomSelect
            options={statusOptions}
            value={statusFilter}
            onChange={handleStatusFilterChange}
            placeholder="All Statuses"
            minWidth="135px"
            isClearable={true}
          />
        </div>
      </div>

      {/* 4. Requests Table */}
      <div className="requests-table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th style={{ width: "45px", textAlign: "center" }}>#</th>
              <th>REQUEST ID</th>
              <th>REQUEST TYPE & TITLE</th>
              <th>AMOUNT</th>
              <th>PROGRESS / STAGE</th>
              <th>STATUS</th>
              <th>SUBMITTED ON</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="table-loading-cell">
                  <div className="table-spinner"></div>
                  <span>Loading approval requests...</span>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty-cell">
                  <div className="empty-box-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <h4>No approval requests found</h4>
                  <p>Submit your first approval request using the button above.</p>
                </td>
              </tr>
            ) : (
              requests.map((r, idx) => {
                const dt = formatDateTime(r.created_at);
                const isPendingOrReview = ["Pending", "In Review"].includes(r.status);

                return (
                  <tr key={r.id}>
                    {/* Index */}
                    <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: "12px" }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Code */}
                    <td>
                      <span className="request-code-badge">{r.request_code}</span>
                    </td>

                    {/* Title & Type */}
                    <td>
                      <div className="request-title-cell">
                        <span className="request-type-pill">{r.request_type}</span>
                        <div className="request-main-title">{r.title}</div>
                        <div className="request-desc-excerpt">{r.description}</div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td>
                      <span className="request-amount-cell">
                        {formatCurrency(r.amount)}
                      </span>
                    </td>

                    {/* Stage */}
                    <td>
                      <div className="stage-cell">
                        <span className="stage-step-tag">
                          Level {r.current_step} of {r.total_steps}
                        </span>
                        <span className="stage-name-text">
                          {r.current_step_name || "Review"}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <div className={`status-pill-custom ${r.status?.toLowerCase().replace(/\s+/g, "-")}`}>
                        <span className="status-dot"></span>
                        <span>{r.status}</span>
                      </div>
                    </td>

                    {/* Submitted On */}
                    <td>
                      <div className="date-cell">
                        <span className="date-main">{dt.date}</span>
                        <span className="date-sub">{dt.time}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="action-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-three-dots"
                          title="Actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId((prev) => (prev === r.id ? null : r.id));
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>

                        {openMenuId === r.id && (
                          <div className="action-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="action-dropdown-item"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleViewDetails(r);
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>View</span>
                            </button>

                            {isPendingOrReview && (
                              <button
                                type="button"
                                className="action-dropdown-item action-dropdown-delete"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleCancel(r.id, r.request_code);
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            )}
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

        {/* Pagination Footer */}
        <div className="table-pagination-footer">
          <div className="pagination-info">
            Showing {requests.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(currentPage * pageSize, totalRecords || requests.length)} of {totalRecords || requests.length} requests
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              &lt;
            </button>
            {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn-page-num ${p === currentPage ? "active" : ""}`}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn-page-nav"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 5. Submit Request Modal */}
      {showCreateModal && (
        <div className="request-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="request-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="request-modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon-box">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3>Submit New Approval Request</h3>
                  <p>Follows automated company review rules based on selected request type.</p>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowCreateModal(false)} aria-label="Close modal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="request-modal-body">
              {formError && (
                <div className="form-error-banner">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              {/* Dedicated Rule Alert Banner */}
              <div className="request-modal-rule-banner">
                <div className="rule-banner-icon-circle">
                  <span>i</span>
                </div>
                <div className="rule-banner-text">
                  <span className="rule-label-bold">Rule: </span>
                  <span>
                    {rules.find((r) => r.request_type === formData.request_type)?.description ||
                      "Requires Direct Admin review first, then final General Admin budget sign-off"}
                  </span>
                </div>
              </div>

              {/* Row 1: Request Type & Estimated Amount */}
              <div className="form-two-col">
                <div className="form-group">
                  <label className="modal-field-label">
                    Request Type <span className="req-star">*</span>
                  </label>
                  <CustomSelect
                    options={availableRequestTypes.map((t) => ({ value: t, label: t }))}
                    value={formData.request_type}
                    onChange={(valOrEvent) => {
                      const val = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
                      setFormData((prev) => ({ ...prev, request_type: val }));
                    }}
                    placeholder="Select request category"
                    className="modal-request-type-select"
                    isClearable={true}
                    icon={
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="modal-field-label">
                    Amount / Cost (₹) <span className="modal-opt-label">(Optional)</span>
                  </label>
                  <div className="input-prefix-wrapper">
                    <span className="input-currency-tag">₹</span>
                    <input
                      type="number"
                      name="amount"
                      placeholder="e.g. 45000"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className="modal-field-input"
                    />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="form-group">
                <label className="modal-field-label">
                  Request Title <span className="req-star">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <svg className="field-icon-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <input
                    type="text"
                    name="title"
                    placeholder="e.g. Dell XPS 15 Laptop for React Development"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="modal-field-input"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="modal-field-label">
                  Business Justification & Detailed Reason <span className="req-star">*</span>
                </label>
                <div className="textarea-icon-wrapper">
                  <svg className="textarea-icon-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <textarea
                    name="description"
                    rows="3"
                    placeholder="Provide comprehensive details, current issue, urgency, or links..."
                    value={formData.description}
                    onChange={handleInputChange}
                    maxLength={1000}
                    className="modal-textarea-field"
                  ></textarea>
                </div>
                <div className="textarea-counter-row">
                  <span>{formData.description ? formData.description.length : 0}/1000</span>
                </div>
              </div>

              {/* Attachments Upload */}
              <div className="form-group">
                <div className="attach-drop-zone">
                  <div className="attach-drop-left">
                    <div className="attach-icon-box">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </div>
                    <div>
                      <div className="attach-title">Attach Supporting Quotation or Screenshots</div>
                      <div className="attach-sub">PDF, images, spreadsheets, and docs up to 10 MB</div>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="request-file-input"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className="btn-browse-file"
                    onClick={() => document.getElementById("request-file-input")?.click()}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Select Files</span>
                  </button>
                </div>

                {formFiles.length > 0 && (
                  <div className="attached-chips-row">
                    {formFiles.map((f, i) => (
                      <span key={i} className="attached-chip">
                        <span>{f.name}</span>
                        <button type="button" onClick={() => removeFile(i)}>
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit" disabled={submitting}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>{submitting ? "Submitting..." : "Submit for Approval"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Request Details Modal with Stepper */}
      {showDetailModal && (
        <div className="request-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="request-detail-modal-box" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="detail-loading-box">
                <div className="table-spinner"></div>
                <span>Loading request details & workflow progress...</span>
              </div>
            ) : activeRequest ? (
              <>
                <div className="request-modal-header">
                  <div className="modal-header-left">
                    <span className="detail-modal-code">{activeRequest.request_code}</span>
                    <div className={`status-pill-custom ${activeRequest.status?.toLowerCase().replace(/\s+/g, "-")}`}>
                      <span className="status-dot"></span>
                      <span>{activeRequest.status}</span>
                    </div>
                  </div>
                  <button type="button" className="modal-close-btn" onClick={() => setShowDetailModal(false)}>
                    &times;
                  </button>
                </div>

                <div className="request-detail-modal-body">
                  {/* Top Highlight Card */}
                  <div className="detail-top-card">
                    <div className="detail-top-row">
                      <div className="detail-top-info">
                        <div className="detail-top-type-badge">{activeRequest.request_type}</div>
                        <h3 className="detail-top-title">{activeRequest.title}</h3>
                        {activeRequest.amount && (
                          <div className="detail-amount-tag">
                            Estimated Cost: <strong>{formatCurrency(activeRequest.amount)}</strong>
                          </div>
                        )}
                      </div>
                      <div className="detail-illustration-box">
                        <div className="illustration-glow-circle">
                          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="detail-meta-bar">
                      <div className="meta-bar-item">
                        <div className="meta-circle-icon icon-user">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                        <div className="meta-bar-text">
                          <span className="meta-bar-label">Submitted By</span>
                          <span className="meta-bar-val">
                            {activeRequest.requester_name || user?.name || "Employee"} ({activeRequest.requester_email || user?.email || "-"})
                          </span>
                        </div>
                      </div>

                      <div className="meta-bar-item">
                        <div className="meta-circle-icon icon-calendar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </div>
                        <div className="meta-bar-text">
                          <span className="meta-bar-label">Submitted On</span>
                          <span className="meta-bar-val">
                            {formatDateTime(activeRequest.created_at).date}, {formatDateTime(activeRequest.created_at).time}
                          </span>
                        </div>
                      </div>
                      <div className="meta-bar-item">
                        <div className="meta-circle-icon icon-stage">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                        </div>
                        <div className="meta-bar-text">
                          <span className="meta-bar-label">Current Stage</span>
                          <span className="meta-bar-val">
                            Level {activeRequest.current_step} of {activeRequest.total_steps}
                          </span>
                        </div>
                      </div>
                      {activeRequest.resolved_at && (
                        <div className="meta-bar-item">
                          <div className="meta-circle-icon icon-user">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <div className="meta-bar-text">
                            <span className="meta-bar-label">Final Decision On</span>
                            <span className="meta-bar-val">
                              {formatDateTime(activeRequest.resolved_at).date}, {formatDateTime(activeRequest.resolved_at).time}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="detail-desc-box">
                    <div className="desc-icon-box">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="desc-content-box">
                      <h5>Requester's Business Justification</h5>
                      <p>{activeRequest.description}</p>
                    </div>
                  </div>

                  {/* Visual Stepper */}
                  <ApprovalStepper
                    steps={activeRequest.steps}
                    currentStep={activeRequest.current_step}
                    overallStatus={activeRequest.status}
                  />

                  {/* Attached Files View */}
                  {activeRequest.attachments && activeRequest.attachments.length > 0 && (
                    <div style={{ marginTop: "14px" }}>
                      <TicketAttachmentsView
                        attachments={activeRequest.attachments}
                        title="Supporting Documents & Quotations"
                        subtitle="Files attached to verify this request"
                        variant="creation"
                      />
                    </div>
                  )}
                </div>

                <div className="detail-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-close"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
