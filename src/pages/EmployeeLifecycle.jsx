import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getLifecycleStats,
  getLifecycleRecords,
  getLifecycleRecordById,
  getTemplates,
  createTemplate,
  getEligibleEmployees,
  startLifecycle,
  toggleChecklistItem,
  completeLifecycle,
  cancelLifecycle,
} from "../services/lifecycleService";
import CustomSelect from "../components/CustomSelect";
import CustomDatePicker from "../components/CustomDatePicker";
import SuccessToast from "../components/SuccessToast";
import "./EmployeeLifecycle.css";

const getAvatarColor = (name) => {
  const colors = ["indigo", "teal", "amber", "rose", "orange"];
  const hash = (name || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const isWorkflowExpired = (rec) => {
  if (!rec || !rec.target_date) return false;
  if (rec.status === "Completed") return false;
  const target = new Date(rec.target_date);
  target.setHours(23, 59, 59, 999);
  return new Date() > target;
};

const isDueToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const EmployeeLifecycle = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current URL path
  const isTemplatesPath = location.pathname.includes("/templates");
  const [activeTab, setActiveTab] = useState(isTemplatesPath ? "templates" : "active");
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"
  const [pendingToggles, setPendingToggles] = useState({});
  const [openMenuRowId, setOpenMenuRowId] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const pageSizeOptions = useMemo(() => {
    const count = Number(totalRecords) || 0;
    const maxLimit = Math.max(5, Math.ceil(count / 5) * 5);
    const options = [];
    for (let i = 5; i <= maxLimit; i += 5) {
      options.push({ value: i, label: `Show ${i}` });
    }
    return options;
  }, [totalRecords]);

  useEffect(() => {
    const availableSizes = pageSizeOptions.map((o) => o.value);
    if (availableSizes.length > 0 && !availableSizes.includes(pageSize)) {
      setPageSize(5);
    }
  }, [pageSizeOptions, pageSize]);


  // Logged in user & department authorization helper
  const loggedInUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const userRoleNameStr = useMemo(() => {
    return String(loggedInUser?.roleName || loggedInUser?.role_name || "").trim().toLowerCase();
  }, [loggedInUser]);

  const userBaseRoleStr = useMemo(() => {
    return String(loggedInUser?.role || "").trim().toLowerCase();
  }, [loggedInUser]);

  const userDeptStr = useMemo(() => {
    return String(loggedInUser?.department || loggedInUser?.dept || "").trim().toLowerCase();
  }, [loggedInUser]);

  const isGeneralAdmin = useMemo(() => {
    return (
      userBaseRoleStr === "general_admin" ||
      userRoleNameStr.includes("general admin") ||
      userRoleNameStr.includes("super admin") ||
      (userBaseRoleStr === "admin" &&
        !userRoleNameStr.includes("it") &&
        !userRoleNameStr.includes("hr") &&
        !userRoleNameStr.includes("manager") &&
        !userRoleNameStr.includes("security") &&
        !userRoleNameStr.includes("finance") &&
        userDeptStr !== "it" &&
        userDeptStr !== "hr")
    );
  }, [userBaseRoleStr, userRoleNameStr, userDeptStr]);

  const isITAdmin = useMemo(() => {
    return (
      !isGeneralAdmin &&
      (userRoleNameStr.includes("it") ||
        userBaseRoleStr === "it_admin" ||
        userBaseRoleStr.includes("it") ||
        userDeptStr === "it" ||
        userDeptStr.includes("information tech"))
    );
  }, [isGeneralAdmin, userRoleNameStr, userBaseRoleStr, userDeptStr]);

  const isHRAdmin = useMemo(() => {
    return (
      !isGeneralAdmin &&
      (userRoleNameStr.includes("hr") ||
        userBaseRoleStr === "hr_admin" ||
        userBaseRoleStr.includes("hr") ||
        userDeptStr === "hr" ||
        userDeptStr.includes("human resource"))
    );
  }, [isGeneralAdmin, userRoleNameStr, userBaseRoleStr, userDeptStr]);

  const isManager = useMemo(() => {
    return (
      !isGeneralAdmin &&
      (userRoleNameStr.includes("manager") ||
        userBaseRoleStr === "manager" ||
        userBaseRoleStr.includes("manager") ||
        userDeptStr.includes("management"))
    );
  }, [isGeneralAdmin, userRoleNameStr, userBaseRoleStr, userDeptStr]);

  const isSecurity = useMemo(() => {
    return (
      !isGeneralAdmin &&
      (userRoleNameStr.includes("security") ||
        userBaseRoleStr === "security_admin" ||
        userBaseRoleStr.includes("security"))
    );
  }, [isGeneralAdmin, userRoleNameStr, userBaseRoleStr]);

  const isFinance = useMemo(() => {
    return (
      !isGeneralAdmin &&
      (userRoleNameStr.includes("finance") ||
        userBaseRoleStr === "finance_admin" ||
        userBaseRoleStr.includes("finance") ||
        userDeptStr.includes("finance"))
    );
  }, [isGeneralAdmin, userRoleNameStr, userBaseRoleStr, userDeptStr]);

  const canAccessLifecycle = useMemo(() => {
    return isGeneralAdmin || isITAdmin || isHRAdmin || isManager || isSecurity || isFinance;
  }, [isGeneralAdmin, isITAdmin, isHRAdmin, isManager, isSecurity, isFinance]);

  const canAccessChecklist = canAccessLifecycle;

  const categoriesToRender = useMemo(() => {
    if (isITAdmin) return ["IT"];
    if (isHRAdmin) return ["HR"];
    if (isManager) return ["Manager"];
    if (isSecurity) return ["Security"];
    if (isFinance) return ["Finance"];
    // General Admin sees all categories to monitor full workflow progress
    if (isGeneralAdmin) return ["IT", "HR", "Manager", "Security", "Finance", "General"];
    return [];
  }, [isITAdmin, isHRAdmin, isManager, isSecurity, isFinance, isGeneralAdmin]);

  // Close 3-dots action menu on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuRowId(null);
    if (openMenuRowId !== null) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [openMenuRowId]);

  const canToggleItem = useCallback(
    (item) => {
      if (!item) return false;
      const category = String(item.category || "").trim().toLowerCase();

      // STRICT PER-DEPARTMENT PERMISSION:
      // General Admin is NOT permitted to check off department items!
      // Only the assigned department admin can tick mark their department items.
      if (category === "it") {
        return Boolean(isITAdmin);
      }
      if (category === "hr") {
        return Boolean(isHRAdmin);
      }
      if (category === "manager") {
        return Boolean(isManager);
      }
      if (category === "security") {
        return Boolean(isSecurity);
      }
      if (category === "finance") {
        return Boolean(isFinance);
      }
      if (category === "general") {
        return Boolean(isGeneralAdmin);
      }

      return false;
    },
    [isGeneralAdmin, isITAdmin, isHRAdmin, isManager, isSecurity, isFinance]
  );

  useEffect(() => {
    if (location.pathname.includes("/templates")) {
      setActiveTab("templates");
    } else if (activeTab === "templates") {
      setActiveTab("active");
    }
  }, [location.pathname]);

  // Data states
  const [stats, setStats] = useState({
    active_onboarding: 0,
    active_offboarding: 0,
    overdue_tasks: 0,
    avg_progress: 0,
    completed_total: 0,
  });
  const [records, setRecords] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Start Form State
  const [startType, setStartType] = useState("onboarding");
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [startNotes, setStartNotes] = useState("");
  const [startError, setStartError] = useState("");

  // New Template Form State
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateType, setNewTemplateType] = useState("onboarding");
  const [newTemplateDept, setNewTemplateDept] = useState("Engineering");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [templateSteps, setTemplateSteps] = useState([
    { title: "IT Setup: Laptop & Credentials", category: "IT", assignee_role: "admin", due_days_offset: 1, is_required: true },
    { title: "HR Contract & Document Collection", category: "HR", assignee_role: "admin", due_days_offset: 2, is_required: true },
  ]);

  // Load KPI Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await getLifecycleStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load lifecycle stats:", err);
    }
  }, []);

  // Load Templates
  const loadTemplates = useCallback(async () => {
    try {
      const res = await getTemplates();
      if (res.success) {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  }, []);

  // Load Records with console logging and network triggering
  const loadRecords = useCallback(
    async (page = 1, limit = pageSize) => {
      setLoading(true);
      console.log(`[Lifecycle API] Calling getLifecycleRecords page=${page}&limit=${limit}&tab=${activeTab}&search=${search}&type=${typeFilter}`);
      try {
        const params = {
          page,
          limit,
          search: search.trim() || undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          status: activeTab === "active" ? "In Progress" : (statusFilter !== "all" ? statusFilter : undefined),
        };
        const res = await getLifecycleRecords(params);
        if (res.success) {
          setRecords(res.data || []);
          const tot = res.pagination?.totalRecords !== undefined ? res.pagination.totalRecords : (res.data?.length || 0);
          setTotalRecords(tot);
          setCurrentPage(res.pagination?.currentPage || page);
          setTotalPages(res.pagination?.totalPages || Math.ceil(tot / limit) || 1);
        }
      } catch (err) {
        console.error("Failed to load records:", err);
      } finally {
        setLoading(false);
      }
    },
    [search, typeFilter, statusFilter, activeTab, pageSize]
  );

  useEffect(() => {
    loadStats();
    loadTemplates();
  }, [loadStats, loadTemplates]);

  useEffect(() => {
    loadRecords(1, pageSize);
  }, [loadRecords]);

  // Load Eligible Employees when Start Modal opens or type changes
  const loadEligibleEmployees = async (type) => {
    try {
      const res = await getEligibleEmployees(type);
      if (res.success) {
        setEligibleEmployees(res.data);
        setSelectedEmployeeId("");
      }
    } catch (err) {
      console.error("Failed to load eligible employees:", err);
    }
  };

  // Open Start Modal
  const handleOpenStartModal = () => {
    setStartType("onboarding");
    setTargetDate("");
    setStartNotes("");
    setStartError("");
    setSelectedEmployeeId("");
    setSelectedTemplateId("");
    loadEligibleEmployees("onboarding");

    setShowStartModal(true);
  };

  // Handle Start Type Change
  const handleStartTypeChange = (type) => {
    setStartType(type);
    setSelectedEmployeeId("");
    setSelectedTemplateId("");
    setTargetDate("");
    loadEligibleEmployees(type);
  };

  // Submit Start Lifecycle
  const handleStartSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setStartError("Please select an employee.");
      return;
    }
    if (!selectedTemplateId) {
      setStartError("Please select a template.");
      return;
    }
    if (!targetDate) {
      setStartError("Please select a target date.");
      return;
    }

    setModalLoading(true);
    setStartError("");
    try {
      const res = await startLifecycle({
        employeeId: selectedEmployeeId,
        templateId: selectedTemplateId,
        targetDate,
        notes: startNotes,
      });

      if (res.success) {
        setShowStartModal(false);
        setToastMessage(`${startType === "onboarding" ? "Onboarding" : "Offboarding"} started successfully!`);
        loadStats();
        loadRecords(1, pageSize);
      }
    } catch (err) {
      setStartError(err.response?.data?.message || "Failed to start lifecycle workflow.");
    } finally {
      setModalLoading(false);
    }
  };

  // View Checklist Drawer
  const handleViewChecklist = async (record) => {
    if (!canAccessChecklist) {
      setToastMessage("Access restricted: Only General Admin, IT Admin, HR Admin, and Manager can access the checklist.");
      return;
    }
    setPendingToggles({});
    setModalLoading(true);
    try {
      const res = await getLifecycleRecordById(record.id);
      if (res.success) {
        setActiveRecord(res.data);
        setShowChecklistModal(true);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to load checklist";
      setToastMessage(errMsg);
    } finally {
      setModalLoading(false);
    }
  };

  // Toggle Checklist Item (instant UI update + background save + track pending)
  const handleToggleItem = async (itemId, currentStatus) => {
    // Once ticked/completed, an item cannot be unticked
    if (currentStatus) return;

    const itemObj = activeRecord?.checklist?.find((i) => i.id === itemId);
    if (!canToggleItem(itemObj)) {
      setToastMessage(
        `Action restricted: Only ${itemObj?.category || "assigned"} Admin can check off this item.`
      );
      return;
    }
    const nextStatus = true;

    // Immediately update local active record state for responsive UI
    setActiveRecord((prev) => {
      if (!prev) return null;
      const updatedChecklist = prev.checklist.map((itm) =>
        itm.id === itemId
          ? {
              ...itm,
              is_completed: true,
              completed_at: new Date().toISOString(),
              completed_by_name: loggedInUser.name || "Staff",
            }
          : itm
      );
      const total = updatedChecklist.length || 1;
      const completedCount = updatedChecklist.filter((i) => i.is_completed).length;
      const progressPct = Math.round((completedCount / total) * 100);
      return {
        ...prev,
        checklist: updatedChecklist,
        progress_pct: progressPct,
      };
    });

    setPendingToggles((prev) => ({
      ...prev,
      [itemId]: true,
    }));

    try {
      const res = await toggleChecklistItem(itemId, true);
      if (res.success) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === activeRecord?.id
              ? { ...r, progress_pct: res.data?.progressPct ?? r.progress_pct }
              : r
          )
        );
        loadStats();
      }
    } catch (err) {
      console.warn("Background toggle save notice:", err);
    }
  };

  // Explicit Save / Update Checklist handler
  const handleSaveChecklistUpdates = async () => {
    if (!activeRecord) {
      setShowChecklistModal(false);
      return;
    }
    setModalLoading(true);
    try {
      const toggleEntries = Object.entries(pendingToggles);
      if (toggleEntries.length > 0) {
        await Promise.all(
          toggleEntries.map(([itemId, nextStatus]) =>
            toggleChecklistItem(String(itemId), Boolean(nextStatus))
          )
        );
      }

      setPendingToggles({});
      setToastMessage("Checklist updated successfully!");

      loadStats();
      loadRecords(currentPage, pageSize);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update checklist.";
      setToastMessage(errMsg);
    } finally {
      setModalLoading(false);
      setShowChecklistModal(false);
    }
  };

  // Complete Lifecycle
  const handleCompleteLifecycle = async () => {
    if (!activeRecord) return;
    if (!isGeneralAdmin) {
      setToastMessage("Only General Admin can finalize onboarding or offboarding workflows.");
      return;
    }
    if ((activeRecord.progress_pct || 0) < 100) {
      setToastMessage("Cannot finalize: All checklist items must be completed by their respective departments first.");
      return;
    }
    const confirmMsg =
      activeRecord.type === "onboarding"
        ? `Are you sure you want to finalize onboarding for ${activeRecord.employee_name}? This will mark the employee as Active!`
        : `Are you sure you want to finalize offboarding for ${activeRecord.employee_name}? This will mark the employee as Inactive!`;

    if (!window.confirm(confirmMsg)) return;

    setModalLoading(true);
    try {
      const res = await completeLifecycle(activeRecord.id);
      if (res.success) {
        setShowChecklistModal(false);
        setToastMessage(res.message);
        loadStats();
        loadRecords(currentPage, pageSize);
      }
    } catch (err) {
      setToastMessage(err.response?.data?.message || "Failed to complete lifecycle.");
    } finally {
      setModalLoading(false);
    }
  };

  // Add Step in Template Creator
  const handleAddTemplateStep = () => {
    setTemplateSteps((prev) => [
      ...prev,
      {
        title: "",
        category: "General",
        assignee_role: "admin",
        due_days_offset: 1,
        is_required: true,
      },
    ]);
  };

  // Remove Step in Template Creator
  const handleRemoveTemplateStep = (idx) => {
    setTemplateSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit New Template
  const handleCreateTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplateTitle.trim()) {
      alert("Template title is required");
      return;
    }
    if (templateSteps.length === 0) {
      alert("Please add at least one step");
      return;
    }

    setModalLoading(true);
    try {
      const res = await createTemplate({
        title: newTemplateTitle.trim(),
        type: newTemplateType,
        department: newTemplateDept,
        description: newTemplateDesc,
        items: templateSteps.map((step, idx) => ({
          ...step,
          due_days_offset: idx + 1,
          order_index: idx + 1,
        })),
      });

      if (res.success) {
        setShowNewTemplateModal(false);
        setNewTemplateTitle("");
        setNewTemplateDesc("");
        setToastMessage(`Template "${res.data.title}" created successfully!`);
        loadTemplates();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create template.");
    } finally {
      setModalLoading(false);
    }
  };

  // Collapsible categories for Checklist Modal
  const [collapsedCats, setCollapsedCats] = useState({});
  const toggleCat = (cat) => setCollapsedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));

  // Helper for checklist item subtitle
  const getItemSubtitle = (item) => {
    if (item.description) return item.description;
    const t = (item.title || "").toLowerCase();
    if (t.includes("laptop") || t.includes("vpn") || t.includes("credentials")) {
      return "Setup and configure corporate laptop with VPN access.";
    }
    if (t.includes("github") || t.includes("cloud") || t.includes("sandbox")) {
      return "Provide GitHub organization access and cloud sandbox setup.";
    }
    if (t.includes("government") || t.includes("tax") || t.includes("bank") || t.includes("id")) {
      return "Collect and verify required HR documents.";
    }
    if (t.includes("buddy") || t.includes("intro") || t.includes("1-on-1")) {
      return "Assign buddy and schedule initial 1-on-1 meeting.";
    }
    if (t.includes("posh") || t.includes("compliance") || t.includes("training") || t.includes("security")) {
      return "Mandatory training for workplace safety and security.";
    }
    if (t.includes("workspace") || t.includes("slack") || t.includes("email")) {
      return "Setup corporate Google Workspace and collaboration tools.";
    }
    if (t.includes("contract") || t.includes("agreements") || t.includes("emergency")) {
      return "Collect signed agreements and emergency contacts.";
    }
    if (t.includes("orientation") || t.includes("handbook")) {
      return "Conduct HR orientation and employee handbook briefing.";
    }
    if (t.includes("insurance") || t.includes("benefits")) {
      return "Enroll employee in corporate benefits and insurance portal.";
    }
    if (t.includes("collect company laptop") || t.includes("badge")) {
      return "Collect company laptop, charger and office access badge.";
    }
    if (t.includes("revoke") || t.includes("logins")) {
      return "Revoke corporate email, Slack, GitHub and cloud logins.";
    }
    if (t.includes("handover") || t.includes("knowledge")) {
      return "Complete project handover and knowledge transfer sign-off.";
    }
    if (t.includes("exit interview") || t.includes("feedback")) {
      return "Conduct exit interview and collect experience feedback.";
    }
    if (t.includes("settlement") || t.includes("clearance") || t.includes("fnf")) {
      return "Finance clearance and full and final settlement processing.";
    }
    return "Track department handoff and verification requirements.";
  };

  const selectedTemplateObj = templates.find((t) => String(t.id) === String(selectedTemplateId));

  if (!canAccessLifecycle) {
    return (
      <div className="lifecycle-page-container">
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#64748b" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" style={{ marginBottom: "16px", display: "inline-block" }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h2 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "20px", fontWeight: "700" }}>Access Restricted</h2>
          <p style={{ fontSize: "14px", maxWidth: "520px", margin: "0 auto", lineHeight: "1.6", color: "#64748b" }}>
            You do not have permission to access Employee Lifecycle Management. Only General Admin, HR Admin, IT Admin, Manager, and Security roles can view or participate in lifecycle workflows.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lifecycle-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <SuccessToast
          message={toastMessage}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* ----------------------------------------------------------------------
          1. Header Section
          ---------------------------------------------------------------------- */}
      <div className="lifecycle-header">
        <div className="lifecycle-header-left">
          <span className="hrms-core-badge orange">HRMS CORE</span>
          <h1 className="lifecycle-page-title">Employee Lifecycle Management</h1>
          <p className="lifecycle-page-subtitle">
            Orchestrate seamless onboarding and secure offboarding workflows across IT, HR, and Management.
          </p>
        </div>
        <div className="lifecycle-header-actions">
          <button
            type="button"
            className="btn-lifecycle-secondary"
            onClick={() => setShowNewTemplateModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            New Template
          </button>
          <button
            type="button"
            className="btn-lifecycle-primary orange"
            onClick={handleOpenStartModal}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Start Lifecycle Process
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          2. KPI Metric Summary Cards (Picture 1 Exact Replication)
          ---------------------------------------------------------------------- */}
      <div className="inbox-stats-grid">
        {/* Card 1: Active Onboardings */}
        <div className="stat-card card-amber">
          <div className="stat-icon open">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Onboardings</span>
            <span className="stat-value">{stats.active_onboarding || 2}</span>
            <span className="stat-subtext-muted">New hires in progress</span>
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

        {/* Card 2: Active Offboardings */}
        <div className="stat-card card-blue">
          <div className="stat-icon total">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Offboardings</span>
            <span className="stat-value">{stats.active_offboarding || 0}</span>
            <span className="stat-subtext-muted">Departures in transition</span>
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

        {/* Card 3: Avg Progress Rate */}
        <div className="stat-card card-green">
          <div className="stat-icon resolved">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Avg Progress Rate</span>
            <span className="stat-value">{stats.avg_progress || 50}%</span>
            <span className="stat-subtext-muted">Workflows on track</span>
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

        {/* Card 4: Overdue Steps */}
        <div className="stat-card card-rose">
          <div className="stat-icon" style={{ background: "#fef2f2", color: "#e11d48", border: "1px solid #ffe4e6" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Overdue Steps</span>
            <span className="stat-value">{stats.overdue_tasks || 0}</span>
            <span className="stat-subtext-muted">Checklist items past deadline</span>
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

      {/* ----------------------------------------------------------------------
          3. Navigation Tabs (Picture 1 Exact Replication)
          ---------------------------------------------------------------------- */}
      <div className="inbox-tabs-bar">
        <button
          type="button"
          className={`inbox-tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("active");
            if (location.pathname !== "/lifecycle") {
              navigate("/lifecycle");
            }
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Active Workflows
          {(stats.active_onboarding + stats.active_offboarding > 0) && (
            <span className="inbox-tab-badge">
              {stats.active_onboarding + stats.active_offboarding}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`inbox-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("all");
            if (location.pathname !== "/lifecycle") {
              navigate("/lifecycle");
            }
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          All Records
        </button>

        <button
          type="button"
          className={`inbox-tab-btn ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("templates");
            if (location.pathname !== "/lifecycle/templates") {
              navigate("/lifecycle/templates");
            }
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          Blueprint Templates ({templates.length})
        </button>
      </div>

      {/* ----------------------------------------------------------------------
          4. Controls Row (Below Tabs)
          ---------------------------------------------------------------------- */}
      {activeTab !== "templates" && (
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
              placeholder="Search by employee name, ID, role, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="clear-search-btn" onClick={() => setSearch("")}>
                &times;
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Controls on the right */}
          <div className="inbox-filters-group">
            <CustomSelect
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                setPageSize(newSize);
                setCurrentPage(1);
                loadRecords(1, newSize);
              }}
              options={pageSizeOptions}
              minWidth="105px"
            />

            <CustomSelect
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "all", label: "All Types" },
                { value: "onboarding", label: "Onboarding" },
                { value: "offboarding", label: "Offboarding" },
              ]}
              placeholder="All Types"
              minWidth="125px"
            />

            {/* Status Filter (only in All Records tab) */}
            {activeTab === "all" && (
              <CustomSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "Completed", label: "Completed" },
                  { value: "Cancelled", label: "Cancelled" },
                ]}
                placeholder="All Statuses"
                minWidth="135px"
              />
            )}

            {/* View Mode Switcher */}
            <div className="lifecycle-view-switcher">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="Cards View"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          4. Main Content Area
          ---------------------------------------------------------------------- */}
      {activeTab === "templates" ? (
        /* Blueprint Templates Grid */
        <div className="lifecycle-cards-grid">
          {templates.map((tpl) => (
            <div key={tpl.id} className="lifecycle-record-card" style={{ height: "auto" }}>
              <div className={`lifecycle-card-top-strip ${tpl.type}`}></div>
              <div className="card-header-row">
                <span className="record-code-badge">{tpl.department}</span>
                <span className={`type-pill ${tpl.type}`}>
                  <span className="type-dot">●</span> {tpl.type}
                </span>
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                {tpl.title}
              </h3>
              <p style={{ margin: "0 0 14px", fontSize: "12.5px", color: "#64748b", lineHeight: 1.4 }}>
                {tpl.description || "Reusable blueprint checklist template."}
              </p>

              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", marginBottom: "14px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>
                  INCLUDED CHECKLIST STEPS ({tpl.total_items}):
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {(tpl.items || []).slice(0, 4).map((item, idx) => (
                    <div key={idx} style={{ fontSize: "12px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#16a34a" }}>✓</span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        [{item.category}] {item.title}
                      </span>
                    </div>
                  ))}
                  {tpl.items && tpl.items.length > 4 && (
                    <span style={{ fontSize: "11px", color: "#ea580c", fontWeight: 600 }}>
                      +{tpl.items.length - 4} more steps...
                    </span>
                  )}
                </div>
              </div>

              <div className="card-footer-row">
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  <strong>{tpl.required_items}</strong> mandatory items
                </span>
                <button
                  type="button"
                  className="btn-card-manage"
                  onClick={() => {
                    handleOpenStartModal();
                    setStartType(tpl.type);
                    setSelectedTemplateId(String(tpl.id));
                  }}
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#64748b", background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          Loading lifecycle workflows...
        </div>
      ) : viewMode === "table" ? (
        /* Data Table View - Exactly as in Reference Picture 1 */
        <div className="lifecycle-table-card">
          <div className="lifecycle-table-responsive">
            <table className="lifecycle-data-table">
              <thead>
                <tr>
                  <th style={{ width: "36px", paddingLeft: "16px" }}>#</th>
                  <th>EMPLOYEE</th>
                  <th>WORKFLOW TYPE</th>
                  <th>DEPARTMENT</th>
                  <th>CURRENT STEP</th>
                  <th>PROGRESS</th>
                  <th>START DATE</th>
                  <th>DUE DATE</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              {records.length > 0 && (
                <tbody>
                  {records.map((rec, idx) => (
                    <tr key={rec.id}>
                      <td style={{ padding: "12px 16px", color: "#64748b", fontWeight: 500, fontSize: "12px", width: "36px" }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="table-emp-cell">
                          <div className="employee-avatar-circle sm orange">
                            {(rec.employee_name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="table-emp-info">
                            <span className="table-emp-name">{rec.employee_name}</span>
                            <span className="table-emp-email">{rec.employee_email}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className={`type-pill ${rec.type}`}>
                          <span className="type-dot">●</span>
                          {rec.type === "onboarding" ? "NEW HIRE ONBOARDING" : "EMPLOYEE OFFBOARDING"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#334155", fontWeight: 400, fontSize: "12px" }}>
                        {rec.template_department || rec.department || "Engineering"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="current-step-main">
                          {rec.status === "Completed" ? "Completed" : `${rec.completed_items || 0} of ${rec.total_items || 5} items`}
                        </div>
                        <div className="current-step-sub">
                          {rec.status === "Completed" ? "All steps finished" : (rec.current_step_title || (rec.type === "onboarding" ? (rec.completed_items >= 4 ? "IT Setup" : "Account Provisioning") : "Account Revocation"))}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="table-progress-cell">
                          <div className="lifecycle-progress-bar-bg">
                            <div
                              className={`lifecycle-progress-bar-fill ${rec.status === "Completed" ? "completed" : rec.type}`}
                              style={{ width: `${rec.progress_pct || 0}%` }}
                            ></div>
                          </div>
                          <span className="table-pct-num">{rec.progress_pct || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569", fontWeight: 400, fontSize: "12px" }}>
                        {new Date(rec.created_at || rec.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="due-date-main">
                          {new Date(rec.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        {isWorkflowExpired(rec) ? (
                          <span className="due-date-tag expired">Expired</span>
                        ) : isDueToday(rec.target_date) ? (
                          <span className="due-date-tag today">Today</span>
                        ) : null}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div className="table-actions-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`btn-table-dots ${openMenuRowId === rec.id ? "active" : ""}`}
                            title="Actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuRowId((prev) => (prev === rec.id ? null : rec.id));
                            }}
                          >
                            ⋮
                          </button>

                          {openMenuRowId === rec.id && (
                            <div className="action-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              {canAccessChecklist ? (
                                <button
                                  type="button"
                                  className="action-dropdown-item"
                                  onClick={() => {
                                    setOpenMenuRowId(null);
                                    handleViewChecklist(rec);
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                    <path d="M9 14l2 2 4-4" />
                                  </svg>
                                  <span>Manage Checklist</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="action-dropdown-item disabled"
                                  disabled
                                  style={{ opacity: 0.5, cursor: "not-allowed" }}
                                  title="Checklist access is restricted to General Admin, IT Admin, HR Admin, and Manager"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                  </svg>
                                  <span>Manage Checklist</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>

          {/* Empty State Box inside Table Card */}
          {records.length === 0 && (
            <div className="lifecycle-empty-box">
              <div className="empty-state-clipboard-icon">
                <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
                  {/* Gold Sparkles */}
                  <path d="M12 28L13.5 24L17.5 22.5L13.5 21L12 17L10.5 21L6.5 22.5L10.5 24L12 28Z" fill="#F59E0B" />
                  <path d="M18 42L19 39L22 38L19 37L18 34L17 37L14 38L17 39L18 42Z" fill="#FBBF24" />
                  <path d="M70 20L71 18L73 17L71 16L70 14L69 16L67 17L69 18L70 20Z" fill="#F59E0B" />
                  
                  {/* Clipboard Body */}
                  <rect x="22" y="14" width="38" height="52" rx="7" fill="#EEF2FF" />
                  <rect x="20" y="12" width="38" height="52" rx="7" fill="#FFFFFF" stroke="#818CF8" strokeWidth="2.5" />
                  {/* Clip Top */}
                  <rect x="30" y="8" width="18" height="8" rx="3" fill="#6366F1" />
                  <circle cx="39" cy="12" r="1.8" fill="#FFFFFF" />
                  
                  {/* Checklist Lines */}
                  <circle cx="28" cy="26" r="2.5" fill="#C7D2FE" />
                  <rect x="34" y="24" width="18" height="4" rx="2" fill="#E0E7FF" />
                  <circle cx="28" cy="36" r="2.5" fill="#C7D2FE" />
                  <rect x="34" y="34" width="14" height="4" rx="2" fill="#E0E7FF" />
                  <circle cx="28" cy="46" r="2.5" fill="#C7D2FE" />
                  <rect x="34" y="44" width="16" height="4" rx="2" fill="#E0E7FF" />
                  
                  {/* Magnifying Glass */}
                  <circle cx="49" cy="47" r="11" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="3" />
                  <path d="M57 55L68 66" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
                  <path d="M45 43C47 41 51 41 53 43" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="empty-title">No Lifecycle Workflows Found</h3>
              <p className="empty-desc">
                There are no employees currently in this lifecycle stage. Start a new onboarding or offboarding process.
              </p>
              <button
                type="button"
                className="btn-lifecycle-primary"
                onClick={handleOpenStartModal}
              >
                + Start Lifecycle Process
              </button>
            </div>
          )}

          {/* Table Footer / Pagination */}
          <div className="lifecycle-table-footer">
            <span className="showing-records-text">
              Showing {records.length === 0 ? "0 of 0" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalRecords || records.length)} of ${totalRecords || records.length}`} records
            </span>
            <div className="lifecycle-pagination-controls">
              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage <= 1}
                onClick={() => {
                  if (currentPage > 1) {
                    loadRecords(currentPage - 1, pageSize);
                  }
                }}
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`pagination-page-btn ${currentPage === pageNum ? "active" : ""}`}
                  onClick={() => {
                    if (currentPage !== pageNum) {
                      loadRecords(pageNum, pageSize);
                    }
                  }}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                className="pagination-arrow-btn"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  if (currentPage < totalPages) {
                    loadRecords(currentPage + 1, pageSize);
                  }
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Pipeline Cards Grid View */
        <div>
          {records.length === 0 ? (
            <div className="lifecycle-table-card">
              <div className="lifecycle-empty-box">
                <div className="empty-state-clipboard-icon">
                  <svg width="76" height="76" viewBox="0 0 80 80" fill="none">
                    <rect x="22" y="14" width="38" height="52" rx="7" fill="#EEF2FF" />
                    <rect x="20" y="12" width="38" height="52" rx="7" fill="#FFFFFF" stroke="#818CF8" strokeWidth="2.5" />
                    <rect x="30" y="8" width="18" height="8" rx="3" fill="#6366F1" />
                    <circle cx="49" cy="47" r="11" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="3" />
                    <path d="M57 55L68 66" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="empty-title">No Lifecycle Workflows Found</h3>
                <p className="empty-desc">
                  There are no employees currently in this lifecycle stage. Start a new onboarding or offboarding process.
                </p>
                <button
                  type="button"
                  className="btn-lifecycle-primary"
                  onClick={handleOpenStartModal}
                >
                  + Start Lifecycle Process
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="lifecycle-cards-grid">
                {records.map((rec) => (
                  <div key={rec.id} className="lifecycle-record-card">
                    <div className={`lifecycle-card-top-strip ${rec.type}`}></div>
                    <div className="card-header-row">
                      <span className="record-code-badge">{rec.record_code}</span>
                      <span className={`type-pill ${rec.type}`}>{rec.type}</span>
                    </div>

                    <div className="card-employee-info">
                      <div className={`employee-avatar-circle ${getAvatarColor(rec.employee_name)}`}>
                        {(rec.employee_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="employee-details-stack">
                        <h4 className="employee-name" title={rec.employee_name}>{rec.employee_name}</h4>
                        <div className="employee-email" title={rec.employee_email}>{rec.employee_email}</div>
                      </div>
                    </div>

                    <div className="card-template-tag" title={rec.template_title}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                      <span>{rec.template_title || "Standard Plan"}</span>
                    </div>

                    <div className="card-progress-section">
                      <div className="progress-header">
                        <span>Checklist Progress ({rec.completed_items || 0}/{rec.total_items || 0})</span>
                        <span className="progress-pct-text">{rec.progress_pct || 0}%</span>
                      </div>
                      <div className="lifecycle-progress-bar-bg">
                        <div
                          className={`lifecycle-progress-bar-fill ${rec.status === "Completed" ? "completed" : rec.type}`}
                          style={{ width: `${rec.progress_pct || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="card-footer-row">
                      <div className="target-date-label">
                        <span>{rec.type === "onboarding" ? "Join Date:" : "Exit Date:"}</span>
                        <strong>{new Date(rec.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                      </div>
                      {canAccessChecklist ? (
                        <button
                          type="button"
                          className="btn-card-manage"
                          onClick={() => handleViewChecklist(rec)}
                        >
                          Manage Checklist
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-card-manage"
                          disabled
                          style={{ opacity: 0.5, cursor: "not-allowed" }}
                          title="Checklist access is restricted to General Admin, IT Admin, HR Admin, and Manager"
                        >
                          Manage Checklist
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cards View Footer / Pagination */}
              <div className="lifecycle-table-footer" style={{ marginTop: "16px", borderRadius: "10px", border: "1px solid #eef2f6" }}>
                <span className="showing-records-text">
                  Showing {records.length === 0 ? "0 of 0" : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalRecords || records.length)} of ${totalRecords || records.length}`} records
                </span>
                <div className="lifecycle-pagination-controls">
                  <button
                    type="button"
                    className="pagination-arrow-btn"
                    disabled={currentPage <= 1}
                    onClick={() => {
                      if (currentPage > 1) {
                        loadRecords(currentPage - 1, pageSize);
                      }
                    }}
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`pagination-page-btn ${currentPage === pageNum ? "active" : ""}`}
                      onClick={() => {
                        if (currentPage !== pageNum) {
                          loadRecords(pageNum, pageSize);
                        }
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="pagination-arrow-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      if (currentPage < totalPages) {
                        loadRecords(currentPage + 1, pageSize);
                      }
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL 1: "Start Lifecycle Process" Wizard (Picture 1 Exact Replica)
          ---------------------------------------------------------------------- */}
      {showStartModal && (
        <div className="lifecycle-modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="wizard-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header with warm aura decoration */}
            <div className="wizard-modal-header">
              <div className="wizard-header-left">
                <div className="wizard-header-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </div>
                <div className="wizard-header-text">
                  <h2>Initiate Employee Lifecycle</h2>
                  <p>Launch an automated onboarding or offboarding workflow for an employee.</p>
                </div>
              </div>
              <button
                type="button"
                className="wizard-close-btn"
                onClick={() => setShowStartModal(false)}
                title="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleStartSubmit} className="wizard-form-container">
              <div className="wizard-modal-body">
                {startError && (
                  <div className="wizard-error-banner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{startError}</span>
                  </div>
                )}

                <div className="wizard-body-layout">
                  {/* Left Stepper Sidebar */}
                  <div className="wizard-stepper-sidebar">
                    {/* Step 1 */}
                    <div className="wizard-step-item active">
                      <div className="step-circle active">1</div>
                      <div className="step-content">
                        <span className="step-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                          Process Type
                        </span>
                        <span className="step-desc">Choose workflow type</span>
                      </div>
                    </div>
                    <div className="wizard-step-line"></div>

                    {/* Step 2 */}
                    <div className={`wizard-step-item ${selectedEmployeeId ? "completed" : ""}`}>
                      <div className={`step-circle ${selectedEmployeeId ? "completed" : ""}`}>2</div>
                      <div className="step-content">
                        <span className="step-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          Employee
                        </span>
                        <span className="step-desc">Select employee</span>
                      </div>
                    </div>
                    <div className="wizard-step-line"></div>

                    {/* Step 3 */}
                    <div className={`wizard-step-item ${selectedTemplateId ? "completed" : ""}`}>
                      <div className={`step-circle ${selectedTemplateId ? "completed" : ""}`}>3</div>
                      <div className="step-content">
                        <span className="step-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          Template
                        </span>
                        <span className="step-desc">Choose blueprint</span>
                      </div>
                    </div>
                    <div className="wizard-step-line"></div>

                    {/* Step 4 */}
                    <div className={`wizard-step-item ${targetDate ? "completed" : ""}`}>
                      <div className={`step-circle ${targetDate ? "completed" : ""}`}>4</div>
                      <div className="step-content">
                        <span className="step-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          Schedule
                        </span>
                        <span className="step-desc">{startType === "onboarding" ? "Joining date" : "Exit date"}</span>
                      </div>
                    </div>
                    <div className="wizard-step-line"></div>

                    {/* Step 5 */}
                    <div className="wizard-step-item">
                      <div className="step-circle">5</div>
                      <div className="step-content">
                        <span className="step-title">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                          Additional Info
                        </span>
                        <span className="step-desc">Notes & requirements</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Content Area */}
                  <div className="wizard-content-main">
                    {/* Section 1: Select Process Type */}
                    <div className="wizard-section-card">
                      <div className="wizard-section-header">
                        <span className="section-step-num orange">1</span>
                        <div className="section-header-titles">
                          <h4>Select Process Type</h4>
                        </div>
                      </div>

                      <div className="wizard-process-types-grid">
                        {/* Onboarding Option */}
                        <div
                          className={`process-choice-card ${startType === "onboarding" ? "selected onboarding" : ""}`}
                          onClick={() => handleStartTypeChange("onboarding")}
                        >
                          <div className="choice-icon-box onboarding">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                          </div>
                          <div className="choice-text-stack">
                            <h5>New Hire Onboarding</h5>
                            <p>Welcome employee, provision hardware, provide access, and ensure compliance.</p>
                          </div>
                          <div className="choice-radio-indicator">
                            <span className={`radio-dot ${startType === "onboarding" ? "active" : "inactive"}`}></span>
                          </div>
                        </div>

                        {/* Offboarding Option */}
                        <div
                          className={`process-choice-card ${startType === "offboarding" ? "selected offboarding" : ""}`}
                          onClick={() => handleStartTypeChange("offboarding")}
                        >
                          <div className="choice-icon-box offboarding">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                              <polyline points="16 17 21 12 16 7" />
                              <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                          </div>
                          <div className="choice-text-stack">
                            <h5>Employee Offboarding</h5>
                            <p>Asset recovery, access revocation, knowledge transfer, and final settlement.</p>
                          </div>
                          <div className="choice-radio-indicator">
                            <span className={`radio-dot ${startType === "offboarding" ? "active" : "inactive"}`}></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Section 2 (Employee) & Section 3 (Template) */}
                    <div className="wizard-two-col-row">
                      {/* Section 2: Select Employee */}
                      <div className="wizard-field-card">
                        <div className="wizard-section-header compact">
                          <span className="section-step-num">2</span>
                          <div className="section-header-titles">
                            <h4>
                              Select Employee <span className="req-star">*</span>
                            </h4>
                          </div>
                        </div>
                        {eligibleEmployees.length === 0 ? (
                          <div className="wizard-no-emp-box">
                            No eligible employees found for {startType}.
                          </div>
                        ) : (
                          <CustomSelect
                            value={selectedEmployeeId}
                            onChange={(valOrEvent) => {
                              const val = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
                              setSelectedEmployeeId(val || "");
                            }}
                            options={eligibleEmployees.map((emp) => ({
                              value: String(emp.id),
                              label: emp.name,
                            }))}
                            placeholder="Select Employee"
                            isClearable={true}
                            searchable={true}
                            icon={
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            }
                          />
                        )}
                      </div>

                      {/* Section 3: Blueprint Plan Template */}
                      <div className="wizard-field-card">
                        <div className="wizard-section-header compact">
                          <span className="section-step-num">3</span>
                          <div className="section-header-titles">
                            <h4>
                              Blueprint Plan Template <span className="req-star">*</span>
                            </h4>
                          </div>
                        </div>
                        <CustomSelect
                          value={selectedTemplateId}
                          onChange={(valOrEvent) => {
                            const val = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
                            setSelectedTemplateId(val || "");
                          }}
                          options={templates
                            .filter((t) => t.type === startType)
                            .map((t) => ({
                              value: String(t.id),
                              label: `${t.title} (${t.department}) - ${t.total_items} steps`,
                            }))}
                          placeholder="Choose Template"
                          isClearable={true}
                          searchable={true}
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          }
                        />
                      </div>
                    </div>

                    {/* Bottom Row: Section 4 (Tasks Preview) & Section 5 (Joining Date) */}
                    <div className="wizard-bottom-split-row">
                      {/* Left: Section 4 Tasks Preview */}
                      <div className="wizard-tasks-preview-card">
                        <div className="wizard-section-header between">
                          <div className="header-step-group">
                            <span className="section-step-num">4</span>
                            <div className="section-header-titles">
                              <h4>Auto-Generated Tasks Preview</h4>
                            </div>
                          </div>
                          <span className="wizard-tasks-count-badge">
                            {selectedTemplateObj?.items?.length || 0} Tasks
                          </span>
                        </div>

                        <div className="wizard-tasks-scroll-list">
                          {selectedTemplateObj && selectedTemplateObj.items && selectedTemplateObj.items.length > 0 ? (
                            selectedTemplateObj.items.map((itm, idx) => (
                              <div key={idx} className="wizard-task-row">
                                <span className="task-row-idx">{idx + 1}</span>
                                <span className={`task-category-chip ${String(itm.category || "").toLowerCase()}`}>
                                  {itm.category || "General"}
                                </span>
                                <span className="task-row-title" title={itm.title}>
                                  {itm.title}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="wizard-no-tasks-hint">
                              Select a template above to preview auto-generated checklist tasks.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Section 5 Joining Date */}
                      <div className="wizard-field-card compact">
                        <div className="wizard-section-header compact">
                          <span className="section-step-num">5</span>
                          <div className="section-header-titles">
                            <h4>
                              {startType === "onboarding" ? "Joining Date" : "Last Working Day"} <span className="req-star">*</span>
                            </h4>
                          </div>
                        </div>
                        <div className="wizard-date-input-wrap">
                          <CustomDatePicker
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            placeholder="dd-mm-yyyy"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Remarks / Handover Notes - Full Width extending across from left (under section 4) to right */}
                    <div className="wizard-field-card compact wizard-remarks-card">
                      <div className="wizard-section-header compact">
                        <span className="section-icon-badge">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        </span>
                        <div className="section-header-titles">
                          <h4>Remarks / Handover Notes (Optional)</h4>
                        </div>
                      </div>
                      <div className="wizard-textarea-wrap">
                        <textarea
                          className="wizard-notes-textarea"
                          placeholder="Add any specific instructions or requirements..."
                          value={startNotes}
                          maxLength={300}
                          onChange={(e) => setStartNotes(e.target.value)}
                          rows={2}
                        />
                        <span className="wizard-char-counter">{startNotes.length}/300</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wizard Modal Footer */}
              <div className="wizard-modal-footer">
                <button
                  type="button"
                  className="btn-wizard-cancel"
                  onClick={() => setShowStartModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-wizard-launch"
                  disabled={modalLoading || !selectedEmployeeId}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>
                    {modalLoading
                      ? "Launching..."
                      : `Launch ${startType === "onboarding" ? "Onboarding" : "Offboarding"}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL 2: "Checklist Execution Drawer / Modal" (Picture 1 Exact Replication)
          ---------------------------------------------------------------------- */}
      {showChecklistModal && activeRecord && (
        <div className="lifecycle-modal-overlay" onClick={() => setShowChecklistModal(false)}>
          <div className="lifecycle-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lifecycle-modal-header">
              <div className="checklist-header-left">
                <div className="checklist-header-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                </div>
                <div className="checklist-header-titles">
                  <h2>
                    {activeRecord.type === "onboarding" ? "Onboarding Checklist" : "Offboarding Clearance"} ({activeRecord.record_code})
                  </h2>
                  <p>Track department handoffs and check off completed items in real time.</p>
                </div>
              </div>
              <button
                type="button"
                className="checklist-close-btn"
                onClick={() => setShowChecklistModal(false)}
                title="Close"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="lifecycle-modal-body">
              {/* Top Summary Banner Card */}
              <div className="checklist-summary-banner">
                <div className="checklist-employee-badge">
                  <div className="checklist-avatar-circle">
                    {(activeRecord.employee_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="checklist-employee-info">
                    <h3>{activeRecord.employee_name}</h3>
                    <p>
                      {activeRecord.employee_email} • {activeRecord.template_title || (activeRecord.type === "onboarding" ? "Software Engineer Onboarding" : "General Offboarding")}
                    </p>
                  </div>
                </div>

                <div className="checklist-summary-progress">
                  <div className="checklist-progress-top-row">
                    <span className="checklist-progress-label">Overall Progress</span>
                    <div className="checklist-progress-bar-wrap">
                      <div
                        className="checklist-progress-bar-fill"
                        style={{ width: `${Math.min(100, Math.max(0, activeRecord.progress_pct || 0))}%` }}
                      />
                    </div>
                    <span className="checklist-progress-pct-val">{activeRecord.progress_pct || 0}%</span>
                  </div>

                  <div className="checklist-target-date-row">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>
                      Target Date: {new Date(activeRecord.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>


              {/* Categorized Checklist Items with Sequential Indices */}
              {(() => {
                const itemIndexMap = new Map();
                (activeRecord.checklist || []).forEach((itm, idx) => itemIndexMap.set(itm.id, idx + 1));

                const categories = categoriesToRender;

                const hasAnyItems = categories.some((cat) =>
                  (activeRecord.checklist || []).some((itm) => itm.category === cat)
                );

                if (!hasAnyItems) {
                  return (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: "12px", display: "inline-block" }}>
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      <h4 style={{ margin: "0 0 6px 0", color: "#334155", fontSize: "15px" }}>No Tasks Assigned</h4>
                      <p style={{ margin: 0, fontSize: "13px" }}>
                        There are no checklist steps assigned to your department ({isITAdmin ? "IT" : isHRAdmin ? "HR" : isManager ? "Manager" : isSecurity ? "Security" : "selected"}) in this workflow.
                      </p>
                    </div>
                  );
                }

                return categories.map((cat) => {
                  const catItems = (activeRecord.checklist || []).filter((itm) => itm.category === cat);
                  if (catItems.length === 0) return null;

                  const completedInCat = catItems.filter((i) => i.is_completed).length;
                  const totalInCat = catItems.length;
                  const isAllDone = completedInCat === totalInCat && totalInCat > 0;
                  const isCollapsed = Boolean(collapsedCats[cat]);

                  const catIcons = {
                    IT: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    ),
                    HR: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    ),
                    Manager: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ),
                    Security: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    ),
                    Finance: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                        <path d="M12 18V6" />
                      </svg>
                    ),
                    General: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                      </svg>
                    ),
                  };

                  return (
                    <div key={cat} className="checklist-category-block">
                      <div className="checklist-category-header" onClick={() => toggleCat(cat)}>
                        <div className="category-header-left">
                          <span className="category-header-icon">{catIcons[cat]}</span>
                          <span className="category-header-title">{cat} Operations &amp; Verification</span>
                          <span className={`category-count-badge ${isAllDone ? "all-done" : ""}`}>
                            {completedInCat} / {totalInCat}
                          </span>
                        </div>
                        <div className={`category-chevron-box ${isCollapsed ? "collapsed" : ""}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="category-items-list">
                          {catItems.map((item) => {
                            const stepNumber = itemIndexMap.get(item.id) || 1;
                            const subtitle = getItemSubtitle(item);
                            const canToggle = canToggleItem(item) && !item.is_completed;

                            return (
                              <div
                                key={item.id}
                                className={`checklist-item-row ${item.is_completed ? "completed" : ""}`}
                              >
                                <div className="checklist-item-left">
                                  {/* Custom Checkbox */}
                                  <div
                                    className={`checklist-checkbox-custom ${item.is_completed ? "checked disabled" : ""} ${!canToggle && !item.is_completed ? "disabled" : ""}`}
                                    onClick={() => {
                                      if (item.is_completed) return;
                                      if (!canToggle) {
                                        setToastMessage(
                                          `Action restricted: Only ${item.category} Admin can check off this item.`
                                        );
                                        return;
                                      }
                                      handleToggleItem(item.id, item.is_completed);
                                    }}
                                    title={
                                      item.is_completed
                                        ? "Completed (cannot be unchecked)"
                                        : !canToggle
                                        ? `Action restricted: Only ${item.category} Admin can complete this task`
                                        : "Click to mark done"
                                    }
                                  >
                                    {item.is_completed && (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </div>

                                  {/* Sequential Step Number Badge */}
                                  <div className={`checklist-step-num ${item.is_completed ? "completed" : ""}`}>
                                    {stepNumber}
                                  </div>

                                  {/* Title & Subtitle */}
                                  <div className="checklist-item-content">
                                    <span className="checklist-item-title">
                                      {item.title}
                                    </span>
                                    <p className="checklist-item-desc">{subtitle}</p>
                                  </div>
                                </div>

                                <div className="checklist-item-right">
                                  {!canToggle && !item.is_completed && (
                                    <span
                                      className="item-badge-dept-lock"
                                      title={
                                        isGeneralAdmin
                                          ? `Action restricted: Requires ${item.category} Admin completion`
                                          : `Requires ${item.category} Admin`
                                      }
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                      </svg>
                                      {item.category} Admin Only
                                    </span>
                                  )}
                                  <span className="item-badge-role">{item.assignee_role}</span>
                                  <span className={`item-badge-status ${item.is_completed ? "completed" : "pending"}`}>
                                    {item.is_completed ? "Completed" : "Pending"}
                                  </span>
                                  <span className="item-badge-due">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                      <line x1="16" y1="2" x2="16" y2="6" />
                                      <line x1="8" y1="2" x2="8" y2="6" />
                                      <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    {new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                  <div className="item-more-btn" title="More options">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                                      <circle cx="12" cy="5" r="1.5" fill="#94a3b8" />
                                      <circle cx="12" cy="12" r="1.5" fill="#94a3b8" />
                                      <circle cx="12" cy="19" r="1.5" fill="#94a3b8" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="lifecycle-modal-footer">
              <button type="button" className="btn-lifecycle-modal-close" onClick={() => setShowChecklistModal(false)}>
                Close
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-complete-lifecycle"
                  style={{
                    background: "#ea580c",
                    color: "#ffffff",
                    border: "none",
                    cursor: modalLoading ? "not-allowed" : "pointer",
                  }}
                  onClick={handleSaveChecklistUpdates}
                  disabled={modalLoading}
                  title="Update checklist"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {modalLoading ? "Updating..." : "Update"}
                </button>

                {isGeneralAdmin && activeRecord.status === "In Progress" && (
                  <button
                    type="button"
                    className="btn-complete-lifecycle"
                    disabled={
                      !(
                        Array.isArray(activeRecord.checklist) &&
                        activeRecord.checklist.length > 0 &&
                        activeRecord.checklist.every((itm) => itm.is_completed)
                      ) || modalLoading
                    }
                    onClick={handleCompleteLifecycle}
                    title={
                      !(
                        Array.isArray(activeRecord.checklist) &&
                        activeRecord.checklist.length > 0 &&
                        activeRecord.checklist.every((itm) => itm.is_completed)
                      )
                        ? `Action restricted: All checklist items across all departments must be completed first (${activeRecord.progress_pct || 0}% done)`
                        : "Finalize workflow & activate/deactivate employee"
                    }
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {activeRecord.type === "onboarding"
                      ? "Finalize Onboarding & Activate Employee"
                      : "Finalize Offboarding & Deactivate Employee"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL 3: "Create Template" Modal
          ---------------------------------------------------------------------- */}
      {/* ----------------------------------------------------------------------
          MODAL 3: "Create Blueprint Template" (Picture 1 Exact Replication)
          ---------------------------------------------------------------------- */}
      {showNewTemplateModal && (
        <div className="lifecycle-modal-overlay" onClick={() => setShowNewTemplateModal(false)}>
          <div className="blueprint-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="blueprint-modal-header">
              <div className="blueprint-header-left">
                <div className="blueprint-header-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <div className="blueprint-header-titles">
                  <h2>Create Blueprint Template</h2>
                  <p>Define a reusable checklist plan for specific job titles or departments.</p>
                </div>
              </div>
              <button
                type="button"
                className="blueprint-close-btn"
                onClick={() => setShowNewTemplateModal(false)}
                title="Close"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className="blueprint-modal-form" onSubmit={handleCreateTemplateSubmit}>
              <div className="blueprint-modal-body">
                {/* Row 1: Template Title & Process Type */}
                <div className="blueprint-form-grid-2">
                  <div>
                    <label className="blueprint-field-label">
                      Template Title <span className="req-star">*</span>
                    </label>
                    <div className="blueprint-input-wrap">
                      <span className="blueprint-input-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        className="blueprint-input-field"
                        placeholder="e.g. Frontend Developer Onboarding"
                        value={newTemplateTitle}
                        onChange={(e) => setNewTemplateTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="blueprint-field-label">
                      Process Type <span className="req-star">*</span>
                    </label>
                    <div className="process-type-cards-grid">
                      {/* Onboarding Option */}
                      <div
                        className={`process-type-card ${newTemplateType === "onboarding" ? "active" : ""}`}
                        onClick={() => setNewTemplateType("onboarding")}
                      >
                        <div className="process-type-icon-box onboarding">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                        </div>
                        <div className="process-type-card-details">
                          <span className="process-type-title">Onboarding</span>
                          <span className="process-type-desc">New employee setup</span>
                        </div>
                        <div className="process-type-radio">
                          {newTemplateType === "onboarding" && <div className="radio-dot" />}
                        </div>
                      </div>

                      {/* Offboarding Option */}
                      <div
                        className={`process-type-card ${newTemplateType === "offboarding" ? "active" : ""}`}
                        onClick={() => setNewTemplateType("offboarding")}
                      >
                        <div className="process-type-icon-box offboarding">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                        </div>
                        <div className="process-type-card-details">
                          <span className="process-type-title">Offboarding</span>
                          <span className="process-type-desc">Employee exit process</span>
                        </div>
                        <div className="process-type-radio">
                          {newTemplateType === "offboarding" && <div className="radio-dot" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Department / Scope */}
                <div className="blueprint-dept-row">
                  <label className="blueprint-field-label">
                    Department / Scope <span className="req-star">*</span>
                  </label>
                  <CustomSelect
                    value={newTemplateDept}
                    onChange={(valOrEvent) => {
                      const val = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
                      setNewTemplateDept(val);
                    }}
                    options={[
                      "Engineering",
                      "Human Resources",
                      "Information Technology",
                      "Sales & Marketing",
                      "Finance & Legal",
                      "Operations",
                      "General",
                    ].map((dept) => ({ value: dept, label: dept }))}
                    placeholder="Select Department / Scope"
                    isClearable={true}
                    className="blueprint-dept-custom-select"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="5" rx="1" />
                        <rect x="14" y="16" width="7" height="5" rx="1" />
                        <rect x="3" y="16" width="7" height="5" rx="1" />
                        <path d="M6.5 8v4h11v4M6.5 12h-0" />
                      </svg>
                    }
                  />
                </div>

                {/* Row 3: Checklist Steps Builder Card */}
                <div className="blueprint-steps-card">
                  <div className="blueprint-steps-header">
                    <div className="steps-header-left">
                      <div className="steps-icon-badge">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="8" y1="6" x2="21" y2="6" />
                          <line x1="8" y1="12" x2="21" y2="12" />
                          <line x1="8" y1="18" x2="21" y2="18" />
                          <line x1="3" y1="6" x2="3.01" y2="6" />
                          <line x1="3" y1="12" x2="3.01" y2="12" />
                          <line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                      </div>
                      <div className="steps-header-titles">
                        <h3>Checklist Steps</h3>
                        <p>Define the steps, assign departments and set the order.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-add-step"
                      onClick={handleAddTemplateStep}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Step
                    </button>
                  </div>

                  <div className="blueprint-steps-list">
                    {templateSteps.map((step, idx) => (
                      <div key={idx} className="blueprint-step-row">
                        {/* Drag handle */}
                        <div className="step-drag-dots" title="Reorder">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                            <circle cx="9" cy="5" r="1.5" fill="#94a3b8" />
                            <circle cx="9" cy="12" r="1.5" fill="#94a3b8" />
                            <circle cx="9" cy="19" r="1.5" fill="#94a3b8" />
                            <circle cx="15" cy="5" r="1.5" fill="#94a3b8" />
                            <circle cx="15" cy="12" r="1.5" fill="#94a3b8" />
                            <circle cx="15" cy="19" r="1.5" fill="#94a3b8" />
                          </svg>
                        </div>

                        {/* Step number circle */}
                        <div className="step-num-circle">{idx + 1}</div>

                        {/* Task title input */}
                        <input
                          type="text"
                          className="step-title-input"
                          placeholder="Task title..."
                          value={step.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTemplateSteps((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, title: val } : s))
                            );
                          }}
                          required
                        />

                        {/* Department Category Select */}
                        <CustomSelect
                          value={step.category}
                          onChange={(valOrEvent) => {
                            const val = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
                            setTemplateSteps((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, category: val } : s))
                            );
                          }}
                          options={[
                            { value: "IT", label: "IT" },
                            { value: "HR", label: "HR" },
                            { value: "Manager", label: "Manager" },
                            { value: "Security", label: "Security" },
                            { value: "Finance", label: "Finance" },
                            { value: "General", label: "General" },
                          ]}
                          placeholder="Category"
                          isClearable={true}
                          searchable={true}
                          className="step-dept-custom-select"
                          icon={
                            step.category === "IT" ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            )
                          }
                        />


                        {/* Trash Button */}
                        <button
                          type="button"
                          className="btn-trash-step"
                          onClick={() => handleRemoveTemplateStep(idx)}
                          title="Remove Step"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Tips Box */}
                  <div className="blueprint-tips-banner">
                    <div className="tips-info-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                    <div className="tips-content">
                      <strong className="tips-title">Tips</strong>
                      <p className="tips-text">
                        Steps will be created in the selected order and shown to approvers during the lifecycle process.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="blueprint-modal-footer">
                <button
                  type="button"
                  className="btn-blueprint-cancel"
                  onClick={() => setShowNewTemplateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-blueprint-save"
                  disabled={modalLoading}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {modalLoading ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLifecycle;
