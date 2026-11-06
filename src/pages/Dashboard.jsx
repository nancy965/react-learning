import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { usePermission } from "../context/PermissionContext";
import { useAuth } from "../context/AuthContext";
import { getFirstAvailableRoute } from "../services/navigationService";
import {
  exportDashboardUsers,
  getDashboardOverview,
} from "../services/dashboardService";
import { API_URL } from "../config/axios.util";
import SearchableDropdown from "../components/SearchableDropdown";
import Table from "../components/Table";
import UserCard from "../components/UserCard";
import Loader from "../components/Loader";
import User360Modal from "../components/User360Modal";
import ReviewUsersModal from "../components/ReviewUsersModal";
import Modal from "../components/Modal";
import ActivityDetailsView from "../components/ActivityDetailsView";
import CustomDatePicker from "../components/CustomDatePicker";
import "./Dashboard.css";
import "./Tasks.css";
import "./PremiumStats.css";
import "./SmartInsights.css";

const DEFAULT_FINDINGS = [
  {
    id: "find-1",
    userId: 1,
    userName: "Dhruvisha",
    email: "dhruvisha@gmail.com",
    issue: "Missing permission role",
    severity: "high",
    reason: "No valid permission role is assigned to this account.",
    recommendedAction:
      "Review the account and assign the appropriate permission role if required.",
  },
  {
    id: "find-2",
    userId: 2,
    userName: "Arjun",
    email: "arjun@gmail.com",
    issue: "Missing permission role",
    severity: "high",
    reason: "No valid permission role is assigned to this account.",
    recommendedAction:
      "Review the account and assign the appropriate permission role if required.",
  },
  {
    id: "find-3",
    userId: 3,
    userName: "Diya",
    email: "diya@gmail.com",
    issue: "Missing permission role",
    severity: "high",
    reason: "No valid permission role is assigned to this account.",
    recommendedAction:
      "Review the account and assign the appropriate permission role if required.",
  },
  {
    id: "find-4",
    userId: 4,
    userName: "Kiara",
    email: "kiara@gmail.com",
    issue: "Missing permission role",
    severity: "high",
    reason: "No valid permission role is assigned to this account.",
    recommendedAction:
      "Review the account and assign the appropriate permission role if required.",
  },
  {
    id: "find-5",
    userId: 5,
    userName: "Khush",
    email: "khush@gmail.com",
    issue: "Missing permission role",
    severity: "high",
    reason: "No valid permission role is assigned to this account.",
    recommendedAction:
      "Review the account and assign the appropriate permission role if required.",
  },
];

const DEFAULT_ACTIVITIES = [
  {
    id: "act-1",
    type: "orange",
    title: "Role Updated",
    description: "CRM role and permissions have been updated.",
    time: "10 Oct 2026, 05:10 PM",
  },
  {
    id: "act-2",
    type: "blue",
    title: "User Created",
    description: "New user Arjun (arjun@gmail.com) has been created.",
    time: "10 Oct 2026, 03:45 PM",
  },
  {
    id: "act-3",
    type: "green",
    title: "Permissions Modified",
    description: "Permissions for role Admin have been updated.",
    time: "10 Oct 2026, 03:11 PM",
  },
  {
    id: "act-4",
    type: "purple",
    title: "Login Successful",
    description: "User Diya (diya@gmail.com) logged in.",
    time: "10 Oct 2026, 02:52 PM",
  },
];

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase() || "U";
};

const mapRecentActivities = (activities) => {
  if (!Array.isArray(activities) || activities.length === 0) return [];
  return activities.slice(0, 4).map((act, idx) => {
    let desc = "Activity details";
    if (typeof act.description === "string") {
      desc = act.description;
    } else if (typeof act.details === "string") {
      desc = act.details;
    } else if (act.details && typeof act.details === "object") {
      if (act.action) {
        desc = `${act.action} recorded for ${act.target_user_name || "account"}`;
      } else {
        desc = "Account details updated";
      }
    } else if (act.action) {
      desc = `${act.action} recorded`;
    }

    let formattedTime = "Recent";
    if (typeof act.time === "string") {
      formattedTime = act.time;
    } else if (act.created_at) {
      try {
        formattedTime = new Date(act.created_at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        formattedTime = "Recent";
      }
    }

    return {
      id: act.id || `act-${idx}`,
      type:
        act.type ||
        (idx % 4 === 0
          ? "orange"
          : idx % 4 === 1
            ? "blue"
            : idx % 4 === 2
              ? "green"
              : "purple"),
      title:
        typeof act.title === "string"
          ? act.title
          : typeof act.action === "string"
            ? act.action
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase())
            : "Activity",
      description: desc,
      time: formattedTime,
      targetUser: act.target_user || act.targetUser || act.userId,
      targetUserName:
        act.target_user_name || act.targetUserName || act.userName,
      raw: act,
    };
  });
};

