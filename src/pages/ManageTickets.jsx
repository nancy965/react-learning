import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllTickets,
  getTicketStats,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  getAvailableAgents,
  createTicket,
} from "../services/ticketService";
import { getCommonMasterByType } from "../services/commonMasterService";
import { useAuth } from "../context/AuthContext";
import CustomSelect from "../components/CustomSelect";
import SuccessToast from "../components/SuccessToast";
import TicketAttachmentsView from "../components/TicketAttachmentsView";
import "./ManageTickets.css";

const STATUS_RANK = {
  "Open": 0,
  "In Progress": 1,
  "Resolved": 2,
  "Closed": 3,
};

const ManageTickets = () => {
  const { user: authUser } = useAuth();
  const loggedInUser = authUser || (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();
  const isGeneralAdmin =
    loggedInUser?.role === "general_admin" ||
    loggedInUser?.role === "super_admin" ||
    (loggedInUser?.role_name || "").toLowerCase() === "general admin" ||
    (loggedInUser?.roleName || "").toLowerCase() === "general admin" ||
    loggedInUser?.baseRole === "general_admin" ||
    loggedInUser?.email === "nency@gmail.com";
  const isAdmin = loggedInUser?.role === "admin";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [agents, setAgents] = useState([]);

  // Filters & Pagination - Default 5 records per page
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState(["Low", "Medium", "High", "Urgent"]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals
  const [activeTicket, setActiveTicket] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("Medium");
  const [terminationReason, setTerminationReason] = useState("");
  const [terminateSession, setTerminateSession] = useState(false);
  const [newStatus, setNewStatus] = useState("In Progress");
  const [resolutionNote, setResolutionNote] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const agentDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target)) {
        setIsAgentDropdownOpen(false);
      }
    };
    if (isAgentDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAgentDropdownOpen]);

  const [createFormData, setCreateFormData] = useState({
    title: "",
    category: "",
    priority: "Medium",
    description: "",
  });
  const [createFormError, setCreateFormError] = useState("");
  const [createFiles, setCreateFiles] = useState([]);
  const [statusFiles, setStatusFiles] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setCreateFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index) => {
    setCreateFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStatusFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setStatusFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeStatusFile = (index) => {
    setStatusFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Load Categories & Priorities & Agents & Stats
  const loadInitialData = useCallback(async () => {
    try {
      const [catRes, prioRes, agentRes, statsRes] = await Promise.all([
        getCommonMasterByType("ticket_category").catch(() => null),
        getCommonMasterByType("ticket_priority").catch(() => null),
        getAvailableAgents().catch(() => null),
        getTicketStats().catch(() => null),
      ]);

      if (catRes?.success && catRes.data?.length > 0) {
        setCategories(catRes.data.map((c) => ({ id: c.id, name: c.name })));
      } else {
        setCategories([
          { id: "Technical Issue", name: "Technical Issue" },
          { id: "Account Access", name: "Account Access" },
          { id: "Data Problem", name: "Data Problem" },
          { id: "Billing", name: "Billing" },
          { id: "Software Request", name: "Software Request" },
          { id: "Other", name: "Other" },
        ]);
      }

      if (prioRes?.success && prioRes.data?.length > 0) {
        setPriorities(prioRes.data.map((p) => ({ id: p.id, name: p.name })));
      } else {
        setPriorities([
          { id: "Low", name: "Low" },
          { id: "Medium", name: "Medium" },
          { id: "High", name: "High" },
          { id: "Urgent", name: "Urgent" },
        ]);
      }

      if (agentRes?.success && agentRes.data) {
        setAgents(agentRes.data);
      }

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error("Error loading initial data:", err);
    }
  }, []);

  // Fetch tickets with live pagination
  const fetchTickets = useCallback(async (page = 1, limit = pageSize) => {
    setLoading(true);
    try {
      const res = await getAllTickets({
        page,
        limit,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        assignedTo: assignedToFilter,
        search,
      });

      if (res.success) {
        setTickets(res.data || []);
        if (res.pagination) {
          setCurrentPage(res.pagination.page);
          setTotalPages(res.pagination.totalPages || 1);
          setTotalRecords(res.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, assignedToFilter, search, pageSize]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    fetchTickets(1, pageSize);
  }, [fetchTickets, pageSize]);

  // Handle Page Size Change
  const handlePageSizeChange = (e) => {
    const newLimit = Number(e.target.value);
    setPageSize(newLimit);
    setCurrentPage(1);
    fetchTickets(1, newLimit);
  };

  // Pagination navigation
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage || loading) return;
    setCurrentPage(page);
    fetchTickets(page, pageSize);
  };

  // Build pagination numbers array
  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }
    return pages;
  };

  // Open Assign / Terminate Session Modal
  const handleOpenAssign = (ticket) => {
    setActiveTicket(ticket);
    setSelectedAgent(ticket.assigned_to || "");
    setSelectedPriority(ticket.priority || "Medium");
    setTerminationReason("");
    setTerminateSession(ticket.status === "In Progress");
    setAgentSearchQuery("");
    setIsAgentDropdownOpen(false);
    setShowAssignModal(true);
  };

  // Submit Assignment or Session Termination & Reassignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgent) {
      alert("Please select a support agent.");
      return;
    }

    const isTerminating = activeTicket.status === "In Progress" || terminateSession;

    setModalLoading(true);
    try {
      const res = await assignTicket(activeTicket.id, {
        assigned_to: selectedAgent,
        priority: selectedPriority,
        terminate_session: isTerminating,
        termination_reason:
          terminationReason.trim() ||
          (isTerminating ? "Session terminated by General Admin to restart task" : ""),
      });

      if (res.success) {
        setShowAssignModal(false);
        setToastMessage(
          isTerminating
            ? `Active session on ${activeTicket.ticket_code} terminated & reassigned! Process restarted fresh.`
            : `Ticket ${activeTicket.ticket_code} assigned successfully!`
        );
        loadInitialData();
        fetchTickets(currentPage, pageSize);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign ticket.");
    } finally {
      setModalLoading(false);
    }
  };

  // Check if a ticket is assigned to the current logged-in user
  const currentUserId = loggedInUser?.id || loggedInUser?.userId;
  const isTicketAssignedToMe = useCallback(
    (ticket) => {
      if (!ticket || !ticket.assigned_to) return false;
      if (currentUserId && Number(ticket.assigned_to) === Number(currentUserId)) return true;
      if (
        ticket.assignee_email &&
        loggedInUser?.email &&
        ticket.assignee_email.toLowerCase() === loggedInUser.email.toLowerCase()
      )
        return true;
      return false;
    },
    [currentUserId, loggedInUser?.email]
  );

  const isAssignedToCurrentUser = isTicketAssignedToMe(activeTicket);
  const isTicketClosed = activeTicket?.status === "Closed";
  const currentStatusRank = STATUS_RANK[activeTicket?.status] ?? 0;

  const isStatusDisabled = (targetStatus) => {
    if (!isAssignedToCurrentUser) return true;
    if (isTicketClosed) return true;
    const targetRank = STATUS_RANK[targetStatus] ?? 0;
    return targetRank < currentStatusRank;
  };

  const getStatusTooltip = (targetStatus) => {
    if (isTicketClosed) {
      return "This ticket is closed and cannot be modified";
    }
    if (!isAssignedToCurrentUser) {
      return "You do not have permission to update this ticket";
    }
    const targetRank = STATUS_RANK[targetStatus] ?? 0;
    if (targetRank < currentStatusRank) {
      return `Cannot revert status from "${activeTicket?.status}" back to "${targetStatus}"`;
    }
    return `Select ${targetStatus}`;
  };

  // Open Status Update Modal
  const handleOpenStatus = (ticket) => {
    setActiveTicket(ticket);
    setNewStatus(ticket.status || "In Progress");
    setResolutionNote(ticket.resolution_note || "");
    setStatusFiles([]);
    setShowStatusModal(true);
  };

  // Submit Status Update
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!isAssignedToCurrentUser) {
      alert("You do not have permission to update this ticket. Only the assigned support agent can update status & resolution.");
      return;
    }
    if (activeTicket?.status === "Closed") {
      alert("This ticket is closed and cannot be modified.");
      return;
    }
    const currentRank = STATUS_RANK[activeTicket?.status] ?? 0;
    const targetRank = STATUS_RANK[newStatus] ?? 0;
    if (targetRank < currentRank) {
      alert(`Cannot revert ticket status from "${activeTicket.status}" back to "${newStatus}". Status can only move forward.`);
      return;
    }
    setModalLoading(true);
    try {
      let statusPayload;
      if (statusFiles && statusFiles.length > 0) {
        statusPayload = new FormData();
        statusPayload.append("status", newStatus);
        if (resolutionNote) statusPayload.append("resolution_note", resolutionNote);
        statusFiles.forEach((f) => statusPayload.append("files", f));
      } else {
        statusPayload = {
          status: newStatus,
          resolution_note: resolutionNote,
        };
      }

      const res = await updateTicketStatus(activeTicket.id, statusPayload);

      if (res.success) {
        setShowStatusModal(false);
        setStatusFiles([]);
        setToastMessage(`Status for ${activeTicket.ticket_code} updated to "${newStatus}"!`);
        loadInitialData();
        fetchTickets(currentPage, pageSize);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    } finally {
      setModalLoading(false);
    }
  };

  // Open Details Modal
  const handleViewDetails = async (ticket) => {
    try {
      const res = await getTicketById(ticket.id);
      if (res.success) {
        setActiveTicket(res.data);
        setShowDetailModal(true);
      }
    } catch {
      setActiveTicket(ticket);
      setShowDetailModal(true);
    }
  };

  // Submit Create Ticket
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createFormData.title.trim()) {
      setCreateFormError("Issue title is required.");
      return;
    }
    if (!createFormData.category) {
      setCreateFormError("Please select a category.");
      return;
    }
    if (!createFormData.description.trim()) {
      setCreateFormError("Issue description is required.");
      return;
    }

    setModalLoading(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append("title", createFormData.title.trim());
      dataPayload.append("category", createFormData.category);
      dataPayload.append("priority", createFormData.priority || "Medium");
      dataPayload.append("description", createFormData.description.trim());
      if (createFiles && createFiles.length > 0) {
        createFiles.forEach((file) => {
          dataPayload.append("files", file);
        });
      }

      const res = await createTicket(dataPayload);
      if (res.success) {
        setShowCreateModal(false);
        setCreateFormData({ title: "", category: categories[0] || "Technical Issue", priority: "Medium", description: "" });
        setCreateFiles([]);
        setToastMessage(`Ticket ${res.data.ticket_code} created successfully!`);
        loadInitialData();
        fetchTickets(1, pageSize);
      }
    } catch (err) {
      setCreateFormError(err.response?.data?.message || "Failed to create ticket.");
    } finally {
      setModalLoading(false);
    }
  };

  // Parse ticket code e.g. TKT-1003
  const parseTicketCode = (code) => {
    if (!code) return { prefix: "TKT-", number: "0000" };
    const parts = code.split("-");
    if (parts.length >= 2) {
      return { prefix: `${parts[0]}-`, number: parts[1] };
    }
    return { prefix: "TKT-", number: code };
  };

  // Format date & time
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

  // Avatar initial color
  const getAvatarColorClass = (name) => {
    const char = (name || "U").charAt(0).toUpperCase();
    if (["A", "B", "C", "E", "F"].includes(char)) return "blue";
    if (["S", "R", "T", "P", "Q"].includes(char)) return "red";
    if (["D", "G", "H", "I", "J"].includes(char)) return "green";
    return "amber";
  };

  // Stats percentages
  const totalCount = stats.total || 0;
  const openPct = totalCount > 0 ? Math.round((stats.open / totalCount) * 100) : 0;
  const inProgressPct = totalCount > 0 ? Math.round((stats.inProgress / totalCount) * 100) : 0;
  const resolvedPct = totalCount > 0 ? Math.round((stats.resolved / totalCount) * 100) : 0;
  const closedPct = totalCount > 0 ? Math.round((stats.closed / totalCount) * 100) : 0;

  // Options for CustomSelect
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" },
  ];

  const priorityOptions = [
    { value: "all", label: "All Priorities" },
    ...priorities.map((p) => ({
      value: typeof p === "object" ? p.id : p,
      label: typeof p === "object" ? p.name : p,
    })),
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((c) => ({
      value: typeof c === "object" ? c.id : c,
      label: typeof c === "object" ? c.name : c,
    })),
  ];

  const assigneeOptions = isGeneralAdmin
    ? [
        { value: "all", label: "All Assignees" },
        { value: "unassigned", label: "Unassigned" },
        ...agents.map((a) => ({ value: a.id, label: a.name })),
      ]
    : [
        { value: "all", label: "Assigned to Me" },
      ];

  // Dynamic page size calculation (e.g., 3 tickets -> Show 5; 7 tickets -> Show 5, Show 10)
  const getPageSizeOptions = (totalCount) => {
    const count = Number(totalCount) || 0;
    const maxLimit = Math.max(5, Math.ceil(count / 5) * 5);
    const options = [];
    for (let i = 5; i <= maxLimit; i += 5) {
      options.push({ value: i, label: `Show ${i}` });
    }
    return options;
  };

  const currentTotal = totalRecords > 0 ? totalRecords : (stats.total || tickets.length || 0);
  const pageSizeOptions = getPageSizeOptions(currentTotal);

  useEffect(() => {
    const availableSizes = pageSizeOptions.map((o) => o.value);
    if (availableSizes.length > 0 && !availableSizes.includes(pageSize)) {
      setPageSize(5);
    }
  }, [pageSizeOptions, pageSize]);

  const selectedAgentObj = agents.find((a) => String(a.id) === String(selectedAgent));

  return (
    <div className="manage-tickets-container" id="manage-tickets-page">
      {/* Toast Notification */}
      {toastMessage && (
        <SuccessToast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* ----------------------------------------------------------------------
          1. Left-aligned Header (matching Pic 2)
          ---------------------------------------------------------------------- */}
      <div className="manage-tickets-header">
        <div className="manage-tickets-title">
          <span className="standard-page-eyebrow">SUPPORT MANAGEMENT</span>
          <h1>Manage Support Tickets</h1>
          <p className="manage-tickets-subtitle">
            Review incoming issues, assign technicians, update progress, and provide resolutions.
          </p>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          2. KPI Stats Cards (5 in a row)
          ---------------------------------------------------------------------- */}
      <div className="manage-stats-grid">
        {/* Card 1: Total */}
        <div className="manage-stat-card card-blue">
          <div className="manage-stat-icon-box total">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="manage-stat-content">
            <div className="manage-stat-label">Total Tickets</div>
            <div className="manage-stat-value">{stats.total}</div>
            <span className="manage-stat-subtext-green">&uarr; +1 this week</span>
          </div>
          <div className="stat-corner-chart blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" />
              <rect x="7.5" y="12" width="3.5" height="10" rx="1" />
              <rect x="13" y="7" width="3.5" height="15" rx="1" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" />
            </svg>
          </div>
        </div>

        {/* Card 2: Open */}
        <div className="manage-stat-card card-amber">
          <div className="manage-stat-icon-box open">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="manage-stat-content">
            <div className="manage-stat-label">Open</div>
            <div className="manage-stat-value">{stats.open}</div>
            <span className="manage-stat-subtext">{openPct}% of total</span>
          </div>
          <div className="stat-corner-chart amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" />
              <rect x="7.5" y="12" width="3.5" height="10" rx="1" />
              <rect x="13" y="7" width="3.5" height="15" rx="1" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" />
            </svg>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="manage-stat-card card-purple">
          <div className="manage-stat-icon-box in-progress">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
          </div>
          <div className="manage-stat-content">
            <div className="manage-stat-label">In Progress</div>
            <div className="manage-stat-value">{stats.inProgress}</div>
            <span className="manage-stat-subtext">{inProgressPct}% of total</span>
          </div>
          <div className="stat-corner-chart purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" />
              <rect x="7.5" y="12" width="3.5" height="10" rx="1" />
              <rect x="13" y="7" width="3.5" height="15" rx="1" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" />
            </svg>
          </div>
        </div>

        {/* Card 4: Resolved */}
        <div className="manage-stat-card card-green">
          <div className="manage-stat-icon-box resolved">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="manage-stat-content">
            <div className="manage-stat-label">Resolved</div>
            <div className="manage-stat-value">{stats.resolved}</div>
            <span className="manage-stat-subtext">{resolvedPct}% of total</span>
          </div>
          <div className="stat-corner-chart green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" />
              <rect x="7.5" y="12" width="3.5" height="10" rx="1" />
              <rect x="13" y="7" width="3.5" height="15" rx="1" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" />
            </svg>
          </div>
        </div>

        {/* Card 5: Closed */}
        <div className="manage-stat-card card-red">
          <div className="manage-stat-icon-box closed">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="manage-stat-content">
            <div className="manage-stat-label">Closed</div>
            <div className="manage-stat-value">{stats.closed}</div>
            <span className="manage-stat-subtext">{closedPct}% of total</span>
          </div>
          <div className="stat-corner-chart red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="16" width="3.5" height="6" rx="1" />
              <rect x="7.5" y="12" width="3.5" height="10" rx="1" />
              <rect x="13" y="7" width="3.5" height="15" rx="1" />
              <rect x="18.5" y="2" width="3.5" height="20" rx="1" />
            </svg>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          3. Controls & Filter Row (No White Container, matching Pic 2)
          ---------------------------------------------------------------------- */}
      <div className="manage-controls-row">
        {/* Search Input on the left */}
        <div className="manage-search-wrapper">
          <span className="manage-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="manage-search-input"
            id="manage-ticket-search"
            placeholder="Search by ticket ID, title, requester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Page Size & Filters using CustomSelect with 4-item scroll */}
        <div className="manage-filters-group">
          <CustomSelect
            value={pageSize}
            onChange={handlePageSizeChange}
            options={pageSizeOptions}
            minWidth="110px"
          />

          <CustomSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions}
            minWidth="135px"
            isClearable={true}
          />

          <CustomSelect
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={categoryOptions}
            minWidth="145px"
            isClearable={true}
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          4. Table (Cleanly fitted without horizontal cut-off)
          ---------------------------------------------------------------------- */}
      <div className="ticket-table-container">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#0f172a" }}>No tickets found</h3>
            <p style={{ margin: 0, fontSize: "13px" }}>No tickets match the selected filters.</p>
          </div>
        ) : (
          <table className="ticket-table" id="manage-tickets-table">
            <thead>
              <tr>
                <th style={{ width: "45px", textAlign: "center" }}>#</th>
                <th>TICKET ID</th>
                <th>REQUESTER</th>
                <th>ISSUE TITLE & CATEGORY</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>ASSIGNED AGENT</th>
                <th>CREATED DATE &darr;</th>
                <th className="ticket-action-column">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, idx) => {
                const parsedId = parseTicketCode(t.ticket_code);
                const dateTime = formatDateTime(t.created_at);
                const avatarColor = getAvatarColorClass(t.creator_name);

                return (
                  <tr key={t.id} id={`manage-row-${t.id}`}>
                    {/* Index Column */}
                    <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: "12px" }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Ticket ID (Stacked Card) */}
                    <td>
                      <div className="ticket-id-stacked-pill">
                        <span className="ticket-id-prefix">{parsedId.prefix}</span>
                        <span className="ticket-id-number">{parsedId.number}</span>
                      </div>
                    </td>

                    {/* Requester */}
                    <td>
                      <div className="requester-cell">
                        <div className={`requester-avatar ${avatarColor}`}>
                          {(t.creator_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="requester-meta">
                          <span className="requester-name">{t.creator_name || "Employee"}</span>
                          <span className="requester-email">{t.creator_email || "-"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Issue Title & Category */}
                    <td>
                      <div className="issue-title-cell">
                        <div className="issue-title-text">{t.title}</div>
                        <div className="issue-desc-excerpt">{t.description}</div>
                        <span className="issue-category-tag">{t.category}</span>
                      </div>
                    </td>

                    {/* Priority (with 3-bar icon) */}
                    <td>
                      <div className={`priority-pill-custom ${t.priority?.toLowerCase() || "medium"}`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="6" y1="20" x2="6" y2="14" />
                          <line
                            x1="12"
                            y1="20"
                            x2="12"
                            y2="8"
                            style={{ opacity: t.priority?.toLowerCase() === "low" ? 0.3 : 1 }}
                          />
                          <line
                            x1="18"
                            y1="20"
                            x2="18"
                            y2="4"
                            style={{
                              opacity: ["low", "medium"].includes(t.priority?.toLowerCase()) ? 0.3 : 1,
                            }}
                          />
                        </svg>
                        <span>{t.priority}</span>
                      </div>
                    </td>

                    {/* Status (with solid dot on left) */}
                    <td>
                      <div className={`status-pill-custom ${t.status?.toLowerCase().replace(/\s+/g, "-") || "open"}`}>
                        <span className="status-dot"></span>
                        <span>{t.status}</span>
                      </div>
                    </td>

                    {/* Assigned Agent */}
                    <td>
                      <div className="agent-cell">
                        {t.assignee_name ? (
                          <>
                            <div className="agent-avatar-circle assigned">
                              {t.assignee_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="agent-name-text">{t.assignee_name}</div>
                          </>
                        ) : (
                          <>
                            <div className="agent-avatar-circle unassigned">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </div>
                            <div>
                              <div className="agent-name-text">Unassigned</div>
                              <div className="agent-subtext">-</div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Created Date */}
                    <td>
                      <div className="created-date-cell">
                        <svg className="date-calendar-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <div className="date-text-stack">
                          <span className="date-primary">{dateTime.date}</span>
                          <span className="date-secondary">{dateTime.time}</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions (Square Icon Buttons centered and aligned) */}
                    <td className="ticket-action-column">
                      <div className="actions-cell">
                        {/* 1. Assign / Terminate & Reassign Icon Button (Only for General Admin) */}
                        {isGeneralAdmin && (
                          <button
                            type="button"
                            className={`btn-icon-square assign ${t.status === "In Progress" ? "terminate-reassign" : ""}`}
                            id={`btn-assign-${t.id}`}
                            title={
                              t.status === "In Progress"
                                ? "Terminate Active Session & Reassign Ticket"
                                : t.assigned_to
                                ? "Reassign Support Agent"
                                : "Assign Support Agent"
                            }
                            onClick={() => handleOpenAssign(t)}
                          >
                            {t.status === "In Progress" ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 3h5v5" />
                                <path d="M4 20L21 3" />
                                <path d="M21 16v5h-5" />
                                <path d="M15 15l6 6" />
                                <path d="M4 4l5 5" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                              </svg>
                            )}
                          </button>
                        )}

                        {/* 2. Status / Notes Icon Button */}
                        <button
                          type="button"
                          className="btn-icon-square"
                          id={`btn-status-${t.id}`}
                          title={
                            isTicketAssignedToMe(t)
                              ? "Update Status & Resolution"
                              : "Update Status & Resolution (No permission - assigned to another user)"
                          }
                          onClick={() => handleOpenStatus(t)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>

                        {/* 3. More / Details Vertical 3 Dots */}
                        <button
                          type="button"
                          className="btn-icon-square"
                          id={`btn-details-${t.id}`}
                          title="View Full Details"
                          onClick={() => handleViewDetails(t)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ----------------------------------------------------------------------
          5. Orange-Themed Pagination (matching Pic 2 with API live updates)
          ---------------------------------------------------------------------- */}
      {totalPages > 0 && (
        <div className="ticket-pagination-wrapper">
          <div className="ticket-pagination-controls">
            {/* First Page */}
            <button
              type="button"
              className="pagination-btn"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || loading}
              title="First Page"
            >
              &laquo;
            </button>

            {/* Previous Page */}
            <button
              type="button"
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              title="Previous Page"
            >
              &lsaquo;
            </button>

            {/* Numeric Page Buttons */}
            {getPaginationPages().map((page, idx) => {
              if (page === "...") {
                return (
                  <span key={`dots-${idx}`} className="pagination-dots">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={page}
                  type="button"
                  className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                  onClick={() => handlePageChange(page)}
                  disabled={loading}
                >
                  {page}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              type="button"
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              title="Next Page"
            >
              &rsaquo;
            </button>

            {/* Last Page */}
            <button
              type="button"
              className="pagination-btn"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || loading}
              title="Last Page"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          Modals
          ---------------------------------------------------------------------- */}
      {/* Create Ticket Modal (Pixel-Perfect Matching Reference Pic 1) */}
      {showCreateModal && (
        <div className="ticket-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-ticket-modal-card" id="create-ticket-modal" onClick={(e) => e.stopPropagation()}>
            {/* Subtle warm peach gradient glow in top-right */}
            <div className="create-modal-header-bg"></div>

            {/* Modal Header */}
            <div className="create-ticket-modal-header">
              <div className="create-modal-header-left">
                <div className="create-modal-icon-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="create-modal-titles">
                  <h2>Create Support Ticket</h2>
                  <p>Provide the details of your issue and our support team will assist you.</p>
                </div>
              </div>
              <button
                type="button"
                className="create-modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                title="Close"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="create-ticket-modal-body">
                {createFormError && (
                  <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: "7px", marginBottom: "8px", fontSize: "12px" }}>
                    {createFormError}
                  </div>
                )}

                {/* 1. Issue Title */}
                <div className="create-field-group">
                  <label className="create-field-label" htmlFor="create-ticket-title">
                    Issue Title <span className="field-required-asterisk">*</span>
                  </label>
                  <div className="create-input-wrapper">
                    <span className="field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="create-ticket-title"
                      className="create-input-control"
                      placeholder="e.g. Cannot log in to dashboard"
                      maxLength={100}
                      value={createFormData.title}
                      onChange={(e) => setCreateFormData((prev) => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field-char-counter">{(createFormData.title || "").length}/100</div>
                </div>

                {/* 2. Category & Priority Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {/* Category */}
                  <div className="create-field-group">
                    <label className="create-field-label" htmlFor="create-ticket-category">
                      Category <span className="field-required-asterisk">*</span>
                    </label>
                    <CustomSelect
                      id="create-ticket-category"
                      className="modal-custom-select"
                      value={createFormData.category}
                      onChange={(e) => setCreateFormData((prev) => ({ ...prev, category: e.target.value }))}
                      options={categories.map((c) => ({
                        value: typeof c === "object" ? c.id : c,
                        label: typeof c === "object" ? c.name : c,
                      }))}
                      placeholder="Select Category"
                      isClearable={true}
                      icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Priority */}
                  <div className="create-field-group">
                    <label className="create-field-label" htmlFor="create-ticket-priority">
                      Priority <span className="field-required-asterisk">*</span>
                    </label>
                    <CustomSelect
                      id="create-ticket-priority"
                      className="modal-custom-select"
                      value={createFormData.priority}
                      onChange={(e) => setCreateFormData((prev) => ({ ...prev, priority: e.target.value }))}
                      options={priorities.map((p) => ({
                        value: typeof p === "object" ? p.id : p,
                        label: typeof p === "object" ? p.name : p,
                      }))}
                      isClearable={true}
                      icon={
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                          <line x1="4" y1="22" x2="4" y2="15" />
                        </svg>
                      }
                    />
                  </div>
                </div>

                {/* 3. Detailed Description */}
                <div className="create-field-group">
                  <label className="create-field-label" htmlFor="create-ticket-desc">
                    Detailed Description <span className="field-required-asterisk">*</span>
                  </label>
                  <div className="create-textarea-wrapper">
                    <span className="field-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="7" y1="8" x2="17" y2="8" />
                        <line x1="7" y1="12" x2="17" y2="12" />
                        <line x1="7" y1="16" x2="12" y2="16" />
                      </svg>
                    </span>
                    <textarea
                      id="create-ticket-desc"
                      className="create-textarea-control"
                      rows="2"
                      placeholder="Provide full details of the issue, steps to reproduce, error messages, etc."
                      maxLength={500}
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData((prev) => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field-char-counter">{(createFormData.description || "").length}/500</div>
                </div>

                {/* 4. Attach Files (Optional) Box */}
                <div className="create-attach-files-box">
                  <div className="attach-files-left">
                    <div className="attach-clip-icon-box">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </div>
                    <div className="attach-files-text">
                      <div className="attach-title">
                        Attach Files <span className="attach-optional">(Optional)</span>
                      </div>
                      <div className="attach-subtitle">
                        You can upload screenshots, error logs or any relevant files.
                      </div>
                    </div>
                  </div>
                  <div className="attach-files-right">
                    <input
                      type="file"
                      id="create-ticket-file-input"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      className="btn-upload-files"
                      onClick={() => document.getElementById("create-ticket-file-input")?.click()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m16 16-4-4-4 4" />
                      </svg>
                      Upload Files
                    </button>
                    <span className="attach-limits-hint">Max 5 files, 10 MB each</span>
                  </div>
                </div>

                {/* Files selection preview chips */}
                {createFiles.length > 0 && (
                  <div className="selected-files-list">
                    {createFiles.map((file, idx) => (
                      <span key={idx} className="file-chip">
                        <span className="file-chip-name">{file.name}</span>
                        <button type="button" onClick={() => removeFile(idx)} className="file-chip-remove" title="Remove file">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="create-ticket-modal-footer">
                <button
                  type="button"
                  className="create-cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-submit-btn"
                  disabled={modalLoading}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {modalLoading ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Reassign Ticket Modal - Exact Match with Reference Picture 1 */}
      {showAssignModal && activeTicket && (
        <div className="ticket-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className={`assign-ticket-modal-card ${activeTicket.status === "In Progress" ? "in-progress" : ""}`} id="assign-ticket-modal" onClick={(e) => e.stopPropagation()}>
            {/* Top-Right Warm Peach Header Background Glow */}
            <div className="assign-modal-header-bg"></div>

            {/* Header */}
            <div className="assign-ticket-modal-header">
              <div className="assign-modal-header-left">
                <div className="assign-modal-icon-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="18" y1="8" x2="23" y2="13" />
                    <line x1="23" y1="8" x2="18" y2="13" />
                  </svg>
                </div>
                <div className="assign-modal-titles">
                  <h2>
                    {activeTicket.assigned_to ? "Reassign Ticket" : "Assign Ticket"} ({activeTicket.ticket_code})
                  </h2>
                  <p>
                    {activeTicket.assigned_to
                      ? "Assign this ticket to a different support agent."
                      : "Assign a support agent to handle this ticket."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="assign-modal-close-btn"
                onClick={() => setShowAssignModal(false)}
                title="Close modal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="assign-ticket-modal-body">
                {/* 1. Ticket Information Summary Card */}
                <div className="assign-ticket-summary-card">
                  {/* Ticket ID */}
                  <div className="assign-summary-item ticket-id-item">
                    <div className="assign-summary-icon-box">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="assign-summary-text">
                      <span className="summary-label">TICKET ID</span>
                      <span className="summary-val-id">{activeTicket.ticket_code}</span>
                    </div>
                  </div>

                  <div className="assign-summary-divider"></div>

                  {/* Issue Title & Category */}
                  <div className="assign-summary-item issue-item" title={activeTicket.title}>
                    <span className="summary-label">ISSUE TITLE</span>
                    <span className="summary-val-title" title={activeTicket.title}>
                      {activeTicket.title}
                    </span>
                    <div className="summary-val-category-pill">
                      {activeTicket.category || "Technical Issue"}
                    </div>
                  </div>

                  <div className="assign-summary-divider"></div>

                  {/* Currently Assigned To */}
                  <div className="assign-summary-item assigned-item">
                    <span className="summary-label">CURRENTLY ASSIGNED TO</span>
                    {activeTicket.assignee_name ? (
                      <div className="assign-current-agent-row">
                        <span className="assign-agent-name">{activeTicket.assignee_name}</span>
                      </div>
                    ) : (
                      <span className="assign-unassigned-text">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* 2. Select New Assignee Section */}
                <div className="assign-form-section">
                  <div className="assign-section-label">
                    Select New Assignee (Support Agent) <span className="field-required-asterisk">*</span>
                  </div>
                  <div className="assign-section-subtitle">
                    Search and select a support agent from the list below.
                  </div>

                  {/* Searchable Agent Custom Dropdown */}
                  <div className="agent-dropdown-wrapper" ref={agentDropdownRef}>
                    {/* Dropdown search trigger bar */}
                    <div
                      className={`agent-dropdown-trigger ${isAgentDropdownOpen ? "active" : ""}`}
                      onClick={() => setIsAgentDropdownOpen((prev) => !prev)}
                    >
                      <span className="agent-search-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="agent-search-input-field"
                        placeholder={
                          !isAgentDropdownOpen && selectedAgentObj
                            ? selectedAgentObj.name
                            : "Search and select an agent..."
                        }
                        value={isAgentDropdownOpen ? agentSearchQuery : (selectedAgentObj?.name || "")}
                        onChange={(e) => {
                          setAgentSearchQuery(e.target.value);
                          if (!isAgentDropdownOpen) setIsAgentDropdownOpen(true);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAgentDropdownOpen) setIsAgentDropdownOpen(true);
                        }}
                      />
                      <span className={`agent-chevron ${isAgentDropdownOpen ? "open" : ""}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </div>

                    {/* Dropdown Options List */}
                    {isAgentDropdownOpen && (
                      <div className="agent-options-list">
                        {agents
                          .filter((agent) => {
                            if (!agentSearchQuery.trim()) return true;
                            const q = agentSearchQuery.toLowerCase();
                            return agent.name?.toLowerCase().includes(q);
                          })
                          .map((agent) => {
                            const isSelected = String(agent.id) === String(selectedAgent);
                            return (
                              <div
                                key={agent.id}
                                className={`agent-option-item ${isSelected ? "selected" : ""}`}
                                onClick={() => {
                                  setSelectedAgent(agent.id);
                                  setIsAgentDropdownOpen(false);
                                  setAgentSearchQuery("");
                                }}
                              >
                                <span className="agent-option-name">{agent.name}</span>
                                {isSelected && (
                                  <div className="agent-selected-badge">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {agents.filter((a) => {
                          if (!agentSearchQuery.trim()) return true;
                          const q = agentSearchQuery.toLowerCase();
                          return a.name?.toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className="agent-no-results">No agents found matching &quot;{agentSearchQuery}&quot;</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Reason for Session Termination (if In Progress) */}
                {activeTicket.status === "In Progress" && (
                  <div className="assign-form-section" style={{ marginTop: "10px" }}>
                    <div className="assign-section-label">Reason for Session Termination</div>
                    <div className="assign-section-subtitle">
                      Provide a brief note explaining why this session is being terminated and restarted.
                    </div>
                    <textarea
                      id="assign-termination-reason"
                      className="assign-termination-textarea"
                      rows="2"
                      placeholder="e.g. Current assignee is unable to complete the task in time..."
                      value={terminationReason}
                      onChange={(e) => setTerminationReason(e.target.value)}
                    />
                  </div>
                )}

                {/* 4. Orange Info Alert Notice Banner */}
                <div className="assign-info-notice-banner">
                  <div className="assign-notice-icon-box">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <span className="assign-notice-text">
                    {activeTicket.status === "In Progress" ? (
                      <>
                        Ticket is currently in <strong>In Progress</strong> status. Reassigning will terminate the active session and restart the task fresh for the new agent.
                      </>
                    ) : (
                      <>
                        Ticket is currently in <strong>{activeTicket.status || "Open"}</strong> status. Reassigning will allocate it to the selected agent without session interruption.
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="assign-ticket-modal-footer">
                <button
                  type="button"
                  className="assign-cancel-btn"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="assign-submit-btn"
                  disabled={modalLoading}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="18" y1="8" x2="23" y2="13" />
                    <line x1="23" y1="8" x2="18" y2="13" />
                  </svg>
                  {modalLoading
                    ? "Processing..."
                    : activeTicket.status === "In Progress"
                    ? "Terminate & Reassign"
                    : activeTicket.assigned_to
                    ? "Reassign Ticket"
                    : "Assign Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal - Exact Match with Reference Picture 1 */}
      {showStatusModal && activeTicket && (
        <div className="ticket-modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="status-ticket-modal-card" id="status-ticket-modal" onClick={(e) => e.stopPropagation()}>
            {/* Warm peach header glow effect */}
            <div className="status-modal-header-bg"></div>

            {/* Header */}
            <div className="status-ticket-modal-header">
              <div className="status-modal-header-left">
                <div className="status-modal-icon-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M10 13l4-4 2 2-4 4-2.5.5.5-2.5z" />
                  </svg>
                </div>
                <div className="status-modal-titles">
                  <h2>Update Status & Resolution ({activeTicket.ticket_code})</h2>
                  <p>Change the current status of this ticket and add resolution details.</p>
                </div>
              </div>
              <button
                type="button"
                className="status-modal-close-btn"
                onClick={() => setShowStatusModal(false)}
                title="Close modal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleStatusSubmit}>
              <div className="status-ticket-modal-body">
                {/* Ticket Information Summary Card */}
                <div className="status-ticket-summary-card">
                  {/* 1. Ticket ID */}
                  <div className="status-summary-item ticket-id-item">
                    <div className="status-summary-icon-box">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="status-summary-text">
                      <span className="summary-label">Ticket ID</span>
                      <span className="summary-val-id">{activeTicket.ticket_code}</span>
                    </div>
                  </div>

                  <div className="status-summary-divider"></div>

                  {/* 2. Issue Title & Category */}
                  <div className="status-summary-item issue-item">
                    <span className="summary-label">Issue Title</span>
                    <span className="summary-val-title" title={activeTicket.title}>
                      {activeTicket.title}
                    </span>
                    <div className="summary-val-category-pill">
                      {activeTicket.category || "Technical Issue"}
                    </div>
                  </div>

                  <div className="status-summary-divider"></div>

                  {/* 3. Current Status & Created At */}
                  <div className="status-summary-item status-item">
                    <span className="summary-label">Current Status</span>
                    <div className={`status-pill-custom ${activeTicket.status?.toLowerCase().replace(/\s+/g, "-") || "open"}`} style={{ display: "inline-flex", alignSelf: "flex-start" }}>
                      <span className="status-dot"></span>
                      <span>{activeTicket.status}</span>
                    </div>
                    <span className="summary-created-date">
                      Created on {formatDateTime(activeTicket.created_at).date}, {formatDateTime(activeTicket.created_at).time}
                    </span>
                  </div>
                </div>

                {/* Closed Ticket Notice Banner OR Permission Denied Banner */}
                {isTicketClosed ? (
                  <div className="status-permission-denied-banner" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                    <div className="status-permission-denied-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div className="status-permission-denied-text">
                      <strong style={{ color: "#991b1b" }}>This ticket is Closed.</strong>
                      <p style={{ color: "#b91c1c" }}>
                        This ticket is completed and closed. Status, resolution notes, and attachments cannot be modified.
                      </p>
                    </div>
                  </div>
                ) : !isAssignedToCurrentUser && (
                  <div className="status-permission-denied-banner">
                    <div className="status-permission-denied-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <div className="status-permission-denied-text">
                      <strong>You do not have permission to update this ticket.</strong>
                      <p>
                        Only the assigned user {activeTicket.assignee_name ? `(${activeTicket.assignee_name})` : ""} can update status &amp; resolution. General Admin can only update tickets assigned to their own account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Select New Status Section */}
                <div className="status-form-section">
                  <div className="status-section-label">
                    Select New Status <span className="field-required-asterisk">*</span>
                  </div>
                  <div className="status-section-subtitle">
                    Choose the new status for this ticket.
                  </div>

                  <div className="status-cards-row">
                    {/* Option 1: Open */}
                    <div
                      className={`status-choice-card open ${newStatus === "Open" ? "selected" : ""} ${isStatusDisabled("Open") ? "disabled" : ""}`}
                      onClick={() => !isStatusDisabled("Open") && setNewStatus("Open")}
                      title={getStatusTooltip("Open")}
                    >
                      <div className="choice-card-left">
                        <div className="choice-dot-ring open">
                          <span className="choice-dot open"></span>
                        </div>
                        <div className="choice-info">
                          <span className="choice-title open">Open</span>
                          <span className="choice-desc">Ticket is newly created and not yet assigned.</span>
                        </div>
                      </div>
                      <div className={`choice-radio-indicator ${newStatus === "Open" ? "checked" : ""}`}>
                        {newStatus === "Open" && <span className="choice-radio-inner"></span>}
                      </div>
                    </div>

                    {/* Option 2: In Progress */}
                    <div
                      className={`status-choice-card in-progress ${newStatus === "In Progress" ? "selected" : ""} ${isStatusDisabled("In Progress") ? "disabled" : ""}`}
                      onClick={() => !isStatusDisabled("In Progress") && setNewStatus("In Progress")}
                      title={getStatusTooltip("In Progress")}
                    >
                      <div className="choice-card-left">
                        <div className="choice-dot-ring in-progress">
                          <span className="choice-dot in-progress"></span>
                        </div>
                        <div className="choice-info">
                          <span className="choice-title in-progress">In Progress</span>
                          <span className="choice-desc">Work is currently being done on this ticket.</span>
                        </div>
                      </div>
                      <div className={`choice-radio-indicator ${newStatus === "In Progress" ? "checked" : ""}`}>
                        {newStatus === "In Progress" && <span className="choice-radio-inner"></span>}
                      </div>
                    </div>

                    {/* Option 3: Resolved */}
                    <div
                      className={`status-choice-card resolved ${newStatus === "Resolved" ? "selected" : ""} ${isStatusDisabled("Resolved") ? "disabled" : ""}`}
                      onClick={() => !isStatusDisabled("Resolved") && setNewStatus("Resolved")}
                      title={getStatusTooltip("Resolved")}
                    >
                      <div className="choice-card-left">
                        <div className="choice-dot-ring resolved">
                          <span className="choice-dot resolved"></span>
                        </div>
                        <div className="choice-info">
                          <span className="choice-title resolved">Resolved</span>
                          <span className="choice-desc">Issue has been fixed and awaiting confirmation.</span>
                        </div>
                      </div>
                      <div className={`choice-radio-indicator ${newStatus === "Resolved" ? "checked" : ""}`}>
                        {newStatus === "Resolved" && <span className="choice-radio-inner"></span>}
                      </div>
                    </div>

                    {/* Option 4: Closed */}
                    <div
                      className={`status-choice-card closed ${newStatus === "Closed" ? "selected" : ""} ${isStatusDisabled("Closed") ? "disabled" : ""}`}
                      onClick={() => !isStatusDisabled("Closed") && setNewStatus("Closed")}
                      title={getStatusTooltip("Closed")}
                    >
                      <div className="choice-card-left">
                        <div className="choice-dot-ring closed">
                          <span className="choice-dot closed"></span>
                        </div>
                        <div className="choice-info">
                          <span className="choice-title closed">Closed</span>
                          <span className="choice-desc">Ticket is completed and closed.</span>
                        </div>
                      </div>
                      <div className={`choice-radio-indicator ${newStatus === "Closed" ? "checked" : ""}`}>
                        {newStatus === "Closed" && <span className="choice-radio-inner"></span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolution Note / Comments Section */}
                <div className="status-form-section">
                  <div className="status-section-label">
                    Resolution Note / Comments <span className="field-required-asterisk">*</span>
                  </div>
                  <div className="status-section-subtitle">
                    Provide details on what was done, how the issue was resolved, or any additional comments.
                  </div>

                  <div className="status-textarea-wrapper">
                    <span className="status-textarea-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </span>
                    <textarea
                      id="status-resolution-note"
                      className="status-textarea-control"
                      placeholder={
                        isTicketClosed
                          ? "This ticket is closed and cannot be modified."
                          : !isAssignedToCurrentUser
                          ? "You do not have permission to edit this ticket..."
                          : "Provide details on the resolution, steps taken, or any additional comments..."
                      }
                      maxLength={500}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      required={newStatus === "Resolved" && isAssignedToCurrentUser && !isTicketClosed}
                      disabled={!isAssignedToCurrentUser || isTicketClosed}
                    />
                  </div>
                  <div className="field-char-counter">{resolutionNote.length}/500</div>
                </div>

                {/* Attach Files (Optional) */}
                <div className="create-attach-files-box status-compact">
                  <div className="attach-files-left">
                    <div className="attach-clip-icon-box">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </div>
                    <div className="attach-files-text">
                      <div className="attach-title">
                        Attach Files <span className="attach-optional">(Optional)</span>
                      </div>
                      <div className="attach-subtitle">
                        You can upload screenshots, logs or any relevant files.
                      </div>
                    </div>
                  </div>
                  <div className="attach-files-right">
                    <input
                      type="file"
                      id="status-ticket-file-input"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleStatusFileChange}
                    />
                    <button
                      type="button"
                      className="btn-upload-files"
                      disabled={!isAssignedToCurrentUser || isTicketClosed}
                      onClick={() => isAssignedToCurrentUser && !isTicketClosed && document.getElementById("status-ticket-file-input")?.click()}
                      title={isTicketClosed ? "This ticket is closed and cannot be modified" : undefined}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                        <path d="M12 12v9" />
                        <path d="m16 16-4-4-4 4" />
                      </svg>
                      Upload Files
                    </button>
                    <span className="attach-limits-hint">Max 5 files, 10 MB each</span>
                  </div>
                </div>

                {/* Selected Files preview chips */}
                {statusFiles.length > 0 && (
                  <div className="selected-files-list">
                    {statusFiles.map((file, idx) => (
                      <span key={idx} className="file-chip">
                        <span className="file-chip-name">{file.name}</span>
                        {!isTicketClosed && (
                          <button type="button" onClick={() => removeStatusFile(idx)} className="file-chip-remove" title="Remove file">&times;</button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Blue Info Notice Banner */}
                <div className="status-info-notice-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>The ticket requester will receive an instant notification with this update.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="status-ticket-modal-footer">
                <button
                  type="button"
                  className="status-cancel-btn"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="status-submit-btn"
                  disabled={modalLoading || !isAssignedToCurrentUser || isTicketClosed}
                  title={
                    isTicketClosed
                      ? "This ticket is closed and cannot be modified"
                      : !isAssignedToCurrentUser
                      ? "You do not have permission to update this ticket"
                      : "Update Status"
                  }
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {modalLoading
                    ? "Updating..."
                    : isTicketClosed
                    ? "Ticket is Closed"
                    : !isAssignedToCurrentUser
                    ? "No Permission to Update"
                    : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal - Exact Match with Reference Picture 1 */}
      {showDetailModal && activeTicket && (
        <div className="ticket-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="detail-ticket-modal-card" id="admin-ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Top-Right Warm Peach Header Background Glow */}
            <div className="detail-modal-header-bg"></div>

            {/* Header */}
            <div className="detail-ticket-modal-header">
              <div className="detail-modal-header-left">
                <div className="detail-modal-icon-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="detail-modal-titles">
                  <h2>Ticket Details ({activeTicket.ticket_code})</h2>
                  <p>View complete information about this ticket.</p>
                </div>
              </div>
              <button
                type="button"
                className="detail-modal-close-btn"
                onClick={() => setShowDetailModal(false)}
                title="Close modal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="detail-ticket-modal-body">
              {/* Card 1: Main Ticket Info Card (Exact match with Picture 1) */}
              <div className="detail-main-info-card">
                {/* Top Row: Code Pill, Status Pill, Created Date */}
                <div className="detail-info-top-row">
                  <div className="detail-top-left-badges">
                    <span className="detail-code-badge">{activeTicket.ticket_code}</span>
                    <div className={`detail-status-pill ${activeTicket.status?.toLowerCase().replace(/\s+/g, "-") || "open"}`}>
                      <span className="detail-status-dot"></span>
                      <span>{activeTicket.status || "Open"}</span>
                    </div>
                  </div>
                  <div className="detail-created-date">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Created on {formatDateTime(activeTicket.created_at).date}, {formatDateTime(activeTicket.created_at).time}</span>
                  </div>
                </div>

                {/* Middle Row: Large Bold Issue Title */}
                <h3 className="detail-main-issue-title">{activeTicket.title}</h3>

                {/* Bottom Row: 4 Columns Info Grid */}
                <div className="detail-meta-columns-grid">
                  {/* Column 1: Requester */}
                  <div className="detail-meta-col">
                    <div className="detail-col-avatar requester-avatar">
                      {(activeTicket.creator_name || "B").charAt(0).toUpperCase()}
                    </div>
                    <div className="detail-col-text">
                      <span className="detail-col-label">Requester</span>
                      <span className="detail-col-val">{activeTicket.creator_name || "Employee"}</span>
                      <span className="detail-col-subtext">{activeTicket.creator_email || "bansi@gmail.com"}</span>
                    </div>
                  </div>

                  {/* Column 2: Category */}
                  <div className="detail-meta-col">
                    <div className="detail-col-avatar category-avatar">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div className="detail-col-text">
                      <span className="detail-col-label">Category</span>
                      <span className="detail-col-val">{activeTicket.category || "Technical Issue"}</span>
                    </div>
                  </div>

                  {/* Column 3: Priority */}
                  <div className="detail-meta-col">
                    <div className="detail-col-avatar priority-avatar">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="19" x2="12" y2="5"/>
                        <polyline points="5 12 12 5 19 12"/>
                      </svg>
                    </div>
                    <div className="detail-col-text">
                      <span className="detail-col-label">Priority</span>
                      <span className={`detail-priority-tag ${(activeTicket.priority || "Medium").toLowerCase()}`}>
                        {activeTicket.priority || "Medium"}
                      </span>
                    </div>
                  </div>

                  {/* Column 4: Assigned Agent */}
                  <div className="detail-meta-col">
                    <div className="detail-col-avatar agent-avatar">
                      {(activeTicket.assignee_name || "K").charAt(0).toUpperCase()}
                    </div>
                    <div className="detail-col-text">
                      <span className="detail-col-label">Assigned Agent</span>
                      <span className="detail-col-val">{activeTicket.assignee_name || "Unassigned"}</span>
                      {activeTicket.assignee_name ? (
                        <span className="detail-col-subtext">{activeTicket.assignee_email || `${activeTicket.assignee_name.toLowerCase()}@gmail.com`}</span>
                      ) : (
                        <span className="detail-col-subtext">No agent assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Issue Description Box */}
              <div className="detail-issue-desc-card">
                <div className="detail-desc-icon-circle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="detail-desc-content">
                  <h4 className="detail-desc-title">Issue Description</h4>
                  <p className="detail-desc-text">{activeTicket.description || "No description provided."}</p>
                </div>
              </div>

              {/* Card 2.5: Issue Attachments (Uploaded by Requester) */}
              {activeTicket.attachments?.some((a) => a.source !== "resolution") && (
                <TicketAttachmentsView
                  attachments={activeTicket.attachments.filter((a) => a.source !== "resolution")}
                  title="Issue Attachments (Requester)"
                  subtitle="Files and documents uploaded during ticket creation"
                  variant="creation"
                />
              )}

              {/* Card 3: Session Reassignment History */}
              {Boolean(activeTicket.reassigned_count > 0 || activeTicket.termination_reason) && (
                <div className="detail-history-card">
                  <div className="detail-history-header-bar">
                    <div className="detail-history-header-left">
                      <div className="detail-history-clock-circle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <span className="detail-history-title">Session Reassignment History</span>
                    </div>
                    <span className="detail-history-count-badge">
                      {activeTicket.reassigned_count || 1} time(s)
                    </span>
                  </div>

                  <div className="detail-history-table-wrapper">
                    <table className="detail-history-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>PREVIOUS AGENT</th>
                          <th>REASSIGNED BY</th>
                          <th>REASSIGNED ON</th>
                          <th>SESSION TERMINATION REASON</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1</td>
                          <td className="agent-col">{activeTicket.assignee_name || "Support Agent"}</td>
                          <td>General Admin</td>
                          <td>
                            {formatDateTime(activeTicket.updated_at || activeTicket.created_at).date}, {formatDateTime(activeTicket.updated_at || activeTicket.created_at).time}
                          </td>
                          <td className="reason-col">
                            {activeTicket.termination_reason || "Session terminated by General Admin to restart task"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Card 4: Resolution Note (if available) */}
              {activeTicket.resolution_note && (
                <div className="detail-resolution-card">
                  <div className="detail-resolution-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Resolution Note
                  </div>
                  <p className="detail-resolution-text">{activeTicket.resolution_note}</p>
                </div>
              )}

              {/* Card 4.5: Resolution & Progress Attachments (Uploaded by Support Agent) */}
              {activeTicket.attachments?.some((a) => a.source === "resolution") && (
                <TicketAttachmentsView
                  attachments={activeTicket.attachments.filter((a) => a.source === "resolution")}
                  title="Resolution & Progress Attachments (Support Agent)"
                  subtitle="Proof documents, screenshots, and files uploaded by assigned agent"
                  variant="resolution"
                />
              )}
            </div>

            {/* Footer */}
            <div className="detail-ticket-modal-footer">
              <button
                type="button"
                className="detail-close-btn"
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTickets;
