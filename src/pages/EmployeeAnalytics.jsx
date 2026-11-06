import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TaskAnalytics.css";

import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";

import {
  getTaskAnalyticsOverview,
  getOverdueTasksAnalytics,
  getTaskExplorer,
  exportTaskAnalytics,
} from "../services/analyticsService";
import { getCommonMasterByType } from "../services/commonMasterService";
import CustomDatePicker from "../components/CustomDatePicker";

const PERF_AVATAR_PALETTE = [
  { bg: "#ffedd5", text: "#ea580c" },
  { bg: "#dbeafe", text: "#2563eb" },
  { bg: "#e0f2fe", text: "#0284c7" },
  { bg: "#f3e8ff", text: "#9333ea" },
  { bg: "#fae8ff", text: "#c026d3" },
];

const generateConicGradient = (data, colorMap, keyField) => {
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0);
  if (total === 0) return "conic-gradient(#e2e8f0 0 100%)";

  const gradientParts = [];
  let currentPercentage = 0;

  data.forEach((item) => {
    const count = Number(item.count || 0);
    if (count > 0) {
      const percentage = (count / total) * 100;
      const color = colorMap[item[keyField]] || "#cbd5e1";
      gradientParts.push(
        `${color} ${currentPercentage}% ${currentPercentage + percentage}%`,
      );
      currentPercentage += percentage;
    }
  });

  return `conic-gradient(${gradientParts.join(", ")})`;
};

