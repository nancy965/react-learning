import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {
  getApprovalInbox,
  getApprovalRequestById,
  processApprovalDecision,
  getApprovalStats,
  getApprovalRules,
} from "../services/approvalService";
import {
  getDatabaseChangeRequests,
  getDatabaseChangeStats,
  approveDatabaseChange,
  rejectDatabaseChange,
  rollbackDatabaseChange,
} from "../services/databaseApprovalService";
import { getCommonMasterByType } from "../services/commonMasterService";
import ApprovalStepper from "../components/ApprovalStepper";
import TicketAttachmentsView from "../components/TicketAttachmentsView";
import SuccessToast from "../components/SuccessToast";
import CustomSelect from "../components/CustomSelect";
import DatabaseDiffModal from "../components/DatabaseDiffModal";
import CreateDatabaseChangeModal from "../components/CreateDatabaseChangeModal";
import { useAuth } from "../context/AuthContext";
import "./ApprovalInbox.css";

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

const formatTargetRecord = (identifier) => {
  if (!identifier) return "-";
  return String(identifier).replace(/\s*\([^)]*@[^)]*\)/g, "").trim() || identifier;
};

export default function ApprovalInbox() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isGeneralAdmin =
    user?.role === "general_admin" ||
    user?.role === "super_admin" ||
    (user?.role_name || "").toLowerCase() === "general admin" ||
    (user?.roleName || "").toLowerCase() === "general admin" ||
    user?.baseRole === "general_admin" ||
    user?.email === "nency@gmail.com";

  const [searchParams, setSearchParams] = useSearchParams();
  const isDbRoute = location.pathname.includes("database");
  const initialTab = isDbRoute ? "database_changes" : (searchParams.get("tab") || "action_required");

  // State
  const [activeTab, setActiveTab] = useState(initialTab); // "action_required" | "all" | "history" | "database_changes"

  useEffect(() => {
    if (location.pathname.includes("database")) {
      setActiveTab("database_changes");
    } else {
      const tabParam = searchParams.get("tab") || "action_required";
      setActiveTab(tabParam);
    }
  }, [location.pathname, searchParams]);

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    action_required: 0,
    total_processed: 0,
    approved_by_me: 0,
    rejected_by_me: 0,
  });

  // Database Changes (Bytebase Workflow) State
  const [dbRequests, setDbRequests] = useState([]);
  const [dbStats, setDbStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    reverted: 0,
  });
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSearch, setDbSearch] = useState("");
  const [dbStatusFilter, setDbStatusFilter] = useState("all");
  const [dbPage, setDbPage] = useState(1);
  const [dbPageSize, setDbPageSize] = useState(5);
  const [dbTotalPages, setDbTotalPages] = useState(1);
  const [dbTotalRecords, setDbTotalRecords] = useState(0);
  const [selectedDbChange, setSelectedDbChange] = useState(null);
  const [showDbDiffModal, setShowDbDiffModal] = useState(false);
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);

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

  // Review & Decision Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Decision Form State
  const [decisionComment, setDecisionComment] = useState("");
  const [decisionFiles, setDecisionFiles] = useState([]);
  const [decisionError, setDecisionError] = useState("");

  // Load Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await getApprovalStats();
      if (res.success && res.data?.inboxStats) {
        setStats(res.data.inboxStats);
      }
    } catch (err) {
      console.error("Failed to load approval inbox stats:", err);
    }
  }, []);

  // Load Rules & Common Master Types
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

  // Fetch Requests with Console Logging & Network Trigger
  const fetchRequests = useCallback(
    async (page = 1, limit = pageSize) => {
      setLoading(true);
      console.log(`[ApprovalInbox API] Calling getApprovalInbox page=${page}&limit=${limit}&tab=${activeTab}`);
      try {
        const params = {
          page,
          limit,
          tab: activeTab,
          search: search.trim() || undefined,
          status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
          request_type: typeFilter && typeFilter !== "all" ? typeFilter : undefined,
        };

        const res = await getApprovalInbox(params);
        if (res.success) {
          setRequests(res.data || []);
          setTotalPages(res.pagination?.totalPages || 1);
          setTotalRecords(res.pagination?.total || 0);
          setCurrentPage(res.pagination?.page || page);
        }
      } catch (err) {
        console.error("Failed to fetch approval inbox:", err);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, pageSize, search, statusFilter, typeFilter]
  );

  // Load Database Changes Stats
  const loadDbStats = useCallback(async () => {
    try {
      const res = await getDatabaseChangeStats();
      if (res.success && res.data) {
        setDbStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load DB change stats:", err);
    }
  }, []);

  // Fetch Database Change Requests
  const fetchDbChanges = useCallback(
    async (page = 1, limit = dbPageSize) => {
      setDbLoading(true);
      try {
        const res = await getDatabaseChangeRequests({
          page,
          limit,
          status: dbStatusFilter !== "all" ? dbStatusFilter : undefined,
          search: dbSearch.trim() || undefined,
        });
        if (res.success) {
          setDbRequests(res.data || []);
          setDbTotalPages(res.pagination?.totalPages || 1);
          setDbTotalRecords(res.pagination?.totalRecords || 0);
          setDbPage(res.pagination?.page || page);
        }
      } catch (err) {
        console.error("Failed to fetch database changes:", err);
      } finally {
        setDbLoading(false);
      }
    },
    [dbPageSize, dbStatusFilter, dbSearch]
  );

  const handleApproveDb = async (id, comment = "") => {
    try {
      await approveDatabaseChange(id, comment);
      setToastMessage("Database change approved & executed successfully!");
      fetchDbChanges(dbPage, dbPageSize);
      loadDbStats();
      setShowDbDiffModal(false);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to approve database change");
    }
  };

  const handleRejectDb = async (id, reason = "") => {
    try {
      await rejectDatabaseChange(id, reason);
      setToastMessage("Database change request rejected.");
      fetchDbChanges(dbPage, dbPageSize);
      loadDbStats();
      setShowDbDiffModal(false);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to reject database change");
    }
  };

  const handleRollbackDb = async (id, rollbackReason = "") => {
    try {
      await rollbackDatabaseChange(id, rollbackReason);
      setToastMessage("Database change successfully rolled back to previous values!");
      fetchDbChanges(dbPage, dbPageSize);
      loadDbStats();
      setShowDbDiffModal(false);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to rollback database change");
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    loadStats();
    loadRules();
    loadDbStats();
  }, [loadStats, loadRules, loadDbStats]);

  useEffect(() => {
    if (activeTab === "database_changes") {
      fetchDbChanges(1, dbPageSize);
    } else {
      fetchRequests(1, pageSize);
    }
  }, [fetchRequests, fetchDbChanges, pageSize, dbPageSize, activeTab]);

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

  const currentRequestsTotal = totalRecords > 0 ? totalRecords : (stats?.total || requests.length || 0);
  const pageSizeOptions = useMemo(() => getPageSizeOptions(currentRequestsTotal), [currentRequestsTotal]);

  useEffect(() => {
    const availableSizes = pageSizeOptions.map((o) => o.value);
    if (availableSizes.length > 0 && !availableSizes.includes(pageSize)) {
      setPageSize(5);
    }
  }, [pageSizeOptions, pageSize]);

  const currentDbTotal = dbTotalRecords > 0 ? dbTotalRecords : (dbStats?.total || dbRequests.length || 0);
  const dbPageSizeOptions = useMemo(() => getPageSizeOptions(currentDbTotal), [currentDbTotal]);

  useEffect(() => {
    const availableSizes = dbPageSizeOptions.map((o) => o.value);
    if (availableSizes.length > 0 && !availableSizes.includes(dbPageSize)) {
      setDbPageSize(5);
    }
  }, [dbPageSizeOptions, dbPageSize]);

  // Open Review Modal
  const handleOpenReview = async (reqItem) => {
    setReviewLoading(true);
    setShowReviewModal(true);
    setDecisionComment("");
    setDecisionFiles([]);
    setDecisionError("");
    try {
      const res = await getApprovalRequestById(reqItem.id);
      if (res.success) {
        setSelectedRequest(res.data);
      } else {
        setSelectedRequest(reqItem);
      }
    } catch (err) {
      console.error("Failed to load request details:", err);
      setSelectedRequest(reqItem);
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle Decision Files
  const handleDecisionFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + decisionFiles.length > 5) {
      setDecisionError("Maximum 5 attachments allowed.");
      return;
    }
    setDecisionFiles((prev) => [...prev, ...files].slice(0, 5));
    setDecisionError("");
  };

  const removeDecisionFile = (index) => {
    setDecisionFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Decision (Approve or Reject)
  const handleSubmitDecision = async (decision) => {
    if (decision === "Rejected" && (!decisionComment || !decisionComment.trim())) {
      setDecisionError("Please provide a reason or feedback for rejecting this request.");
      return;
    }

    setDecisionSubmitting(true);
    setDecisionError("");
    try {
      const dataPayload = new FormData();
      dataPayload.append("decision", decision);
      dataPayload.append("comment", decisionComment.trim());
      if (decisionFiles && decisionFiles.length > 0) {
        decisionFiles.forEach((file) => {
          dataPayload.append("files", file);
        });
      }

      const res = await processApprovalDecision(selectedRequest.id, dataPayload);
      if (res.success) {
        setShowReviewModal(false);
        setToastMessage(`Request ${selectedRequest.request_code} was ${decision.toLowerCase()} successfully!`);
        loadStats();
        fetchRequests(currentPage, pageSize);
      }
    } catch (err) {
      setDecisionError(err.response?.data?.message || `Failed to ${decision.toLowerCase()} request.`);
    } finally {
      setDecisionSubmitting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Pending", label: "Pending" },
    { value: "In Review", label: "In Review" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
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
    <div className="approval-inbox-page" id="approval-inbox-view">
      {/* Toast Notification */}
      {toastMessage && (
        <SuccessToast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* 1. Header */}
      <div className="inbox-header-row">
        <div className="inbox-header-titles">
          <span className="inbox-eyebrow">
            {activeTab === "database_changes" ? "DATABASE AUDIT & APPROVAL" : "APPROVAL WORKFLOW"}
          </span>
          <h1>
            {activeTab === "database_changes" ? "Database Changes (Bytebase)" : "Approval Inbox"}
          </h1>
          <p className="inbox-subtitle">
            {activeTab === "database_changes"
              ? "Review incoming database modification proposals, audit schema diffs, and approve or revert transactions."
              : "Review incoming approval requests, audit workflow stages, and record official decisions."}
          </p>
        </div>

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

      {/* 2. KPI Stats Grid (Unclickable, no hover effect) */}
      {/* 2. KPI Stats Grid (Unclickable, no hover effect) */}
      <div className="inbox-stats-grid">
        {activeTab === "database_changes" ? (
          <>
            {/* Pending DB Reviews */}
            <div className="stat-card card-amber">
              <div className="stat-icon open">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Pending DB Review</span>
                <span className="stat-value">{dbStats.pending || 0}</span>
                <span className="stat-subtext-muted">Awaiting maker-checker approval</span>
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

            {/* Approved & Applied */}
            <div className="stat-card card-green">
              <div className="stat-icon resolved">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Approved & Applied</span>
                <span className="stat-value">{dbStats.approved || 0}</span>
                <span className="stat-subtext-muted">Committed to live database</span>
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

            {/* Rejected */}
            <div className="stat-card card-rose">
              <div className="stat-icon" style={{ background: "#fef2f2", color: "#e11d48", border: "1px solid #ffe4e6" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Rejected Changes</span>
                <span className="stat-value">{dbStats.rejected || 0}</span>
                <span className="stat-subtext-muted">Declined by reviewer</span>
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

            {/* Rolled Back / Reverted */}
            <div className="stat-card" style={{ background: "#ffffff", border: "1px solid #e9d5ff" }}>
              <div className="stat-icon" style={{ background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Rolled Back (Reverted)</span>
                <span className="stat-value" style={{ color: "#7c3aed" }}>{dbStats.reverted || 0}</span>
                <span className="stat-subtext-muted">Restored to old values</span>
              </div>
              <div className="stat-corner-chart" style={{ color: "#7c3aed" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="16" width="3.5" height="6" rx="1" opacity="0.6" />
                  <rect x="7.5" y="11" width="3.5" height="11" rx="1" opacity="0.75" />
                  <rect x="13" y="6" width="3.5" height="16" rx="1" opacity="0.9" />
                  <rect x="18.5" y="2" width="3.5" height="20" rx="1" opacity="1" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Action Required */}
            <div className="stat-card card-amber">
              <div className="stat-icon open">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Pending My Action</span>
                <span className="stat-value">{stats.action_required || 0}</span>
                <span className="stat-subtext-muted">Awaiting your decision</span>
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

            {/* Total Processed */}
            <div className="stat-card card-blue">
              <div className="stat-icon total">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">All Organization Requests</span>
                <span className="stat-value">{stats.all_requests !== undefined ? stats.all_requests : (totalRecords || 0)}</span>
                <span className="stat-subtext-muted">Company wide requests</span>
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

            {/* Approved by Me */}
            <div className="stat-card card-green">
              <div className="stat-icon resolved">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Approved By Me</span>
                <span className="stat-value">{stats.approved_by_me || 0}</span>
                <span className="stat-subtext-muted">Authorized approvals</span>
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

            {/* Rejected by Me */}
            <div className="stat-card card-rose">
              <div className="stat-icon" style={{ background: "#fef2f2", color: "#e11d48", border: "1px solid #ffe4e6" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Rejected By Me</span>
                <span className="stat-value">{stats.rejected_by_me || 0}</span>
                <span className="stat-subtext-muted">Declined submissions</span>
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
          </>
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="inbox-tabs-bar">
        <button
          type="button"
          className={`inbox-tab-btn ${activeTab === "action_required" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("action_required");
            navigate("/approvals/inbox?tab=action_required");
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Action Required
          {stats.action_required > 0 && (
            <span className="inbox-tab-badge">{stats.action_required}</span>
          )}
        </button>

        <button
          type="button"
          className={`inbox-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("all");
            navigate("/approvals/inbox?tab=all");
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          All Requests
        </button>

        <button
          type="button"
          className={`inbox-tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("history");
            navigate("/approvals/inbox?tab=history");
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          My Decision History
        </button>

        <button
          type="button"
          className={`inbox-tab-btn ${activeTab === "database_changes" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("database_changes");
            navigate("/database-approvals");
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          Database Changes (Bytebase)
          {dbStats.pending > 0 && (
            <span className="inbox-tab-badge" style={{ background: "#f59e0b", color: "#fff" }}>
              {dbStats.pending}
            </span>
          )}
        </button>
      </div>

      {/* 4. Controls & Table Area */}
      {activeTab === "database_changes" ? (
        <>
          {/* Database Changes Controls Row */}
          <div className="inbox-controls-row">
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
                placeholder="Search DB changes by code, target, requester..."
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
              />
              {dbSearch && (
                <button type="button" className="clear-search-btn" onClick={() => setDbSearch("")}>
                  &times;
                </button>
              )}
            </div>

            <div className="inbox-filters-group">
              <CustomSelect
                value={dbPageSize}
                onChange={(val) => {
                  const size = Number(val?.target ? val.target.value : val) || 5;
                  setDbPageSize(size);
                  setDbPage(1);
                  fetchDbChanges(1, size);
                }}
                options={dbPageSizeOptions}
                minWidth="110px"
              />

              <CustomSelect
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "pending", label: "Pending Review" },
                  { value: "approved", label: "Approved & Live" },
                  { value: "rejected", label: "Rejected" },
                  { value: "reverted", label: "Rolled Back (Reverted)" },
                ]}
                value={dbStatusFilter}
                onChange={(val) => {
                  const s = val?.target ? val.target.value : val;
                  setDbStatusFilter(s);
                  setDbPage(1);
                }}
                minWidth="160px"
              />

              <button
                type="button"
                className="db-propose-btn"
                onClick={() => setShowCreateDbModal(true)}
              >
                + Propose DB Change
              </button>
            </div>
          </div>

          {/* Database Changes Table */}
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>#</th>
                  <th>CODE</th>
                  <th>TARGET RECORD</th>
                  <th>MODULE / TABLE</th>
                  <th>PROPOSED CHANGES</th>
                  <th>REQUESTED BY</th>
                  <th>STATUS</th>
                  <th style={{ width: "80px", textAlign: "center" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {dbLoading ? (
                  <tr>
                    <td colSpan="8" className="table-loading-cell">
                      <div className="table-spinner"></div>
                      <span>Loading database changes...</span>
                    </td>
                  </tr>
                ) : dbRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="table-empty-cell">
                      <div className="empty-box-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <h4>No Database Changes Found</h4>
                      <p>
                        {dbStatusFilter === "pending"
                          ? "All pending database changes have been reviewed and resolved!"
                          : "No matching database change requests recorded."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  dbRequests.map((r, idx) => {
                    const dt = formatDateTime(r.created_at);
                    const statusLower = (r.status || "pending").toLowerCase();

                    return (
                      <tr key={r.id}>
                        <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: "12px" }}>
                          {(dbPage - 1) * dbPageSize + idx + 1}
                        </td>
                        <td>
                          <span className="db-code-pill">{r.request_code}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "13px" }}>
                            {formatTargetRecord(r.record_identifier)}
                          </div>
                        </td>
                        <td>
                          <span className="db-table-module-badge">
                            {r.module_name} &bull; {r.table_name}
                          </span>
                        </td>
                        <td>
                          <span className="db-change-summary-badge" title={r.change_summary}>
                            {r.change_summary}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: "12px", color: "#334155", fontWeight: 500 }}>
                            {r.requested_by_name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>{dt.date} {dt.time}</div>
                        </td>
                        <td>
                          <span className={`db-status-pill ${statusLower}`}>
                            <span className={`db-status-dot db-status-dot-${statusLower}`} />
                            {r.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div
                            className="action-menu-wrapper"
                            style={{ display: "flex", justifyContent: "center" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="btn-three-dots"
                              title="Actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((prev) => (prev === `db-${r.id}` ? null : `db-${r.id}`));
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="5" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="12" cy="19" r="1.5" />
                              </svg>
                            </button>

                            {openMenuId === `db-${r.id}` && (
                              <div className="action-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="action-dropdown-item action-dropdown-diff"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedDbChange(r);
                                    setShowDbDiffModal(true);
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  <span>Visual Diff</span>
                                </button>

                                {r.status === "PENDING" && (
                                  <>
                                    <button
                                      type="button"
                                      className="action-dropdown-item action-dropdown-approve"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleApproveDb(r.id);
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                      <span>Approve</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="action-dropdown-item action-dropdown-delete"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setSelectedDbChange(r);
                                        setShowDbDiffModal(true);
                                      }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                      <span>Reject</span>
                                    </button>
                                  </>
                                )}

                                {r.status === "APPROVED" && !r.is_reverted && (
                                  <button
                                    type="button"
                                    className="action-dropdown-item action-dropdown-rollback"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setSelectedDbChange(r);
                                      setShowDbDiffModal(true);
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="1 4 1 10 7 10"></polyline>
                                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                    </svg>
                                    <span>Rollback</span>
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

            {/* DB Pagination Footer */}
            <div className="table-pagination-footer">
              <div className="pagination-info">
                Showing {dbRequests.length > 0 ? (dbPage - 1) * dbPageSize + 1 : 0} to{" "}
                {Math.min(dbPage * dbPageSize, dbTotalRecords)} of {dbTotalRecords} changes
              </div>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn-page-nav"
                  disabled={dbPage <= 1}
                  onClick={() => {
                    setDbPage(dbPage - 1);
                    fetchDbChanges(dbPage - 1, dbPageSize);
                  }}
                >
                  &lt;
                </button>
                {Array.from({ length: Math.max(1, dbTotalPages) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn-page-num ${p === dbPage ? "active" : ""}`}
                    onClick={() => {
                      setDbPage(p);
                      fetchDbChanges(p, dbPageSize);
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn-page-nav"
                  disabled={dbPage >= dbTotalPages}
                  onClick={() => {
                    setDbPage(dbPage + 1);
                    fetchDbChanges(dbPage + 1, dbPageSize);
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 4. Controls Row (NO white container card across line) */}
          <div className="inbox-controls-row">
            {/* Search Input on the left */}
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
            id="inbox-search-input"
            placeholder="Search by request code, title, or requester name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="clear-search-btn" onClick={() => setSearch("")}>
              &times;
            </button>
          )}
        </div>

        {/* Filter Dropdowns on the right */}
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

      {/* 5. Requests Table */}
      <div className="requests-table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th style={{ width: "45px", textAlign: "center" }}>#</th>
              <th>REQUEST ID</th>
              <th>REQUESTER</th>
              <th>REQUEST DETAILS</th>
              <th>AMOUNT</th>
              <th>ACTIVE STAGE</th>
              <th>STATUS</th>
              <th>CREATED ON</th>
              <th style={{ width: "80px", textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="table-loading-cell">
                  <div className="table-spinner"></div>
                  <span>Loading approval inbox...</span>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="9" className="table-empty-cell">
                  <div className="empty-box-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4>No requests found</h4>
                  <p>
                    {activeTab === "action_required"
                      ? "Awesome! You have cleared all pending requests in your queue."
                      : "No matching records found for the selected filters."}
                  </p>
                </td>
              </tr>
            ) : (
              requests.map((r, idx) => {
                const dt = formatDateTime(r.created_at);
                const isPendingAction =
                  activeTab === "action_required" ||
                  (["Pending", "In Review"].includes(r.status) &&
                    ((isGeneralAdmin && r.current_approver_role === "general_admin") ||
                      (!isGeneralAdmin && r.current_approver_role === "admin" && String(r.requested_by) !== String(user?.userId))));

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

                    {/* Requester */}
                    <td>
                      <div className="requester-col">
                        <div className="requester-avatar">
                          {r.requester_name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="requester-info">
                          <span className="requester-name">{r.requester_name || "Employee"}</span>
                          <span className="requester-role">
                            {r.requested_by_role === "admin" ? "Admin" : "Employee"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Type & Title */}
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

                    {/* Active Stage */}
                    <td>
                      <div className="stage-cell">
                        <span className="stage-step-tag">
                          Level {r.current_step} of {r.total_steps}
                        </span>
                        <span className="stage-name-text">
                          {r.current_step_name || "Direct Admin Review"}
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

                    {/* Created On */}
                    <td>
                      <div className="date-cell">
                        <span className="date-main">{dt.date}</span>
                        <span className="date-sub">{dt.time}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="action-menu-wrapper" style={{ display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
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
                            {isPendingAction ? (
                              <button
                                type="button"
                                className="action-dropdown-item action-dropdown-review"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleOpenReview(r);
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>Review</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="action-dropdown-item"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleOpenReview(r);
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span>View</span>
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
    </>
  )}

      {/* 6. Review & Decision Modal */}
      {showReviewModal && (
        <div className="request-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="request-detail-modal-box" onClick={(e) => e.stopPropagation()}>
            {reviewLoading ? (
              <div className="detail-loading-box">
                <div className="table-spinner"></div>
                <span>Loading request details & workflow progress...</span>
              </div>
            ) : selectedRequest ? (() => {
              const currentUserId = String(user?.userId || user?.id || "");
              const currentStepObj = selectedRequest.steps?.find(
                (s) => Number(s.step_number) === Number(selectedRequest.current_step)
              );
              const currentApproverRole = (
                selectedRequest.current_approver_role ||
                currentStepObj?.approver_role ||
                ""
              ).toLowerCase();

              const isRequester =
                Boolean(currentUserId) &&
                String(selectedRequest.requested_by) === currentUserId &&
                (selectedRequest.requested_by_role || "").toLowerCase() === (user?.role || user?.baseRole || "").toLowerCase();

              const canTakeAction =
                ["Pending", "In Review"].includes(selectedRequest.status) &&
                !isRequester &&
                ((isGeneralAdmin && currentApproverRole === "general_admin") ||
                  (!isGeneralAdmin && currentApproverRole === "admin"));

              return (
                <>
                  <div className="request-modal-header">
                    <div className="modal-header-left">
                      <span className="detail-modal-code">{selectedRequest.request_code}</span>
                      <div className={`status-pill-custom ${selectedRequest.status?.toLowerCase().replace(/\s+/g, "-")}`}>
                        <span className="status-dot"></span>
                        <span>{selectedRequest.status}</span>
                      </div>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={() => setShowReviewModal(false)}>
                      &times;
                    </button>
                  </div>

                  <div className="request-detail-modal-body">
                    {/* Requester & Submission Highlight */}
                    <div className="detail-top-card">
                      <div className="detail-top-row">
                        <div className="detail-top-info">
                          <div className="detail-top-type-badge">{selectedRequest.request_type}</div>
                          <h3 className="detail-top-title">{selectedRequest.title}</h3>
                          {selectedRequest.amount && (
                            <div className="detail-amount-tag">
                              Estimated Cost: <strong>{formatCurrency(selectedRequest.amount)}</strong>
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

                      {/* Meta bar with 3 circular icons in a light gray container */}
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
                              {selectedRequest.requester_name || "Employee"} ({selectedRequest.requester_email || "-"})
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
                              {formatDateTime(selectedRequest.created_at).date}, {formatDateTime(selectedRequest.created_at).time}
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
                              Level {selectedRequest.current_step} of {selectedRequest.total_steps}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Justification Box with Document Icon */}
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
                        <p>{selectedRequest.description}</p>
                      </div>
                    </div>

                    {/* Visual Stepper */}
                    <ApprovalStepper
                      steps={selectedRequest.steps}
                      currentStep={selectedRequest.current_step}
                      overallStatus={selectedRequest.status}
                    />

                    {/* Supporting Documents View */}
                    {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                      <div style={{ marginTop: "14px" }}>
                        <TicketAttachmentsView
                          attachments={selectedRequest.attachments}
                          title="Supporting Documents & Quotations"
                          subtitle="Files attached by requester"
                          variant="creation"
                        />
                      </div>
                    )}

                    {/* Action Decision Panel */}
                    {canTakeAction && (
                      <div className="decision-action-card">
                        <div className="decision-card-header">
                          <div className="decision-header-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <div>
                            <h4>Take Approval Action</h4>
                            <p>Record your official decision for Level {selectedRequest.current_step}</p>
                          </div>
                        </div>

                        {decisionError && (
                          <div className="form-error-banner" style={{ margin: "10px 0" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span>{decisionError}</span>
                          </div>
                        )}

                        <div className="decision-form-body" style={{ marginTop: "10px" }}>
                          <div className="decision-label-row">
                            <label>
                              Decision Feedback & Justification Note <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <span className="decision-counter">{decisionComment ? decisionComment.length : 0}/1000</span>
                          </div>
                          <textarea
                            rows="3"
                            placeholder="Enter approval conditions, feedback, or reason for decline..."
                            value={decisionComment}
                            maxLength={1000}
                            onChange={(e) => {
                              setDecisionComment(e.target.value);
                              setDecisionError("");
                            }}
                            className="modal-textarea-input"
                          ></textarea>

                          {/* Decision Attachments */}
                          <div className="decision-attach-zone">
                            <div className="decision-attach-left">
                              <div className="decision-attach-icon-box">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                              </div>
                              <div>
                                <div className="decision-attach-title">Attach Approval Proof or Signed Documents (Optional)</div>
                                <div className="decision-attach-sub">PDF, images, spreadsheets, and docs up to 10 MB</div>
                              </div>
                            </div>
                            <input
                              type="file"
                              id="decision-file-input"
                              multiple
                              style={{ display: "none" }}
                              onChange={handleDecisionFileChange}
                            />
                            <button
                              type="button"
                              className="btn-select-files"
                              onClick={() => document.getElementById("decision-file-input")?.click()}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                              </svg>
                              <span>Select Files</span>
                            </button>
                          </div>

                          {decisionFiles.length > 0 && (
                            <div className="attached-chips-row">
                              {decisionFiles.map((f, i) => (
                                <span key={i} className="attached-chip">
                                  <span>{f.name}</span>
                                  <button type="button" onClick={() => removeDecisionFile(i)}>
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="detail-modal-footer">
                    <button
                      type="button"
                      className="btn-modal-close"
                      onClick={() => setShowReviewModal(false)}
                    >
                      Close
                    </button>
                    {canTakeAction && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          type="button"
                          className="btn-action-reject"
                          disabled={decisionSubmitting}
                          onClick={() => handleSubmitDecision("Rejected")}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          <span>Reject Request</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-approve"
                          disabled={decisionSubmitting}
                          onClick={() => handleSubmitDecision("Approved")}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{decisionSubmitting ? "Processing..." : "Approve Request"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })() : null}
          </div>
        </div>
      )}

      {/* Database Diff Modal */}
      {showDbDiffModal && (
        <DatabaseDiffModal
          request={selectedDbChange}
          onClose={() => {
            setShowDbDiffModal(false);
            setSelectedDbChange(null);
          }}
          onApprove={handleApproveDb}
          onReject={handleRejectDb}
          onRollback={handleRollbackDb}
          isReviewer={true}
        />
      )}

      {/* Create Database Change Modal */}
      {showCreateDbModal && (
        <CreateDatabaseChangeModal
          onClose={() => setShowCreateDbModal(false)}
          onSuccess={(newReq) => {
            setToastMessage(`Database Change Request ${newReq.request_code} created successfully!`);
            fetchDbChanges(1, dbPageSize);
            loadDbStats();
          }}
        />
      )}
    </div>
  );
}
