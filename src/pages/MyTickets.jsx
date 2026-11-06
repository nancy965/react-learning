import { useState, useEffect, useCallback } from "react";
import {
  getMyTickets,
  createTicket,
  getTicketStats,
  getTicketById,
} from "../services/ticketService";
import { getCommonMasterByType } from "../services/commonMasterService";
import CustomSelect from "../components/CustomSelect";
import SuccessToast from "../components/SuccessToast";
import TicketAttachmentsView from "../components/TicketAttachmentsView";
import "./MyTickets.css";

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState(["Low", "Medium", "High", "Urgent"]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals & Toast
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    priority: "Medium",
    description: "",
  });
  const [formError, setFormError] = useState("");
  const [createFiles, setCreateFiles] = useState([]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setCreateFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index) => {
    setCreateFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Load ticket categories and priorities from common_master
  const loadMasterData = useCallback(async () => {
    try {
      const [catRes, prioRes] = await Promise.all([
        getCommonMasterByType("ticket_category").catch(() => null),
        getCommonMasterByType("ticket_priority").catch(() => null),
      ]);

      if (catRes?.success && catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data.map((item) => ({ id: item.id, name: item.name })));
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

      if (prioRes?.success && prioRes.data && prioRes.data.length > 0) {
        setPriorities(prioRes.data.map((item) => ({ id: item.id, name: item.name })));
      } else {
        setPriorities([
          { id: "Low", name: "Low" },
          { id: "Medium", name: "Medium" },
          { id: "High", name: "High" },
          { id: "Urgent", name: "Urgent" },
        ]);
      }
    } catch {
      setCategories([
        { id: "Technical Issue", name: "Technical Issue" },
        { id: "Account Access", name: "Account Access" },
        { id: "Data Problem", name: "Data Problem" },
        { id: "Billing", name: "Billing" },
        { id: "Software Request", name: "Software Request" },
        { id: "Other", name: "Other" },
      ]);
      setPriorities([
        { id: "Low", name: "Low" },
        { id: "Medium", name: "Medium" },
        { id: "High", name: "High" },
        { id: "Urgent", name: "Urgent" },
      ]);
    }
  }, []);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const res = await getTicketStats({ scope: "my" });
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  // Fetch user's tickets with network API logging
  const fetchTickets = useCallback(
    async (page = 1, limit = pageSize) => {
      setLoading(true);
      console.log(`[MyTickets API] Calling getMyTickets page=${page}&limit=${limit}`);
      try {
        const res = await getMyTickets({
          page,
          limit,
          status: statusFilter,
          category: categoryFilter,
          search,
        });

        if (res.success) {
          setTickets(res.data || []);
          if (res.pagination) {
            setTotalRecords(res.pagination.totalRecords ?? res.pagination.total ?? 0);
            setTotalPages(res.pagination.totalPages || 1);
            setCurrentPage(res.pagination.page || page);
            setPageSize(res.pagination.limit || limit);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tickets:", err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, categoryFilter, search, pageSize]
  );

  useEffect(() => {
    loadMasterData();
    loadStats();
  }, [loadMasterData, loadStats]);

  useEffect(() => {
    fetchTickets(1, pageSize);
  }, [statusFilter, categoryFilter, search]);

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError("");
  };

  // Submit New Ticket
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Issue title is required.");
      return;
    }
    if (!formData.category) {
      setFormError("Please select a category.");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Issue description is required.");
      return;
    }

    setSubmitting(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append("title", formData.title.trim());
      dataPayload.append("category", formData.category);
      dataPayload.append("priority", formData.priority || "Medium");
      dataPayload.append("description", formData.description.trim());
      if (createFiles && createFiles.length > 0) {
        createFiles.forEach((file) => {
          dataPayload.append("files", file);
        });
      }

      const res = await createTicket(dataPayload);
      if (res.success) {
        setShowCreateModal(false);
        setFormData({ title: "", category: "", priority: "Medium", description: "" });
        setCreateFiles([]);
        setToastMessage(`Ticket ${res.data.ticket_code} submitted successfully!`);
        loadStats();
        fetchTickets(1);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Details Modal
  const handleViewDetails = async (ticket) => {
    try {
      const res = await getTicketById(ticket.id);
      if (res.success) {
        setSelectedTicket(res.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error("Failed to load details:", err);
      setSelectedTicket(ticket);
      setShowDetailModal(true);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "open";
      case "in progress":
        return "in-progress";
      case "resolved":
        return "resolved";
      case "closed":
        return "closed";
      default:
        return "open";
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

  // Options for CustomSelect
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" },
  ];

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((c) => ({
      value: typeof c === "object" ? c.id : c,
      label: typeof c === "object" ? c.name : c,
    })),
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

  const handlePageSizeChange = (e) => {
    const newLimit = Number(e.target.value);
    setPageSize(newLimit);
    setCurrentPage(1);
    fetchTickets(1, newLimit);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage || loading) return;
    setCurrentPage(page);
    fetchTickets(page, pageSize);
  };

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

  return (
    <div className="my-tickets-container" id="my-tickets-page">
      {/* Toast Notification */}
      {toastMessage && (
        <SuccessToast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* ----------------------------------------------------------------------
          1. Header (matching Pic 1)
          ---------------------------------------------------------------------- */}
      <div className="my-tickets-header">
        <div className="my-tickets-title">
          <span className="standard-page-eyebrow">SUPPORT TICKETS</span>
          <h1>My Support Tickets</h1>
          <p className="my-tickets-subtitle">
            Report issues, track progress, and communicate directly with support staff.
          </p>
        </div>

        <button
          type="button"
          className="btn-header-create-ticket"
          id="btn-create-ticket"
          onClick={() => {
            const defaultCat = categories[0]?.id || (typeof categories[0] === "object" ? categories[0]?.id : categories[0]) || "";
            const defaultPrio = priorities.find((p) => (typeof p === "object" ? p.name : p) === "Medium")?.id || (typeof priorities[0] === "object" ? priorities[0]?.id : priorities[0]) || "Medium";
            setFormData({
              title: "",
              category: defaultCat,
              priority: defaultPrio,
              description: "",
            });
            setFormError("");
            setShowCreateModal(true);
          }}
        >
          + Create New Ticket
        </button>
      </div>

      {/* ----------------------------------------------------------------------
          2. KPI Stats Grid (4 Cards in a row, matching Pic 1)
          ---------------------------------------------------------------------- */}
      <div className="ticket-stats-grid">
        {/* Card 1: Total Submitted */}
        <div className="stat-card card-blue">
          <div className="stat-icon total">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Submitted</span>
            <span className="stat-value">{stats.total}</span>
            <span className="stat-subtext-green">&uarr; +1 this week</span>
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

        {/* Card 2: Open Issues */}
        <div className="stat-card card-amber">
          <div className="stat-icon open">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Open Issues</span>
            <span className="stat-value">{stats.open}</span>
            <span className="stat-subtext-muted">{openPct}% of total</span>
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
        <div className="stat-card card-purple">
          <div className="stat-icon in-progress">
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
          <div className="stat-details">
            <span className="stat-label">In Progress</span>
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-subtext-muted">{inProgressPct}% of total</span>
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
        <div className="stat-card card-green">
          <div className="stat-icon resolved">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Resolved</span>
            <span className="stat-value">{stats.resolved}</span>
            <span className="stat-subtext-muted">{resolvedPct}% of total</span>
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
      </div>

      {/* ----------------------------------------------------------------------
          3. Controls Row (NO white container card across line, matching request)
          ---------------------------------------------------------------------- */}
      <div className="my-tickets-controls-row">
        {/* Search Input on the left */}
        <div className="my-tickets-search-wrapper">
          <span className="my-tickets-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="my-tickets-search-input"
            id="ticket-search-input"
            placeholder="Search by ticket ID, title, requester, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Dropdowns on the right */}
        <div className="my-tickets-filters-group">
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
          4. Table Container (matching Pic 1)
          ---------------------------------------------------------------------- */}
      <div className="ticket-table-container">
        <table className="ticket-table" id="my-tickets-table">
          <thead>
            <tr>
              <th style={{ width: "45px", textAlign: "center" }}>#</th>
              <th>TICKET ID</th>
              <th>REQUESTER</th>
              <th>ISSUE TITLE & CATEGORY</th>
              <th>PRIORITY</th>
              <th>STATUS</th>
              <th>ASSIGNED AGENT</th>
              <th>
                CREATED DATE{" "}
                <span style={{ fontSize: "12px", opacity: 0.8 }}>&#x21C5;</span>
              </th>
              <th className="ticket-action-column">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                  Loading your tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: 0 }}>
                  <div className="empty-ticket-state">
                    {/* Cloud Illustration with Document and Orange Sparks (Matching Pic 1) */}
                    <div className="empty-illustration-wrapper">
                      <svg width="120" height="75" viewBox="0 0 120 75" fill="none">
                        {/* Soft cloud backdrop */}
                        <path
                          d="M30 60h60a20 20 0 0 0 5-39.4A26 26 0 0 0 50 15a21 21 0 0 0-23 23A18 18 0 0 0 30 60z"
                          fill="#f1f5f9"
                        />
                        {/* Document outline */}
                        <rect x="47" y="24" width="26" height="34" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
                        <path d="M54 34h12M54 40h12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                        <line x1="60" y1="46" x2="60.01" y2="46" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Orange / Gold sparks */}
                        <path d="M85 16l4-4M91 19l6 0M88 25l4 4" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </div>

                    <h3 className="empty-state-title">No tickets found</h3>
                    <p className="empty-state-desc">You haven&apos;t created any tickets matching your search filters.</p>
                    <button
                      type="button"
                      className="btn-create-first-ticket"
                      id="btn-create-first-ticket"
                      onClick={() => {
                        setFormData({
                          title: "",
                          category: categories[0] || "Technical Issue",
                          priority: "Medium",
                          description: "",
                        });
                        setFormError("");
                        setShowCreateModal(true);
                      }}
                    >
                      + Create Your First Ticket
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              tickets.map((t, idx) => {
                const parsedId = parseTicketCode(t.ticket_code);
                const dateTime = formatDateTime(t.created_at);
                const avatarColor = getAvatarColorClass(t.creator_name);

                return (
                  <tr key={t.id} id={`ticket-row-${t.id}`}>
                    {/* Index Column */}
                    <td style={{ textAlign: "center", color: "#64748b", fontWeight: 600, fontSize: "12px" }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Ticket ID */}
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

                    {/* Priority */}
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
                            style={{ opacity: ["low", "medium"].includes(t.priority?.toLowerCase()) ? 0.3 : 1 }}
                          />
                        </svg>
                        <span>{t.priority}</span>
                      </div>
                    </td>

                    {/* Status */}
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

                    {/* Actions */}
                    <td className="ticket-action-column">
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="btn-icon-square"
                          id={`btn-view-${t.id}`}
                          title="View Full Details"
                          onClick={() => handleViewDetails(t)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
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

      {/* ----------------------------------------------------------------------
          5. Orange-Themed Pagination (matching Manage Tickets)
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

      {/* Modal: Create Ticket (Pixel-Perfect Matching Reference Pic 1) */}
      {showCreateModal && (
        <div className="ticket-modal-overlay">
          <div className="create-ticket-modal-card" id="create-ticket-modal">
            {/* Subtle warm peach gradient glow in top-right */}
            <div className="create-modal-header-bg"></div>

            {/* Modal Header */}
            <div className="create-ticket-modal-header">
              <div className="create-modal-header-left">
                <div className="create-modal-icon-badge">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                {formError && (
                  <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: "7px", marginBottom: "8px", fontSize: "12px" }}>
                    {formError}
                  </div>
                )}

                {/* 1. Issue Title */}
                <div className="create-field-group">
                  <label className="create-field-label" htmlFor="ticket-title">
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
                      id="ticket-title"
                      name="title"
                      className="create-input-control"
                      placeholder="e.g. Cannot log in to dashboard"
                      maxLength={100}
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="field-char-counter">{(formData.title || "").length}/100</div>
                </div>

                {/* 2. Category & Priority Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {/* Category */}
                  <div className="create-field-group">
                    <label className="create-field-label" htmlFor="ticket-category">
                      Category <span className="field-required-asterisk">*</span>
                    </label>
                    <CustomSelect
                      id="ticket-category"
                      className="modal-custom-select"
                      value={formData.category}
                      onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
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
                    <label className="create-field-label" htmlFor="ticket-priority">
                      Priority <span className="field-required-asterisk">*</span>
                    </label>
                    <CustomSelect
                      id="ticket-priority"
                      className="modal-custom-select"
                      value={formData.priority}
                      onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
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
                  <label className="create-field-label" htmlFor="ticket-description">
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
                      id="ticket-description"
                      name="description"
                      className="create-textarea-control"
                      rows="2"
                      placeholder="Provide full details of the issue, steps to reproduce, error messages, etc."
                      maxLength={500}
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="field-char-counter">{(formData.description || "").length}/500</div>
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
                      id="my-ticket-file-input"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      className="btn-upload-files"
                      onClick={() => document.getElementById("my-ticket-file-input")?.click()}
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
                  id="btn-submit-ticket"
                  disabled={submitting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {submitting ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Ticket Details - Exact Match with Reference Picture 1 */}
      {showDetailModal && selectedTicket && (
        <div className="ticket-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="detail-ticket-modal-card" id="ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
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
                  <h2>Ticket Details ({selectedTicket.ticket_code})</h2>
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
                    <span className="detail-code-badge">{selectedTicket.ticket_code}</span>
                    <div className={`detail-status-pill ${selectedTicket.status?.toLowerCase().replace(/\s+/g, "-") || "open"}`}>
                      <span className="detail-status-dot"></span>
                      <span>{selectedTicket.status || "Open"}</span>
                    </div>
                  </div>
                  <div className="detail-created-date">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Created on {formatDateTime(selectedTicket.created_at).date}, {formatDateTime(selectedTicket.created_at).time}</span>
                  </div>
                </div>

                {/* Middle Row: Large Bold Issue Title */}
                <h3 className="detail-main-issue-title">{selectedTicket.title}</h3>

                {/* Bottom Row: 4 Columns Info Grid */}
                <div className="detail-meta-columns-grid">
                  {/* Column 1: Requester */}
                  <div className="detail-meta-col">
                    <div className="detail-col-avatar requester-avatar">
                      {(selectedTicket.creator_name || "B").charAt(0).toUpperCase()}
                    </div>
                    <div className="detail-col-text">
                      <span className="detail-col-label">Requester</span>
                      <span className="detail-col-val">{selectedTicket.creator_name || "Employee"}</span>
                      <span className="detail-col-subtext">{selectedTicket.creator_email || "bansi@gmail.com"}</span>
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
                      <span className="detail-col-val">{selectedTicket.category || "Technical Issue"}</span>
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
                      <span className={`detail-priority-tag ${(selectedTicket.priority || "Medium").toLowerCase()}`}>
                        {selectedTicket.priority || "Medium"}
                      </span>
                    </div>
                  </div>

                  {/* Column 4: Assigned Agent */}
                  <div className="detail-meta-col">
                    <div className="detail-col-avatar agent-avatar">
                      {(selectedTicket.assignee_name || "K").charAt(0).toUpperCase()}
                    </div>
                    <div className="detail-col-text">
                      <span className="detail-col-label">Assigned Agent</span>
                      <span className="detail-col-val">{selectedTicket.assignee_name || "Unassigned"}</span>
                      {selectedTicket.assignee_name ? (
                        <span className="detail-col-subtext">{selectedTicket.assignee_email || `${selectedTicket.assignee_name.toLowerCase()}@gmail.com`}</span>
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
                  <p className="detail-desc-text">{selectedTicket.description || "No description provided."}</p>
                </div>
              </div>

              {/* Card 2.5: Issue Attachments (Uploaded by Requester) */}
              {selectedTicket.attachments?.some((a) => a.source !== "resolution") && (
                <TicketAttachmentsView
                  attachments={selectedTicket.attachments.filter((a) => a.source !== "resolution")}
                  title="Issue Attachments (Requester)"
                  subtitle="Files and documents uploaded during ticket creation"
                  variant="creation"
                />
              )}

              {/* Card 3: Session Reassignment History */}
              {Boolean(selectedTicket.reassigned_count > 0 || selectedTicket.termination_reason) && (
                <div className="detail-history-card">
                  <div className="detail-history-header-bar">
                    <div className="detail-history-header-left">
                      <div className="detail-history-clock-circle">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 16 14" />
                        </svg>
                      </div>
                      <span className="detail-history-title">Session Reassignment History</span>
                    </div>
                    <span className="detail-history-count-badge">
                      {selectedTicket.reassigned_count || 1} time(s)
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
                          <td className="agent-col">{selectedTicket.assignee_name || "Support Agent"}</td>
                          <td>General Admin</td>
                          <td>
                            {formatDateTime(selectedTicket.updated_at || selectedTicket.created_at).date}, {formatDateTime(selectedTicket.updated_at || selectedTicket.created_at).time}
                          </td>
                          <td className="reason-col">
                            {selectedTicket.termination_reason || "Session terminated by General Admin to restart task"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Card 4: Resolution Note (if available) */}
              {selectedTicket.resolution_note && (
                <div className="detail-resolution-card">
                  <div className="detail-resolution-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Resolution Note
                  </div>
                  <p className="detail-resolution-text">{selectedTicket.resolution_note}</p>
                </div>
              )}

              {/* Card 4.5: Resolution & Progress Attachments (Uploaded by Support Agent) */}
              {selectedTicket.attachments?.some((a) => a.source === "resolution") && (
                <TicketAttachmentsView
                  attachments={selectedTicket.attachments.filter((a) => a.source === "resolution")}
                  title="Resolution & Proof Attachments (Support Agent)"
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

export default MyTickets;