function Dashboard() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const { hasPermission, loading: permissionsLoading } = usePermission();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [showUser360, setShowUser360] = useState(false);
  const [openUserMenuId, setOpenUserMenuId] = useState(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [permissionRole, setPermissionRole] = useState("all");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [tempFromDate, setTempFromDate] = useState("");
  const [tempToDate, setTempToDate] = useState("");
  const [tempDatePreset, setTempDatePreset] = useState("");

  const dateFilterRef = useRef(null);
  const previousFiltersRef = useRef(null);
  const previousUsersRequestRef = useRef(null);

  const [newThisMonth, setNewThisMonth] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedActivityLog, setSelectedActivityLog] = useState(null);

  const USERS_PER_PAGE = 5;

  const isGeneralAdmin =
    user?.role === "general_admin" ||
    user?.baseRole === "general_admin" ||
    String(user?.role_name || user?.roleName || "")
      .toLowerCase()
      .includes("general") ||
    user?.email === "nency@gmail.com" ||
    String(user?.name || "").toLowerCase() === "nency";

  const canViewDashboard =
    isGeneralAdmin ||
    user?.role === "admin" ||
    hasPermission([
      "user_dashboard.view",
      "dashboard.view",
      "user_dashboard",
      "dashboard",
    ]);
  const canExportDashboard =
    isGeneralAdmin ||
    user?.role === "admin" ||
    hasPermission(["user_dashboard.export", "dashboard.export"]);
  const canViewUsers =
    isGeneralAdmin ||
    user?.role === "admin" ||
    hasPermission(["users.view", "users"]);
  const canBulkCreateUsers =
    isGeneralAdmin ||
    user?.role === "admin" ||
    hasPermission(["users.bulk_create", "users.create"]);
  const canEditUsers =
    isGeneralAdmin || user?.role === "admin" || hasPermission(["users.edit"]);
  const canDeleteUsers =
    isGeneralAdmin || user?.role === "admin" || hasPermission(["users.delete"]);

  useEffect(() => {
    if (!permissionsLoading && !canViewDashboard) {
      const cached = localStorage.getItem("sessionNavigation");
      if (cached) {
        try {
          const navList = JSON.parse(cached);
          const firstRoute = getFirstAvailableRoute(navList, user?.role);
          if (firstRoute && firstRoute !== "/dashboard") {
            navigate(firstRoute, { replace: true });
          }
        } catch (e) {
          console.error("Dashboard redirect error:", e);
        }
      }
    }
  }, [permissionsLoading, canViewDashboard, navigate, user?.role]);

  const [smartInsights, setSmartInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState("");
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [findingsSearch, setFindingsSearch] = useState("");
  const [showSmartDatePopup, setShowSmartDatePopup] = useState(false);
  const [activeFindingMenuId, setActiveFindingMenuId] = useState(null);
  const smartDateRef = useRef(null);
  const findingMenuRef = useRef(null);

  const [recentActivities, setRecentActivities] = useState(DEFAULT_ACTIVITIES);

  const rawFindings = smartInsights?.findings || [];
  const findings = smartInsights ? rawFindings : DEFAULT_FINDINGS;

  const visibleFindings = useMemo(() => {
    return findings.filter((finding) => {
      // 1. Severity filter
      if (
        severityFilter !== "all" &&
        String(finding.severity || "").toLowerCase() !==
          severityFilter.toLowerCase()
      ) {
        return false;
      }
      // 2. Search query filter
      if (findingsSearch.trim()) {
        const query = findingsSearch.trim().toLowerCase();
        const userName = String(
          finding.userName || finding.name || "",
        ).toLowerCase();
        const email = String(finding.email || "").toLowerCase();
        const issue = String(finding.issue || "").toLowerCase();
        const severity = String(finding.severity || "").toLowerCase();
        const reason = String(finding.reason || "").toLowerCase();
        const recAction = String(finding.recommendedAction || "").toLowerCase();

        return (
          userName.includes(query) ||
          email.includes(query) ||
          issue.includes(query) ||
          severity.includes(query) ||
          reason.includes(query) ||
          recAction.includes(query)
        );
      }
      return true;
    });
  }, [findings, severityFilter, findingsSearch]);

  const riskDistribution = smartInsights?.distribution || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const dashboardFilters = useMemo(
    () => ({
      search,
      status,
      role,
      permissionRole,
      fromDate,
      toDate,
      newThisMonth,
      adminId: selectedAdminId,
      employeeId: selectedEmployeeId,
    }),
    [
      search,
      status,
      role,
      permissionRole,
      fromDate,
      toDate,
      newThisMonth,
      selectedAdminId,
      selectedEmployeeId,
    ],
  );

  const filteredEmployeesList = selectedAdminId
    ? employeesList.filter(
        (employee) => String(employee.admin_id) === String(selectedAdminId),
      )
    : employeesList;

  // Findings Trend Chart Points & Interactive Tooltip State
  const findingsTrendPoints = useMemo(
    () => [
      {
        date: "Sep 10",
        x: 45,
        highY: 98,
        lowY: 104,
        critical: 0,
        high: 5,
        medium: 1,
        low: 2,
      },
      {
        date: "Sep 13",
        x: 95,
        highY: 74,
        lowY: 94,
        critical: 0,
        high: 17,
        medium: 1,
        low: 7,
      },
      {
        date: "Sep 16",
        x: 145,
        highY: 76,
        lowY: 93,
        critical: 0,
        high: 16,
        medium: 1,
        low: 7,
      },
      {
        date: "Sep 19",
        x: 195,
        highY: 53,
        lowY: 83,
        critical: 0,
        high: 28,
        medium: 1,
        low: 13,
      },
      {
        date: "Sep 22",
        x: 245,
        highY: 64,
        lowY: 74,
        critical: 0,
        high: 23,
        medium: 1,
        low: 17,
      },
      {
        date: "Sep 25",
        x: 295,
        highY: 68,
        lowY: 87,
        critical: 0,
        high: 21,
        medium: 1,
        low: 11,
      },
      {
        date: "Sep 28",
        x: 345,
        highY: 55,
        lowY: 78,
        critical: 0,
        high: 27,
        medium: 1,
        low: 15,
      },
      {
        date: "Oct 01",
        x: 395,
        highY: 35,
        lowY: 79,
        critical: 0,
        high: 38,
        medium: 2,
        low: 15,
      },
      {
        date: "Oct 04",
        x: 445,
        highY: 42,
        lowY: 71,
        critical: 0,
        high: 34,
        medium: 2,
        low: 19,
      },
      {
        date: "Oct 07",
        x: 495,
        highY: 48,
        lowY: 59,
        critical: 0,
        high: 31,
        medium: 1,
        low: 25,
      },
      {
        date: "Oct 10",
        x: 530,
        highY: 51,
        lowY: 60,
        critical: 0,
        high: 30,
        medium: 1,
        low: 25,
      },
    ],
    [],
  );
  const [activeTrendIndex, setActiveTrendIndex] = useState(null);
  const trendWrapRef = useRef(null);

  const handleFindingView = (finding) => {
    if (finding.recordType === "admin") {
      navigate("/admins");
      return;
    }

    const existingUser = users.find(
      (user) => String(user.id) === String(finding.userId),
    );

    setOpenUserMenuId(null);
    setSelectedUser(
      existingUser || {
        id: finding.userId,
        name: finding.userName,
        email: finding.email,
        role: finding.role,
      },
    );
    setShowUser360(true);
  };

  const handleActivityCardClick = (act) => {
    // Open dedicated Activity Details Modal for this log (not User 360)
    const rawLog = act.raw || act;
    setSelectedActivityLog({
      ...rawLog,
      target_user_name:
        rawLog.target_user_name || act.targetUserName || rawLog.userName,
      target_user: rawLog.target_user || act.targetUser || rawLog.userId,
      action:
        rawLog.action ||
        (act.title
          ? act.title.toUpperCase().replace(/\s+/g, "_")
          : "CREATE_EMPLOYEE"),
      title: act.title || rawLog.action || "Create Employee",
      time: rawLog.created_at || act.time,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest(".custom-datepicker-popover") ||
        event.target.closest(".custom-datepicker-wrap") ||
        event.target.closest(".custom-datepicker-dropdown-menu") ||
        event.target.closest(".custom-datepicker-dropdown-container")
      ) {
        return;
      }

      if (
        dateFilterRef.current &&
        !dateFilterRef.current.contains(event.target)
      ) {
        setShowDatePicker(false);
      }
      if (
        smartDateRef.current &&
        !smartDateRef.current.contains(event.target)
      ) {
        setShowSmartDatePopup(false);
      }
      if (
        findingMenuRef.current &&
        !findingMenuRef.current.contains(event.target)
      ) {
        setActiveFindingMenuId(null);
      }
      if (
        trendWrapRef.current &&
        !trendWrapRef.current.contains(event.target)
      ) {
        setActiveTrendIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDatePicker || showSmartDatePopup) {
      setTempFromDate(fromDate);
      setTempToDate(toDate);
      setTempDatePreset(datePreset);
    }
  }, [showDatePicker, showSmartDatePopup, fromDate, toDate, datePreset]);

  const isPageChangeOnlyRef = useRef(false);

  useEffect(() => {
    if (permissionsLoading && !canViewDashboard) return;
    if (!canViewDashboard) return;

    let cancelled = false;

    const fetchOverview = async () => {
      try {
        setLoading(true);
        setUsersLoading(true);
        setInsightsLoading(true);
        setError(false);
        setInsightsError("");

        const response = await getDashboardOverview(
          dashboardFilters,
          1,
          USERS_PER_PAGE,
        );

        if (cancelled) return;

        if (!response?.success) {
          throw new Error("Unable to load dashboard data");
        }

        const data = response.data || {};

        setStats(
          data.stats || {
            totalUsers: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            newUsers: 0,
          },
        );

        setUsers(data.users || []);
        setTotalPages(data.totalPages ?? data.pagination?.totalPages ?? 0);
        setTotalRecords(
          data.totalRecords ?? data.pagination?.totalRecords ?? 0,
        );

        if (data.smartInsights) {
          setSmartInsights(data.smartInsights);
        }

        if (Array.isArray(data.admins) && data.admins.length > 0) {
          setAdminsList(data.admins);
        }

        if (Array.isArray(data.employees) && data.employees.length > 0) {
          setEmployeesList(data.employees);
        }

        if (
          Array.isArray(data.recentActivity) &&
          data.recentActivity.length > 0
        ) {
          const mapped = mapRecentActivities(data.recentActivity);
          if (mapped.length > 0) {
            setRecentActivities(mapped);
          }
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Error fetching dashboard overview:", err);
        setError(true);
        setInsightsError("Unable to load smart insights. Please try again.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setUsersLoading(false);
          setInsightsLoading(false);
        }
      }
    };

    fetchOverview();

    return () => {
      cancelled = true;
    };
  }, [permissionsLoading, canViewDashboard, dashboardFilters]);

  // Handle users table pagination specifically when user clicks a page button
  useEffect(() => {
    if (permissionsLoading || !canViewDashboard || !canViewUsers) {
      return;
    }

    if (!isPageChangeOnlyRef.current) {
      return;
    }

    let cancelled = false;

    const fetchUsersPage = async () => {
      try {
        setUsersLoading(true);

        const response = await getDashboardOverview(
          dashboardFilters,
          currentPage,
          USERS_PER_PAGE,
        );

        if (cancelled) return;

        if (!response?.success) {
          throw new Error("Unable to load users");
        }

        const data = response.data || {};

        setUsers(data.users || []);
        setTotalPages(data.totalPages ?? data.pagination?.totalPages ?? 0);
        setTotalRecords(
          data.totalRecords ?? data.pagination?.totalRecords ?? 0,
        );
      } catch (err) {
        if (cancelled) return;

        console.error("Error fetching dashboard users:", err);
        setUsers([]);
        setTotalPages(0);
        setTotalRecords(0);
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    };

    fetchUsersPage();

    return () => {
      cancelled = true;
    };
  }, [
    permissionsLoading,
    canViewDashboard,
    canViewUsers,
    currentPage,
    dashboardFilters,
  ]);

  useEffect(() => {
    isPageChangeOnlyRef.current = false;
    setCurrentPage(1);
    previousUsersRequestRef.current = null;
  }, [
    search,
    status,
    role,
    permissionRole,
    fromDate,
    toDate,
    newThisMonth,
    selectedAdminId,
    selectedEmployeeId,
  ]);

  const handlePageChange = (newPage) => {
    isPageChangeOnlyRef.current = true;
    setCurrentPage(newPage);
  };

  const getPaginationPages = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }

      return pages;
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [
        1,
        "...",
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

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDateLabel = (date) => {
    if (!date) return "";

    const parsedDate = new Date(`${date}T00:00:00`);

    return parsedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDatePreset = (preset) => {
    const today = new Date();
    const todayString = getLocalDateString(today);

    if (preset === "today") {
      setTempFromDate(todayString);
      setTempToDate(todayString);
    }

    if (preset === "7days") {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);

      setTempFromDate(getLocalDateString(startDate));
      setTempToDate(todayString);
    }

    if (preset === "30days") {
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 29);

      setTempFromDate(getLocalDateString(startDate));
      setTempToDate(todayString);
    }

    if (preset === "month") {
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

      setTempFromDate(getLocalDateString(startDate));
      setTempToDate(todayString);
    }

    if (preset === "custom") {
      setTempDatePreset("custom");
      return;
    }

    setTempDatePreset(preset);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setRole("all");
    setPermissionRole("all");
    setFromDate("");
    setToDate("");
    setDatePreset("");
    setNewThisMonth(false);
    setSelectedAdminId("");
    setSelectedEmployeeId("");
    setShowDatePicker(false);
    setShowSmartDatePopup(false);
    setFindingsSearch("");
    setSeverityFilter("all");
    setCurrentPage(1);
  };

  const handleOpenUser360 = (userId) => {
    const user = users.find((item) => String(item.id) === String(userId));

    if (!user) return;

    setOpenUserMenuId(null);
    setSelectedUser(user);
    setShowUser360(true);
  };

  const handleCloseUser360 = () => {
    setShowUser360(false);
    setSelectedUser(null);
  };

  const handleExport = async () => {
    try {
      const response = await exportDashboardUsers(dashboardFilters);

      if (!response) return;

      const blob = new Blob([response.data || response], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Dynamic filename based on selected Employee or Admin
      let filename = "user dashboard.xlsx";

      if (selectedEmployeeId) {
        const selectedEmp = employeesList.find(
          (emp) => String(emp.id) === String(selectedEmployeeId),
        );
        const empName = selectedEmp?.name ? selectedEmp.name.trim() : "";
        if (empName) {
          filename = `user dashboard ${empName.toLowerCase()}.xlsx`;
        } else {
          filename = "user dashboard employee.xlsx";
        }
      } else if (selectedAdminId) {
        const selectedAdm = adminsList.find(
          (adm) => String(adm.id) === String(selectedAdminId),
        );
        const admName = selectedAdm?.name ? selectedAdm.name.trim() : "";
        if (admName) {
          filename = `user dashboard ${admName.toLowerCase()}.xlsx`;
        } else {
          filename = "user dashboard admin.xlsx";
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting dashboard users:", error);
    }
  };

  const handleRetryInsights = async () => {
    setShowAllFindings(false);
    setSmartInsights(null);
    setInsightsError("");
    setInsightsLoading(true);

    try {
      const response = await getDashboardOverview(
        dashboardFilters,
        1,
        USERS_PER_PAGE,
      );

      if (response?.success && response.data?.smartInsights) {
        setSmartInsights(response.data.smartInsights);
      } else {
        setInsightsError("Unable to load smart insights.");
      }
    } catch (err) {
      console.error("Error retrying smart insights:", err);
      setInsightsError("Unable to load smart insights.");
    } finally {
      setInsightsLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "--";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isTotalUsersSelected = status === "all" && !newThisMonth;
  const isActiveUsersSelected = status === "active" && !newThisMonth;
  const isInactiveUsersSelected = status === "inactive" && !newThisMonth;
  const isNewUsersSelected = newThisMonth;

  if (!canViewDashboard) {
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
          <Loader text="Loading dashboard..." />
        </div>
      );
    }
    return (
      <div className={`dashboard-container ${theme}-theme`}>
        <div className="dashboard-page">
          <div className="dashboard-error">
            <h2>Access Denied</h2>
            <p>You do not have permission to view the dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`dashboard-container ${theme}-theme`}>
        <div className="dashboard-page">
          <div className="dashboard-error">
            <h2>Unable to load dashboard</h2>
            <p>Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "index",
      label: "#",
      width: "0.5fr",
      align: "center",
      render: (_, index) => (
        <span>{(currentPage - 1) * USERS_PER_PAGE + index + 1}</span>
      ),
    },
    {
      key: "name",
      label: "Name",
      width: "1.5fr",
      align: "left",
      render: (user) => (
        <div className="dashboard-user-name">
          <strong>{user.name || "--"}</strong>
          <span>{user.age ? `${user.age} years` : "Age --"}</span>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      width: "1.5fr",
      align: "left",
      render: (user) => user.email || "--",
    },
    {
      key: "country_name",
      label: "Country",
      width: "1fr",
      align: "left",
      render: (user) => user.country_name || "--",
    },
    {
      key: "state_name",
      label: "State",
      width: "1fr",
      align: "left",
      render: (user) => user.state_name || "--",
    },
    {
      key: "city_name",
      label: "City",
      width: "1fr",
      align: "left",
      render: (user) => user.city_name || "--",
    },
    {
      key: "pincode",
      label: "Pincode",
      width: "1fr",
      align: "left",
      render: (user) => user.pincode || "--",
    },
    {
      key: "role",
      label: "Role",
      width: "1fr",
      align: "center",
      render: (user) => user.role || "--",
    },
    {
      key: "permission_role",
      label: "Permission Role",
      width: "1fr",
      align: "center",
      render: (user) => user.permission_role || "No Permission Role",
    },
    {
      key: "status",
      label: "Status",
      width: "1fr",
      align: "center",
      render: (user) => (
        <span
          className={`dashboard-status-badge ${
            user.is_active ? "active" : "inactive"
          }`}
        >
          {user.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created At",
      width: "1fr",
      align: "left",
      render: (user) => formatDate(user.created_at),
    },
    {
      key: "action",
      label: "Action",
      render: (user) => (
        <button
          type="button"
          className="dashboard-view-button"
          onClick={() => handleOpenUser360(user.id)}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className={`dashboard-container ${theme}-theme`}>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">USER DASHBOARD</span>
            <h1>Dashboard</h1>
            <p>Monitor users, registrations, roles and account activity.</p>
          </div>

          <div className="dashboard-header-actions">
            {canExportDashboard && (
              <button
                type="button"
                className="dashboard-secondary-button"
                onClick={handleExport}
              >
                Export
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-global-filters">
          <div className="dashboard-date-filter" ref={dateFilterRef}>
            <button
              type="button"
              className="dashboard-date-trigger"
              onClick={() => setShowDatePicker((previous) => !previous)}
            >
              <span>
                {fromDate || toDate
                  ? `${formatDateLabel(fromDate) || "From"} → ${
                      formatDateLabel(toDate) || "To"
                    }`
                  : "Date Range"}
              </span>
              <span
                className={`dashboard-date-arrow ${showDatePicker ? "open" : ""}`}
              >
                ▾
              </span>
            </button>

            {showDatePicker && (
              <div className="dashboard-date-popup">
                <div className="dashboard-date-options">
                  {[
                    { value: "today", label: "Today" },
                    { value: "7days", label: "Last 7 Days" },
                    { value: "30days", label: "Last 30 Days" },
                    { value: "month", label: "This Month" },
                    { value: "custom", label: "Custom" },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={
                        tempDatePreset === preset.value ? "selected" : ""
                      }
                      onClick={() => handleDatePreset(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="dashboard-custom-date-fields">
                  <div>
                    <label htmlFor="dashboard-from-date">From</label>
                    <CustomDatePicker
                      id="dashboard-from-date"
                      value={tempFromDate}
                      onChange={(event) => {
                        setTempFromDate(event.target.value);
                        setTempDatePreset("custom");
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="dashboard-to-date">To</label>
                    <CustomDatePicker
                      id="dashboard-to-date"
                      value={tempToDate}
                      min={tempFromDate || undefined}
                      onChange={(event) => {
                        setTempToDate(event.target.value);
                        setTempDatePreset("custom");
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="dashboard-date-apply"
                  onClick={() => {
                    setFromDate(tempFromDate);
                    setToDate(tempToDate);
                    setDatePreset(tempDatePreset);
                    setShowDatePicker(false);
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div style={{ width: "230px" }} title="Filter by Admin">
            <SearchableDropdown
              value={selectedAdminId}
              options={adminsList}
              onChange={(val) => {
                setSelectedAdminId(val);

                if (!val) {
                  setSelectedEmployeeId("");
                } else if (selectedEmployeeId) {
                  const employee = employeesList.find(
                    (item) => String(item.id) === String(selectedEmployeeId),
                  );

                  if (employee && String(employee.admin_id) !== String(val)) {
                    setSelectedEmployeeId("");
                  }
                }
              }}
              placeholder="All Admins"
              searchPlaceholder="Search Admin..."
              prefix="Admin"
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
            />
          </div>

          <div style={{ width: "230px" }} title="Filter by Employee">
            <SearchableDropdown
              value={selectedEmployeeId}
              options={filteredEmployeesList}
              onChange={(val) => {
                setSelectedEmployeeId(val);

                if (val) {
                  const employee = employeesList.find(
                    (item) => String(item.id) === String(val),
                  );

                  if (
                    employee &&
                    employee.admin_id &&
                    String(employee.admin_id) !== String(selectedAdminId)
                  ) {
                    setSelectedAdminId(String(employee.admin_id));
                  }
                }
              }}
              placeholder="All Employees"
              searchPlaceholder="Search Employee..."
              prefix="Employee"
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
          </div>

          <div className="dashboard-global-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setNewThisMonth(false);
              }}
            />
          </div>

          <button
            type="button"
            className="dashboard-reset-button"
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </div>

        <div className="dashboard-stats-grid premium-stats">
          <div className="dashboard-stat-card premium total">
            <div className="dashboard-stat-icon total">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Users</span>
              <div className="stat-value-row">
                <strong>{loading ? "..." : (stats.totalUsers ?? 0)}</strong>
                <span className="stat-growth up">↑ 12%</span>
              </div>
              <span className="stat-subtext">+6 from last month</span>
            </div>
            <div className="stat-chart-bg">
              <svg
                viewBox="0 0 76 28"
                width="76"
                height="28"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="totalSparkGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="80%" stopColor="#3b82f6" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,20 Q16,22 34,11 T54,15 T76,5 L76,28 L0,28 Z"
                  fill="url(#totalSparkGrad)"
                />
                <path
                  d="M0,20 Q16,22 34,11 T54,15 T76,5"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="dashboard-stat-card premium active">
            <div className="dashboard-stat-icon active">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Active Users</span>
              <div className="stat-value-row">
                <strong>{loading ? "..." : (stats.activeUsers ?? 0)}</strong>
                <span className="stat-growth up">↑ 8%</span>
              </div>
              <span className="stat-subtext">+4 from last month</span>
            </div>
            <div className="stat-chart-bg">
              <svg
                viewBox="0 0 76 28"
                width="76"
                height="28"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="activeSparkGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="80%" stopColor="#10b981" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,21 Q15,23 32,12 T54,17 T76,4 L76,28 L0,28 Z"
                  fill="url(#activeSparkGrad)"
                />
                <path
                  d="M0,21 Q15,23 32,12 T54,17 T76,4"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="dashboard-stat-card premium inactive">
            <div className="dashboard-stat-icon inactive">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 15 15" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Inactive Users</span>
              <div className="stat-value-row">
                <strong>{loading ? "..." : (stats.inactiveUsers ?? 0)}</strong>
                <span className="stat-growth down">↓ 40%</span>
              </div>
              <span className="stat-subtext">-2 from last month</span>
            </div>
            <div className="stat-chart-bg">
              <svg
                viewBox="0 0 76 28"
                width="76"
                height="28"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="inactiveSparkGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                    <stop offset="80%" stopColor="#ef4444" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,22 Q18,24 38,12 T58,16 T76,6 L76,28 L0,28 Z"
                  fill="url(#inactiveSparkGrad)"
                />
                <path
                  d="M0,22 Q18,24 38,12 T58,16 T76,6"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <div className="dashboard-stat-card premium new">
            <div className="dashboard-stat-icon new">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">New This Month</span>
              <div className="stat-value-row">
                <strong>{loading ? "..." : (stats.newUsers ?? 0)}</strong>
                <span className="stat-growth up">↑ 100%</span>
              </div>
              <span className="stat-subtext">+4 from last month</span>
            </div>
            <div className="stat-chart-bg">
              <svg
                viewBox="0 0 76 28"
                width="76"
                height="28"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="newSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                    <stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,21 Q13,22 28,14 T50,17 T64,9 T76,5 L76,28 L0,28 Z"
                  fill="url(#newSparkGrad)"
                />
                <path
                  d="M0,21 Q13,22 28,14 T50,17 T64,9 T76,5"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <section className="dashboard-smart-insights">
          {/* Header matching Image 2 */}
          <div className="dashboard-smart-insights-header">
            <div className="dashboard-smart-insights-header-left">
              <div className="dashboard-smart-shield-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="dashboard-smart-header-text">
                <h2>Smart User Insights &amp; Risk Detection</h2>
                <p>
                  Review account issues and prioritize findings using current
                  dashboard filters.
                </p>
              </div>
            </div>

            <div className="dashboard-smart-findings-controls">
              <div
                className="dashboard-smart-date-container"
                ref={smartDateRef}
              >
                <button
                  type="button"
                  className="dashboard-smart-date-btn"
                  onClick={() => setShowSmartDatePopup(!showSmartDatePopup)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>
                    {fromDate && toDate
                      ? `${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}`
                      : "Date Range"}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="12"
                    height="12"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showSmartDatePopup && (
                  <div className="dashboard-smart-date-popup">
                    <div className="dashboard-date-options">
                      {[
                        { value: "today", label: "Today" },
                        { value: "7days", label: "Last 7 Days" },
                        { value: "30days", label: "Last 30 Days" },
                        { value: "month", label: "This Month" },
                        { value: "custom", label: "Custom" },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          className={
                            tempDatePreset === preset.value ? "selected" : ""
                          }
                          onClick={() => handleDatePreset(preset.value)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="dashboard-custom-date-fields">
                      <div>
                        <label htmlFor="smart-from-date">From</label>
                        <CustomDatePicker
                          id="smart-from-date"
                          value={tempFromDate}
                          onChange={(event) => {
                            setTempFromDate(event.target.value);
                            setTempDatePreset("custom");
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="smart-to-date">To</label>
                        <CustomDatePicker
                          id="smart-to-date"
                          value={tempToDate}
                          min={tempFromDate || undefined}
                          onChange={(event) => {
                            setTempToDate(event.target.value);
                            setTempDatePreset("custom");
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dashboard-date-apply"
                      onClick={() => {
                        setFromDate(tempFromDate);
                        setToDate(tempToDate);
                        setDatePreset(tempDatePreset);
                        setShowSmartDatePopup(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {insightsLoading ? (
            <div className="dashboard-smart-status-card">
              <Loader text="Analyzing user records..." />
            </div>
          ) : insightsError ? (
            <div
              className="dashboard-smart-status-card"
              style={{ color: "#ef4444" }}
            >
              <p>{insightsError}</p>
              <button
                type="button"
                onClick={handleRetryInsights}
                style={{
                  marginTop: "10px",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  background: "#ea580c",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Row 1: 4 Stat KPI Cards matching Image 2 */}
              <div className="dashboard-smart-insights-summary">
                {/* Users to Review */}
                <div className="dashboard-smart-kpi-card users-review">
                  <div className="dashboard-smart-kpi-left">
                    <div className="dashboard-smart-kpi-icon">
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
                    <div className="dashboard-smart-kpi-text">
                      <span className="dashboard-smart-kpi-label">
                        Users to Review
                      </span>
                      <div className="dashboard-smart-kpi-val-row">
                        <span className="dashboard-smart-kpi-val">
                          {smartInsights?.summary?.usersToReview ?? 0}
                        </span>
                        <span className="dashboard-smart-kpi-growth up-red">
                          ↑ 12%
                        </span>
                      </div>
                      <span className="dashboard-smart-kpi-subtext">
                        Unique accounts with findings
                      </span>
                    </div>
                  </div>
                </div>

                {/* High Priority */}
                <div className="dashboard-smart-kpi-card high-priority">
                  <div className="dashboard-smart-kpi-left">
                    <div className="dashboard-smart-kpi-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="dashboard-smart-kpi-text">
                      <span className="dashboard-smart-kpi-label">
                        High Priority
                      </span>
                      <div className="dashboard-smart-kpi-val-row">
                        <span className="dashboard-smart-kpi-val">
                          {smartInsights?.summary?.highPriority ?? 0}
                        </span>
                        <span className="dashboard-smart-kpi-growth up-orange">
                          ↑ 8%
                        </span>
                      </div>
                      <span className="dashboard-smart-kpi-subtext">
                        Critical and high-severity findings
                      </span>
                    </div>
                  </div>
                </div>

                {/* Task Risks */}
                <div className="dashboard-smart-kpi-card task-risks">
                  <div className="dashboard-smart-kpi-left">
                    <div className="dashboard-smart-kpi-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
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
                    <div className="dashboard-smart-kpi-text">
                      <span className="dashboard-smart-kpi-label">
                        Task Risks
                      </span>
                      <div className="dashboard-smart-kpi-val-row">
                        <span className="dashboard-smart-kpi-val">
                          {smartInsights?.summary?.taskRisks ?? 0}
                        </span>
                        <span className="dashboard-smart-kpi-growth down-green">
                          ↓ 100%
                        </span>
                      </div>
                      <span className="dashboard-smart-kpi-subtext">
                        Task-related findings
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Issues */}
                <div className="dashboard-smart-kpi-card account-issues">
                  <div className="dashboard-smart-kpi-left">
                    <div className="dashboard-smart-kpi-icon">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </div>
                    <div className="dashboard-smart-kpi-text">
                      <span className="dashboard-smart-kpi-label">
                        Account Issues
                      </span>
                      <div className="dashboard-smart-kpi-val-row">
                        <span className="dashboard-smart-kpi-val">
                          {smartInsights?.summary?.accountIssues ?? 0}
                        </span>
                        <span className="dashboard-smart-kpi-growth up-green">
                          ↑ 15%
                        </span>
                      </div>
                      <span className="dashboard-smart-kpi-subtext">
                        Account and profile findings
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Visual Analytics (Risk Distribution Donut + Findings Trend Chart) */}
              <div className="dashboard-smart-charts-grid">
                {/* Risk Distribution Donut Card */}
                <div className="dashboard-smart-subcard">
                  <div className="dashboard-smart-subcard-header">
                    <div className="dashboard-smart-subcard-header-left">
                      <div className="dashboard-smart-subcard-icon orange">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2a10 10 0 0 1 10 10h-10z" />
                        </svg>
                      </div>
                      <div className="dashboard-smart-subcard-text">
                        <h3>Risk Distribution</h3>
                        <p>Distribution of user risks by severity level.</p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-smart-donut-layout">
                    <div className="dashboard-smart-donut-svg-wrap">
                      {(() => {
                        const crit = Number(riskDistribution.critical || 0);
                        const high = Number(riskDistribution.high || 0);
                        const med = Number(riskDistribution.medium || 0);
                        const low = Number(riskDistribution.low || 0);
                        const total = crit + high + med + low;
                        const pLow = total > 0 ? (low / total) * 100 : 0;
                        const pHigh = total > 0 ? (high / total) * 100 : 0;
                        const pMed = total > 0 ? (med / total) * 100 : 0;
                        const pCrit = total > 0 ? (crit / total) * 100 : 0;
                        const C = 336.15;

                        return (
                          <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle
                              cx="60"
                              cy="60"
                              r="53.5"
                              fill="none"
                              stroke="#f1f5f9"
                              strokeWidth="13"
                            />
                            {/* High Segment (Orange - top and right) */}
                            {pHigh > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="53.5"
                                fill="none"
                                stroke="#ea580c"
                                strokeWidth="13"
                                strokeDasharray={`${(pHigh / 100) * C} ${C}`}
                                strokeDashoffset="0"
                                transform="rotate(-90 60 60)"
                              />
                            )}
                            {/* Medium Segment (Yellow - bottom) */}
                            {pMed > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="53.5"
                                fill="none"
                                stroke="#eab308"
                                strokeWidth="13"
                                strokeDasharray={`${(pMed / 100) * C} ${C}`}
                                strokeDashoffset={`${-((pHigh / 100) * C)}`}
                                transform="rotate(-90 60 60)"
                              />
                            )}
                            {/* Low Segment (Blue - left side) */}
                            {pLow > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="53.5"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="13"
                                strokeDasharray={`${(pLow / 100) * C} ${C}`}
                                strokeDashoffset={`${-(((pHigh + pMed) / 100) * C)}`}
                                transform="rotate(-90 60 60)"
                              />
                            )}
                            {/* Critical Segment */}
                            {pCrit > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="53.5"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="13"
                                strokeDasharray={`${(pCrit / 100) * C} ${C}`}
                                strokeDashoffset={`${-(((pHigh + pMed + pLow) / 100) * C)}`}
                                transform="rotate(-90 60 60)"
                              />
                            )}
                            <text
                              x="60"
                              y="58"
                              textAnchor="middle"
                              fontSize="22"
                              fontWeight="800"
                              fill="#0f172a"
                            >
                              {total}
                            </text>
                            <text
                              x="60"
                              y="73"
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="500"
                              fill="#64748b"
                            >
                              Total Findings
                            </text>
                          </svg>
                        );
                      })()}
                    </div>

                    <div className="dashboard-smart-donut-legend">
                      {(() => {
                        const crit = Number(riskDistribution.critical || 0);
                        const high = Number(riskDistribution.high || 0);
                        const med = Number(riskDistribution.medium || 0);
                        const low = Number(riskDistribution.low || 0);
                        const total = crit + high + med + low;
                        const pCrit =
                          total > 0 ? Math.round((crit / total) * 100) : 0;
                        const pHigh =
                          total > 0 ? Math.round((high / total) * 100) : 0;
                        const pMed =
                          total > 0 ? Math.round((med / total) * 100) : 0;
                        const pLow =
                          total > 0
                            ? Math.max(0, 100 - (pCrit + pHigh + pMed))
                            : 0;

                        return (
                          <>
                            <div className="dashboard-smart-donut-legend-item">
                              <div className="dashboard-smart-legend-left">
                                <span className="dashboard-smart-legend-dot critical" />
                                <span className="dashboard-smart-legend-label">
                                  Critical
                                </span>
                              </div>
                              <span className="dashboard-smart-legend-val">
                                {crit} ({pCrit}%)
                              </span>
                            </div>

                            <div className="dashboard-smart-donut-legend-item">
                              <div className="dashboard-smart-legend-left">
                                <span className="dashboard-smart-legend-dot high" />
                                <span className="dashboard-smart-legend-label">
                                  High
                                </span>
                              </div>
                              <span className="dashboard-smart-legend-val">
                                {high} ({pHigh}%)
                              </span>
                            </div>

                            <div className="dashboard-smart-donut-legend-item">
                              <div className="dashboard-smart-legend-left">
                                <span className="dashboard-smart-legend-dot medium" />
                                <span className="dashboard-smart-legend-label">
                                  Medium
                                </span>
                              </div>
                              <span className="dashboard-smart-legend-val">
                                {med} ({pMed}%)
                              </span>
                            </div>

                            <div className="dashboard-smart-donut-legend-item">
                              <div className="dashboard-smart-legend-left">
                                <span className="dashboard-smart-legend-dot low" />
                                <span className="dashboard-smart-legend-label">
                                  Low
                                </span>
                              </div>
                              <span className="dashboard-smart-legend-val">
                                {low} ({pLow}%)
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Findings Trend Line/Area Chart Card */}
                <div className="dashboard-smart-subcard">
                  <div className="dashboard-smart-subcard-header">
                    <div className="dashboard-smart-subcard-header-left">
                      <div className="dashboard-smart-subcard-icon blue">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 3v18h18" />
                          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                        </svg>
                      </div>
                      <div className="dashboard-smart-subcard-text">
                        <h3>Findings Trend</h3>
                        <p>Number of user findings over the selected period.</p>
                      </div>
                    </div>

                    <div className="dashboard-smart-trend-legend">
                      <div className="dashboard-smart-trend-legend-item">
                        <span className="dashboard-smart-legend-dot critical" />
                        <span>Critical</span>
                      </div>
                      <div className="dashboard-smart-trend-legend-item">
                        <span className="dashboard-smart-legend-dot high" />
                        <span>High</span>
                      </div>
                      <div className="dashboard-smart-trend-legend-item">
                        <span className="dashboard-smart-legend-dot medium" />
                        <span>Medium</span>
                      </div>
                      <div className="dashboard-smart-trend-legend-item">
                        <span className="dashboard-smart-legend-dot low" />
                        <span>Low</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="dashboard-smart-trend-chart-wrap"
                    ref={trendWrapRef}
                  >
                    <svg viewBox="0 0 540 125" preserveAspectRatio="none">
                      <defs>
                        <linearGradient
                          id="orangeTrendGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#ea580c"
                            stopOpacity="0.22"
                          />
                          <stop
                            offset="100%"
                            stopColor="#ea580c"
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="blueTrendGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity="0.18"
                          />
                          <stop
                            offset="100%"
                            stopColor="#3b82f6"
                            stopOpacity="0.0"
                          />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line
                        x1="30"
                        y1="12"
                        x2="530"
                        y2="12"
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <line
                        x1="30"
                        y1="31"
                        x2="530"
                        y2="31"
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <line
                        x1="30"
                        y1="50"
                        x2="530"
                        y2="50"
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <line
                        x1="30"
                        y1="69"
                        x2="530"
                        y2="69"
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <line
                        x1="30"
                        y1="88"
                        x2="530"
                        y2="88"
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <line
                        x1="30"
                        y1="107"
                        x2="530"
                        y2="107"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />

                      {/* Y-Axis Labels */}
                      <text
                        x="22"
                        y="15"
                        fontSize="8.5"
                        fill="#94a3b8"
                        textAnchor="end"
                      >
                        50
                      </text>
                      <text
                        x="22"
                        y="34"
                        fontSize="8.5"
                        fill="#94a3b8"
                        textAnchor="end"
                      >
                        40
                      </text>
                      <text
                        x="22"
                        y="53"
                        fontSize="8.5"
                        fill="#94a3b8"
                        textAnchor="end"
                      >
                        30
                      </text>
                      <text
                        x="22"
                        y="72"
                        fontSize="8.5"
                        fill="#94a3b8"
                        textAnchor="end"
                      >
                        20
                      </text>
                      <text
                        x="22"
                        y="91"
                        fontSize="8.5"
                        fill="#94a3b8"
                        textAnchor="end"
                      >
                        10
                      </text>
                      <text
                        x="22"
                        y="109"
                        fontSize="8.5"
                        fill="#94a3b8"
                        textAnchor="end"
                      >
                        0
                      </text>

                      {/* X-Axis Labels */}
                      <text
                        x="45"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Sep 10
                      </text>
                      <text
                        x="95"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Sep 13
                      </text>
                      <text
                        x="145"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Sep 16
                      </text>
                      <text
                        x="195"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Sep 19
                      </text>
                      <text
                        x="245"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Sep 22
                      </text>
                      <text
                        x="295"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Sep 25
                      </text>
                      <text
                        x="345"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Sep 28
                      </text>
                      <text
                        x="395"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Oct 01
                      </text>
                      <text
                        x="445"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Oct 04
                      </text>
                      <text
                        x="495"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Oct 07
                      </text>
                      <text
                        x="530"
                        y="121"
                        fontSize="8"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        Oct 10
                      </text>

                      {/* Area Fill: Orange (High) */}
                      <path
                        d="M45,98 L95,74 L145,76 L195,53 L245,64 L295,68 L345,55 L395,35 L445,42 L495,48 L530,51 L530,107 L45,107 Z"
                        fill="url(#orangeTrendGrad)"
                      />

                      {/* Area Fill: Blue (Low) */}
                      <path
                        d="M45,104 L95,94 L145,93 L195,83 L245,74 L295,87 L345,78 L395,79 L445,71 L495,59 L530,60 L530,107 L45,107 Z"
                        fill="url(#blueTrendGrad)"
                      />

                      {/* Line: Critical (Red) */}
                      <line
                        x1="45"
                        y1="107"
                        x2="530"
                        y2="107"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />

                      {/* Line: Medium (Yellow) */}
                      <path
                        d="M45,106 L95,105 L145,105 L195,104 L245,105 L295,104 L345,105 L395,103 L445,103 L495,104 L530,105"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="1.5"
                      />

                      {/* Line: Low (Blue) */}
                      <path
                        d="M45,104 L95,94 L145,93 L195,83 L245,74 L295,87 L345,78 L395,79 L445,71 L495,59 L530,60"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                      />

                      {/* Line: High (Orange) */}
                      <path
                        d="M45,98 L95,74 L145,76 L195,53 L245,64 L295,68 L345,55 L395,35 L445,42 L495,48 L530,51"
                        fill="none"
                        stroke="#ea580c"
                        strokeWidth="2"
                      />

                      {/* Active point vertical guideline */}
                      {activeTrendIndex !== null &&
                        findingsTrendPoints[activeTrendIndex] && (
                          <line
                            x1={findingsTrendPoints[activeTrendIndex].x}
                            y1="12"
                            x2={findingsTrendPoints[activeTrendIndex].x}
                            y2="107"
                            stroke="#94a3b8"
                            strokeWidth="1.2"
                            strokeDasharray="2.5 2.5"
                            opacity="0.8"
                          />
                        )}

                      {/* Interactive dots and column hit-targets */}
                      {findingsTrendPoints.map((pt, i) => {
                        const isSelected = activeTrendIndex === i;
                        return (
                          <g key={`trend-point-${i}`}>
                            {/* Hit-area rect for effortless clicking */}
                            <rect
                              x={pt.x - 16}
                              y="10"
                              width="32"
                              height="102"
                              fill="transparent"
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTrendIndex((prev) =>
                                  prev === i ? null : i,
                                );
                              }}
                            />

                            {/* High Dot (Orange) */}
                            <circle
                              cx={pt.x}
                              cy={pt.highY}
                              r={isSelected ? 4.8 : 2.8}
                              fill="#ea580c"
                              stroke="#ffffff"
                              strokeWidth={isSelected ? 2 : 1.5}
                              style={{
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTrendIndex((prev) =>
                                  prev === i ? null : i,
                                );
                              }}
                            />

                            {/* Low Dot (Blue) */}
                            <circle
                              cx={pt.x}
                              cy={pt.lowY}
                              r={isSelected ? 4.8 : 2.8}
                              fill="#2563eb"
                              stroke="#ffffff"
                              strokeWidth={isSelected ? 2 : 1.5}
                              style={{
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTrendIndex((prev) =>
                                  prev === i ? null : i,
                                );
                              }}
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Tooltip Card Matching Pic 2 */}
                    {activeTrendIndex !== null &&
                      findingsTrendPoints[activeTrendIndex] &&
                      (() => {
                        const pt = findingsTrendPoints[activeTrendIndex];
                        let transform = "translate(-50%, 0)";
                        if (pt.x < 110) {
                          transform = "translate(-10%, 0)";
                        } else if (pt.x > 450) {
                          transform = "translate(-90%, 0)";
                        }

                        return (
                          <div
                            className="dashboard-smart-trend-tooltip"
                            style={{
                              left: `${(pt.x / 540) * 100}%`,
                              transform,
                            }}
                          >
                            <div className="dashboard-smart-trend-tooltip-date">
                              {pt.date}
                            </div>
                            <div className="dashboard-smart-trend-tooltip-item critical">
                              Critical : {pt.critical}
                            </div>
                            <div className="dashboard-smart-trend-tooltip-item high">
                              High : {pt.high}
                            </div>
                            <div className="dashboard-smart-trend-tooltip-item medium">
                              Medium : {pt.medium}
                            </div>
                            <div className="dashboard-smart-trend-tooltip-item low">
                              Low : {pt.low}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                </div>
              </div>

              {/* Row 3: Prioritized Findings Table + Recommended Actions */}
              <div className="dashboard-smart-findings-grid">
                {/* Findings Table Card */}
                <div className="dashboard-smart-subcard">
                  <div className="dashboard-smart-subcard-header">
                    <div className="dashboard-smart-subcard-header-left">
                      <div className="dashboard-smart-subcard-icon red">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="2" r="2" />
                        </svg>
                      </div>
                      <div className="dashboard-smart-subcard-text">
                        <h3>Top Prioritized Findings</h3>
                        <p>
                          Users with the highest risks that require your
                          attention.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="dashboard-smart-link-btn"
                      onClick={() => setShowAllFindings(true)}
                    >
                      <span>View All Findings</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="14"
                        height="14"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>

                  <div className="dashboard-smart-findings-toolbar">
                    <div className="dashboard-smart-findings-search">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        width="14"
                        height="14"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search findings (user, issue, severity...)"
                        value={findingsSearch}
                        onChange={(e) => setFindingsSearch(e.target.value)}
                      />
                      {findingsSearch && (
                        <button
                          type="button"
                          className="dashboard-smart-search-clear"
                          onClick={() => setFindingsSearch("")}
                          title="Clear search"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="dashboard-smart-severity-control">
                      <label htmlFor="smart-findings-severity">Severity</label>
                      <select
                        id="smart-findings-severity"
                        className="dashboard-smart-severity-select"
                        value={severityFilter}
                        onChange={(event) =>
                          setSeverityFilter(event.target.value)
                        }
                      >
                        <option value="all">All severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="dashboard-smart-table-wrapper">
                    <table className="dashboard-smart-table">
                      <thead>
                        <tr>
                          <th style={{ width: "35px" }}>#</th>
                          <th>USER</th>
                          <th>DETECTED ISSUE</th>
                          <th>SEVERITY</th>
                          <th>REASON</th>
                          <th>RECOMMENDED ACTION</th>
                          <th style={{ textAlign: "right" }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFindings.length === 0 ? (
                          <tr>
                            <td
                              colSpan="7"
                              style={{
                                textAlign: "center",
                                padding: "28px 16px",
                                color: "#64748b",
                                fontSize: "12px",
                              }}
                            >
                              No findings match your search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          visibleFindings.slice(0, 5).map((finding, idx) => (
                            <tr
                              key={finding.id || idx}
                              style={{
                                position: "relative",
                                zIndex:
                                  activeFindingMenuId === (finding.id || idx)
                                    ? 50
                                    : 1,
                              }}
                            >
                              <td className="dashboard-smart-row-index">
                                {idx + 1}
                              </td>
                              <td>
                                <div className="dashboard-smart-user-cell">
                                  <div className="dashboard-smart-user-avatar">
                                    {getInitials(
                                      finding.userName || finding.name,
                                    )}
                                  </div>
                                  <div className="dashboard-smart-user-text">
                                    <span className="dashboard-smart-user-name">
                                      {typeof (
                                        finding.userName || finding.name
                                      ) === "string"
                                        ? finding.userName || finding.name
                                        : "User"}
                                    </span>
                                    <span className="dashboard-smart-user-email">
                                      {typeof finding.email === "string"
                                        ? finding.email
                                        : "--"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="dashboard-smart-issue-cell">
                                  <svg
                                    className="dashboard-smart-issue-icon"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
                                  </svg>
                                  {typeof finding.issue === "string"
                                    ? finding.issue
                                    : "Missing permission role"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`dashboard-smart-severity-badge ${typeof finding.severity === "string" ? finding.severity : "high"}`}
                                >
                                  <svg
                                    className="dashboard-smart-badge-icon"
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
                                    <circle
                                      cx="12"
                                      cy="17"
                                      r="1.3"
                                      fill="#ffffff"
                                    />
                                  </svg>
                                  {typeof finding.severity === "string"
                                    ? finding.severity.charAt(0).toUpperCase() +
                                      finding.severity.slice(1)
                                    : "High"}
                                </span>
                              </td>
                              <td>
                                <span className="dashboard-smart-reason-cell">
                                  {typeof finding.reason === "string"
                                    ? finding.reason
                                    : "No valid permission role is assigned to this account."}
                                </span>
                              </td>
                              <td>
                                <span className="dashboard-smart-action-cell">
                                  {typeof finding.recommendedAction === "string"
                                    ? finding.recommendedAction
                                    : "Review the account and assign the appropriate permission role if required."}
                                </span>
                              </td>
                              <td>
                                <div
                                  className="dashboard-smart-actions-cell"
                                  style={{
                                    justifyContent: "flex-end",
                                    position: "relative",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="dashboard-smart-more-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveFindingMenuId(
                                        activeFindingMenuId ===
                                          (finding.id || idx)
                                          ? null
                                          : finding.id || idx,
                                      );
                                    }}
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

                                  {activeFindingMenuId ===
                                    (finding.id || idx) && (
                                    <div
                                      className="dashboard-smart-row-menu"
                                      ref={findingMenuRef}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveFindingMenuId(null);
                                          handleFindingView(finding);
                                        }}
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          width="14"
                                          height="14"
                                        >
                                          <circle cx="12" cy="12" r="10" />
                                          <polyline points="12 6 12 12 14 14" />
                                        </svg>
                                        <span>View User 360°</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveFindingMenuId(null);
                                          navigate(
                                            `/users?search=${encodeURIComponent(finding.email || finding.userName)}`,
                                          );
                                        }}
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          width="14"
                                          height="14"
                                        >
                                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                          <circle cx="9" cy="7" r="4" />
                                        </svg>
                                        <span>Review User</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveFindingMenuId(null);
                                          navigate("/tasks");
                                        }}
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          width="14"
                                          height="14"
                                        >
                                          <path d="M9 11l3 3L22 4" />
                                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                        </svg>
                                        <span>View Tasks</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recommended Actions Stack Card */}
                <div className="dashboard-smart-subcard">
                  <div className="dashboard-smart-subcard-header">
                    <div className="dashboard-smart-subcard-header-left">
                      <div className="dashboard-smart-subcard-icon bulb">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 18h6" />
                          <path d="M10 22h4" />
                          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
                        </svg>
                      </div>
                      <div className="dashboard-smart-subcard-text">
                        <h3>Recommended Actions</h3>
                        <p>
                          Take quick actions to resolve user risks and improve
                          security.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-smart-actions-stack">
                    {/* Action 1: Review Users */}
                    <div
                      className="dashboard-smart-rec-action-card orange"
                      onClick={() => setShowAllFindings(true)}
                    >
                      <div className="dashboard-smart-rec-left">
                        <div className="dashboard-smart-rec-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <polyline points="9 12 11 14 15 10" />
                          </svg>
                        </div>
                        <div className="dashboard-smart-rec-info">
                          <h4>Review Users</h4>
                          <p>Check user details and assign proper roles.</p>
                        </div>
                      </div>
                      <div className="dashboard-smart-rec-arrow">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>

                    {/* Action 2: View Tasks */}
                    <div
                      className="dashboard-smart-rec-action-card blue"
                      onClick={() => {}}
                    >
                      <div className="dashboard-smart-rec-left">
                        <div className="dashboard-smart-rec-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </svg>
                        </div>
                        <div className="dashboard-smart-rec-info">
                          <h4>View Tasks</h4>
                          <p>See related tasks and pending actions.</p>
                        </div>
                      </div>
                      <div className="dashboard-smart-rec-arrow">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>

                    {/* Action 3: Open User 360 */}
                    <div
                      className="dashboard-smart-rec-action-card white"
                      onClick={() => {
                        const target =
                          users[0] ||
                          (visibleFindings[0]?.userId
                            ? {
                                id: visibleFindings[0].userId,
                                name: visibleFindings[0].userName,
                                email: visibleFindings[0].email,
                                role: visibleFindings[0].role,
                              }
                            : {
                                id: 1,
                                name: "Demo User",
                                email: "user@demo.com",
                                role: "employee",
                              });
                        setSelectedUser(target);
                        setShowUser360(true);
                      }}
                    >
                      <div className="dashboard-smart-rec-left">
                        <div className="dashboard-smart-rec-icon">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </div>
                        <div className="dashboard-smart-rec-info">
                          <h4>Open User 360°</h4>
                          <p>View complete user profile and Activity.</p>
                        </div>
                      </div>
                      <div className="dashboard-smart-rec-arrow">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Recent Risk Activities */}
              <div className="dashboard-smart-subcard">
                <div className="dashboard-smart-subcard-header">
                  <div className="dashboard-smart-subcard-header-left">
                    <div className="dashboard-smart-subcard-icon blue">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div className="dashboard-smart-subcard-text">
                      <h3>Recent Risk Activities</h3>
                      <p>Latest risk-related activities in the system.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="dashboard-smart-link-btn"
                    onClick={() => navigate("/activity-logs")}
                  >
                    <span>View Activity Log</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="14"
                      height="14"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>

                <div className="dashboard-smart-activities-grid">
                  {recentActivities.map((act) => (
                    <div
                      className="dashboard-smart-activity-item"
                      key={act.id}
                      onClick={() => handleActivityCardClick(act)}
                      title={`View ${act.targetUserName || "user"} activity log`}
                    >
                      <div
                        className={`dashboard-smart-activity-icon ${act.type || "orange"}`}
                      >
                        {act.type === "green" ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                          </svg>
                        ) : act.type === "blue" ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                        ) : act.type === "purple" ? (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        )}
                      </div>
                      <div className="dashboard-smart-activity-info">
                        <span className="dashboard-smart-activity-title">
                          {typeof act.title === "string"
                            ? act.title
                            : "Activity"}
                        </span>
                        <span className="dashboard-smart-activity-subtext">
                          {typeof act.description === "string"
                            ? act.description
                            : "Details"}
                        </span>
                        <span className="dashboard-smart-activity-time">
                          {typeof act.time === "string" ? act.time : "Recent"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Modal: Users to Review matching Pic 1 */}
          <ReviewUsersModal
            isOpen={showAllFindings}
            onClose={() => setShowAllFindings(false)}
            findings={findings}
            users={users}
            onViewUser360={(findingUser) => {
              setShowAllFindings(false);
              handleFindingView(findingUser);
            }}
            onAssignRole={() => {
              // Feature not yet implemented - do nothing as requested
            }}
            onViewTasks={() => {
              setShowAllFindings(false);
              navigate("/tasks");
            }}
          />
        </section>

        {canViewUsers && (
          <section className="dashboard-users-panel">
            <div className="dashboard-users-header">
              <div>
                <h2>Users</h2>
                <p>{totalRecords} user(s) found</p>
              </div>
            </div>

            <div className="dashboard-users-table-wrapper">
              <Table
                columns={columns}
                data={usersLoading ? [] : users}
                emptyMessage={
                  usersLoading ? (
                    <div
                      style={{
                        height: "260px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Loader text="Loading users..." />
                    </div>
                  ) : users.length === 0 ? (
                    <div
                      style={{
                        height: "260px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "#64748b",
                      }}
                    >
                      No users found for the selected filters.
                    </div>
                  ) : (
                    "No data"
                  )
                }
                renderRow={(user, index, gridTemplate) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    gridTemplate={gridTemplate}
                    index={(currentPage - 1) * USERS_PER_PAGE + index + 1}
                    isAdmin={true}
                    userRole={user.role}
                    canEditUsers={canEditUsers}
                    canDeleteUsers={canDeleteUsers}
                    onView={handleOpenUser360}
                    openUserMenuId={openUserMenuId}
                    setOpenUserMenuId={setOpenUserMenuId}
                    openMenuUp={true}
                    onSuccess={() => {}}
                    refreshUsers={() => {}}
                  />
                )}
              />
            </div>

            {totalPages > 0 && (
              <div
                className="task-pagination small-pagination"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "5px",
                  marginBottom: "5px",
                }}
              >
                <div className="task-pagination-controls">
                  <button
                    type="button"
                    className="pagination-button pagination-arrow"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || usersLoading}
                    aria-label="First page"
                    title="First page"
                  >
                    «
                  </button>

                  <button
                    type="button"
                    className="pagination-button pagination-arrow"
                    onClick={() =>
                      handlePageChange(Math.max(currentPage - 1, 1))
                    }
                    disabled={currentPage === 1 || usersLoading}
                    aria-label="Previous page"
                    title="Previous page"
                  >
                    ⟨
                  </button>

                  {getPaginationPages().map((page, index) => {
                    if (page === "...") {
                      return (
                        <span key={`dots-${index}`} className="pagination-dots">
                          ...
                        </span>
                      );
                    }

                    return (
                      <button
                        key={page}
                        type="button"
                        className={`pagination-number ${
                          currentPage === page ? "active" : ""
                        }`}
                        onClick={() => handlePageChange(page)}
                        disabled={usersLoading}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="pagination-button pagination-arrow"
                    onClick={() =>
                      handlePageChange(Math.min(currentPage + 1, totalPages))
                    }
                    disabled={currentPage === totalPages || usersLoading}
                    aria-label="Next page"
                    title="Next page"
                  >
                    ⟩
                  </button>

                  <button
                    type="button"
                    className="pagination-button pagination-arrow"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages || usersLoading}
                    aria-label="Last page"
                    title="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <User360Modal
          isOpen={showUser360}
          user={selectedUser}
          onClose={handleCloseUser360}
        />

        {/* Activity Details Modal for Recent Risk Activities */}
        <Modal
          isOpen={!!selectedActivityLog}
          onClose={() => setSelectedActivityLog(null)}
          className="activity-details-modal-box"
        >
          <div className="activity-details-modal-content">
            {selectedActivityLog && (
              <ActivityDetailsView
                log={selectedActivityLog}
                user={
                  users.find(
                    (u) =>
                      String(u.id) ===
                        String(
                          selectedActivityLog.target_user ||
                            selectedActivityLog.targetUser ||
                            selectedActivityLog.userId,
                        ) ||
                      (selectedActivityLog.target_user_name &&
                        u.name?.toLowerCase() ===
                          selectedActivityLog.target_user_name.toLowerCase()),
                  ) || {
                    name: selectedActivityLog.target_user_name,
                    id: selectedActivityLog.target_user,
                  }
                }
                onClose={() => setSelectedActivityLog(null)}
              />
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default Dashboard;