function EmployeeAnalytics() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionPercentage: 0,
  });

  const [statusData, setStatusData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [employeePerformanceData, setEmployeePerformanceData] = useState([]);
  const [overdueTasksData, setOverdueTasksData] = useState([]);
  const [taskAgingData, setTaskAgingData] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [resolutionTime, setResolutionTime] = useState({
    resolvedTasks: 0,
    averageResolutionDays: 0,
    fastestResolutionDays: 0,
    longestResolutionDays: 0,
  });
  const [employeeInsights, setEmployeeInsights] = useState([]);

  const [overdueLoading, setOverdueLoading] = useState(false);
  const [overdueSearch, setOverdueSearch] = useState("");
  const [overdueFilter, setOverdueFilter] = useState("all");
  const [overduePage, setOverduePage] = useState(1);
  const [overduePerPage, setOverduePerPage] = useState(5);
  const [overdueView, setOverdueView] = useState("overdue");

  const [overduePagination, setOverduePagination] = useState({
    page: 1,
    limit: 5,
    totalRecords: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const [dateRange, setDateRange] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customDatePopupOpen, setCustomDatePopupOpen] = useState(false);

  const [taskType, setTaskType] = useState("");
  const [status, setStatus] = useState("");

  const [taskTypeDropdownOpen, setTaskTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const customDatePopupRef = useRef(null);
  const taskTypeDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  const [availableTaskTypes, setAvailableTaskTypes] = useState([
    { value: "basic", label: "Basic" },
    { value: "normal", label: "Normal" },
    { value: "hard", label: "Hard" },
  ]);

  const loadAnalytics = async () => {
    if (dateRange === "custom" && (!customFrom || !customTo)) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await getTaskAnalyticsOverview(
        token,
        dateRange,
        "",
        taskType,
        status,
        customFrom,
        customTo,
      );

      if (!response?.success) {
        setError(response?.message || "Failed to load analytics");
        return;
      }

      const data = response.data || {};

      setAnalytics(
        data.overview || {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          completionPercentage: 0,
        },
      );

      setStatusData(data.taskStatus || []);
      setTypeData(data.taskTypes || []);
      setTrendData(data.taskTrend || []);
      setEmployeePerformanceData(data.employeePerformance || []);
      setTaskAgingData(data.taskAging || []);
      setUpcomingDeadlines(data.upcomingDeadlines || []);
      setResolutionTime(
        data.resolutionTime || {
          resolvedTasks: 0,
          averageResolutionDays: 0,
          fastestResolutionDays: 0,
          longestResolutionDays: 0,
        },
      );
      setEmployeeInsights(data.employeeInsights || []);
    } catch (error) {
      console.error("GET EMPLOYEE TASK ANALYTICS ERROR:", error);
      setError(
        error.response?.data?.message || "Failed to load task analytics",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (dateRange === "custom" && (!customFrom || !customTo)) {
      return;
    }

    try {
      setExportLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await exportTaskAnalytics(
        token,
        dateRange,
        "",
        taskType,
        status,
        customFrom,
        customTo,
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let fileName = "My_Task_Analytics.xlsx";

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match?.[1]) {
          fileName = match[1];
        }
      }

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("EXPORT EMPLOYEE TASK ANALYTICS ERROR:", error);
      setError(
        error.response?.data?.message || "Failed to export task analytics",
      );
    } finally {
      setExportLoading(false);
    }
  };

  const resetOverduePagination = () => {
    setOverduePage(1);
    setOverduePagination((current) => ({
      ...current,
      page: 1,
    }));
  };

  const loadOverdueTasks = async (minimumLoadingTime = 500) => {
    if (dateRange === "custom" && (!customFrom || !customTo)) {
      return;
    }

    const startedAt = Date.now();

    try {
      setOverdueLoading(true);
      const token = localStorage.getItem("token");

      if (overdueView === "all") {
        const response = await getTaskExplorer(
          token,
          overduePage,
          overduePerPage,
          overdueSearch,
          "",
          taskType,
          status,
          dateRange,
          customFrom,
          customTo,
        );

        if (!response?.success) {
          console.error(response?.message || "Failed to load tasks");
          setOverdueTasksData([]);
          setOverduePagination({
            page: overduePage,
            limit: overduePerPage,
            totalRecords: 0,
            totalPages: 0,
          });
          return;
        }

        setOverdueTasksData(response.data || []);
        setOverduePagination(
          response.pagination || {
            page: overduePage,
            limit: overduePerPage,
            totalRecords: 0,
            totalPages: 0,
          },
        );
      } else {
        const response = await getOverdueTasksAnalytics(
          token,
          overduePage,
          overduePerPage,
          overdueSearch,
          overdueFilter,
          dateRange,
          "",
          taskType,
          status,
          customFrom,
          customTo,
        );

        if (!response?.success) {
          console.error(response?.message || "Failed to load overdue tasks");
          setOverdueTasksData([]);
          setOverduePagination({
            page: overduePage,
            limit: overduePerPage,
            totalRecords: 0,
            totalPages: 0,
          });
          return;
        }

        setOverdueTasksData(response.data || []);
        setOverduePagination(
          response.pagination || {
            page: overduePage,
            limit: overduePerPage,
            totalRecords: 0,
            totalPages: 0,
          },
        );
      }
    } catch (error) {
      console.error("GET EMPLOYEE TASK TABLE ERROR:", error);
      setOverdueTasksData([]);
      setOverduePagination({
        page: overduePage,
        limit: overduePerPage,
        totalRecords: 0,
        totalPages: 0,
      });
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = minimumLoadingTime - elapsed;

      if (remaining > 0) {
        setTimeout(() => {
          setOverdueLoading(false);
        }, remaining);
      } else {
        setOverdueLoading(false);
      }
    }
  };

  useEffect(() => {
    if (dateRange === "custom" && (!customFrom || !customTo)) {
      return;
    }
    loadAnalytics();
  }, [dateRange, customFrom, customTo, taskType, status]);

  useEffect(() => {
    if (dateRange === "custom" && (!customFrom || !customTo)) {
      return;
    }

    const timer = setTimeout(() => {
      loadOverdueTasks(overdueSearch ? 900 : 500);
    }, 300);

    return () => clearTimeout(timer);
  }, [
    overduePage,
    overduePerPage,
    overdueSearch,
    overdueFilter,
    overdueView,
    dateRange,
    customFrom,
    customTo,
    taskType,
    status,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        customDatePopupRef.current &&
        !customDatePopupRef.current.contains(event.target)
      ) {
        setCustomDatePopupOpen(false);
      }

      if (
        taskTypeDropdownRef.current &&
        !taskTypeDropdownRef.current.contains(event.target)
      ) {
        setTaskTypeDropdownOpen(false);
      }

      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchTaskTypes = async () => {
      try {
        const res = await getCommonMasterByType("task_type");
        if (Array.isArray(res?.data) && res.data.length > 0) {
          setAvailableTaskTypes(
            res.data.map((item) => ({
              value: item.name,
              label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load task types in EmployeeAnalytics:", err);
      }
    };

    fetchTaskTypes();
  }, []);

  const changeDateRange = (value) => {
    setOverduePage(1);
    setOverduePagination((current) => ({
      ...current,
      page: 1,
    }));

    if (value === "custom") {
      setDateRange("custom");
      setCustomDatePopupOpen(true);
      return;
    }

    setDateRange(value);
    setCustomFrom("");
    setCustomTo("");
    setCustomDatePopupOpen(false);
  };

  const applyCustomDateRange = () => {
    if (!customFrom || !customTo) {
      return;
    }

    if (customFrom > customTo) {
      setError("The From date cannot be after the To date.");
      return;
    }

    setError("");
    setDateRange("custom");
    setOverduePage(1);
    setCustomDatePopupOpen(false);
  };

  const clearDateRange = () => {
    setDateRange("");
    setCustomFrom("");
    setCustomTo("");
    setCustomDatePopupOpen(false);
    setOverduePage(1);
    setOverduePagination((current) => ({
      ...current,
      page: 1,
    }));
  };

  const statusColors = {
    Completed: "#16a34a",
    "In Progress": "#2563eb",
    Pending: "#f97316",
    Overdue: "#ef4444",
    completed: "#16a34a",
    "in-progress": "#2563eb",
    pending: "#f97316",
    overdue: "#ef4444",
    Blocked: "#64748b",
    Cancelled: "#94a3b8",
  };

  const typeColors = {
    Basic: "#f97316",
    Normal: "#2563eb",
    Hard: "#0f172a",
    basic: "#f97316",
    normal: "#2563eb",
    hard: "#0f172a",
    Travel: "#f97316",
    Development: "#2563eb",
    Design: "#10b981",
  };

  const formatCustomDate = (date) => {
    if (!date) return "";
    const parts = String(date).split("T")[0].split("-");
    if (parts.length !== 3) return date;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatMonthDayYear = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const m = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, "0");
    const yr = d.getFullYear();
    return `${m} ${day}, ${yr}`;
  };

  const getHeaderDateRangeDisplay = () => {
    if (dateRange === "custom" && customFrom && customTo) {
      return `${formatMonthDayYear(customFrom)} - ${formatMonthDayYear(customTo)}`;
    }
    const days = dateRange ? Number(dateRange) : 7;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    return `${formatMonthDayYear(start)} - ${formatMonthDayYear(end)}`;
  };

  const getDateRangeLabel = () => {
    if (dateRange === "custom") {
      if (customFrom && customTo) {
        return `${formatCustomDate(customFrom)} - ${formatCustomDate(
          customTo,
        )}`;
      }
      return "Custom Date Range";
    }
    if (dateRange) {
      return `Last ${dateRange} Days`;
    }
    return "All Dates";
  };

  const resetAllFilters = () => {
    setDateRange("");
    setCustomFrom("");
    setCustomTo("");
    setCustomDatePopupOpen(false);
    setTaskType("");
    setStatus("");
    setOverduePage(1);
    setOverduePagination((current) => ({
      ...current,
      page: 1,
    }));
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "--";
    const parts = String(dateStr).split("T")[0].split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDuration = (task) => {
    if (task.duration) return task.duration;
    const start = task.startingAt || task.startTime;
    const end = task.endingAt || task.endTime;
    if (!start) return "--";
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    if (isNaN(startTime) || isNaN(endTime)) return "--";
    const diffSec = Math.max(0, Math.floor((endTime - startTime) / 1000));
    const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
    const secs = String(diffSec % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const cards = [
    {
      title: "Total Tasks",
      value: analytics.totalTasks,
      className: "card-total",
      iconClass: "total",
      barColor: "#ea580c",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      trend: "+12%",
      trendDir: "up",
      trendType: "positive",
      status: "",
      clickable: true,
    },
    {
      title: "Completed",
      value: analytics.completedTasks,
      className: "card-completed",
      iconClass: "completed",
      barColor: "#16a34a",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#16a34a" stroke="#16a34a">
          <circle cx="12" cy="12" r="10" fill="#16a34a" stroke="none" />
          <polyline points="8 12 11 15 16 9" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      trend: "+8%",
      trendDir: "up",
      trendType: "positive",
      status: "completed",
      clickable: true,
    },
    {
      title: "In Progress",
      value: analytics.inProgressTasks,
      className: "card-progress",
      iconClass: "progress",
      barColor: "#2563eb",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
      ),
      trend: "-20%",
      trendDir: "down",
      trendType: "negative",
      status: "in-progress",
      clickable: true,
    },
    {
      title: "Pending",
      value: analytics.pendingTasks,
      className: "card-pending",
      iconClass: "pending",
      barColor: "#ea580c",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ea580c">
          <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6z"/>
        </svg>
      ),
      trend: "+17%",
      trendDir: "up",
      trendType: "positive",
      status: "pending",
      clickable: true,
    },
    {
      title: "Overdue",
      value: analytics.overdueTasks,
      className: "card-overdue",
      iconClass: "overdue",
      barColor: "#ef4444",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="7" x2="12" y2="13" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="12" cy="17" r="1.25" fill="#ffffff"/>
        </svg>
      ),
      trend: "+5%",
      trendDir: "up",
      trendType: "warning",
      status: "overdue",
      clickable: true,
    },
    {
      title: "Completion Rate",
      value: `${analytics.completionPercentage}%`,
      className: "card-completion",
      iconClass: "completion",
      barColor: "#9333ea",
      icon: (
        <span style={{ fontSize: "16px", fontWeight: "800", color: "#9333ea" }}>%</span>
      ),
      trend: "+2.4%",
      trendDir: "up",
      trendType: "positive",
      status: "",
      clickable: false,
    },
  ];

  const totalStatusCount = statusData.reduce(
    (total, item) => total + Number(item.count || 0),
    0,
  );

  const totalTypeCount = typeData.reduce(
    (total, item) => total + Number(item.count || 0),
    0,
  );

  const getOverduePaginationPages = () => {
    const pages = [];
    const totalPages = overduePagination.totalPages;

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) {
        pages.push(i);
      }
      return pages;
    }

    if (overduePage <= 3) {
      pages.push(1, 2, 3, "...", totalPages);
      return pages;
    }

    if (overduePage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      return pages;
    }

    pages.push(
      1,
      "...",
      overduePage - 1,
      overduePage,
      overduePage + 1,
      "...",
      totalPages,
    );

    return pages;
  };

  return (
    <div className="task-analytics-page dashboard-container">
      <div className="task-analytics-shell">
        <div className="analytics-page-heading">
          <div className="analytics-page-heading-content">
            <span className="dashboard-eyebrow">TASK MANAGEMENT</span>
            <h1>My Analytics</h1>
            <p>Monitor your task workload, progress and performance across your tasks.</p>
          </div>

          <div className="analytics-header-controls">

            <button
              type="button"
              className="analytics-export-button"
              onClick={handleExport}
              disabled={
                exportLoading ||
                (dateRange === "custom" && (!customFrom || !customTo))
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>{exportLoading ? "Exporting..." : "Export Report"}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="analytics-loading">
            <div className="analytics-loading-spinner"></div>
            <span>Loading your task analytics...</span>
          </div>
        ) : error ? (
          <div className="analytics-error-state">
            <h2>Unable to load employee task analytics</h2>
            <p>Please try again later.</p>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="analytics-filters-card">
              <div className="filter-item">
                <div className="filter-dropdown-wrapper" ref={customDatePopupRef}>
                  <button
                    type="button"
                    className={`filter-input-btn ${customDatePopupOpen ? "open" : ""}`}
                    onClick={() => setCustomDatePopupOpen(!customDatePopupOpen)}
                  >
                    <div className="filter-input-content">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span>{getDateRangeLabel()}</span>
                    </div>
                    <span className="filter-arrow">⌵</span>
                  </button>

                  {customDatePopupOpen && (
                    <div className="custom-date-popup">
                      <div className="custom-date-popup-header">
                        <strong>Select Date Range</strong>
                        <button type="button" onClick={() => setCustomDatePopupOpen(false)}>×</button>
                      </div>
                      <div className="date-range-options">
                        <button type="button" onClick={clearDateRange}>All Dates</button>
                        <button type="button" onClick={() => changeDateRange("3")}>Last 3 Days</button>
                        <button type="button" onClick={() => changeDateRange("7")}>Last 7 Days</button>
                        <button type="button" onClick={() => changeDateRange("30")}>Last 30 Days</button>
                        <button type="button" onClick={() => changeDateRange("90")}>Last 90 Days</button>
                      </div>
                      <div className="custom-date-popup-fields">
                        <div className="custom-date-field">
                          <label>From</label>
                          <CustomDatePicker
                            value={customFrom}
                            onChange={(e) => {
                              setDateRange("custom");
                              setCustomFrom(e.target.value);
                            }}
                          />
                        </div>
                        <div className="custom-date-field">
                          <label>To</label>
                          <CustomDatePicker
                            value={customTo}
                            min={customFrom || undefined}
                            onChange={(e) => {
                              setDateRange("custom");
                              setCustomTo(e.target.value);
                            }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className="custom-date-apply"
                        disabled={!customFrom || !customTo}
                        onClick={applyCustomDateRange}
                      >
                        Apply Date Range
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="filter-item">
                <div className="filter-dropdown-wrapper" ref={taskTypeDropdownRef}>
                  <button
                    type="button"
                    className={`filter-input-btn ${taskTypeDropdownOpen ? "open" : ""}`}
                    onClick={() => setTaskTypeDropdownOpen(!taskTypeDropdownOpen)}
                  >
                    <div className="filter-input-content">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                      <span>
                        {taskType === ""
                          ? "All Task Types"
                          : availableTaskTypes.find(
                              (t) => t.value.toLowerCase() === taskType.toLowerCase()
                            )?.label ||
                            taskType.charAt(0).toUpperCase() + taskType.slice(1)}
                      </span>
                    </div>
                    <span className="filter-arrow">⌵</span>
                  </button>

                  {taskTypeDropdownOpen && (
                    <div className="filter-menu-popup">
                      <button
                        type="button"
                        className={`filter-menu-option ${taskType === "" ? "selected" : ""}`}
                        onClick={() => {
                          setTaskType("");
                          setTaskTypeDropdownOpen(false);
                          resetOverduePagination();
                        }}
                      >
                        All Task Types
                      </button>
                      {availableTaskTypes.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          className={`filter-menu-option ${
                            taskType.toLowerCase() === t.value.toLowerCase() ? "selected" : ""
                          }`}
                          onClick={() => {
                            setTaskType(t.value);
                            setTaskTypeDropdownOpen(false);
                            resetOverduePagination();
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="filter-item">
                <div className="filter-dropdown-wrapper" ref={statusDropdownRef}>
                  <button
                    type="button"
                    className={`filter-input-btn ${statusDropdownOpen ? "open" : ""}`}
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  >
                    <div className="filter-input-content">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>
                        {status === ""
                          ? "All Status"
                          : status === "pending"
                            ? "Pending"
                            : status === "in-progress"
                              ? "In Progress"
                              : status === "completed"
                                ? "Completed"
                                : "Overdue"}
                      </span>
                    </div>
                    <span className="filter-arrow">⌵</span>
                  </button>

                  {statusDropdownOpen && (
                    <div className="filter-menu-popup">
                      <button
                        type="button"
                        className={`filter-menu-option ${status === "" ? "selected" : ""}`}
                        onClick={() => {
                          setStatus("");
                          setStatusDropdownOpen(false);
                          resetOverduePagination();
                        }}
                      >
                        All Status
                      </button>
                      <button
                        type="button"
                        className={`filter-menu-option ${status === "pending" ? "selected" : ""}`}
                        onClick={() => {
                          setStatus("pending");
                          setStatusDropdownOpen(false);
                          resetOverduePagination();
                        }}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        className={`filter-menu-option ${status === "in-progress" ? "selected" : ""}`}
                        onClick={() => {
                          setStatus("in-progress");
                          setStatusDropdownOpen(false);
                          resetOverduePagination();
                        }}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        className={`filter-menu-option ${status === "completed" ? "selected" : ""}`}
                        onClick={() => {
                          setStatus("completed");
                          setStatusDropdownOpen(false);
                          resetOverduePagination();
                        }}
                      >
                        Completed
                      </button>
                      <button
                        type="button"
                        className={`filter-menu-option ${status === "overdue" ? "selected" : ""}`}
                        onClick={() => {
                          setStatus("overdue");
                          setStatusDropdownOpen(false);
                          resetOverduePagination();
                        }}
                      >
                        Overdue
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="filter-item-reset">
                <button
                  type="button"
                  className="filter-reset-btn"
                  onClick={resetAllFilters}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
            <div className="analytics-kpi-grid">
              {cards.map((card) => (
                <button
                  type="button"
                  className={`dashboard-stat-card ${card.className} ${
                    status === card.status && card.status !== "" ? "selected" : ""
                  }`}
                  key={card.title}
                  style={{
                    cursor: card.clickable ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (!card.clickable) return;
                    const selectedStatus = card.status || "";
                    setStatus(selectedStatus);
                    setOverdueView(selectedStatus === "overdue" ? "overdue" : "all");
                    setOverduePage(1);
                    setOverdueSearch("");
                    setOverdueFilter("all");
                    setTimeout(() => {
                      document
                        .getElementById("recent-tasks-explorer")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }, 100);
                  }}
                >
                  <div className="dashboard-stat-top">
                    <div className="dashboard-stat-left">
                      <div className={`dashboard-stat-icon ${card.iconClass}`}>
                        {card.icon}
                      </div>
                      <div className="dashboard-stat-info">
                        <span className="dashboard-stat-title">{card.title}</span>
                        <strong className="dashboard-stat-value">{card.value}</strong>
                      </div>
                    </div>

                    <div className="dashboard-stat-bars" style={{ color: card.barColor }}>
                      <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                        <rect x="1" y="16" width="3" height="6" rx="1.5" fill="currentColor" />
                        <rect x="6" y="12" width="3" height="10" rx="1.5" fill="currentColor" />
                        <rect x="11" y="8" width="3" height="14" rx="1.5" fill="currentColor" />
                        <rect x="16" y="4" width="3" height="18" rx="1.5" fill="currentColor" />
                        <rect x="21" y="0" width="3" height="22" rx="1.5" fill="currentColor" />
                      </svg>
                    </div>
                  </div>

                  <div className="dashboard-stat-trend">
                    <span className={`trend-tag ${card.trendType}`}>
                      {card.trendDir === "down" ? "↘" : "↗"} {card.trend}
                    </span>
                    <span className="trend-label">vs. previous period</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Middle Row (2 Panels): Task Status Overview & Task Activity Trend */}
            <div className="analytics-middle-grid">
              <div className="analytics-panel status-overview-panel">
                <div className="panel-header">
                  <div>
                    <h3>Task Status Overview</h3>
                    <p>Distribution of tasks by status</p>
                  </div>
                  <div className="panel-select-pill">
                    <span>All Tasks</span>
                    <span className="pill-arrow">⌵</span>
                  </div>
                </div>

                <div className="status-overview-body">
                  <div className="status-donut-container">
                    <div
                      className="ta-status-donut"
                      style={{
                        background: generateConicGradient(
                          statusData,
                          statusColors,
                          "status",
                        ),
                      }}
                    >
                      <div className="donut-center">
                        <strong>{analytics.totalTasks}</strong>
                        <span>Tasks</span>
                      </div>
                    </div>
                  </div>

                  <div className="status-legend-list">
                    {statusData.map((item) => {
                      const count = Number(item.count || 0);
                      const percentage =
                        totalStatusCount > 0
                          ? ((count / totalStatusCount) * 100).toFixed(2)
                          : "0.00";

                      return (
                        <div className="status-legend-item" key={item.status}>
                          <div className="status-legend-label">
                            <span
                              className="status-dot"
                              style={{
                                background:
                                  statusColors[item.status] || "#7b8fb1",
                              }}
                            />
                            <span>{item.status}</span>
                          </div>
                          <div className="status-legend-value">
                            <strong>{count}</strong>
                            <span className="status-legend-percent">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="analytics-panel activity-trend-panel">
                <div className="panel-header">
                  <div>
                    <h3>Task Activity Trend</h3>
                    <p>Created, completed and overdue tasks over time</p>
                  </div>
                  <div className="panel-select-pill">
                    <span>
                      {dateRange === "custom"
                        ? "Custom"
                        : dateRange
                          ? `Last ${dateRange} Days`
                          : "Last 7 Days"}
                    </span>
                    <span className="pill-arrow">⌵</span>
                  </div>
                </div>

                <div className="trend-chart-container">
                  {trendData.length === 0 ? (
                    <div className="analytics-empty">
                      No trend data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart
                        data={trendData}
                        margin={{
                          top: 15,
                          right: 15,
                          left: -20,
                          bottom: 0,
                        }}
                      >
                        <defs>
                          <linearGradient id="createdGradEmp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f172a" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#0f172a" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="completedGradEmp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#16a34a" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="overdueGradEmp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid vertical={false} stroke="#f1f5f9" />

                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 10.5 }}
                        />

                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          width={32}
                          tick={{ fill: "#94a3b8", fontSize: 10.5 }}
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            fontSize: "12px",
                          }}
                        />

                        <Area
                          type="monotone"
                          dataKey="created"
                          name="Created"
                          stroke="#0f172a"
                          strokeWidth={2}
                          fill="url(#createdGradEmp)"
                          dot={{ r: 3, fill: "#0f172a" }}
                          activeDot={{ r: 5 }}
                        />

                        <Area
                          type="monotone"
                          dataKey="completed"
                          name="Completed"
                          stroke="#16a34a"
                          strokeWidth={2}
                          fill="url(#completedGradEmp)"
                          dot={{ r: 3, fill: "#16a34a" }}
                          activeDot={{ r: 5 }}
                        />

                        <Area
                          type="monotone"
                          dataKey="overdue"
                          name="Overdue"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#overdueGradEmp)"
                          dot={{ r: 3, fill: "#ef4444" }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="trend-legend-bottom">
                  <span>
                    <i style={{ background: "#0f172a" }}></i>
                    Created
                  </span>
                  <span>
                    <i style={{ background: "#16a34a" }}></i>
                    Completed
                  </span>
                  <span>
                    <i style={{ background: "#ef4444" }}></i>
                    Overdue
                  </span>
                </div>
              </div>
            </div>

            {/* Third Row (3 Panels): Task Complexity, Task Aging, Employee Task Performance */}
            <div className="analytics-bottom-three-grid">
              {/* Task Complexity */}
              <div className="analytics-panel complexity-panel">
                <div className="panel-header">
                  <div>
                    <h3>Task Complexity</h3>
                    <p>Tasks by difficulty level</p>
                  </div>
                  <div className="panel-select-pill">
                    <span>All Tasks</span>
                    <span className="pill-arrow">⌵</span>
                  </div>
                </div>

                <div className="complexity-body">
                  <div className="complexity-donut-container">
                    <div
                      className="ta-type-donut"
                      style={{
                        background: generateConicGradient(
                          typeData,
                          typeColors,
                          "taskType",
                        ),
                      }}
                    >
                      <div className="donut-center">
                        <strong>{totalTypeCount || analytics.totalTasks}</strong>
                        <span>Tasks</span>
                      </div>
                    </div>
                  </div>

                  <div className="complexity-legend-list">
                    {typeData.map((item) => {
                      const count = Number(item.count || 0);
                      const percentage =
                        totalTypeCount > 0
                          ? ((count / totalTypeCount) * 100).toFixed(2)
                          : "0.00";

                      return (
                        <div className="complexity-legend-item" key={item.taskType}>
                          <div className="complexity-legend-label">
                            <span
                              className="type-dot"
                              style={{
                                background:
                                  typeColors[item.taskType] || "#7b8fb1",
                              }}
                            />
                            <span style={{ textTransform: "capitalize" }}>
                              {item.taskType}
                            </span>
                          </div>
                          <div className="complexity-legend-value">
                            <strong>{count}</strong>
                            <span className="complexity-legend-percent">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Task Aging */}
              <div className="analytics-panel aging-panel">
                <div className="panel-header">
                  <div>
                    <h3>Task Aging</h3>
                    <p>Active tasks by age</p>
                  </div>
                  <div className="panel-select-pill">
                    <span>All Tasks</span>
                    <span className="pill-arrow">⌵</span>
                  </div>
                </div>

                <div className="task-aging-body">
                  {taskAgingData.length === 0 ? (
                    <div className="analytics-empty">No aging data</div>
                  ) : (
                    taskAgingData.map((item) => {
                      const count = Number(item.count || 0);
                      const maxCount = Math.max(
                        ...taskAgingData.map((d) => Number(d.count || 0)),
                        1,
                      );
                      const percentage = (count / maxCount) * 100;
                      const barColor = item.range.includes("30+")
                        ? "#ef4444"
                        : item.range.includes("15-30")
                          ? "#ea580c"
                          : item.range.includes("8-14")
                            ? "#2563eb"
                            : "#16a34a";

                      return (
                        <div className="aging-bar-row" key={item.range}>
                          <span className="aging-label">{item.range}</span>
                          <div className="aging-bar-track">
                            <div
                              className="aging-bar-fill"
                              style={{
                                width: `${percentage}%`,
                                background: barColor,
                              }}
                            />
                          </div>
                          <strong className="aging-count">{count}</strong>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Employee Task Performance */}
              <div className="analytics-panel employee-perf-panel">
                <div className="panel-header">
                  <div>
                    <h3>Employee Task Performance</h3>
                    <p>Tasks completed by each employee</p>
                  </div>
                  <div className="panel-select-pill">
                    <span>Top 5</span>
                    <span className="pill-arrow">⌵</span>
                  </div>
                </div>

                <div className="employee-table-container">
                  <table className="employee-perf-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Employee</th>
                        <th>Completed</th>
                        <th>In Progress</th>
                        <th>Overdue</th>
                        <th>Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeePerformanceData.length > 0 ? (
                        employeePerformanceData.slice(0, 5).map((emp, idx) => {
                          const rate = Number(emp.completionRate || 0);
                          return (
                            <tr key={emp.employeeId || idx}>
                              <td className="emp-rank">{idx + 1}</td>
                              <td className="emp-name">
                                <div className="emp-name-wrapper">
                                  <span
                                    className="emp-avatar-circle"
                                    style={{
                                      backgroundColor:
                                        PERF_AVATAR_PALETTE[
                                          idx % PERF_AVATAR_PALETTE.length
                                        ].bg,
                                      color:
                                        PERF_AVATAR_PALETTE[
                                          idx % PERF_AVATAR_PALETTE.length
                                        ].text,
                                    }}
                                  >
                                    {(emp.employeeName || "E").trim().charAt(0).toUpperCase()}
                                  </span>
                                  <span className="emp-name-text">{emp.employeeName}</span>
                                </div>
                              </td>
                              <td className="emp-completed">{emp.completedTasks || 0}</td>
                              <td className="emp-progress">{emp.inProgressTasks || 0}</td>
                              <td className="emp-overdue">{emp.overdueTasks || 0}</td>
                              <td className="emp-rate-cell">
                                <span className="emp-rate-text">{rate.toFixed(1)}%</span>
                                <div className="emp-rate-track">
                                  <div
                                    className="emp-rate-fill"
                                    style={{ width: `${Math.min(rate, 100)}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="emp-rank">1</td>
                          <td className="emp-name">You</td>
                          <td className="emp-completed">{analytics.completedTasks || 0}</td>
                          <td className="emp-progress">{analytics.inProgressTasks || 0}</td>
                          <td className="emp-overdue">{analytics.overdueTasks || 0}</td>
                          <td className="emp-rate-cell">
                            <span className="emp-rate-text">
                              {Number(analytics.completionPercentage || 0).toFixed(1)}%
                            </span>
                            <div className="emp-rate-track">
                              <div
                                className="emp-rate-fill"
                                style={{
                                  width: `${Math.min(
                                    Number(analytics.completionPercentage || 0),
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Tasks */}
            <div className="recent-tasks-card" id="recent-tasks-explorer">
              <div className="recent-tasks-header">
                <div>
                  <h3>Recent Tasks</h3>
                  <p>Latest created, completed and overdue tasks</p>
                </div>
                <button
                  type="button"
                  className="recent-tasks-view-all-btn"
                  onClick={() => {
                    setOverdueView(overdueView === "all" ? "overdue" : "all");
                    setOverduePage(1);
                  }}
                >
                  {overdueView === "all" ? "Recent Only" : "View All"}
                </button>
              </div>

              {overdueView === "all" && (
                <div className="recent-tasks-controls-bar">
                  <div className="search-wrapper overdue-search-wrapper">
                    <span className="search-icon">⌕</span>
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={overdueSearch}
                      onChange={(e) => {
                        setOverdueSearch(e.target.value);
                        setOverduePage(1);
                      }}
                    />
                  </div>

                  <select
                    className="user-range-select overdue-range-select"
                    value={overduePerPage}
                    onChange={(e) => {
                      setOverduePerPage(Number(e.target.value));
                      setOverduePage(1);
                    }}
                  >
                    <option value={5}>Show 5</option>
                    <option value={10}>Show 10</option>
                    <option value={15}>Show 15</option>
                    <option value={20}>Show 20</option>
                  </select>

                  <select
                    className="user-range-select overdue-filter-select"
                    value={overdueFilter}
                    onChange={(e) => {
                      setOverdueFilter(e.target.value);
                      setOverduePage(1);
                    }}
                  >
                    <option value="all">All Task Types</option>
                    <option value="basic">Basic</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              )}

              <div className="recent-tasks-table-wrapper">
                {overdueLoading ? (
                  <div className="recent-tasks-loading">
                    <div className="analytics-loading-spinner"></div>
                  </div>
                ) : (
                  <table className="recent-tasks-table">
                    <colgroup>
                      <col style={{ width: "5%" }} />
                      <col style={{ width: "23%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "5%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="th-center">INDEX</th>
                        <th>TASK NAME</th>
                        <th>ASSIGN TO</th>
                        <th className="th-center">TASK TYPE</th>
                        <th className="th-center">TASK STATUS</th>
                        <th className="th-center">TASK DATE</th>
                        <th className="th-center">DUE DATE</th>
                        <th className="th-center">ENDING AT</th>
                        <th className="th-center">DURATION</th>
                        <th className="th-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueTasksData.length > 0 ? (
                        overdueTasksData.map((task, idx) => (
                          <tr key={task.taskId || idx}>
                            <td className="task-index-cell">
                              {(overduePage - 1) * overduePerPage + idx + 1}
                            </td>
                            <td className="task-name-cell" title={task.taskName}>
                              <span className="task-name-text">{task.taskName}</span>
                            </td>
                            <td className="assigned-to-cell">
                              {task.employeeName || "You"}
                            </td>
                            <td className="task-type-cell text-center">
                              <span className="task-type-badge">
                                {task.taskType
                                  ? task.taskType.charAt(0).toUpperCase() + task.taskType.slice(1)
                                  : "--"}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`task-progress-status ${(
                                  task.taskStatus || ""
                                )
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")}`}
                              >
                                {task.taskStatus || "--"}
                              </span>
                            </td>
                            <td className="text-center">{formatDateDisplay(task.taskDate || task.startingAt)}</td>
                            <td className="text-center">{formatDateDisplay(task.dueDate)}</td>
                            <td className="text-center">{task.endingAt ? formatDateDisplay(task.endingAt) : "--"}</td>
                            <td className="duration-cell text-center">{formatDuration(task)}</td>
                            <td className="actions-cell text-center">
                              <button
                                type="button"
                                className="action-menu-btn"
                                title="Actions"
                                onClick={() => {
                                  navigate(`/task-details/${task.taskId}`);
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="10" className="no-tasks-row">
                            {overdueSearch ? "No matching tasks" : "No tasks found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {overduePagination.totalPages > 1 && (
                <div className="dashboard-pagination">
                  <span>
                    Page {overduePage} of {overduePagination.totalPages}
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={overduePage === 1}
                      onClick={() => setOverduePage(1)}
                    >
                      «
                    </button>
                    <button
                      type="button"
                      disabled={overduePage === 1}
                      onClick={() => setOverduePage((page) => Math.max(page - 1, 1))}
                    >
                      ‹
                    </button>
                    {getOverduePaginationPages().map((page, index) => {
                      if (page === "...") {
                        return (
                          <span key={`dots-${index}`} className="dashboard-pagination-dots">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          type="button"
                          className={overduePage === page ? "active" : ""}
                          onClick={() => setOverduePage(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={overduePage === overduePagination.totalPages}
                      onClick={() =>
                        setOverduePage((page) =>
                          Math.min(page + 1, overduePagination.totalPages),
                        )
                      }
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      disabled={overduePage === overduePagination.totalPages}
                      onClick={() => setOverduePage(overduePagination.totalPages)}
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EmployeeAnalytics;