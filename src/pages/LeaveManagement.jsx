import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
  Palmtree,
  HeartPulse,
  Coffee,
  HelpCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  User,
  Copy,
  ArrowLeftRight,
  ShieldCheck,
  Ban,
  CalendarCheck,
  Info,
  UserCheck,
  Users,
  Check,
  Eye,
  MessageSquare,
  History,
  Grid,
  List,
  SlidersHorizontal,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Layers,
  Building2,
  PartyPopper,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SuccessToast from "../components/SuccessToast";
import ConfirmDialog from "../components/ConfirmDialog";
import CustomSelect from "../components/CustomSelect";
import CustomDatePicker from "../components/CustomDatePicker";
import {
  getLeaveTypes,
  getCompanyHolidays,
  calculateWorkingDays,
  getMyLeaveBalances,
  applyLeave,
  getMyLeaveRequests,
  cancelLeaveRequest,
  getAdminLeaveRequests,
  getAdminLeaveStats,
  decideLeaveRequest,
  getTeamLeaveCalendar,
  getLeaveTransactions,
  adjustEmployeeLeaveBalance,
} from "../services/leaveService";
import { getUsers } from "../services/userService";
import "./LeaveManagement.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function LeaveManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isGeneralAdmin = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    const baseRole = (user?.baseRole || "").toLowerCase();
    const roleName = (user?.role_name || user?.roleName || "").toLowerCase();
    return (
      role === "general_admin" ||
      role === "super_admin" ||
      baseRole === "general_admin" ||
      roleName === "general_admin" ||
      roleName === "general admin" ||
      user?.email === "nency@gmail.com"
    );
  }, [user]);

  const isAdmin = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    const baseRole = (user?.baseRole || "").toLowerCase();
    const roleName = (user?.role_name || user?.roleName || "").toLowerCase();
    return (
      role === "admin" ||
      role === "general_admin" ||
      role === "super_admin" ||
      baseRole === "admin" ||
      baseRole === "general_admin" ||
      baseRole === "super_admin" ||
      roleName === "admin" ||
      roleName === "general_admin" ||
      roleName === "general admin" ||
      user?.email === "nency@gmail.com"
    );
  }, [user]);

  // Route-driven view matching sidebar submenus:
  // /leaves or /leaves/my-leaves -> "my_leaves" (for employee/admin) or "team_calendar" (first page for General Admin)
  // /leaves/calendar -> "team_calendar"
  // /leaves/audit -> "audit_ledger"
  // /leaves/requests -> "admin_approvals"
  const mainView = useMemo(() => {
    if (location.pathname.startsWith("/leaves/calendar"))
      return "team_calendar";
    if (location.pathname.startsWith("/leaves/audit")) return "audit_ledger";
    if (location.pathname.startsWith("/leaves/requests"))
      return "admin_approvals";
    if (isGeneralAdmin) return "team_calendar";
    return "my_leaves";
  }, [location.pathname, isGeneralAdmin]);

  // If General Admin navigates directly to /leaves or /leaves/my-leaves, redirect to first page (/leaves/calendar)
  useEffect(() => {
    if (
      isGeneralAdmin &&
      (location.pathname === "/leaves" ||
        location.pathname === "/leaves/" ||
        location.pathname === "/leaves/my-leaves")
    ) {
      navigate("/leaves/calendar", { replace: true });
    }
  }, [isGeneralAdmin, location.pathname, navigate]);

  // Common State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [companyHolidays, setCompanyHolidays] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Employee State (Step 2)
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [holidaySearch, setHolidaySearch] = useState("");
  const [holidayTypeFilter, setHolidayTypeFilter] = useState("all");
  const [selectedRequestForDetail, setSelectedRequestForDetail] =
    useState(null);
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Apply Form State
  const [applyFormData, setApplyFormData] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [isMoreThanOneDay, setIsMoreThanOneDay] = useState(false);
  const [calcPreview, setCalcPreview] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);

  // Admin Specific State (Step 3)
  const [adminStats, setAdminStats] = useState({
    pendingCount: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    onLeaveTodayCount: 0,
    onLeaveTodayEmployees: [],
  });
  const [adminRequests, setAdminRequests] = useState([]);
  const [adminStatusTab, setAdminStatusTab] = useState("Pending");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminLeaveTypeFilter, setAdminLeaveTypeFilter] = useState("All");

  // Admin Decision Modal State
  const [decisionCandidate, setDecisionCandidate] = useState(null);
  const [decisionType, setDecisionType] = useState("Approved");
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState("");

  // Step 6: Team Calendar State
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calViewMode, setCalViewMode] = useState("grid"); // "grid" | "matrix"
  const [calendarData, setCalendarData] = useState({
    holidays: [],
    leaves: [],
    stats: { employeesOnLeaveCount: 0, totalDaysOff: 0, holidayCount: 0 },
    daysInMonth: 31,
  });
  const [calSearch, setCalSearch] = useState("");
  const [calLeaveTypeFilter, setCalLeaveTypeFilter] = useState("All");
  const [calLoading, setCalLoading] = useState(false);

  // Step 4: Audit Ledger State
  const [transactions, setTransactions] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [txTypeFilter, setTxTypeFilter] = useState("All");
  const [txSearch, setTxSearch] = useState("");

  // Step 4: Admin Manual Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [adjustFormData, setAdjustFormData] = useState({
    employeeId: "",
    leaveTypeId: "",
    days: "",
    adjustmentType: "ADD",
    reason: "",
  });
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // Helper date formatter
  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    return isNaN(d.getTime())
      ? String(dateVal)
      : d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  // Helper to determine whether a holiday is a Company Holiday or Public Holiday
  const isCompanyHoliday = (hol) => {
    if (!hol) return false;
    if (hol.is_optional) return true;
    const name = (hol.name || "").toLowerCase();
    return (
      name.includes("labour") ||
      name.includes("gujarat") ||
      name.includes("raksha") ||
      name.includes("company")
    );
  };

  const parseHolidayDateParts = (dateVal) => {
    if (!dateVal) return { day: "01", month: "Jan", year: "2026" };
    if (typeof dateVal === "string" && dateVal.includes("-")) {
      const parts = dateVal.split("T")[0].split("-");
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2].padStart(2, "0");
        const shortMonths = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        return {
          day,
          month: shortMonths[monthIdx] || "Jan",
          year: year || "2026",
        };
      }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return { day: "01", month: "Jan", year: "2026" };
    return {
      day: String(d.getDate()).padStart(2, "0"),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      year: String(d.getFullYear()),
    };
  };

  const holidaySummaryStats = useMemo(() => {
    const total = companyHolidays.length || 12;
    let companyCount = 0;
    let publicCount = 0;
    companyHolidays.forEach((h) => {
      if (isCompanyHoliday(h)) {
        companyCount++;
      } else {
        publicCount++;
      }
    });
    return {
      total: companyHolidays.length ? total : 12,
      company: companyHolidays.length ? companyCount : 2,
      public: companyHolidays.length ? publicCount : 10,
    };
  }, [companyHolidays]);

  const holidayTypeOptions = useMemo(
    () => [
      { value: "all", label: "All Holidays" },
      { value: "public", label: "Public Holidays" },
      { value: "company", label: "Company Holidays" },
    ],
    []
  );

  const filteredCompanyHolidays = useMemo(() => {
    return companyHolidays.filter((hol) => {
      const isCompany = isCompanyHoliday(hol);
      if (holidayTypeFilter === "company" && !isCompany) return false;
      if (holidayTypeFilter === "public" && isCompany) return false;

      if (holidaySearch && holidaySearch.trim()) {
        const q = holidaySearch.trim().toLowerCase();
        const matchName = (hol.name || "").toLowerCase().includes(q);
        const matchDesc = (hol.description || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [companyHolidays, holidayTypeFilter, holidaySearch]);

  // Helper icon for leave type
  const getLeaveIcon = (code) => {
    switch (code) {
      case "PAID":
        return <Palmtree size={20} />;
      case "SICK":
        return <HeartPulse size={20} />;
      case "CASUAL":
        return <Coffee size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  // Fetch initial data
  const fetchData = useCallback(
    async (showRefreshIndicator = false) => {
      try {
        if (showRefreshIndicator) setRefreshing(true);
        else setLoading(true);
        setErrorMessage("");

        const promises = [
          getLeaveTypes().catch((e) => ({ success: false, error: e })),
          getMyLeaveBalances(selectedYear).catch((e) => ({
            success: false,
            error: e,
          })),
          getMyLeaveRequests({ year: selectedYear }).catch((e) => ({
            success: false,
            error: e,
          })),
          getCompanyHolidays(selectedYear).catch((e) => ({
            success: false,
            error: e,
          })),
        ];

        if (isAdmin) {
          promises.push(
            getAdminLeaveStats(selectedYear).catch((e) => ({
              success: false,
              error: e,
            })),
          );
          promises.push(
            getAdminLeaveRequests({
              year: selectedYear,
              status: adminStatusTab === "All" ? undefined : adminStatusTab,
              search: adminSearch || undefined,
              leaveTypeId:
                adminLeaveTypeFilter === "All"
                  ? undefined
                  : adminLeaveTypeFilter,
            }).catch((e) => ({ success: false, error: e })),
          );
        }

        const results = await Promise.all(promises);
        const typesRes = results[0];
        const balsRes = results[1];
        const reqsRes = results[2];
        const holsRes = results[3];

        if (typesRes?.success) setLeaveTypes(typesRes.data || []);
        if (balsRes?.success) {
          setLeaveBalances(balsRes.data?.balances || []);
          setBalanceSummary(balsRes.data?.summary || null);
        }
        if (reqsRes?.success) setMyRequests(reqsRes.data || []);
        if (holsRes?.success) setCompanyHolidays(holsRes.data || []);

        if (isAdmin) {
          const statsRes = results[4];
          const adminReqsRes = results[5];
          if (statsRes?.success) setAdminStats(statsRes.data);
          if (adminReqsRes?.success) setAdminRequests(adminReqsRes.data || []);
        }

        // Only alert if both core endpoints failed
        if (!balsRes?.success && !typesRes?.success) {
          setErrorMessage(
            "Failed to load leave records. Please check connection and try again.",
          );
        }
      } catch (err) {
        console.error("Failed to load leave data:", err);
        setErrorMessage("Failed to load leave records. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedYear, isAdmin, adminStatusTab, adminSearch, adminLeaveTypeFilter],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch Calendar Data (Step 6)
  const fetchCalendar = useCallback(async () => {
    try {
      setCalLoading(true);
      const res = await getTeamLeaveCalendar({
        year: calYear,
        month: calMonth,
        leaveTypeId:
          calLeaveTypeFilter && calLeaveTypeFilter.toLowerCase() !== "all"
            ? calLeaveTypeFilter
            : undefined,
        search: calSearch || undefined,
      });
      if (res?.success) {
        setCalendarData(res.data);
      }
    } catch (err) {
      console.error("Failed to load team calendar:", err);
    } finally {
      setCalLoading(false);
    }
  }, [calYear, calMonth, calLeaveTypeFilter, calSearch]);

  useEffect(() => {
    if (mainView === "team_calendar") {
      fetchCalendar();
    }
  }, [mainView, fetchCalendar]);

  // Fetch Audit Ledger Transactions (Step 4)
  const fetchTransactions = useCallback(async () => {
    try {
      setLedgerLoading(true);
      const res = await getLeaveTransactions({
        year: selectedYear,
        transactionType: txTypeFilter !== "All" ? txTypeFilter : undefined,
        search: txSearch || undefined,
        ...(!isGeneralAdmin
          ? { employeeId: user?.id || user?.registerId || user?.register_id }
          : {}),
      });
      if (res?.success) {
        setTransactions(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLedgerLoading(false);
    }
  }, [selectedYear, txTypeFilter, txSearch, isGeneralAdmin, user]);

  useEffect(() => {
    if (mainView === "audit_ledger") {
      fetchTransactions();
    }
  }, [mainView, fetchTransactions]);

  const isCurrentUserTransaction = useCallback(
    (tx) => {
      if (!tx) return false;
      const uid = user?.id || user?.registerId || user?.register_id;
      const uemail = (user?.email || "").trim().toLowerCase();
      const uname = (user?.name || "").trim().toLowerCase();

      if (
        uid &&
        (String(tx.employee_id) === String(uid) ||
          String(tx.user_id) === String(uid) ||
          String(tx.register_id) === String(uid))
      ) {
        return true;
      }
      if (
        uemail &&
        tx.employee_email &&
        tx.employee_email.trim().toLowerCase() === uemail
      ) {
        return true;
      }
      if (
        uname &&
        tx.employee_name &&
        tx.employee_name.trim().toLowerCase() === uname
      ) {
        return true;
      }
      return false;
    },
    [user],
  );

  // General Admin sees all transactions; Admin & Employee only see their own transactions
  const effectiveTransactions = useMemo(() => {
    if (isGeneralAdmin) {
      return transactions;
    }
    return transactions.filter(isCurrentUserTransaction);
  }, [isGeneralAdmin, transactions, isCurrentUserTransaction]);

  // Filtered users list excluding General Admin
  const filteredUsersList = useMemo(() => {
    return usersList.filter((u) => {
      const r = (u.role || u.role_name || u.roleName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return (
        r !== "general_admin" &&
        r !== "super_admin" &&
        email !== "nency@gmail.com"
      );
    });
  }, [usersList]);

  // Options for Employee select in Adjust Modal (Name on left, role on right, NO email)
  const employeeOptions = useMemo(() => {
    return filteredUsersList.map((u) => {
      const idVal = u.id || u.register_id || u.registerId;
      const roleVal = u.role || u.role_name || "employee";
      return {
        value: String(idVal),
        label: u.name || `User ${idVal}`,
        name: u.name,
        role: roleVal,
      };
    });
  }, [filteredUsersList]);

  const adjustCategoryOptions = useMemo(() => {
    return leaveTypes.map((t) => ({
      value: String(t.id),
      label: t.name,
    }));
  }, [leaveTypes]);

  const adjustActionOptions = useMemo(
    () => [
      { value: "ADD", label: "Add Days (+ Credit)" },
      { value: "DEDUCT", label: "Deduct Days (- Debit)" },
    ],
    [],
  );

  const applyLeaveTypeOptions = useMemo(() => {
    return leaveTypes.map((t) => {
      const displayLabel =
        t.code && !t.name.includes(t.code)
          ? `${t.name} (${t.code})`
          : t.name;
      return {
        value: String(t.id),
        label: displayLabel,
      };
    });
  }, [leaveTypes]);

  // Fetch users for admin adjustment
  const handleOpenAdjustModal = async () => {
    setShowAdjustModal(true);
    setAdjustError("");
    setAdjustFormData({
      employeeId: "",
      leaveTypeId: leaveTypes[0]?.id ? String(leaveTypes[0].id) : "",
      days: "",
      adjustmentType: "ADD",
      reason: "",
    });
    try {
      const uRes = await getUsers(1, 100);
      const fetched = uRes.data?.data || uRes.data?.users || [];
      setUsersList(fetched);
      const nonGeneralAdmin = fetched.filter((u) => {
        const r = (u.role || u.role_name || u.roleName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return (
          r !== "general_admin" &&
          r !== "super_admin" &&
          email !== "nency@gmail.com"
        );
      });
      if (nonGeneralAdmin.length > 0) {
        setAdjustFormData((prev) => ({
          ...prev,
          employeeId: String(
            nonGeneralAdmin[0].id || nonGeneralAdmin[0].register_id,
          ),
        }));
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
  };

  // Submit Balance Adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (
      !adjustFormData.employeeId ||
      !adjustFormData.leaveTypeId ||
      !adjustFormData.days ||
      !adjustFormData.reason.trim()
    ) {
      setAdjustError("All fields are required.");
      return;
    }
    try {
      setAdjustSubmitting(true);
      setAdjustError("");
      const res = await adjustEmployeeLeaveBalance({
        employeeId: adjustFormData.employeeId,
        leaveTypeId: adjustFormData.leaveTypeId,
        year: selectedYear,
        days: parseFloat(adjustFormData.days),
        adjustmentType: adjustFormData.adjustmentType,
        reason: adjustFormData.reason.trim(),
      });
      if (res?.success) {
        setToastMessage(
          `Leave balance adjusted successfully (${adjustFormData.adjustmentType} ${adjustFormData.days} days).`,
        );
        setShowAdjustModal(false);
        fetchTransactions();
        fetchData();
      }
    } catch (err) {
      setAdjustError(
        err.response?.data?.message || "Failed to adjust balance.",
      );
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Live calculation of working days in Apply Modal
  useEffect(() => {
    const sDate = applyFormData.startDate;
    const eDate = isMoreThanOneDay
      ? (applyFormData.endDate || applyFormData.startDate)
      : (applyFormData.endDate || applyFormData.startDate);

    if (!sDate) {
      setCalcPreview(null);
      setCalcError("");
      return;
    }

    if (applyFormData.endDate && sDate > applyFormData.endDate) {
      setCalcPreview(null);
      setCalcError("Start date cannot be after end date.");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCalcLoading(true);
        setCalcError("");
        const res = await calculateWorkingDays(sDate, eDate || sDate);
        if (res?.success) {
          setCalcPreview(res.data);
          if (res.data.workingDays === 0) {
            setCalcError(
              "Selected date range contains only weekends or holidays (0 working days).",
            );
          }
        }
      } catch (err) {
        setCalcPreview(null);
        setCalcError(
          err.response?.data?.message || "Failed to calculate working days.",
        );
      } finally {
        setCalcLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [applyFormData.startDate, applyFormData.endDate, isMoreThanOneDay]);

  const currentSelectedBalance = useMemo(() => {
    if (!applyFormData.leaveTypeId) return null;
    return leaveBalances.find(
      (b) => String(b.leave_type_id) === String(applyFormData.leaveTypeId),
    );
  }, [leaveBalances, applyFormData.leaveTypeId]);

  const isBalanceExceeded = useMemo(() => {
    if (!calcPreview || !currentSelectedBalance) return false;
    return (
      calcPreview.workingDays >
      parseFloat(currentSelectedBalance.available_days || 0)
    );
  }, [calcPreview, currentSelectedBalance]);

  // Today and future date constraints for Leave Application
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const getNextDayStr = useCallback((dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const minForToDate = useMemo(() => {
    if (applyFormData.startDate) {
      return getNextDayStr(applyFormData.startDate);
    }
    return getNextDayStr(todayDateStr);
  }, [applyFormData.startDate, todayDateStr, getNextDayStr]);

  const resetApplyForm = useCallback(() => {
    setApplyFormData({
      leaveTypeId: "",
      startDate: "",
      endDate: "",
      reason: "",
    });
    setIsMoreThanOneDay(false);
    setCalcPreview(null);
    setCalcLoading(false);
    setCalcError("");
  }, []);

  const handleCloseApplyModal = useCallback(() => {
    setShowApplyModal(false);
    resetApplyForm();
  }, [resetApplyForm]);

  const handleOpenApplyModal = useCallback(() => {
    if (isGeneralAdmin) return;
    resetApplyForm();
    setShowApplyModal(true);
  }, [resetApplyForm, isGeneralAdmin]);

  useEffect(() => {
    if (!showApplyModal) {
      resetApplyForm();
    }
  }, [showApplyModal, resetApplyForm]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setApplyFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyFormData.leaveTypeId) {
      setCalcError("Please select a leave category.");
      return;
    }
    const effectiveStartDate = applyFormData.startDate;
    const effectiveEndDate = isMoreThanOneDay
      ? (applyFormData.endDate || applyFormData.startDate)
      : (applyFormData.endDate || applyFormData.startDate);

    if (!effectiveStartDate) {
      setCalcError("Please select a date.");
      return;
    }
    if (applyFormData.endDate && effectiveStartDate > applyFormData.endDate) {
      setCalcError("Start date cannot be after end date.");
      return;
    }
    if (!applyFormData.reason?.trim()) {
      setCalcError("Please provide a reason for the leave.");
      return;
    }
    if (isBalanceExceeded) {
      setCalcError("Cannot submit: Requested days exceed available balance.");
      return;
    }

    try {
      setApplySubmitting(true);
      setCalcError("");

      const res = await applyLeave({
        leaveTypeId: applyFormData.leaveTypeId,
        leave_type_id: applyFormData.leaveTypeId,
        startDate: effectiveStartDate,
        start_date: effectiveStartDate,
        endDate: effectiveEndDate,
        end_date: effectiveEndDate,
        reason: applyFormData.reason.trim(),
      });

      if (res?.success) {
        setToastMessage("Leave application submitted successfully!");
        handleCloseApplyModal();
        fetchData();
      }
    } catch (err) {
      setCalcError(
        err.response?.data?.message || "Failed to submit leave application.",
      );
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelCandidate) return;
    try {
      setCancelLoading(true);
      const res = await cancelLeaveRequest(cancelCandidate.id);
      if (res?.success) {
        setToastMessage(
          `Request ${cancelCandidate.request_code} cancelled and balance restored.`,
        );
        setCancelCandidate(null);
        fetchData();
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || "Failed to cancel leave request.",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const handleOpenDecision = (req, type) => {
    setDecisionCandidate(req);
    setDecisionType(type);
    setDecisionRemarks(type === "Approved" ? "Approved" : "");
    setDecisionError("");
  };

  const handleSubmitDecision = async () => {
    if (!decisionCandidate) return;
    if (decisionType === "Rejected" && !decisionRemarks.trim()) {
      setDecisionError(
        "Please provide a reason for rejecting this leave request.",
      );
      return;
    }

    try {
      setDecisionSubmitting(true);
      setDecisionError("");

      const res = await decideLeaveRequest(decisionCandidate.id, {
        decision: decisionType,
        remarks: decisionRemarks.trim() || undefined,
      });

      if (res?.success) {
        setToastMessage(
          `Request ${decisionCandidate.request_code} has been ${decisionType.toLowerCase()} successfully.`,
        );
        setDecisionCandidate(null);
        fetchData();
        if (mainView === "team_calendar") fetchCalendar();
      }
    } catch (err) {
      setDecisionError(
        err.response?.data?.message ||
          `Failed to process ${decisionType.toLowerCase()} decision.`,
      );
    } finally {
      setDecisionSubmitting(false);
    }
  };

  // Dynamic page size calculation (e.g., 4 items -> Show 5; 7 items -> Show 5, Show 10; 12 items -> Show 5, Show 10, Show 15)
  const getPageSizeOptions = (totalCount) => {
    const count = Number(totalCount) || 0;
    const maxLimit = Math.max(5, Math.ceil(count / 5) * 5);
    const options = [];
    for (let i = 5; i <= maxLimit; i += 5) {
      options.push({ value: i, label: `Show ${i}` });
    }
    return options;
  };

  const totalLeavesCount = myRequests.length || 0;
  const pageSizeOptions = useMemo(
    () => getPageSizeOptions(totalLeavesCount),
    [totalLeavesCount]
  );

  useEffect(() => {
    const availableSizes = pageSizeOptions.map((o) => o.value);
    if (availableSizes.length > 0 && !availableSizes.includes(pageSize)) {
      setPageSize(availableSizes[0] || 5);
    }
  }, [pageSizeOptions, pageSize]);

  const handlePageSizeChange = (valOrEvent) => {
    const rawVal = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    const newSize = Number(rawVal) || 5;
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (valOrEvent) => {
    const rawVal = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    const s = String(rawVal || "").trim();
    if (!s || s.toLowerCase() === "all") {
      setStatusFilter("all");
      setActiveTab("All");
    } else {
      setStatusFilter(s);
      if (["Pending", "Approved", "Rejected", "Cancelled"].includes(s)) {
        setActiveTab(s);
      }
    }
    setCurrentPage(1);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === "All") {
      setStatusFilter("all");
    } else {
      setStatusFilter(tab);
    }
    setCurrentPage(1);
  };

  const handleLeaveTypeFilterChange = (valOrEvent) => {
    const rawVal = valOrEvent?.target ? valOrEvent.target.value : valOrEvent;
    const val = String(rawVal || "").trim();
    setLeaveTypeFilter(val || "all");
    setCurrentPage(1);
  };

  const statusFilterOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  const leaveTypeFilterOptions = useMemo(() => {
    return [
      { value: "all", label: "All Leave Types" },
      ...leaveTypes.map((t) => ({
        value: String(t.id),
        label: t.name || t.code || `Type ${t.id}`,
      })),
    ];
  }, [leaveTypes]);

  // Filter employee personal requests
  const filteredRequests = useMemo(() => {
    return myRequests.filter((item) => {
      // Status matching
      const effectiveStatus =
        statusFilter && statusFilter !== "all"
          ? statusFilter
          : activeTab !== "All"
          ? activeTab
          : null;

      const matchesStatus = !effectiveStatus
        ? true
        : item.status?.toLowerCase() === effectiveStatus.toLowerCase();

      // Leave Type matching
      const matchesType =
        !leaveTypeFilter || leaveTypeFilter === "all"
          ? true
          : String(item.leave_type_id) === String(leaveTypeFilter) ||
            String(item.leaveTypeId) === String(leaveTypeFilter) ||
            item.leave_type_name?.toLowerCase() === leaveTypeFilter.toLowerCase();

      // Search matching (search by request code, leave type name, or reason)
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q
          ? true
          : item.request_code?.toLowerCase().includes(q) ||
            item.leave_type_name?.toLowerCase().includes(q) ||
            item.reason?.toLowerCase().includes(q);

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [myRequests, activeTab, statusFilter, leaveTypeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const getPaginationPages = (curr, total) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (curr <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (curr >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", curr - 1, curr, curr + 1, "...", total];
  };

  const tabCounts = useMemo(() => {
    const counts = {
      All: myRequests.length,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Cancelled: 0,
    };
    myRequests.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return counts;
  }, [myRequests]);

  // Calendar navigation helpers
  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleTodayJump = () => {
    const now = new Date();
    setCalMonth(now.getMonth() + 1);
    setCalYear(now.getFullYear());
  };

  // Calendar Leave Category Options for CustomSelect
  const calCategoryOptions = useMemo(() => {
    return [
      { value: "All", label: "All Categories" },
      ...leaveTypes.map((t) => ({
        value: String(t.id),
        label: t.name,
      })),
    ];
  }, [leaveTypes]);

  const isCurrentUserLeave = useCallback(
    (leave) => {
      if (!leave) return false;
      const uid = user?.id || user?.registerId || user?.register_id;
      const uemail = (user?.email || "").trim().toLowerCase();
      const uname = (user?.name || "").trim().toLowerCase();

      if (
        uid &&
        (String(leave.employee_id) === String(uid) ||
          String(leave.user_id) === String(uid) ||
          String(leave.register_id) === String(uid))
      ) {
        return true;
      }
      if (
        uemail &&
        leave.employee_email &&
        leave.employee_email.trim().toLowerCase() === uemail
      ) {
        return true;
      }
      if (
        uname &&
        leave.employee_name &&
        leave.employee_name.trim().toLowerCase() === uname
      ) {
        return true;
      }
      return false;
    },
    [user],
  );

  // General Admin can see all team leaves; Employee & Admin only see their own leaves
  const effectiveCalendarLeaves = useMemo(() => {
    const rawLeaves = calendarData.leaves || [];
    if (isGeneralAdmin) {
      return rawLeaves;
    }
    return rawLeaves.filter(isCurrentUserLeave);
  }, [isGeneralAdmin, calendarData.leaves, isCurrentUserLeave]);

  const effectiveCalendarStats = useMemo(() => {
    if (isGeneralAdmin) {
      return (
        calendarData.stats || {
          employeesOnLeaveCount: 0,
          totalDaysOff: 0,
          holidayCount: 0,
        }
      );
    }
    let totalDays = 0;
    effectiveCalendarLeaves.forEach((l) => {
      totalDays += parseFloat(l.total_days || 0);
    });
    return {
      employeesOnLeaveCount: effectiveCalendarLeaves.length > 0 ? 1 : 0,
      totalDaysOff: totalDays,
      holidayCount: calendarData.stats?.holidayCount || 0,
    };
  }, [isGeneralAdmin, calendarData.stats, effectiveCalendarLeaves]);

  // Generate 7-column calendar grid days
  const calendarGridDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(calYear, calMonth - 1, 1));
    // 0 = Sunday, 1 = Monday ... convert to Monday = 0
    let startDayOfWeek = (firstDay.getUTCDay() + 6) % 7;
    const daysInMonth = calendarData.daysInMonth || 30;

    const days = [];
    // Leading blanks
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayNumber: null, isOtherMonth: true, key: `blank-${i}` });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(calMonth).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      const dateStr = `${calYear}-${monthStr}-${dayStr}`;

      const dateObj = new Date(Date.UTC(calYear, calMonth - 1, d));
      const dayOfWeek = (dateObj.getUTCDay() + 6) % 7;
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Sat, Sun

      // Matching holidays (timezone-safe YYYY-MM-DD match)
      const matchedHolidays = (calendarData.holidays || []).filter((h) => {
        if (!h.holiday_date) return false;
        const raw = String(h.holiday_date).trim();
        const hDate = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
        return hDate === dateStr;
      });

      // Matching approved leaves (timezone-safe YYYY-MM-DD match)
      const matchedLeaves = effectiveCalendarLeaves.filter((l) => {
        if (!l.start_date || !l.end_date) return false;
        const s = String(l.start_date).trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
        const e = String(l.end_date).trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
        return dateStr >= s && dateStr <= e;
      });

      days.push({
        dayNumber: d,
        dateStr,
        dayOfWeek,
        isWeekend,
        isToday: dateStr === todayStr,
        holidays: matchedHolidays,
        leaves: matchedLeaves,
        key: `day-${d}`,
      });
    }

    return days;
  }, [calYear, calMonth, calendarData, effectiveCalendarLeaves]);

  // Unique employees for Timeline Matrix View
  const matrixEmployees = useMemo(() => {
    const map = new Map();
    effectiveCalendarLeaves.forEach((l) => {
      if (!map.has(l.employee_id)) {
        map.set(l.employee_id, {
          id: l.employee_id,
          name: l.employee_name,
          email: l.employee_email,
          role: l.employee_role,
        });
      }
    });
    if (!isGeneralAdmin && map.size === 0 && user) {
      map.set(user.id || user.registerId || "me", {
        id: user.id || user.registerId || "me",
        name: user.name || "My Schedule",
        email: user.email,
        role: user.role,
      });
    }
    return Array.from(map.values());
  }, [effectiveCalendarLeaves, isGeneralAdmin, user]);

  const displayAllocated = balanceSummary ? balanceSummary.totalAllocated : 12;
  const displayUsed = balanceSummary ? balanceSummary.totalUsed : 4;
  const pendingRequestsCount = myRequests.filter(
    (r) => r.status === "Pending",
  ).length;
  const displayPending =
    balanceSummary?.totalPending !== undefined &&
    balanceSummary.totalPending !== null
      ? balanceSummary.totalPending
      : pendingRequestsCount || 2;
  const displayAvailable = balanceSummary ? balanceSummary.totalAvailable : 8;

  const usedPct =
    displayAllocated > 0
      ? Math.min(100, Math.round((displayUsed / displayAllocated) * 100))
      : 33;
  const pendingPct =
    displayAllocated > 0
      ? Math.min(100, Math.round((displayPending / displayAllocated) * 100))
      : 17;
  const availPct =
    displayAllocated > 0
      ? Math.min(100, Math.round((displayAvailable / displayAllocated) * 100))
      : 67;

  return (
    <div className="leave-mgmt-container">
      {/* Toast Notification */}
      <SuccessToast
        message={toastMessage}
        onClose={() => setToastMessage("")}
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="leave-alert-banner">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="leave-alert-close"
            onClick={() => setErrorMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="leave-header-bar">
        {mainView === "admin_approvals" && (
          <div className="admin-header-bg-wave">
            <svg viewBox="0 0 500 120" fill="none" preserveAspectRatio="none">
              <path
                d="M0,35 C150,85 300,15 500,55 L500,0 L0,0 Z"
                fill="url(#adminHeaderWaveGrad)"
                opacity="0.55"
              />
              <defs>
                <linearGradient id="adminHeaderWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.75" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
        <div className="leave-header-title">
          <div className="leave-header-icon-box">
            {mainView === "admin_approvals" ? (
              <ShieldCheck size={22} color="#0284c7" />
            ) : (
              <CalendarDays size={22} color="#2563eb" />
            )}
          </div>
          <div>
            <h1>
              {mainView === "team_calendar"
                ? isGeneralAdmin
                  ? "Team Leave Calendar"
                  : "My Leave Calendar"
                : mainView === "audit_ledger"
                  ? "Leave Audit Ledger"
                  : mainView === "admin_approvals"
                    ? "Admin Leave Requests"
                    : "Leave Management"}
            </h1>
            <p>
              {mainView === "team_calendar"
                ? isGeneralAdmin
                  ? "View team schedule, company holidays, and employee leave availability."
                  : "View your personal leave schedule, company holidays, and days off."
                : mainView === "audit_ledger"
                  ? "Immutable transaction audit records, balance deductions, and credit adjustments."
                  : mainView === "admin_approvals"
                    ? "Review pending leave requests, check availability, and process employee approvals."
                    : "Manage leave applications, approvals, team calendar, and leave records in one place."}
            </p>
          </div>
        </div>

        <div className="leave-header-actions">
          {/* Year Selector */}
          <div className="leave-year-select-wrap">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="leave-year-select"
            >
              <option value={2026}>Year 2026</option>
              <option value={2025}>Year 2025</option>
            </select>
          </div>

          {/* Company Holidays Button */}
          <button
            type="button"
            className="leave-btn-outline"
            onClick={() => setShowHolidaysModal(true)}
            title="View Company Holidays"
          >
            <Calendar size={15} />
            <span>Company Holidays</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            className="leave-btn-icon"
            onClick={() => fetchData(true)}
            title="Refresh Leave Data"
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "spin-animation" : ""}
            />
          </button>

          {/* Apply Leave Button (Only Admin & Employee can apply, not General Admin) */}
          {!isGeneralAdmin && (
            <button
              type="button"
              className="leave-btn-primary"
              onClick={handleOpenApplyModal}
            >
              <Plus size={16} />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================================
          VIEW 1: MY LEAVES (STEP 2 - Matches Pic 1)
          ====================================================================== */}
      {mainView === "my_leaves" && (
        <>
          {/* 4 Summary KPI Cards Grid (Matches Picture 1 Exact UI & Design) */}
          <div className="inbox-stats-grid leave-kpi-grid">
            {/* Card 1: Annual Leave */}
            <div className="stat-card card-amber">
              <div className="stat-icon open">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Annual Leave</span>
                <span className="stat-value">{displayAllocated} days</span>
                <span className="stat-subtext-muted">
                  Total allocated allowance
                </span>
              </div>
              <div className="stat-corner-chart amber">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>

            {/* Card 2: Used */}
            <div className="stat-card card-blue">
              <div className="stat-icon total">
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Used</span>
                <span className="stat-value">{displayUsed} days</span>
                <span className="stat-subtext-muted">
                  {usedPct}% utilized so far
                </span>
              </div>
              <div className="stat-corner-chart blue">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>

            {/* Card 3: Pending Requests */}
            <div className="stat-card card-amber">
              <div className="stat-icon open">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Pending Requests</span>
                <span className="stat-value">{displayPending}</span>
                <span className="stat-subtext-muted">
                  {displayPending === 0
                    ? "All requests processed"
                    : "Awaiting manager approval"}
                </span>
              </div>
              <div className="stat-corner-chart amber">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>

            {/* Card 4: Available Balance */}
            <div className="stat-card card-green">
              <div className="stat-icon resolved">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Available Balance</span>
                <span className="stat-value">{displayAvailable} days</span>
                <span className="stat-subtext-muted">
                  {availPct}% balance remaining
                </span>
              </div>
              <div className="stat-corner-chart green">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Controls Row: Search Input + 3 Dropdowns (Outside Container, matching Image 2) */}
          <div className="leave-controls-row">
            <div className="leave-search-wrapper">
              <span className="leave-search-icon">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Search by request code or reason..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="leave-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="leave-filters-group">
              {/* Show Dropdown */}
              <CustomSelect
                value={pageSize}
                onChange={handlePageSizeChange}
                options={pageSizeOptions}
                minWidth="110px"
              />

              {/* Status Dropdown */}
              <CustomSelect
                options={statusFilterOptions}
                value={statusFilter}
                onChange={handleStatusFilterChange}
                placeholder="All Statuses"
                minWidth="135px"
                isClearable={true}
              />

              {/* Leave Type Dropdown */}
              <CustomSelect
                options={leaveTypeFilterOptions}
                value={leaveTypeFilter}
                onChange={handleLeaveTypeFilterChange}
                placeholder="All Leave Types"
                minWidth="160px"
                isClearable={true}
              />
            </div>
          </div>

          {/* Main White Table Container Box */}
          <div className="leave-content-box">

            {filteredRequests.length === 0 ? (
              <div className="leave-empty-showcase">
                <div className="leave-empty-art">
                  <svg
                    width="84"
                    height="84"
                    viewBox="0 0 84 84"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Radiance sparkle rays */}
                    <line
                      x1="56"
                      y1="12"
                      x2="60"
                      y2="6"
                      stroke="#ea580c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="62"
                      y1="18"
                      x2="68"
                      y2="15"
                      stroke="#ea580c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="60"
                      y1="24"
                      x2="65"
                      y2="28"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Calendar desk pad */}
                    <rect
                      x="18"
                      y="22"
                      width="34"
                      height="42"
                      rx="4"
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 26C18 23.7909 19.7909 22 22 22H48C50.2091 22 52 23.7909 52 26V32H18V26Z"
                      fill="#ea580c"
                      stroke="#1e293b"
                      strokeWidth="2"
                    />
                    {/* Binding rings */}
                    <line
                      x1="26"
                      y1="18"
                      x2="26"
                      y2="24"
                      stroke="#1e293b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="44"
                      y1="18"
                      x2="44"
                      y2="24"
                      stroke="#1e293b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Calendar dot matrix */}
                    <circle cx="25" cy="38" r="1.5" fill="#94a3b8" />
                    <circle cx="33" cy="38" r="1.5" fill="#94a3b8" />
                    <circle cx="41" cy="38" r="1.5" fill="#94a3b8" />
                    <circle cx="25" cy="45" r="1.5" fill="#94a3b8" />
                    <circle cx="33" cy="45" r="1.5" fill="#94a3b8" />
                    <circle cx="41" cy="45" r="1.5" fill="#94a3b8" />
                    <circle cx="25" cy="52" r="1.5" fill="#94a3b8" />
                    <circle cx="33" cy="52" r="1.5" fill="#94a3b8" />
                    <circle cx="41" cy="52" r="1.5" fill="#94a3b8" />

                    {/* Checklist sheet overlapping */}
                    <rect
                      x="42"
                      y="34"
                      width="24"
                      height="30"
                      rx="3"
                      fill="#ffffff"
                      stroke="#1e293b"
                      strokeWidth="2"
                    />
                    <line
                      x1="47"
                      y1="41"
                      x2="61"
                      y2="41"
                      stroke="#1e293b"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="47"
                      y1="48"
                      x2="61"
                      y2="48"
                      stroke="#1e293b"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="47"
                      y1="55"
                      x2="57"
                      y2="55"
                      stroke="#1e293b"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3 className="leave-empty-title">No leave requests yet</h3>
                <p className="leave-empty-sub">
                  Your leave applications will appear here once submitted.
                </p>
                {!isGeneralAdmin && (
                  <button
                    type="button"
                    className="leave-empty-apply-btn"
                    onClick={handleOpenApplyModal}
                  >
                    <Plus size={16} />
                    <span>Apply for Leave</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="leave-table-responsive">
                  <table className="leave-data-table">
                    <thead>
                      <tr>
                        <th className="th-idx">#</th>
                        <th className="th-code">REQUEST CODE</th>
                        <th className="th-type">LEAVE TYPE</th>
                        <th className="th-dates">DATE RANGE</th>
                        <th className="th-days">WORKING DAYS</th>
                        <th className="th-reason">REASON</th>
                        <th className="th-status">STATUS</th>
                        <th className="th-applied">APPLIED ON</th>
                        <th className="th-actions">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.map((req, idx) => {
                        const actualIndex = (currentPage - 1) * pageSize + idx + 1;
                        const statusClass = req.status.toLowerCase();
                        return (
                          <tr key={req.id}>
                            <td className="td-idx">{actualIndex}</td>
                            <td className="td-code">
                              <span className="leave-req-code">
                                {req.request_code}
                              </span>
                            </td>
                            <td className="td-type">
                              <span
                                className="leave-type-pill"
                                style={{
                                  backgroundColor: `${req.leave_type_color}15`,
                                  color: req.leave_type_color || "#2563eb",
                                  borderColor: `${req.leave_type_color}40`,
                                }}
                              >
                                <span
                                  className="pill-dot"
                                  style={{
                                    backgroundColor:
                                      req.leave_type_color || "#2563eb",
                                  }}
                                />
                                {req.leave_type_name}
                              </span>
                            </td>
                            <td className="td-dates">
                              <div className="leave-date-span">
                                <span className="date-main">
                                  {formatDateDisplay(req.start_date)}
                                </span>
                                <span className="date-arrow">→</span>
                                <span className="date-main">
                                  {formatDateDisplay(req.end_date)}
                                </span>
                              </div>
                            </td>
                            <td className="td-days">
                              <span className="leave-days-badge">
                                <strong>{req.total_days}</strong> Day
                                {parseFloat(req.total_days) > 1 ? "s" : ""}
                              </span>
                            </td>
                            <td className="td-reason">
                              <span
                                className="leave-reason-text"
                                title={req.reason}
                              >
                                {req.reason}
                              </span>
                            </td>
                            <td className="td-status">
                              <span
                                className={`leave-status-badge ${statusClass}`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="td-applied">
                              <span className="leave-applied-date">
                                {formatDateDisplay(req.created_at)}
                              </span>
                            </td>
                            <td className="td-actions">
                              <div className="leave-table-row-actions">
                                <button
                                  type="button"
                                  className="leave-table-btn view"
                                  onClick={() =>
                                    setSelectedRequestForDetail(req)
                                  }
                                  title="View Details"
                                >
                                  View
                                </button>

                                {req.status === "Pending" && (
                                  <button
                                    type="button"
                                    className="leave-table-btn cancel"
                                    onClick={() => setCancelCandidate(req)}
                                    title="Cancel Leave Request"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="leave-table-footer">
                  <span className="leave-table-count-text">
                    Showing{" "}
                    {filteredRequests.length === 0
                      ? 0
                      : (currentPage - 1) * pageSize + 1}{" "}
                    to{" "}
                    {Math.min(currentPage * pageSize, filteredRequests.length)}{" "}
                    of {filteredRequests.length} leave
                    {filteredRequests.length !== 1 ? "s" : ""}
                  </span>

                  <div className="leave-pagination-controls">
                    <button
                      type="button"
                      className="pagination-button pagination-arrow"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage <= 1}
                      aria-label="First page"
                      title="First page"
                    >
                      «
                    </button>
                    <button
                      type="button"
                      className="pagination-button pagination-arrow"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                      title="Previous page"
                    >
                      ‹
                    </button>

                    {getPaginationPages(currentPage, totalPages).map(
                      (p, index) => {
                        if (p === "...") {
                          return (
                            <span
                              key={`dots-${index}`}
                              className="pagination-dots"
                            >
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={p}
                            type="button"
                            className={`pagination-number ${
                              currentPage === p ? "active" : ""
                            }`}
                            onClick={() => setCurrentPage(p)}
                            aria-label={`Page ${p}`}
                            aria-current={
                              currentPage === p ? "page" : undefined
                            }
                          >
                            {p}
                          </button>
                        );
                      },
                    )}

                    <button
                      type="button"
                      className="pagination-button pagination-arrow"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages, prev + 1),
                        )
                      }
                      disabled={currentPage >= totalPages}
                      aria-label="Next page"
                      title="Next page"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      className="pagination-button pagination-arrow"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      aria-label="Last page"
                      title="Last page"
                    >
                      »
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ======================================================================
          VIEW 2: TEAM LEAVE CALENDAR & AVAILABILITY MATRIX (Picture 1 Exact Replica)
          ====================================================================== */}
      {mainView === "team_calendar" && (
        <div className="team-cal-container">
          {/* 4 Summary Metric Cards Grid (Matching Picture 1 Exact Copy: Amber, Blue, Green, Rose + Corner Charts) */}
          <div className="inbox-stats-grid team-cal-metrics-grid">
            {/* Card 1: Employees On Leave (Amber) */}
            <div className="stat-card card-amber">
              <div className="stat-icon open">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">
                  {isGeneralAdmin ? "Employees On Leave" : "My Leaves This Month"}
                </span>
                <span className="stat-value">
                  {effectiveCalendarStats?.employeesOnLeaveCount || 0}
                </span>
                <span className="stat-subtext-muted">
                  {isGeneralAdmin ? "Active leaves in month" : "Leaves taken this month"}
                </span>
              </div>
              <div className="stat-corner-chart amber">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>

            {/* Card 2: Total Working Days Off (Blue) */}
            <div className="stat-card card-blue">
              <div className="stat-icon total">
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">
                  {isGeneralAdmin ? "Total Working Days Off" : "My Working Days Off"}
                </span>
                <span className="stat-value">
                  {effectiveCalendarStats?.totalDaysOff || 0} Days
                </span>
                <span className="stat-subtext-muted">
                  {isGeneralAdmin ? "Working days off taken" : "Personal days off taken"}
                </span>
              </div>
              <div className="stat-corner-chart blue">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>

            {/* Card 3: Company Holidays in Month (Green) */}
            <div className="stat-card card-green">
              <div className="stat-icon resolved">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Company Holidays in Month</span>
                <span className="stat-value">
                  {calendarData.stats?.holidayCount || 0} Holidays
                </span>
                <span className="stat-subtext-muted">
                  Official company holidays
                </span>
              </div>
              <div className="stat-corner-chart green">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>

            {/* Card 4: Total Days in Month (Rose) */}
            <div className="stat-card card-rose">
              <div
                className="stat-icon"
                style={{
                  background: "#fef2f2",
                  color: "#e11d48",
                  border: "1px solid #ffe4e6",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-label">Total Days in Month</span>
                <span className="stat-value">
                  {calendarData.daysInMonth ||
                    new Date(calYear, calMonth, 0).getDate()}
                </span>
                <span className="stat-subtext-muted">Calendar days span</span>
              </div>
              <div className="stat-corner-chart rose">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="16"
                    width="3.5"
                    height="6"
                    rx="1"
                    opacity="0.6"
                  />
                  <rect
                    x="7.5"
                    y="11"
                    width="3.5"
                    height="11"
                    rx="1"
                    opacity="0.75"
                  />
                  <rect
                    x="13"
                    y="6"
                    width="3.5"
                    height="16"
                    rx="1"
                    opacity="0.9"
                  />
                  <rect
                    x="18.5"
                    y="2"
                    width="3.5"
                    height="20"
                    rx="1"
                    opacity="1"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Main White Calendar Card */}
          <div className="team-cal-main-card">
            {/* Calendar Toolbar */}
            <div className="team-cal-toolbar">
              <div className="team-cal-nav-group">
                <button
                  type="button"
                  className="team-cal-nav-btn"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="team-cal-today-btn"
                  onClick={handleTodayJump}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="team-cal-nav-btn"
                  onClick={handleNextMonth}
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>

                <div className="team-cal-month-title-wrap">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="team-cal-current-label">
                    {MONTH_NAMES[calMonth - 1]} {calYear}
                  </span>
                </div>
              </div>

              <div className="team-cal-controls-right">
                {/* Search by employee */}
                <div className="team-cal-search-wrap">
                  <Search size={15} className="team-cal-search-icon" />
                  <input
                    type="text"
                    placeholder="Filter by employee name..."
                    value={calSearch}
                    onChange={(e) => setCalSearch(e.target.value)}
                    className="team-cal-search-input"
                  />
                </div>

                {/* Leave Type Filter - CustomSelect matching whole website theme */}
                <CustomSelect
                  value={calLeaveTypeFilter}
                  onChange={(e, val) => {
                    const nextVal = val || e?.target?.value || "All";
                    setCalLeaveTypeFilter(nextVal);
                  }}
                  onClear={() => setCalLeaveTypeFilter("All")}
                  options={calCategoryOptions}
                  placeholder="All Categories"
                  className="team-cal-category-custom-select"
                  isClearable={true}
                  searchable={false}
                />

                {/* View Switcher: Grid vs Timeline Matrix */}
                <div className="team-cal-view-toggle">
                  <button
                    type="button"
                    className={`team-cal-view-btn ${calViewMode === "grid" ? "active" : ""}`}
                    onClick={() => setCalViewMode("grid")}
                  >
                    <Grid size={15} />
                    <span>Month Grid</span>
                  </button>
                  <button
                    type="button"
                    className={`team-cal-view-btn ${calViewMode === "matrix" ? "active" : ""}`}
                    onClick={() => setCalViewMode("matrix")}
                  >
                    <List size={15} />
                    <span>Timeline Matrix</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MODE 1: 7-Column Monthly Calendar Grid */}
            {calViewMode === "grid" ? (
              <div className="team-cal-grid-container">
                <div className="team-cal-grid-header">
                  {WEEKDAY_NAMES.map((w, idx) => (
                    <div
                      key={w}
                      className={`team-cal-weekday-title ${idx >= 5 ? "weekend" : ""}`}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                <div className="team-cal-grid-body">
                  {calendarGridDays.map((cell) => {
                    if (cell.isOtherMonth) {
                      return (
                        <div
                          key={cell.key}
                          className="team-cal-day-cell other-month"
                        />
                      );
                    }

                    return (
                      <div
                        key={cell.key}
                        className={`team-cal-day-cell ${cell.isWeekend ? "weekend" : ""} ${cell.isToday ? "is-today" : ""} ${cell.holidays?.length > 0 ? "has-holiday" : ""}`}
                      >
                        <div className="cal-day-number-row">
                          <span className="cal-day-number">
                            {cell.dayNumber}
                          </span>
                          {cell.isToday && (
                            <span className="cal-today-tag">Today</span>
                          )}
                        </div>

                        {/* Holiday Badge (Matching Picture 1) */}
                        {cell.holidays?.map((h) => (
                          <div
                            key={h.id}
                            className="cal-holiday-tag"
                            title={h.description || h.name}
                          >
                            <Sparkles size={11} color="#9333ea" />
                            <span>{h.name}</span>
                          </div>
                        ))}

                        {/* Leave Range Bars (Image 1 Range Pattern) */}
                        {(() => {
                          const sortedLeaves = [...(cell.leaves || [])].sort((a, b) => {
                            if (a.employee_id !== b.employee_id) {
                              return (a.employee_id || 0) - (b.employee_id || 0);
                            }
                            return (a.id || 0) - (b.id || 0);
                          });

                          return sortedLeaves.map((l) => {
                            const sDate =
                              String(l.start_date || "")
                                .trim()
                                .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
                            const eDate =
                              String(l.end_date || "")
                                .trim()
                                .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
                            const cDate = cell.dateStr;

                            const isSingleDay = sDate === eDate;
                            const isStart = cDate === sDate;
                            const isEnd = cDate === eDate;
                            const isMiddle = cDate > sDate && cDate < eDate;
                            const isRowStart = cell.dayOfWeek === 0; // Monday
                            const isRowEnd = cell.dayOfWeek === 6; // Sunday

                            let rangeClass = "is-single";
                            if (isSingleDay) {
                              rangeClass = "is-single";
                            } else if (isStart) {
                              rangeClass = "is-range-start";
                              if (isRowEnd) rangeClass += " is-row-end";
                            } else if (isEnd) {
                              rangeClass = "is-range-end";
                              if (isRowStart) rangeClass += " is-row-start";
                            } else if (isMiddle) {
                              rangeClass = "is-range-middle";
                              if (isRowStart) rangeClass += " is-row-start";
                              if (isRowEnd) rangeClass += " is-row-end";
                            }

                            const initials = l.employee_name
                              ? l.employee_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              : "EM";

                            const typeCode =
                              l.leave_type_code ||
                              (l.leave_type_name?.includes("(")
                                ? l.leave_type_name.match(/\(([^)]+)\)/)?.[1]
                                : l.leave_type_name?.slice(0, 2).toUpperCase()) ||
                              "LV";

                            const leaveColor = l.leave_type_color || "#2563eb";

                            return (
                              <div
                                key={`${l.id}-${cell.dayNumber}`}
                                className={`cal-leave-range-bar ${rangeClass}`}
                                style={{
                                  backgroundColor: leaveColor,
                                }}
                                title={`${l.employee_name} (${l.leave_type_name}): ${formatDateDisplay(l.start_date)} - ${formatDateDisplay(l.end_date)} (${l.total_days} days)`}
                                onClick={() => setSelectedRequestForDetail(l)}
                              >
                                {(isStart || isSingleDay || (isMiddle && isRowStart) || (isEnd && isRowStart)) && (
                                  <span className="cal-leave-pill-avatar">
                                    {initials}
                                  </span>
                                )}

                                <span className="cal-leave-pill-name">
                                  {l.employee_name}
                                </span>

                                {(isStart || isSingleDay) && (
                                  <span className="cal-leave-pill-type-code">
                                    {typeCode}
                                  </span>
                                )}

                                {isMiddle && !isRowEnd && (
                                  <span className="cal-leave-range-connector-arrow">
                                    →
                                  </span>
                                )}

                                {isEnd && !isSingleDay && (
                                  <span
                                    className="cal-leave-range-end-accent"
                                    title={`Ends on ${formatDateDisplay(l.end_date)}`}
                                  >
                                    <span className="cal-leave-range-end-ring" />
                                  </span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* MODE 2: Timeline Matrix View */
              <div className="timeline-matrix-card">
                {matrixEmployees.length === 0 ? (
                  <div className="leave-empty-state">
                    <Calendar size={32} />
                    <h3>No Team Leaves Scheduled</h3>
                    <p>
                      No approved leaves found for {MONTH_NAMES[calMonth - 1]}{" "}
                      {calYear}.
                    </p>
                  </div>
                ) : (
                  <table className="timeline-matrix-table">
                    <thead>
                      <tr>
                        <th className="emp-col-header">Employee</th>
                        {Array.from({
                          length: calendarData.daysInMonth || 30,
                        }).map((_, i) => {
                          const d = i + 1;
                          const dateObj = new Date(
                            Date.UTC(calYear, calMonth - 1, d),
                          );
                          const isWeekend = (dateObj.getUTCDay() + 6) % 7 >= 5;
                          return (
                            <th
                              key={d}
                              className={isWeekend ? "weekend-header" : ""}
                            >
                              {d}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td className="emp-col-cell">
                            <span className="font-semibold text-primary">
                              {emp.name}
                            </span>
                          </td>
                          {Array.from({
                            length: calendarData.daysInMonth || 30,
                          }).map((_, i) => {
                            const d = i + 1;
                            const monthStr = String(calMonth).padStart(2, "0");
                            const dayStr = String(d).padStart(2, "0");
                            const dateStr = `${calYear}-${monthStr}-${dayStr}`;

                            const match = effectiveCalendarLeaves.find(
                              (l) => {
                                if (l.employee_id !== emp.id) return false;
                                const s = String(l.start_date).trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
                                const e = String(l.end_date).trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
                                return dateStr >= s && dateStr <= e;
                              },
                            );

                            return (
                              <td key={d}>
                                {match && (() => {
                                  const s = String(match.start_date || "").trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
                                  const e = String(match.end_date || "").trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || "";
                                  const isSingle = s === e;
                                  const isStart = dateStr === s;
                                  const isEnd = dateStr === e;
                                  const tRangeClass = isSingle ? "is-single" : isStart ? "is-range-start" : isEnd ? "is-range-end" : "is-range-middle";

                                  return (
                                    <div
                                      className={`timeline-leave-block ${tRangeClass}`}
                                      style={{
                                        backgroundColor:
                                          match.leave_type_color || "#2563eb",
                                      }}
                                      title={`${match.employee_name || emp.name} (${match.leave_type_name}): ${match.reason || ""}`}
                                      onClick={() =>
                                        setSelectedRequestForDetail(match)
                                      }
                                    >
                                      {match.leave_type_code}
                                    </div>
                                  );
                                })()}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Color Legend Strip (Matching Picture 1) */}
            <div className="team-cal-legend-strip">
              <span className="cal-legend-title">Legend:</span>
              <div className="cal-legend-item">
                <span
                  className="cal-legend-color-box"
                  style={{ backgroundColor: "#2563eb" }}
                />
                <span>Paid Leave (PL)</span>
              </div>
              <div className="cal-legend-item">
                <span
                  className="cal-legend-color-box"
                  style={{ backgroundColor: "#dc2626" }}
                />
                <span>Sick Leave (SL)</span>
              </div>
              <div className="cal-legend-item">
                <span
                  className="cal-legend-color-box"
                  style={{ backgroundColor: "#ea580c" }}
                />
                <span>Casual Leave (CL)</span>
              </div>
              <div className="cal-legend-item">
                <span
                  className="cal-legend-color-box"
                  style={{ backgroundColor: "#475569" }}
                />
                <span>Leave Without Pay (LWP)</span>
              </div>
              <div className="cal-legend-item">
                <span
                  className="cal-legend-color-box"
                  style={{ backgroundColor: "#c084fc" }}
                />
                <span>Company Holiday</span>
              </div>
              <div className="cal-legend-item">
                <span
                  className="cal-legend-color-box"
                  style={{ backgroundColor: "#e2e8f0" }}
                />
                <span>Weekend</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          VIEW 3: AUDIT LEDGER & TRANSACTIONS (STEP 4)
          ====================================================================== */}
      {mainView === "audit_ledger" && (
        <div className="leave-table-card">
          <div className="leave-table-header">
            <div className="leave-table-tabs">
              {[
                "All",
                "DEBIT",
                "CREDIT_REVERSAL",
                "ALLOCATION",
                "ADJUSTMENT",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`leave-tab-btn ${txTypeFilter === tab ? "active" : ""}`}
                  onClick={() => setTxTypeFilter(tab)}
                >
                  <span>
                    {tab === "CREDIT_REVERSAL"
                      ? "Reversals"
                      : tab === "ALLOCATION"
                        ? "Allocations"
                        : tab}
                  </span>
                </button>
              ))}
            </div>

            <div className="leave-table-actions">
              {/* Search */}
              <div className="leave-search-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search ledger notes, employee..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="leave-search-input"
                />
              </div>

              {/* General Admin Manual Adjustment Button (Only General Admin can manually adjust) */}
              {isGeneralAdmin && (
                <button
                  type="button"
                  className="btn-manual-adjust"
                  onClick={handleOpenAdjustModal}
                  title="Manually adjust employee leave quota"
                >
                  <SlidersHorizontal size={15} />
                  <span>Adjust Balance</span>
                </button>
              )}
            </div>
          </div>

          {/* Ledger Table */}
          {effectiveTransactions.length === 0 ? (
            <div className="leave-empty-state">
              <History size={36} />
              <h3>No Transactions Recorded</h3>
              <p>No audit transactions match the selected filters.</p>
            </div>
          ) : (
            <div className="leave-table-responsive">
              <table className="leave-data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Employee</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Balance Impact</th>
                    <th>Request Ref</th>
                    <th>Performed By & Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveTransactions.map((tx) => {
                    const isDebit = tx.transaction_type === "DEBIT";
                    const isReversal =
                      tx.transaction_type === "CREDIT_REVERSAL";
                    const isAlloc = tx.transaction_type === "ALLOCATION";
                    const typeClass = tx.transaction_type.toLowerCase();

                    return (
                      <tr key={tx.id}>
                        <td>
                          <span className="leave-applied-date">
                            {new Date(tx.created_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td>
                          <span className="font-semibold text-primary">
                            {tx.employee_name || tx.employee_id}
                          </span>
                        </td>
                        <td>
                          <span
                            className="leave-type-pill"
                            style={{
                              backgroundColor: `${tx.leave_type_color}15`,
                              color: tx.leave_type_color || "#2563eb",
                            }}
                          >
                            {tx.leave_type_name}
                          </span>
                        </td>
                        <td>
                          <span className={`ledger-type-badge ${typeClass}`}>
                            {isDebit && <TrendingDown size={12} />}
                            {(isReversal || isAlloc) && (
                              <TrendingUp size={12} />
                            )}
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`ledger-days-val ${isDebit ? "negative" : "positive"}`}
                          >
                            {isDebit ? `-${tx.days}` : `+${tx.days}`} Day(s)
                          </span>
                        </td>
                        <td>
                          <div className="ledger-balance-progression">
                            <span>{tx.balance_before}</span>
                            <ArrowRight
                              size={12}
                              className="progression-arrow"
                            />
                            <strong>{tx.balance_after}</strong>
                          </div>
                        </td>
                        <td>
                          {tx.request_code ? (
                            <span className="leave-req-code">
                              {tx.request_code}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className="leave-reason-text" title={tx.notes}>
                            {tx.notes}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
          VIEW 4: ADMIN PENDING LEAVE REQUESTS & APPROVALS (STEP 3)
          ====================================================================== */}
      {isAdmin && mainView === "admin_approvals" && (
        <div className="leave-admin-view-wrapper">
          {/* Admin Stats Grid (Matching Picture 1 Exact UI & Design) */}
          <div className="leave-admin-stats-grid">
            <div
              className="leave-admin-stat-card pending-card"
              onClick={() => setAdminStatusTab("Pending")}
            >
              <div className="admin-stat-wave-bg">
                <svg viewBox="0 0 120 50" fill="none" preserveAspectRatio="none">
                  <path
                    d="M0,50 C40,42 70,12 120,22 L120,50 Z"
                    fill="#fed7aa"
                    fillOpacity="0.5"
                  />
                </svg>
              </div>
              <div className="admin-stat-top-row">
                <div className="admin-stat-badge pending">
                  <Clock size={18} color="#ea580c" />
                </div>
                <span className="admin-stat-title">Pending Approvals</span>
              </div>
              <div className="admin-stat-value">
                {adminStats?.pendingCount || 0}
              </div>
              <div className="admin-stat-sub">
                Requires admin decision
              </div>
            </div>

            <div
              className="leave-admin-stat-card approved-card"
              onClick={() => setAdminStatusTab("Approved")}
            >
              <div className="admin-stat-wave-bg">
                <svg viewBox="0 0 120 50" fill="none" preserveAspectRatio="none">
                  <path
                    d="M0,50 C40,42 70,12 120,22 L120,50 Z"
                    fill="#bbf7d0"
                    fillOpacity="0.5"
                  />
                </svg>
              </div>
              <div className="admin-stat-top-row">
                <div className="admin-stat-badge approved">
                  <CheckCircle2 size={18} color="#16a34a" />
                </div>
                <span className="admin-stat-title">Approved This Month</span>
              </div>
              <div className="admin-stat-value">
                {adminStats?.approvedThisMonth || 0}
              </div>
              <div className="admin-stat-sub">
                Leaves authorized
              </div>
            </div>

            <div
              className="leave-admin-stat-card rejected-card"
              onClick={() => setAdminStatusTab("Rejected")}
            >
              <div className="admin-stat-wave-bg">
                <svg viewBox="0 0 120 50" fill="none" preserveAspectRatio="none">
                  <path
                    d="M0,50 C40,42 70,12 120,22 L120,50 Z"
                    fill="#fecaca"
                    fillOpacity="0.5"
                  />
                </svg>
              </div>
              <div className="admin-stat-top-row">
                <div className="admin-stat-badge rejected">
                  <XCircle size={18} color="#dc2626" />
                </div>
                <span className="admin-stat-title">Rejected This Month</span>
              </div>
              <div className="admin-stat-value">
                {adminStats?.rejectedThisMonth || 0}
              </div>
              <div className="admin-stat-sub">
                Declined applications
              </div>
            </div>

            <div
              className="leave-admin-stat-card today-card"
              title={
                adminStats?.onLeaveTodayEmployees?.length > 0
                  ? adminStats.onLeaveTodayEmployees
                      .map((e) => `${e.employee_name} (${e.leave_type_name})`)
                      .join("\n")
                  : "No employees on leave today"
              }
            >
              <div className="admin-stat-wave-bg">
                <svg viewBox="0 0 120 50" fill="none" preserveAspectRatio="none">
                  <path
                    d="M0,50 C40,42 70,12 120,22 L120,50 Z"
                    fill="#bfdbfe"
                    fillOpacity="0.5"
                  />
                </svg>
              </div>
              <div className="admin-stat-top-row">
                <div className="admin-stat-badge today">
                  <Users size={18} color="#0284c7" />
                </div>
                <span className="admin-stat-title">On Leave Today</span>
              </div>
              <div className="admin-stat-value">
                {adminStats?.onLeaveTodayCount || 0}
              </div>
              <div className="admin-stat-sub">
                {adminStats?.onLeaveTodayCount > 0
                  ? `${adminStats.onLeaveTodayCount} employee(s) off`
                  : "Full team available"}
              </div>
            </div>
          </div>

          {/* Admin Table Card */}
          <div className="leave-table-card">
            <div className="leave-table-header">
              <div className="leave-table-tabs">
                {["Pending", "Approved", "Rejected", "All"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`leave-tab-btn ${adminStatusTab === tab ? "active" : ""}`}
                    onClick={() => setAdminStatusTab(tab)}
                  >
                    <span>{tab === "Pending" ? "Pending Requests" : tab}</span>
                    {tab === "Pending" && (
                      <span className="leave-tab-count pending-count-pill">
                        {adminStats?.pendingCount || 0}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="leave-table-actions">
                <div className="leave-search-wrap">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by employee, email, or request code..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="leave-search-input"
                  />
                  {adminSearch && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setAdminSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <CustomSelect
                  value={adminLeaveTypeFilter}
                  onChange={(e, val) => {
                    const v = val !== undefined ? val : e?.target?.value || "All";
                    setAdminLeaveTypeFilter(v);
                  }}
                  options={[
                    { value: "All", label: "All Leave Types" },
                    ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name })),
                  ]}
                  minWidth="160px"
                  showClear={false}
                />
              </div>
            </div>

            {adminRequests.length === 0 ? (
              <div className="leave-empty-state admin-empty-state-card">
                <div className="admin-empty-illustration">
                  <svg
                    width="150"
                    height="100"
                    viewBox="0 0 150 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Soft cloud shape behind */}
                    <path
                      d="M40 60C33 60 27 54 27 48C27 42 31 37 37 36C39 27 48 20 58 20C67 20 75 25 78 33C81 31 85 30 89 30C97 30 104 36 104 44C109 45 113 49 113 54C113 59 108 64 102 64L40 64C40 64 40 60 40 60Z"
                      fill="#f1f5f9"
                      opacity="0.85"
                    />

                    {/* Sparkle lines on top right */}
                    <line
                      x1="98"
                      y1="22"
                      x2="105"
                      y2="16"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="108"
                      y1="27"
                      x2="117"
                      y2="25"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="104"
                      y1="34"
                      x2="111"
                      y2="38"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Calendar Drop Shadow */}
                    <rect
                      x="48"
                      y="26"
                      width="54"
                      height="48"
                      rx="7"
                      fill="#0f172a"
                      fillOpacity="0.04"
                      transform="translate(0, 2)"
                    />

                    {/* Calendar Body */}
                    <rect
                      x="48"
                      y="26"
                      width="54"
                      height="48"
                      rx="7"
                      fill="#ffffff"
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                    />

                    {/* Calendar Top Orange Header */}
                    <path
                      d="M48 33C48 29.134 51.134 26 55 26H95C98.866 26 102 29.134 102 33V37H48V33Z"
                      fill="#ea580c"
                    />

                    {/* Binder Pegs */}
                    <rect
                      x="57"
                      y="23"
                      width="3"
                      height="6"
                      rx="1.5"
                      fill="#475569"
                    />
                    <rect
                      x="90"
                      y="23"
                      width="3"
                      height="6"
                      rx="1.5"
                      fill="#475569"
                    />

                    {/* Calendar Grid Dots / squares */}
                    <rect x="54" y="43" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="63.5" y="43" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="73" y="43" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="82.5" y="43" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />

                    <rect x="54" y="51" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="63.5" y="51" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="73" y="51" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="82.5" y="51" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />

                    <rect x="54" y="59" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="63.5" y="59" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />
                    <rect x="73" y="59" width="5.5" height="4.5" rx="1" fill="#e2e8f0" />

                    {/* Checkmark Circle badge on bottom right */}
                    <circle
                      cx="94"
                      cy="66"
                      r="11"
                      fill="#ffffff"
                      stroke="#ea580c"
                      strokeWidth="2"
                    />
                    <path
                      d="M90 66L93 69L98 63"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>No Leave Requests Found</h3>
                <p>
                  {adminStatusTab === "Pending"
                    ? "Great news! There are currently no pending employee leave requests requiring your review."
                    : "No requests matched the selected filters."}
                </p>
                {!isGeneralAdmin && (
                  <button
                    type="button"
                    className="admin-empty-apply-btn"
                    onClick={handleOpenApplyModal}
                  >
                    <Plus size={16} />
                    <span>Apply for Leave</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="leave-table-responsive">
                <table className="leave-data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Request Code</th>
                      <th>Leave Type</th>
                      <th>Requested Dates</th>
                      <th>Duration</th>
                      <th>Balance Available</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminRequests.map((req) => {
                      const statusClass = req.status.toLowerCase();
                      const initials = req.employee_name
                        ? req.employee_name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "EM";

                      return (
                        <tr key={req.id}>
                          <td>
                            <div className="leave-admin-emp-info">
                              <div className="emp-avatar-circle">
                                {initials}
                              </div>
                              <div className="emp-details">
                                <span className="emp-name-text">
                                  {req.employee_name}
                                </span>
                                <span className="emp-email-sub">
                                  {req.employee_email}
                                </span>
                                <span
                                  className={`emp-role-tag ${req.employee_role || "employee"}`}
                                >
                                  {req.employee_role || "employee"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="leave-req-code">
                              {req.request_code}
                            </span>
                          </td>

                          <td>
                            <span
                              className="leave-type-pill"
                              style={{
                                backgroundColor: `${req.leave_type_color}15`,
                                color: req.leave_type_color || "#2563eb",
                                borderColor: `${req.leave_type_color}40`,
                              }}
                            >
                              <span
                                className="pill-dot"
                                style={{
                                  backgroundColor:
                                    req.leave_type_color || "#2563eb",
                                }}
                              />
                              {req.leave_type_name}
                            </span>
                          </td>

                          <td>
                            <div className="leave-date-span">
                              <span className="date-main">
                                {formatDateDisplay(req.start_date)}
                              </span>
                              <span className="date-arrow">→</span>
                              <span className="date-main">
                                {formatDateDisplay(req.end_date)}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="leave-days-badge">
                              <strong>{req.total_days}</strong> Day
                              {parseFloat(req.total_days) > 1 ? "s" : ""}
                            </span>
                          </td>

                          <td>
                            <span className="emp-bal-context-pill">
                              <strong>{req.emp_available_days}</strong> Days
                              Left
                            </span>
                          </td>

                          <td>
                            <span
                              className="leave-reason-text"
                              title={req.reason}
                            >
                              {req.reason}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`leave-status-badge ${statusClass}`}
                            >
                              {req.status}
                            </span>
                          </td>

                          <td>
                            <div className="admin-action-btn-group">
                              {req.status === "Pending" ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn-approve-sm"
                                    onClick={() =>
                                      handleOpenDecision(req, "Approved")
                                    }
                                    title="Approve this leave request"
                                  >
                                    <Check size={14} />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-reject-sm"
                                    onClick={() =>
                                      handleOpenDecision(req, "Rejected")
                                    }
                                    title="Reject this leave request"
                                  >
                                    <X size={14} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              ) : null}

                              <button
                                type="button"
                                className="btn-details-sm"
                                onClick={() => setSelectedRequestForDetail(req)}
                                title="View full request details"
                              >
                                <Eye size={14} />
                                <span>Details</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 1: APPLY FOR LEAVE (2-COLUMN DESIGN MATCHING IMAGE 1)
          ====================================================================== */}
      {showApplyModal && (
        <div className="leave-modal-overlay" onClick={handleCloseApplyModal}>
          <div className="apply-leave-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* LEFT COLUMN: HERO ILLUSTRATION & STEPS */}
            <div className="apply-modal-left-col">
              {/* Top 3D Calendar Illustration with checkmark & foliage */}
              <div className="apply-left-illustration">
                <svg
                  width="140"
                  height="125"
                  viewBox="0 0 140 125"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Ground shadow / warm glow */}
                  <ellipse
                    cx="68"
                    cy="114"
                    rx="52"
                    ry="6.5"
                    fill="#fdba74"
                    fillOpacity="0.4"
                  />

                  {/* Autumn leaves & botanical sprigs on the right */}
                  <g opacity="0.95">
                    <path
                      d="M98 78C110 70 120 54 116 38C110 48 104 58 98 78Z"
                      fill="#ea580c"
                    />
                    <path
                      d="M102 65C112 60 124 50 126 40C116 44 108 52 102 65Z"
                      fill="#f97316"
                    />
                    <path
                      d="M94 84C108 86 120 81 126 73C117 74 108 76 94 84Z"
                      fill="#ea580c"
                    />
                    <path
                      d="M90 82C101 74 113 60 115 42"
                      stroke="#c2410c"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Calendar Card Drop Shadow */}
                  <rect
                    x="20"
                    y="24"
                    width="78"
                    height="74"
                    rx="12"
                    fill="#0f172a"
                    fillOpacity="0.08"
                    transform="translate(2, 4)"
                  />

                  {/* Calendar Card Body */}
                  <rect
                    x="20"
                    y="24"
                    width="78"
                    height="74"
                    rx="12"
                    fill="#ffffff"
                    stroke="#cbd5e1"
                    strokeWidth="1.2"
                  />

                  {/* Top Orange Header Bar */}
                  <path
                    d="M20 34C20 28.4772 24.4772 24 30 24H88C93.5228 24 98 28.4772 98 34V42H20V34Z"
                    fill="#f97316"
                  />

                  {/* Spiral Binder Rings */}
                  <rect
                    x="30"
                    y="18"
                    width="5.5"
                    height="12"
                    rx="2.5"
                    fill="#1e293b"
                  />
                  <rect
                    x="46"
                    y="18"
                    width="5.5"
                    height="12"
                    rx="2.5"
                    fill="#1e293b"
                  />
                  <rect
                    x="66"
                    y="18"
                    width="5.5"
                    height="12"
                    rx="2.5"
                    fill="#1e293b"
                  />
                  <rect
                    x="82"
                    y="18"
                    width="5.5"
                    height="12"
                    rx="2.5"
                    fill="#1e293b"
                  />

                  {/* Calendar Grid Date Tiles */}
                  <rect
                    x="29"
                    y="50"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="44"
                    y="50"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="59"
                    y="50"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="74"
                    y="50"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />

                  <rect
                    x="29"
                    y="63"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="44"
                    y="63"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="59"
                    y="63"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="74"
                    y="63"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />

                  <rect
                    x="29"
                    y="76"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="44"
                    y="76"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />
                  <rect
                    x="59"
                    y="76"
                    width="10"
                    height="8"
                    rx="2"
                    fill="#e2e8f0"
                  />

                  {/* Checkmark Badge on Bottom Right */}
                  <circle
                    cx="88"
                    cy="80"
                    r="13"
                    fill="#ea580c"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M83.5 80L86.5 83L92.5 76.5"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="apply-left-title">Apply for Leave</h3>
              <p className="apply-left-desc">
                Submit your leave request for manager approval. Working days are
                calculated automatically.
              </p>

              {/* 4 Feature Steps */}
              <div className="apply-steps-list">
                <div className="apply-step-item">
                  <span className="apply-step-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <span className="apply-step-text">Choose leave type</span>
                </div>

                <div className="apply-step-item">
                  <span className="apply-step-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                    </svg>
                  </span>
                  <span className="apply-step-text">Select date range</span>
                </div>

                <div className="apply-step-item">
                  <span className="apply-step-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </span>
                  <span className="apply-step-text">Add a reason</span>
                </div>

                <div className="apply-step-item">
                  <span className="apply-step-icon">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </span>
                  <span className="apply-step-text">Submit for approval</span>
                </div>
              </div>

              {/* Bottom Decorative Waves */}
              <div className="apply-left-waves-wrap">
                <svg
                  viewBox="0 0 340 80"
                  fill="none"
                  preserveAspectRatio="none"
                  style={{ width: "100%", height: "80px", display: "block" }}
                >
                  <path
                    d="M0 45C60 25 130 65 210 40C260 25 300 50 340 35V80H0V45Z"
                    fill="#fed7aa"
                    fillOpacity="0.5"
                  />
                  <path
                    d="M0 60C70 45 160 75 240 50C280 38 310 60 340 52V80H0V60Z"
                    fill="#ffedd5"
                    fillOpacity="0.85"
                  />
                </svg>
              </div>
            </div>

            {/* RIGHT COLUMN: APPLICATION FORM */}
            <div className="apply-modal-right-col">
              {/* Close Button */}
              <button
                type="button"
                className="apply-close-btn"
                onClick={handleCloseApplyModal}
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="apply-form-header">
                <h3 className="apply-form-title">Leave Application</h3>
                <p className="apply-form-subtitle">
                  Fill in the details below to apply for leave.
                </p>
              </div>

              <form onSubmit={handleApplySubmit} className="apply-form-body">
                {calcError && (
                  <div
                    className="leave-form-error-banner"
                    style={{ marginBottom: "10px" }}
                  >
                    <AlertCircle size={15} />
                    <span>{calcError}</span>
                  </div>
                )}

                {/* ROW 1: LEAVE CATEGORY + REMAINING BALANCE */}
                <div className="apply-cat-bal-row">
                  <div className="apply-category-box">
                    <label className="apply-field-label">
                      Leave Category <span className="apply-req-star">*</span>
                    </label>
                    <CustomSelect
                      value={applyFormData.leaveTypeId}
                      onChange={(e, val) => {
                        const v = val !== undefined ? val : e?.target?.value;
                        setApplyFormData((prev) => ({
                          ...prev,
                          leaveTypeId: v,
                        }));
                      }}
                      options={applyLeaveTypeOptions}
                      placeholder="Choose leave type..."
                      className="apply-custom-select"
                      isClearable={true}
                      icon={
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#334155"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Remaining Balance Pill */}
                  <div className="apply-balance-pill">
                    <div className="apply-balance-icon-wrap">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ea580c"
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
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                      </svg>
                    </div>
                    <div className="apply-balance-content">
                      <span className="apply-balance-label">
                        Remaining Balance
                      </span>
                      <span className="apply-balance-number">
                        {currentSelectedBalance?.available_days ?? 0} day(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* ROW 2: FROM & TO DATES (SINGLE DAY OR MULTI-DAY AS PER IMAGES 2 & 3) */}
                {!isMoreThanOneDay ? (
                  <div className="apply-dates-single-row">
                    <div className="apply-date-field apply-from-field">
                      <label className="apply-field-label">
                        From <span className="apply-req-star">*</span>
                      </label>
                      <CustomDatePicker
                        value={applyFormData.startDate}
                        allowFutureYears={true}
                        min={todayDateStr}
                        placeholder="dd-mm-yyyy"
                        onChange={(e) => {
                          const val = e?.target?.value || "";
                          setApplyFormData((prev) => ({
                            ...prev,
                            startDate: val,
                            endDate: val,
                          }));
                        }}
                        disabled={applySubmitting}
                        className="apply-custom-datepicker"
                      />
                    </div>

                    <button
                      type="button"
                      className="apply-more-days-btn"
                      onClick={() => {
                        setIsMoreThanOneDay(true);
                        setApplyFormData((prev) => {
                          const start = prev.startDate || todayDateStr;
                          const nextDay = getNextDayStr(start);
                          return {
                            ...prev,
                            startDate: start,
                            endDate:
                              prev.endDate && prev.endDate >= nextDay
                                ? prev.endDate
                                : nextDay,
                          };
                        });
                      }}
                    >
                      MORE THAN ONE DAY?
                    </button>
                  </div>
                ) : (
                  <div className="apply-dates-multi-row">
                    <div className="apply-date-field">
                      <label className="apply-field-label">
                        From <span className="apply-req-star">*</span>
                      </label>
                      <CustomDatePicker
                        value={applyFormData.startDate}
                        allowFutureYears={true}
                        min={todayDateStr}
                        placeholder="dd-mm-yyyy"
                        onChange={(e) => {
                          const val = e?.target?.value || "";
                          const nextDay = val ? getNextDayStr(val) : getNextDayStr(todayDateStr);
                          setApplyFormData((prev) => ({
                            ...prev,
                            startDate: val,
                            endDate:
                              prev.endDate && prev.endDate >= nextDay
                                ? prev.endDate
                                : nextDay,
                          }));
                        }}
                        disabled={applySubmitting}
                        className="apply-custom-datepicker"
                      />
                    </div>

                    <div className="apply-date-field">
                      <label className="apply-field-label">
                        To
                      </label>
                      <div className="apply-to-input-row">
                        <div className="flex-1" style={{ minWidth: 0 }}>
                          <CustomDatePicker
                            value={applyFormData.endDate}
                            allowFutureYears={true}
                            min={minForToDate}
                            placeholder="dd-mm-yyyy"
                            onChange={(e) => {
                              const val = e?.target?.value || "";
                              setApplyFormData((prev) => ({
                                ...prev,
                                endDate: val,
                              }));
                            }}
                            disabled={applySubmitting}
                            className="apply-custom-datepicker"
                          />
                        </div>
                        <button
                          type="button"
                          className="apply-remove-range-btn"
                          onClick={() => {
                            setIsMoreThanOneDay(false);
                            setApplyFormData((prev) => ({
                              ...prev,
                              endDate: prev.startDate,
                            }));
                          }}
                          title="Single day leave"
                          aria-label="Remove end date"
                        >
                          <X size={15} color="#ef4444" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CALCULATION PREVIEW */}
                {calcLoading && (
                  <div className="calc-preview-card loading">
                    <RefreshCw size={13} className="spin-animation" />
                    <span>Calculating working days...</span>
                  </div>
                )}

                {calcPreview && !calcLoading && (
                  <div
                    className={`calc-preview-card ${isBalanceExceeded ? "exceeded" : "success"}`}
                  >
                    <div className="calc-preview-header">
                      <div className="calc-badge-row">
                        <span className="calc-badge">
                          <Check size={12} strokeWidth={3} />
                          <span>
                            {calcPreview.workingDays} Working Day
                            {calcPreview.workingDays !== 1 ? "s" : ""}
                          </span>
                        </span>
                        <span className="calc-sub-text">
                          Calendar span: {calcPreview.calendarDays}{" "}
                          {calcPreview.calendarDays === 1 ? "day" : "days"}
                        </span>
                      </div>
                    </div>

                    <div className="calc-breakdown">
                      Excludes: {calcPreview.breakdown?.weekendDays ?? 0} weekend
                      day(s), {calcPreview.breakdown?.companyHolidays ?? 0}{" "}
                      company holiday(s).
                    </div>

                    {isBalanceExceeded && (
                      <div className="calc-exceeded-warning">
                        <AlertCircle size={13} />
                        <span>
                          Requested ({calcPreview.workingDays} days) exceeds
                          available balance (
                          {currentSelectedBalance?.available_days || 0} days).
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ROW 3: REASON FOR LEAVE */}
                <div className="apply-reason-box">
                  <label className="apply-field-label">
                    Reason for Leave <span className="apply-req-star">*</span>
                  </label>
                  <textarea
                    name="reason"
                    rows={3}
                    maxLength={500}
                    value={applyFormData.reason}
                    onChange={handleFormChange}
                    placeholder="Provide a clear explanation for your time-off request..."
                    className="apply-textarea-native"
                    required
                  />
                  <div className="apply-char-counter">
                    {applyFormData.reason?.length || 0} / 500
                  </div>
                </div>

                {/* ROW 4: ACTION BUTTONS */}
                <div className="apply-modal-actions">
                  <button
                    type="button"
                    className="apply-btn-cancel"
                    onClick={handleCloseApplyModal}
                    disabled={applySubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="apply-btn-submit"
                    disabled={
                      applySubmitting ||
                      calcLoading ||
                      isBalanceExceeded ||
                      (calcPreview && calcPreview.workingDays === 0)
                    }
                  >
                    {applySubmitting ? (
                      <>
                        <RefreshCw size={14} className="spin-animation" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ transform: "rotate(-10deg)" }}
                        >
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 2: COMPANY HOLIDAYS (MATCHING PICTURE 1)
          ====================================================================== */}
      {showHolidaysModal && (
        <div className="leave-modal-overlay">
          <div className="holidays-modal-card">
            {/* Top-Right Decorative Peach Wave */}
            <div className="holidays-header-wave-shape">
              <svg viewBox="0 0 160 80" fill="none" preserveAspectRatio="none">
                <path
                  d="M0,0 C60,40 100,10 160,50 L160,0 Z"
                  fill="url(#holidaysWaveGrad)"
                  opacity="0.8"
                />
                <defs>
                  <linearGradient
                    id="holidaysWaveGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.75" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Header */}
            <div className="holidays-modal-header">
              <div className="holidays-header-left">
                <div className="holidays-header-icon-badge">
                  <Calendar size={22} color="#ea580c" />
                </div>
                <div className="holidays-header-titles">
                  <h3 className="holidays-modal-title">
                    Official Company Holidays ({selectedYear})
                  </h3>
                  <p className="holidays-modal-subtitle">
                    Public holidays and non-working days for planning your leaves.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="holidays-modal-close-btn"
                onClick={() => setShowHolidaysModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="holidays-modal-body">
              {/* 3-KPI Summary Strip */}
              <div className="holidays-summary-strip">
                <div className="holidays-summary-item">
                  <div className="holidays-summary-icon">
                    <Calendar size={18} color="#ea580c" />
                  </div>
                  <div className="holidays-summary-info">
                    <span className="holidays-summary-lbl">Total Holidays</span>
                    <span className="holidays-summary-val">
                      {holidaySummaryStats.total}
                    </span>
                  </div>
                </div>

                <div className="holidays-summary-divider" />

                <div className="holidays-summary-item">
                  <div className="holidays-summary-icon">
                    <Building2 size={18} color="#ea580c" />
                  </div>
                  <div className="holidays-summary-info">
                    <span className="holidays-summary-lbl">Company Holidays</span>
                    <span className="holidays-summary-val">
                      {holidaySummaryStats.company}
                    </span>
                  </div>
                </div>

                <div className="holidays-summary-divider" />

                <div className="holidays-summary-item">
                  <div className="holidays-summary-icon">
                    <PartyPopper size={18} color="#ea580c" />
                  </div>
                  <div className="holidays-summary-info">
                    <span className="holidays-summary-lbl">Public Holidays</span>
                    <span className="holidays-summary-val">
                      {holidaySummaryStats.public}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls Row: Search + Filter */}
              <div className="holidays-controls-row">
                <div className="holidays-search-wrap">
                  <Search size={15} className="holidays-search-icon" />
                  <input
                    type="text"
                    className="holidays-search-input"
                    placeholder="Search holiday by name..."
                    value={holidaySearch}
                    onChange={(e) => setHolidaySearch(e.target.value)}
                  />
                  {holidaySearch && (
                    <button
                      type="button"
                      className="holidays-search-clear"
                      onClick={() => setHolidaySearch("")}
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="holidays-filter-dropdown-wrap">
                  <CustomSelect
                    value={holidayTypeFilter}
                    onChange={(e, val) => {
                      const nextVal =
                        val !== undefined ? val : e?.target?.value || "all";
                      setHolidayTypeFilter(nextVal);
                    }}
                    options={holidayTypeOptions}
                    minWidth="160px"
                    showClear={false}
                  />
                </div>
              </div>

              {/* Holidays Cards List */}
              <div className="holidays-items-list">
                {filteredCompanyHolidays.length === 0 ? (
                  <div className="holidays-empty-state">
                    <Calendar size={28} color="#94a3b8" />
                    <p>No holidays found matching your search.</p>
                  </div>
                ) : (
                  filteredCompanyHolidays.map((hol) => {
                    const isCompany = isCompanyHoliday(hol);
                    const parts = parseHolidayDateParts(hol.holiday_date);
                    return (
                      <div
                        key={hol.id || `${hol.name}-${hol.holiday_date}`}
                        className="holiday-row-card"
                      >
                        <div className="holiday-row-left">
                          <div className="holiday-date-block">
                            <span className="holiday-date-day">{parts.day}</span>
                            <span className="holiday-date-month">
                              {parts.month}
                            </span>
                            <span className="holiday-date-year">{parts.year}</span>
                          </div>
                          <div className="holiday-row-divider" />
                          <div className="holiday-info-block">
                            <h4 className="holiday-name">{hol.name}</h4>
                            <p className="holiday-desc">{hol.description}</p>
                          </div>
                        </div>

                        <div className="holiday-row-right">
                          {isCompany ? (
                            <span className="holiday-type-badge company">
                              <Building2 size={13} />
                              <span>Company Holiday</span>
                            </span>
                          ) : (
                            <span className="holiday-type-badge public">
                              <Calendar size={13} />
                              <span>Public Holiday</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="holidays-modal-footer">
                <button
                  type="button"
                  className="holidays-btn-close"
                  onClick={() => setShowHolidaysModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 3: VIEW REQUEST DETAIL (MATCHING PICTURE 1)
          ====================================================================== */}
      {selectedRequestForDetail && (
        <div className="leave-modal-overlay">
          <div className="detail-modal-card">
            {/* Header with Icon, Title, Subtitle, Close */}
            <div className="detail-modal-header">
              <div className="detail-header-left">
                <div className="detail-header-icon-badge">
                  <Calendar size={22} color="#ea580c" />
                </div>
                <div className="detail-header-titles">
                  <h3 className="detail-modal-title">Leave Application Details</h3>
                  <p className="detail-modal-subtitle">
                    Complete information about this leave request.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="detail-modal-close-btn"
                onClick={() => setSelectedRequestForDetail(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-modal-body">
              {/* TOP STATUS BANNER (Request Code & Status Pill) */}
              <div className={`detail-status-banner ${selectedRequestForDetail.status.toLowerCase()}`}>
                <div className="detail-code-group">
                  <span className="detail-banner-lbl">Request Code</span>
                  <div className="detail-code-row">
                    <span className="detail-code-text">{selectedRequestForDetail.request_code}</span>
                    <button
                      type="button"
                      className="detail-copy-btn"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedRequestForDetail.request_code);
                        setToastMessage(`Copied ${selectedRequestForDetail.request_code} to clipboard!`);
                      }}
                      title="Copy Request Code"
                    >
                      <Copy size={14} color="#64748b" />
                    </button>
                  </div>
                </div>

                <div className="detail-banner-divider" />

                <div className="detail-status-group">
                  <span className="detail-banner-lbl-status">Status</span>
                  <span className={`detail-status-pill ${selectedRequestForDetail.status.toLowerCase()}`}>
                    {selectedRequestForDetail.status === "Approved" && <CheckCircle2 size={15} />}
                    {selectedRequestForDetail.status === "Pending" && <Clock size={15} />}
                    {selectedRequestForDetail.status === "Rejected" && <XCircle size={15} />}
                    {selectedRequestForDetail.status === "Cancelled" && <Ban size={15} />}
                    <span>{selectedRequestForDetail.status}</span>
                  </span>
                </div>
              </div>

              {/* TWO-COLUMN DETAILS GRID */}
              <div className="detail-info-grid">
                {/* Row 1: Employee & Leave Category */}
                <div className="detail-info-cell">
                  <div className="detail-cell-icon-badge employee-badge">
                    <User size={18} color="#2563eb" />
                  </div>
                  <div className="detail-cell-content">
                    <span className="detail-cell-lbl">Employee</span>
                    <span className="detail-cell-val employee-name">
                      {selectedRequestForDetail.employee_name} ({selectedRequestForDetail.employee_role || "employee"})
                    </span>
                  </div>
                </div>

                <div className="detail-info-cell">
                  <div className="detail-cell-icon-badge category-badge">
                    <Layers size={18} color="#9333ea" />
                  </div>
                  <div className="detail-cell-content">
                    <span className="detail-cell-lbl">Leave Category</span>
                    <span className="detail-cell-val category-name">
                      {selectedRequestForDetail.leave_type_name}
                    </span>
                  </div>
                </div>

                {/* Row 2: Start Date & End Date */}
                <div className="detail-info-cell">
                  <div className="detail-cell-icon-badge date-badge">
                    <Calendar size={18} color="#ea580c" />
                  </div>
                  <div className="detail-cell-content">
                    <span className="detail-cell-lbl">Start Date</span>
                    <span className="detail-cell-val date-val">
                      {formatDateDisplay(selectedRequestForDetail.start_date)}
                    </span>
                  </div>
                </div>

                <div className="detail-info-cell">
                  <div className="detail-cell-icon-badge date-badge">
                    <Calendar size={18} color="#ea580c" />
                  </div>
                  <div className="detail-cell-content">
                    <span className="detail-cell-lbl">End Date</span>
                    <span className="detail-cell-val date-val">
                      {formatDateDisplay(selectedRequestForDetail.end_date)}
                    </span>
                  </div>
                </div>

                {/* Row 3: Total Working Days */}
                <div className="detail-info-cell">
                  <div className="detail-cell-icon-badge days-badge">
                    <Clock size={18} color="#0284c7" />
                  </div>
                  <div className="detail-cell-content">
                    <span className="detail-cell-lbl">Total Working Days</span>
                    <span className="detail-cell-val days-val">
                      {selectedRequestForDetail.total_days} Day(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* STATED REASON CARD */}
              <div className="detail-reason-card">
                <div className="detail-reason-icon-badge">
                  <FileText size={18} color="#64748b" />
                </div>
                <div className="detail-reason-content">
                  <span className="detail-reason-lbl">Stated Reason</span>
                  <p className="detail-reason-text">{selectedRequestForDetail.reason}</p>
                </div>
              </div>

              {/* REVIEWER INFORMATION CARD */}
              {selectedRequestForDetail.approver_name && (
                <div className="detail-reviewer-card">
                  <div className="detail-reviewer-left">
                    <div className="detail-reviewer-badge">
                      <ShieldCheck size={22} color="#16a34a" />
                    </div>
                    <div className="detail-reviewer-divider" />
                    <div className="detail-reviewer-content">
                      <span className="detail-reviewer-lbl">Reviewer Information</span>
                      <div className="detail-reviewer-name-row">
                        <User size={13} color="#15803d" />
                        <span className="detail-reviewer-name">{selectedRequestForDetail.approver_name}</span>
                        <span className="detail-reviewer-date">
                          on {formatDateDisplay(selectedRequestForDetail.decision_date)}
                        </span>
                      </div>
                      {selectedRequestForDetail.approver_remarks && (
                        <div className="detail-reviewer-remarks-row">
                          <MessageSquare size={13} color="#64748b" />
                          <span className="detail-reviewer-remarks">
                            "{selectedRequestForDetail.approver_remarks}"
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Watermark Seal */}
                  <div className="detail-reviewer-seal-icon">
                    <CheckCircle2 size={54} color="#86efac" />
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="detail-modal-footer">
              <button
                type="button"
                className="detail-btn-close"
                onClick={() => setSelectedRequestForDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 4: ADMIN APPROVE / REJECT DECISION (STEP 3)
          ====================================================================== */}
      {decisionCandidate && (
        <div className="leave-modal-overlay">
          <div className="decision-modal-card">
            <div
              className={`decision-modal-header ${decisionType === "Approved" ? "approve" : "reject"}`}
            >
              <div className="decision-modal-title-box">
                {decisionType === "Approved" ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <XCircle size={22} />
                )}
                <h3>
                  {decisionType === "Approved"
                    ? "Approve Leave Request"
                    : "Reject Leave Request"}
                </h3>
              </div>
              <button
                type="button"
                className="leave-modal-close"
                onClick={() => setDecisionCandidate(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="decision-modal-body">
              {decisionError && (
                <div className="leave-form-error-banner">
                  <AlertCircle size={16} />
                  <span>{decisionError}</span>
                </div>
              )}

              <div className="decision-req-preview">
                <div className="decision-preview-row">
                  <span className="label">Employee</span>
                  <span className="val">
                    {decisionCandidate.employee_name} (
                    {decisionCandidate.employee_email})
                  </span>
                </div>
                <div className="decision-preview-row">
                  <span className="label">Request Code</span>
                  <span className="val">{decisionCandidate.request_code}</span>
                </div>
                <div className="decision-preview-row">
                  <span className="label">Leave Type</span>
                  <span className="val">
                    {decisionCandidate.leave_type_name}
                  </span>
                </div>
                <div className="decision-preview-row">
                  <span className="label">Duration</span>
                  <span className="val">
                    {formatDateDisplay(decisionCandidate.start_date)} →{" "}
                    {formatDateDisplay(decisionCandidate.end_date)} (
                    <strong>
                      {decisionCandidate.total_days} Working Day(s)
                    </strong>
                    )
                  </span>
                </div>
                <div className="decision-preview-reason">
                  <strong>Reason:</strong> {decisionCandidate.reason}
                </div>
              </div>

              <div className="form-tip-info">
                <Info size={16} />
                <span>
                  {decisionType === "Approved"
                    ? `Approving will deduct ${decisionCandidate.total_days} day(s) from ${decisionCandidate.employee_name}'s balance and record the audit ledger.`
                    : `Rejecting will restore ${decisionCandidate.total_days} day(s) back to ${decisionCandidate.employee_name}'s available balance.`}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {decisionType === "Approved"
                    ? "Approval Comments (Optional)"
                    : "Rejection Reason (Required)"}{" "}
                  {decisionType === "Rejected" && (
                    <span className="req-star">*</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={decisionRemarks}
                  onChange={(e) => setDecisionRemarks(e.target.value)}
                  placeholder={
                    decisionType === "Approved"
                      ? "Add any notes or well wishes (e.g., Approved, have a good vacation)..."
                      : "Explain clearly why this request cannot be approved..."
                  }
                  className="decision-remarks-textarea"
                />
              </div>
            </div>

            <div className="decision-modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDecisionCandidate(null)}
                disabled={decisionSubmitting}
              >
                Cancel
              </button>
              {decisionType === "Approved" ? (
                <button
                  type="button"
                  className="btn-confirm-approve"
                  onClick={handleSubmitDecision}
                  disabled={decisionSubmitting}
                >
                  <Check size={16} />
                  <span>
                    {decisionSubmitting ? "Approving..." : "Confirm & Approve"}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-confirm-reject"
                  onClick={handleSubmitDecision}
                  disabled={decisionSubmitting || !decisionRemarks.trim()}
                >
                  <X size={16} />
                  <span>
                    {decisionSubmitting ? "Rejecting..." : "Confirm & Reject"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 5: CANCEL REQUEST CONFIRMATION (EMPLOYEE)
          ====================================================================== */}
      {cancelCandidate && (
        <ConfirmDialog
          isOpen={Boolean(cancelCandidate)}
          title="Cancel Leave Application"
          message={`Are you sure you want to cancel request ${cancelCandidate.request_code}? The ${cancelCandidate.total_days} day(s) will be restored to your available balance.`}
          confirmText="Yes, Cancel Leave"
          cancelText="Keep Request"
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelCandidate(null)}
          loading={cancelLoading}
          variant="danger"
        />
      )}

      {/* ======================================================================
          MODAL 6: ADMIN MANUAL BALANCE ADJUSTMENT (STEP 4)
          MODAL 6: ADMIN MANUAL BALANCE ADJUSTMENT (MATCHING PICTURE 1)
          ====================================================================== */}
      {showAdjustModal && (
        <div className="leave-modal-overlay">
          <div className="adjust-quota-modal-card">
            {/* Header with Icon, Title, Subtitle and Top-Right Curved Flourish */}
            <div className="adjust-quota-modal-header">
              <div className="adjust-header-left">
                <div className="adjust-header-icon-badge">
                  <Layers size={22} color="#ea580c" />
                </div>
                <div className="adjust-header-titles">
                  <h3 className="adjust-modal-title">Manual Leave Quota Adjustment</h3>
                  <p className="adjust-modal-subtitle">
                    Award bonus leaves, carry forward days, or correct an employee's annual allocation.
                  </p>
                </div>
              </div>

              {/* Decorative wave background in top right */}
              <div className="adjust-header-wave-shape">
                <svg viewBox="0 0 160 80" fill="none" preserveAspectRatio="none">
                  <path
                    d="M0,0 C60,40 100,10 160,50 L160,0 Z"
                    fill="url(#adjustWaveGrad)"
                    opacity="0.8"
                  />
                  <defs>
                    <linearGradient id="adjustWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.75" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <button
                type="button"
                className="adjust-modal-close-btn"
                onClick={() => setShowAdjustModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="adjust-quota-modal-form">
              {adjustError && (
                <div className="leave-form-error-banner">
                  <AlertCircle size={16} />
                  <span>{adjustError}</span>
                </div>
              )}

              {/* ROW 1: Select Employee */}
              <div className="adjust-form-row">
                <div className="adjust-field-icon-badge user-badge">
                  <User size={18} color="#ea580c" />
                </div>
                <div className="adjust-field-wrapper flex-1">
                  <label className="adjust-field-label">
                    Select Employee <span className="req-star">*</span>
                  </label>
                  <CustomSelect
                    value={adjustFormData.employeeId}
                    onChange={(e, val) => {
                      const v = val !== undefined ? val : e?.target?.value;
                      setAdjustFormData((p) => ({
                        ...p,
                        employeeId: v,
                      }));
                    }}
                    options={employeeOptions}
                    placeholder="Choose an employee..."
                    className="adjust-custom-select"
                    isClearable={true}
                    renderOption={(opt, isSelected) => (
                      <div className="custom-select-emp-row">
                        <span className="emp-opt-name">
                          {opt.name || opt.label}
                        </span>
                        <span
                          className={`emp-opt-role-tag role-${(opt.role || "employee").toLowerCase()}`}
                        >
                          {opt.role || "employee"}
                        </span>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* ROW 2: Leave Category & Action Type with Middle Exchange Icon */}
              <div className="adjust-form-row adjust-split-row">
                {/* Leave Category */}
                <div className="adjust-split-item flex-1">
                  <div className="adjust-field-icon-badge cal-badge">
                    <Calendar size={18} color="#ea580c" />
                  </div>
                  <div className="adjust-field-wrapper flex-1">
                    <label className="adjust-field-label">
                      Leave Category <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      value={adjustFormData.leaveTypeId}
                      onChange={(e, val) => {
                        const v = val !== undefined ? val : e?.target?.value;
                        setAdjustFormData((p) => ({
                          ...p,
                          leaveTypeId: v,
                        }));
                      }}
                      options={adjustCategoryOptions}
                      placeholder="Select category..."
                      className="adjust-custom-select"
                      isClearable={true}
                    />
                  </div>
                </div>

                {/* Middle Exchange / Swap Icon */}
                <div
                  className="adjust-swap-icon-badge"
                  title="Adjustment Direction"
                >
                  <ArrowLeftRight size={16} color="#475569" />
                </div>

                {/* Action Type */}
                <div className="adjust-split-item flex-1">
                  <div className="adjust-field-wrapper flex-1">
                    <label className="adjust-field-label">
                      Action Type <span className="req-star">*</span>
                    </label>
                    <CustomSelect
                      value={adjustFormData.adjustmentType}
                      onChange={(e, val) => {
                        const v = val !== undefined ? val : e?.target?.value;
                        setAdjustFormData((p) => ({
                          ...p,
                          adjustmentType: v,
                        }));
                      }}
                      options={adjustActionOptions}
                      placeholder="Select action type..."
                      className="adjust-custom-select"
                      isClearable={true}
                    />
                  </div>
                </div>
              </div>

              {/* ROW 3: Adjustment Preview Box */}
              <div className="adjust-preview-card">
                <div className="adjust-preview-col-title">
                  <span className="adjust-preview-info-circle">
                    <Info size={15} color="#ea580c" />
                  </span>
                  <span className="adjust-preview-header-text">Adjustment Preview</span>
                </div>
                <div className="adjust-preview-divider" />
                <div className="adjust-preview-col">
                  <span className="adjust-preview-lbl">Action</span>
                  <div className="adjust-preview-val">
                    {adjustFormData.adjustmentType === "DEDUCT" ? (
                      <span className="adjust-pill deduct">- Deduct Days</span>
                    ) : (
                      <span className="adjust-pill add">+ Add Days</span>
                    )}
                  </div>
                </div>
                <div className="adjust-preview-col">
                  <span className="adjust-preview-lbl">Number of Days</span>
                  <span className="adjust-preview-val bold">
                    {adjustFormData.days ? `${adjustFormData.days} Days` : "—"}
                  </span>
                </div>
                <div className="adjust-preview-col">
                  <span className="adjust-preview-lbl">Leave Category</span>
                  <span className="adjust-preview-val bold category-name">
                    {leaveTypes.find(
                      (t) => String(t.id) === String(adjustFormData.leaveTypeId)
                    )?.name || "Paid Leave (PL)"}
                  </span>
                </div>
              </div>

              {/* ROW 4: Number of Days & Reason for Adjustment */}
              <div className="adjust-form-row adjust-split-row align-start">
                {/* Number of Days */}
                <div className="adjust-split-item days-item">
                  <div className="adjust-field-icon-badge cal-badge">
                    <Calendar size={18} color="#ea580c" />
                  </div>
                  <div className="adjust-field-wrapper">
                    <label className="adjust-field-label">
                      Number of Days <span className="req-star">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="100"
                      value={adjustFormData.days}
                      onChange={(e) =>
                        setAdjustFormData((p) => ({ ...p, days: e.target.value }))
                      }
                      placeholder="e.g. 2.0"
                      className="adjust-days-input"
                      required
                    />
                  </div>
                </div>

                {/* Reason for Adjustment */}
                <div className="adjust-split-item flex-1 reason-item">
                  <div className="adjust-field-icon-badge file-badge">
                    <FileText size={18} color="#64748b" />
                  </div>
                  <div className="adjust-field-wrapper flex-1">
                    <label className="adjust-field-label">
                      Reason for Adjustment <span className="req-star">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={adjustFormData.reason}
                      onChange={(e) =>
                        setAdjustFormData((p) => ({ ...p, reason: e.target.value }))
                      }
                      placeholder="Explain why this adjustment is made (e.g., Performance reward, manual carry forward)..."
                      className="adjust-reason-textarea"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="adjust-modal-footer">
                <button
                  type="button"
                  className="adjust-btn-cancel"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={adjustSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adjust-btn-confirm"
                  disabled={adjustSubmitting}
                >
                  <Check size={16} />
                  <span>
                    {adjustSubmitting ? "Adjusting..." : "Confirm Adjustment"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveManagement;
