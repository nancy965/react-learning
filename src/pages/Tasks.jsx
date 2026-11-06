import { useEffect, useState } from "react";
import Table from "../components/Table";
import SuccessToast from "../components/SuccessToast";
import { useSearchParams } from "react-router-dom";
import "./Tasks.css";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePermission } from "../context/PermissionContext";
import {
  getTasks,
  getTaskEmployees,
  createTask,
  deleteTask,
  updateTask,
  startTask,
  startTrackingSession,
  endTrackingSession,
  getActiveTrackingSession,
  getTrackingSessionHistory,
} from "../services/taskService";
import { getCommonMasterByType } from "../services/commonMasterService";
import CustomDatePicker from "../components/CustomDatePicker";
import ConfirmDialog from "../components/ConfirmDialog";

const Tasks = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [frequencyOptions, setFrequencyOptions] = useState([
    { value: "daily", label: "Daily" },
    { value: "one-time", label: "One Time" },
  ]);
  const [taskTypeOptions, setTaskTypeOptions] = useState([
    { value: "basic", label: "Basic" },
    { value: "normal", label: "Normal" },
    { value: "hard", label: "Hard" },
  ]);

  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [trackerTask, setTrackerTask] = useState(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [workSummary, setWorkSummary] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [sessionHistoryTask, setSessionHistoryTask] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);

  const {
    hasPermission,
    permissions,
    loading: permissionsLoading,
  } = usePermission();

  const { user } = useAuth();

  const isAssignedEmployee = (task) => {
    if (!task || !user || user.role !== "employee") return false;
    const assignedId = String(task.assigned_to || task.assigned_to_id || "");
    const currentUserId = String(user.id || user.userId || "");
    if (assignedId && currentUserId && assignedId === currentUserId)
      return true;
    if (
      task.assigned_to_name &&
      user.name &&
      task.assigned_to_name.trim().toLowerCase() ===
        user.name.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  const [formData, setFormData] = useState({
    assignedTo: [],
    taskName: "",
    taskDate: "",
    dueDate: "",
    isActive: true,
    taskType: "normal",
    frequency: "daily",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(
    Number(searchParams.get("limit")) || 5,
  );

  const token = localStorage.getItem("token");

  const status = searchParams.get("status") || "all";
  const employeeId = searchParams.get("employeeId") || "";
  const taskType = searchParams.get("taskType") || "";
  const dateRange = searchParams.get("dateRange") || "";
  const customFrom = searchParams.get("customFrom") || "";
  const customTo = searchParams.get("customTo") || "";

  const getLocalDateString = (dateObj = new Date()) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = getLocalDateString(new Date());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowDate = getLocalDateString(tomorrow);

  const minDueDate = (() => {
    const baseDate =
      formData.taskDate && formData.taskDate > today
        ? formData.taskDate
        : today;
    if (formData.frequency === "daily") {
      return baseDate;
    }
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 1);
    const nextDay = getLocalDateString(next);
    return nextDay > tomorrowDate ? nextDay : tomorrowDate;
  })();

  const loadTasks = async (page = 1) => {
    const canViewTasks = hasPermission("tasks.view");

    console.log("TASKS VIEW PERMISSION:", canViewTasks);
    console.log("USER PERMISSIONS:", permissions);

    if (!canViewTasks) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getTasks(
        token,
        page,
        tasksPerPage,
        status === "all" ? "" : status,
        employeeId,
        taskType,
        search,
        dateRange,
        customFrom,
        customTo,
      );

      console.log("GET TASKS API RESPONSE:", response);
      console.log("TASKS RECEIVED BY UI:", response.tasks);
      console.log("TASK COUNT:", response.tasks?.length);

      setTasks(response.tasks || []);
      setTotalRecords(response.pagination?.totalRecords || 0);
      setTotalPages(response.pagination?.totalPages || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error("GET TASKS ERROR:", error);

      setError(error.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!hasPermission("tasks.view")) {
      return;
    }

    try {
      const response = await getTaskEmployees(token);

      setEmployees(response.employees || []);
    } catch (error) {
      console.error("GET EMPLOYEES ERROR:", error);

      setEmployees([]);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadActiveSession = async () => {
      try {
        const response = await getActiveTrackingSession(token);
        if (!cancelled) {
          setActiveSession(response.data || null);
        }
      } catch (err) {
        console.error("Failed to restore active tracking session:", err);
      }
    };

    if (token) {
      loadActiveSession();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!activeSession?.started_at) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsedTime = () => {
      const startedAt = new Date(activeSession.started_at).getTime();
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateElapsedTime();
    const intervalId = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(intervalId);
  }, [activeSession]);

  useEffect(() => {
    window.__activeTaskSession = activeSession;
    return () => {
      window.__activeTaskSession = null;
    };
  }, [activeSession]);

  useEffect(() => {
    const handleStopTracker = () => {
      setActiveSession(null);
      setElapsedSeconds(0);
      window.__activeTaskSession = null;
    };
    window.addEventListener("stopActiveTaskTracker", handleStopTracker);
    return () => window.removeEventListener("stopActiveTaskTracker", handleStopTracker);
  }, []);

  useEffect(() => {
    if (!permissionsLoading && hasPermission("tasks.view")) {
      loadEmployees();
    }
  }, [permissionsLoading, permissions]);

  useEffect(() => {
    const fetchMasterOptions = async () => {
      try {
        const [typeRes, freqRes] = await Promise.allSettled([
          getCommonMasterByType("task_type"),
          getCommonMasterByType("task_frequency"),
        ]);

        if (
          typeRes.status === "fulfilled" &&
          Array.isArray(typeRes.value?.data) &&
          typeRes.value.data.length > 0
        ) {
          setTaskTypeOptions(
            typeRes.value.data.map((item) => ({
              value: item.name,
              label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
            })),
          );
        }

        if (
          freqRes.status === "fulfilled" &&
          Array.isArray(freqRes.value?.data) &&
          freqRes.value.data.length > 0
        ) {
          setFrequencyOptions(
            freqRes.value.data.map((item) => ({
              value: item.name,
              label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
            })),
          );
        }
      } catch (err) {
        console.error("Failed to load master options in Tasks:", err);
      }
    };

    fetchMasterOptions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".action-menu-wrapper")) {
        setOpenMenu(null);
      }

      if (!event.target.closest(".tasks-page-size")) {
        setShowPageSizeDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".custom-employee-select")) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleTasksPerPageChange = (newTasksPerPage) => {
    setTasksPerPage(newTasksPerPage);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!permissionsLoading && hasPermission("tasks.view")) {
      loadTasks(1);
    }
  }, [
    permissionsLoading,
    permissions,
    tasksPerPage,
    status,
    employeeId,
    taskType,
    search,
    dateRange,
    customFrom,
    customTo,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = () => {
    setFormData((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  };

  const handleRemoveEmployee = (employeeId, e) => {
    e.stopPropagation();

    setFormData((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(
        (id) => String(id) !== String(employeeId),
      ),
    }));
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(
      (item) => String(item.id) === String(employeeId),
    );

    return employee?.name || "Employee";
  };

  const resetForm = () => {
    setFormData({
      assignedTo: [],
      taskName: "",
      taskDate: "",
      dueDate: "",
      isActive: true,
      taskType: "normal",
      frequency: "daily",
    });

    setEditTask(null);
    setShowForm(false);
    setShowEmployeeDropdown(false);
    setError("");
  };

  const handleAddTask = () => {
    if (!hasPermission("tasks.create")) {
      return;
    }

    navigate("/tasks/create");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editTask && !hasPermission("tasks.edit")) {
      return;
    }

    if (!editTask && !hasPermission("tasks.create")) {
      return;
    }

    if (!formData.taskName.trim()) {
      setError("Task name is required");
      return;
    }

    if (!formData.assignedTo.length) {
      setError("Please select at least one employee");
      return;
    }

    if (!formData.taskDate || !formData.dueDate) {
      setError("Task date and due date are required");
      return;
    }

    if (formData.frequency === "daily") {
      if (formData.dueDate < formData.taskDate) {
        setError("Due date cannot be before task date");
        return;
      }
    } else {
      if (formData.dueDate <= formData.taskDate) {
        setError("Due date must be after task date");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      if (editTask) {
        const existingEmployeeId = String(editTask.assigned_to_id);

        const additionalEmployeeIds = formData.assignedTo.filter(
          (id) => String(id) !== existingEmployeeId,
        );

        const updateData = {
          taskName: formData.taskName.trim(),
          taskDate: formData.taskDate,
          dueDate: formData.dueDate,
          isActive: formData.isActive,
          taskType: formData.taskType,
          assignedTo: existingEmployeeId,
        };

        await updateTask(editTask.id, updateData, token);

        for (const employeeId of additionalEmployeeIds) {
          const createData = {
            taskName: formData.taskName.trim(),
            taskDate: formData.taskDate,
            dueDate: formData.dueDate,
            isActive: formData.isActive,
            taskType: formData.taskType,
            assignedTo: [employeeId],
            frequency: formData.frequency,
          };

          await createTask(createData, token);
        }

        setSuccessMessage("Task updated successfully!");
      } else {
        const createData = {
          taskName: formData.taskName.trim(),
          taskDate: formData.taskDate,
          dueDate: formData.dueDate,
          isActive: formData.isActive,
          taskType: formData.taskType,
          assignedTo: formData.assignedTo,
          frequency: formData.frequency,
        };

        console.log("CREATE TASK DATA:", createData);

        await createTask(createData, token);

        setSuccessMessage("Task created successfully!");
      }

      resetForm();

      await loadTasks(currentPage);
    } catch (error) {
      console.error("TASK SAVE ERROR:", error);

      console.log(
        "BACKEND RESPONSE JSON:",
        JSON.stringify(error.response?.data, null, 2),
      );

      setError(
        error.response?.data?.message ||
          (editTask ? "Failed to update task" : "Failed to create task"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (taskId) => {
    if (!hasPermission("tasks.delete")) {
      return;
    }
    setOpenMenu(null);
    setConfirmDeleteTaskId(taskId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTaskId) return;

    try {
      setLoading(true);

      await deleteTask(confirmDeleteTaskId, token);

      setConfirmDeleteTaskId(null);
      setSuccessMessage("Task deleted successfully!");

      await loadTasks(currentPage);
    } catch (error) {
      console.error("DELETE TASK ERROR:", error);

      setError(error.response?.data?.message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  const handleOpenTrackerModal = (task) => {
    setOpenMenu(null);
    if (!isAssignedEmployee(task)) {
      setError("Only the assigned employee can start this task.");
      return;
    }
    setTrackerTask(task);
  };

  const handleStartTracking = async (taskId) => {
    if (activeSession) {
      setError(
        "End your current tracking session before starting another task.",
      );
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (task && !isAssignedEmployee(task)) {
      setError("Only the assigned employee can start this task.");
      return;
    }
    if (task && (task.end_time || task.status === "Completed")) {
      setError(
        "This task has already been completed and cannot be started again.",
      );
      return;
    }

    try {
      setTrackerLoading(true);
      setError("");

      const response = await startTrackingSession(taskId, token);
      const session = response.data || response;
      setActiveSession(session);
      setSuccessMessage("Task tracking started successfully!");

      await loadTasks(currentPage);
    } catch (err) {
      console.error("START TRACKING SESSION ERROR:", err);
      setError(
        err.response?.data?.message || "Failed to start tracking session.",
      );
    } finally {
      setTrackerLoading(false);
    }
  };

  const handleOpenEndSessionModal = (task) => {
    setOpenMenu(null);
    if (!isAssignedEmployee(task)) {
      setError("Only the assigned employee can end this task.");
      return;
    }
    setWorkSummary("");
    setError("");
    setShowEndSessionModal(true);
  };

  const handleEndTracking = async () => {
    if (!activeSession) return;

    if (!workSummary.trim()) {
      setError("Please describe what work you completed.");
      return;
    }

    try {
      setTrackerLoading(true);
      setError("");

      const response = await endTrackingSession(
        activeSession.task_id,
        activeSession.id,
        workSummary.trim(),
        token,
      );

      const savedData = response.data || response;
      const formattedTime =
        savedData.formatted_duration ||
        formatDuration(savedData.duration_seconds || elapsedSeconds);

      setActiveSession(null);
      setShowEndSessionModal(false);
      setTrackerTask(null);
      setWorkSummary("");
      setSuccessMessage(
        `Session saved! Time recorded: ${formattedTime} (${savedData.hours || 0}h ${savedData.minutes || 0}m ${savedData.seconds || 0}s)`,
      );

      await loadTasks(currentPage);
    } catch (err) {
      console.error("END TRACKING SESSION ERROR:", err);
      setError(
        err.response?.data?.message || "Failed to save tracking session.",
      );
    } finally {
      setTrackerLoading(false);
    }
  };

  const handleViewSessionHistory = async (task) => {
    try {
      setOpenMenu(null);
      setSessionHistoryTask(task);
      setSessionHistoryLoading(true);

      const response = await getTrackingSessionHistory(task.id, token);
      setSessionHistory(response.data || response || []);
    } catch (err) {
      console.error("GET SESSION HISTORY ERROR:", err);
      setError(
        err.response?.data?.message || "Failed to load session history.",
      );
    } finally {
      setSessionHistoryLoading(false);
    }
  };

  const handleStartTask = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && !isAssignedEmployee(task)) {
      setError("Only the assigned employee can start this task.");
      return;
    }

    try {
      setActionLoading(taskId);
      setError("");

      const response = await startTask(taskId, token);

      setOpenMenu(null);
      setSuccessMessage(response?.message || "Task started successfully!");

      await loadTasks(currentPage);
    } catch (error) {
      console.error("START TASK ERROR:", error);
      setError(error.response?.data?.message || "Failed to start task");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (task) => {
    if (!hasPermission("tasks.edit")) {
      return;
    }

    if (task.end_time) {
      return;
    }

    setOpenMenu(null);

    navigate(`/tasks/${task.id}/edit`);
  };

  const handleView = (task) => {
    if (!hasPermission("tasks.view")) {
      return;
    }

    setOpenMenu(null);

    navigate(`/tasks/${task.id}`);
  };

  const formatDate = (date) => {
    if (!date) return "--";

    return date.toString().split("T")[0].split("-").reverse().join("/");
  };

  const isFutureTask = (dateStr) => {
    if (!dateStr) return false;
    const taskDate = new Date(dateStr);
    if (Number.isNaN(taskDate.getTime())) return false;
    const today = new Date();
    taskDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return taskDate > today;
  };

  const formatDateTime = (value) => {
    if (!value) return "--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTaskStatus = (task) => {
    if (task.end_time || task.status === "Completed") {
      return "Completed";
    }

    if (task.start_time) {
      return "In Progress";
    }

    return "Pending";
  };

  const getPaginationPages = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }

      return pages;
    }

    if (currentPage <= 3) {
      pages.push(1, 2, 3);
      pages.push("...");
      pages.push(totalPages);

      return pages;
    }

    if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      pages.push(totalPages - 2, totalPages - 1, totalPages);

      return pages;
    }

    pages.push(1);
    pages.push("...");
    pages.push(currentPage - 1, currentPage, currentPage + 1);
    pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const handlePrevious = async () => {
    if (currentPage <= 1 || loading) {
      return;
    }

    await loadTasks(currentPage - 1);
  };

  const handleNext = async () => {
    if (currentPage >= totalPages || loading) {
      return;
    }

    await loadTasks(currentPage + 1);
  };

  const maxTaskOption = Math.max(5, Math.ceil((totalRecords || 0) / 5) * 5);

  const taskPageSizeOptions = [];

  for (let i = 5; i <= maxTaskOption; i += 5) {
    taskPageSizeOptions.push(i);
  }

  if (error && !tasks.length) {
    return (
      <div className="tasks-page">
        <div className="tasks-error">
          <h2>Unable to load tasks</h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />

      {activeSession &&
        (() => {
          const runningTask =
            tasks.find((t) => String(t.id) === String(activeSession.task_id)) ||
            {};
          const runningTaskName =
            runningTask.task_name ||
            activeSession.task_title ||
            "Task in Progress";
          const assignedToName =
            runningTask.assigned_to_name ||
            activeSession.assigned_to_name ||
            "Dixxii";

          const displayTaskId =
            activeSession.task_uuid ||
            runningTask.task_uuid ||
            (String(activeSession.task_id).startsWith("#")
              ? activeSession.task_id
              : `#${activeSession.task_id}`);

          const formatSessionStartTime = (dateStr) => {
            if (!dateStr) return "--";
            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) return "--";
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            const time = date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return `${day}/${month}/${year} ${time}`;
          };

          return (
            <aside
              className="task-tracker-banner"
              role="region"
              aria-label="Active task tracking session"
            >
              {/* Left: Concentric Radar + Headings */}
              <div className="task-banner-left">
                <div className="task-banner-radar">
                  <div className="task-banner-radar-outer">
                    <div className="task-banner-radar-inner">
                      <div className="task-banner-radar-dot" />
                    </div>
                  </div>
                </div>

                <div className="task-banner-heading-block">
                  <span className="task-banner-tag">CURRENT SESSION</span>
                  <h2 className="task-banner-title">Task in Progress</h2>
                  <p className="task-banner-taskname" title={runningTaskName}>
                    {runningTaskName}
                  </p>
                </div>
              </div>

              {/* Center: Info Modules */}
              <div className="task-banner-modules">
                {/* Module 1: Task ID */}
                <div className="task-banner-pill">
                  <div className="task-banner-pill-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div className="task-banner-pill-text">
                    <span className="task-banner-pill-label">Task ID</span>
                    <span
                      className="task-banner-pill-val"
                      title={displayTaskId}
                    >
                      {displayTaskId}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="task-banner-copy-btn"
                    title="Copy Task ID"
                    onClick={() => {
                      navigator.clipboard?.writeText(displayTaskId);
                      setSuccessMessage("Task ID copied to clipboard!");
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>

                <div className="task-banner-divider" />

                {/* Module 2: Assigned To */}
                <div className="task-banner-meta-item">
                  <div className="task-banner-pill-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div className="task-banner-pill-text">
                    <span className="task-banner-pill-label">Assigned To</span>
                    <span className="task-banner-pill-val-bold">
                      {assignedToName}
                    </span>
                  </div>
                </div>

                {/* Module 3: Start Time */}
                <div className="task-banner-meta-item">
                  <div className="task-banner-pill-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
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
                      ></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <div className="task-banner-pill-text">
                    <span className="task-banner-pill-label">Start Time</span>
                    <span className="task-banner-pill-val-bold">
                      {formatSessionStartTime(activeSession.started_at)}
                    </span>
                  </div>
                </div>

                {/* Module 4: Duration */}
                <div className="task-banner-meta-item">
                  <div className="task-banner-pill-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="task-banner-pill-text">
                    <span className="task-banner-pill-label">Duration</span>
                    <span className="task-banner-pill-val-bold task-banner-timer-val">
                      {formatDuration(elapsedSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: End Session Button */}
              <div className="task-banner-controls">
                <button
                  type="button"
                  className="task-banner-end-btn"
                  onClick={() => {
                    setWorkSummary("");
                    setError("");
                    setShowEndSessionModal(true);
                  }}
                  disabled={trackerLoading}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                  End Task / Session
                </button>
              </div>
            </aside>
          );
        })()}

      <div className="tasks-header">
        <div className="tasks-title">
          <span className="task-breadcrumb-tag">TASK MANAGEMENT</span>
          <h1>Tasks</h1>
          <p className="task-subtitle">Search and manage your tasks.</p>
        </div>

        {hasPermission("tasks.create") && (
          <button className="add-task-btn" onClick={handleAddTask}>
            + Add Task
          </button>
        )}
      </div>

      <div className="users-controls task-controls">
        <div className="search-wrapper task-search-wrapper">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="tasks-page-size">
          <button
            type="button"
            className="tasks-page-size-button"
            onClick={() => setShowPageSizeDropdown((previous) => !previous)}
            disabled={loading}
            aria-haspopup="listbox"
            aria-expanded={showPageSizeDropdown}
          >
            <span>Show {tasksPerPage}</span>

            <span
              className={`tasks-page-size-arrow ${
                showPageSizeDropdown ? "open" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {showPageSizeDropdown && (
            <div className="tasks-page-size-menu" role="listbox">
              {taskPageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`tasks-page-size-option ${
                    tasksPerPage === opt ? "selected" : ""
                  }`}
                  onClick={() => {
                    handleTasksPerPageChange(opt);
                    setShowPageSizeDropdown(false);
                  }}
                >
                  Show {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="task-error">
          {typeof error === "string" ? error : "Something went wrong"}
        </p>
      )}

      <Table
        columns={[
          {
            key: "index",
            label: "INDEX",
            width: "0.5fr",
            minWidth: 65,
            align: "center",
          },
          {
            key: "assignedTo",
            label: "ASSIGN TO",
            width: "1.1fr",
            minWidth: 125,
            align: "left",
          },
          {
            key: "taskName",
            label: "TASK NAME",
            width: "1.8fr",
            minWidth: 220,
            align: "left",
          },
          {
            key: "taskDate",
            label: "TASK DATE",
            width: "1fr",
            minWidth: 120,
            align: "left",
          },
          {
            key: "dueDate",
            label: "DUE DATE",
            width: "1fr",
            minWidth: 120,
            align: "left",
          },
          {
            key: "status",
            label: "STATUS",
            width: "1fr",
            minWidth: 110,
            align: "left",
          },
          {
            key: "taskType",
            label: "TASK TYPE",
            width: "0.9fr",
            minWidth: 115,
            align: "left",
          },
          {
            key: "frequency",
            label: "FREQUENCY",
            width: "1fr",
            minWidth: 125,
            align: "left",
          },
          {
            key: "startingAt",
            label: "STARTING AT",
            width: "1.2fr",
            minWidth: 145,
            align: "left",
          },
          {
            key: "endingAt",
            label: "ENDING AT",
            width: "1.2fr",
            minWidth: 145,
            align: "left",
          },
          {
            key: "taskStatus",
            label: "TASK STATUS",
            width: "1.2fr",
            minWidth: 165,
            align: "center",
          },
          {
            key: "action",
            label: "ACTION",
            width: "0.9fr",
            minWidth: 90,
            align: "center",
          },
        ]}
        data={tasks}
        emptyMessage="No tasks found"
        renderRow={(task, index, gridTemplate) => {
          const taskStatus = getTaskStatus(task);

          const taskIndex = (currentPage - 1) * tasksPerPage + index + 1;

          return (
            <div
              className="task-table-row"
              style={{
                gridTemplateColumns: gridTemplate,
              }}
            >
              <div className="task-index-cell">{taskIndex}</div>

              <div>{task.assigned_to_name || "--"}</div>

              <div
                className="task-name-cell"
                title={task.task_name}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {task.task_name}
                </span>
                {task.is_blocked && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#b91c1c",
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}
                    title={`Blocked by prerequisite tasks: ${task.blocking_tasks?.map((b) => b.task_name).join(", ")}`}
                  >
                    🔒 Blocked
                  </span>
                )}
              </div>

              <div className="task-date-cell">{formatDate(task.task_date)}</div>

              <div className="task-date-cell">{formatDate(task.due_date)}</div>

              <div>
                <span
                  className={
                    task.is_active ? "status-active" : "status-inactive"
                  }
                >
                  {task.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div>
                <span className="task-type-badge">
                  {task.task_type
                    ? task.task_type.charAt(0).toUpperCase() +
                      task.task_type.slice(1)
                    : "--"}
                </span>
              </div>

              <div>
                <span className="task-frequency-badge">
                  {task.frequency === "daily" ? "Daily" : "One Time"}
                </span>
              </div>

              <div className="task-time-cell">
                {task.start_time ? (
                  <>
                    <span className="task-time-date">
                      {new Date(task.start_time).toLocaleDateString("en-GB")}
                    </span>

                    <span className="task-time-value">
                      {new Date(task.start_time).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                ) : (
                  "--"
                )}
              </div>

              <div className="task-time-cell">
                {task.end_time ? (
                  <>
                    <span className="task-time-date">
                      {new Date(task.end_time).toLocaleDateString("en-GB")}
                    </span>

                    <span className="task-time-value">
                      {new Date(task.end_time).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                ) : (
                  "--"
                )}
              </div>

              <div className="task-status-cell">
                <span
                  className={`task-progress-status ${taskStatus
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  {taskStatus}
                </span>
                {task.is_blocked && taskStatus === "Pending" && (
                  <span
                    className="task-waiting-chip"
                    title={`Prerequisites pending: ${task.blocking_tasks?.map((b) => b.task_name).join(", ") || "Prerequisite tasks not completed"}`}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="waiting-lock-icon"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Waiting</span>
                  </span>
                )}
              </div>

              <div className="action-cell">
                <div className="action-menu-wrapper">
                  <button
                    type="button"
                    className="action-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();

                      setOpenMenu((currentMenu) =>
                        currentMenu === task.id ? null : task.id,
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

                  {openMenu === task.id && (
                    <div
                      className={`action-dropdown ${
                        task.id === tasks[tasks.length - 1]?.id
                          ? "action-dropdown-up"
                          : ""
                      }`}
                    >
                      {hasPermission("tasks.view") && (
                        <button
                          type="button"
                          className="view-task-btn"
                          onClick={() => handleView(task)}
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
                          <span>View</span>
                        </button>
                      )}

                      {isAssignedEmployee(task) &&
                        (activeSession && activeSession.task_id === task.id ? (
                          <button
                            type="button"
                            className="end-task-btn"
                            onClick={() => handleOpenEndSessionModal(task)}
                            disabled={trackerLoading}
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
                              <circle cx="12" cy="12" r="10" />
                              <rect x="9" y="9" width="6" height="6" />
                            </svg>
                            <span>End Session</span>
                          </button>
                        ) : (
                          !task.end_time &&
                          task.status !== "Completed" && (() => {
                            const isScheduledFuture = isFutureTask(task.task_date);
                            return (
                              <button
                                type="button"
                                className={`start-task-btn ${task.is_blocked || isScheduledFuture ? "disabled" : ""}`}
                                onClick={() => {
                                  if (task.is_blocked) {
                                    setError(
                                      `Cannot start task: blocked by prerequisite task(s): ${task.blocking_tasks?.map((b) => b.task_name).join(", ")}`,
                                    );
                                    return;
                                  }
                                  if (isScheduledFuture) {
                                    setError(
                                      `Cannot start task yet: this task is scheduled to start on ${formatDate(task.task_date)}. It cannot be started before its start date.`,
                                    );
                                    return;
                                  }
                                  handleOpenTrackerModal(task);
                                }}
                                disabled={task.is_blocked || isScheduledFuture}
                                title={
                                  task.is_blocked
                                    ? `Cannot start: blocked by ${task.blocking_tasks?.map((b) => b.task_name).join(", ")}`
                                    : isScheduledFuture
                                    ? `Cannot start yet: scheduled to start on ${formatDate(task.task_date)}`
                                    : "Start Task"
                                }
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
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                <span>
                                  {task.is_blocked
                                    ? "🔒 Blocked"
                                    : isScheduledFuture
                                    ? "📅 Scheduled"
                                    : "Start Task"}
                                </span>
                              </button>
                            );
                          })()
                        ))}

                      <button
                        type="button"
                        className="history-task-btn"
                        onClick={() => handleViewSessionHistory(task)}
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
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Session History</span>
                      </button>

                      {hasPermission("tasks.edit") && (
                        <button
                          type="button"
                          className="edit-task-btn"
                          disabled={taskStatus === "Completed"}
                          onClick={() => handleEdit(task)}
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
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                      )}

                      {hasPermission("tasks.delete") && (
                        <>
                          <div className="action-dropdown-divider" />
                          <button
                            type="button"
                            className="delete-task-btn"
                            onClick={() => handleDelete(task.id)}
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
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      {totalRecords > 0 && (
        <div className="task-pagination">
          <button
            type="button"
            className="pagination-button"
            onClick={() => loadTasks(1)}
            disabled={currentPage === 1 || loading}
            aria-label="First page"
            title="First page"
          >
            «
          </button>

          <button
            type="button"
            className="pagination-button"
            onClick={handlePrevious}
            disabled={currentPage === 1 || loading}
            aria-label="Previous page"
            title="Previous page"
          >
            ‹
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
                onClick={() => loadTasks(page)}
                disabled={loading}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            className="pagination-button"
            onClick={handleNext}
            disabled={currentPage === totalPages || loading}
            aria-label="Next page"
            title="Next page"
          >
            ›
          </button>

          <button
            type="button"
            className="pagination-button"
            onClick={() => loadTasks(totalPages)}
            disabled={currentPage === totalPages || loading}
            aria-label="Last page"
            title="Last page"
          >
            »
          </button>
        </div>
      )}

      {showForm && (
        <div
          className="task-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetForm();
            }
          }}
        >
          <div className="task-modal-content">
            <h2>{editTask ? "Edit Task" : "Add Task"}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  Task Name <span>*</span>
                </label>

                <textarea
                  name="taskName"
                  value={formData.taskName}
                  onChange={handleChange}
                  placeholder="Enter task details"
                  required
                />
              </div>

              <div className="task-form-row">
                <div className="form-group">
                  <label>
                    Assign To <span>*</span>
                  </label>

                  <div className="custom-employee-select">
                    <div
                      className="selected-employees"
                      onClick={() => setShowEmployeeDropdown((prev) => !prev)}
                    >
                      {formData.assignedTo.length === 0 ? (
                        <span className="employee-placeholder">
                          Select employee
                        </span>
                      ) : (
                        formData.assignedTo.map((employeeId) => (
                          <span
                            className="selected-employee-tag"
                            key={employeeId}
                          >
                            {getEmployeeName(employeeId)}

                            <button
                              type="button"
                              onClick={(e) =>
                                handleRemoveEmployee(employeeId, e)
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}

                      <span className="employee-dropdown-arrow">▾</span>
                    </div>

                    {showEmployeeDropdown && (
                      <div className="employee-dropdown">
                        {employees.length > 0 ? (
                          employees.map((employee) => {
                            const employeeId = String(employee.id);

                            const isSelected =
                              formData.assignedTo.includes(employeeId);

                            return (
                              <div
                                key={employee.id}
                                className={`employee-option ${
                                  isSelected ? "selected" : ""
                                }`}
                                onClick={() => {
                                  if (!isSelected) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      assignedTo: [
                                        ...prev.assignedTo,
                                        employeeId,
                                      ],
                                    }));
                                  }

                                  setShowEmployeeDropdown(false);
                                }}
                              >
                                {employee.name}
                              </div>
                            );
                          })
                        ) : (
                          <div className="employee-option">
                            No employees found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Task Frequency <span>*</span>
                  </label>

                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    required
                  >
                    {frequencyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Task Type <span>*</span>
                  </label>

                  <select
                    name="taskType"
                    value={formData.taskType}
                    onChange={handleChange}
                    required
                  >
                    {taskTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="task-form-row">
                <div className="form-group">
                  <label>
                    Task Date <span>*</span>
                  </label>

                  <CustomDatePicker
                    name="taskDate"
                    min={today}
                    value={formData.taskDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Due Date <span>*</span>
                  </label>

                  <CustomDatePicker
                    name="dueDate"
                    min={minDueDate}
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <div className="status-control">
                    <div
                      className={`task-toggle ${
                        formData.isActive ? "on" : "off"
                      }`}
                      onClick={handleToggle}
                    >
                      <div className="toggle-circle"></div>
                    </div>

                    <span>{formData.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>

              <div className="task-form-buttons">
                <button type="button" onClick={resetForm}>
                  Cancel
                </button>

                <button type="submit" disabled={loading}>
                  {loading
                    ? editTask
                      ? "Updating..."
                      : "Creating..."
                    : editTask
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRACKER MODAL (POPUP ON START TASK - EXACT UI FROM REFERENCE IMAGE) */}
      {trackerTask &&
        (() => {
          const isCurrentRunning = Boolean(
            activeSession && activeSession.task_id === trackerTask.id,
          );
          const currentSeconds = isCurrentRunning ? elapsedSeconds : 0;
          const hVal = Math.floor(currentSeconds / 3600);
          const mVal = Math.floor((currentSeconds % 3600) / 60);
          const sVal = currentSeconds % 60;
          const hoursStr = String(hVal).padStart(2, "0");
          const minsStr = String(mVal).padStart(2, "0");
          const secsStr = String(sVal).padStart(2, "0");

          const trackerStatus = getTaskStatus(trackerTask);
          const isCompleted =
            trackerTask.end_time ||
            trackerTask.status === "Completed" ||
            trackerStatus === "Completed";

          return (
            <div
              className="task-tracker-modal-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget && !trackerLoading) {
                  setTrackerTask(null);
                }
              }}
            >
              <div
                className="task-tracker-modal task-tracker-main-popup"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tracker-modal-title"
              >
                {/* Top-Right Circular Close Button */}
                <button
                  type="button"
                  className="task-tracker-modal-close-btn"
                  onClick={() => setTrackerTask(null)}
                  disabled={trackerLoading}
                  aria-label="Close"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {/* Centered Blue Clipboard Badge */}
                <div className="task-tracker-top-icon">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <path d="M9 12l2 2 4-4"></path>
                    <path d="M9 16h6"></path>
                  </svg>
                </div>

                {/* Title & Subtitle */}
                <h2 id="tracker-modal-title" className="task-tracker-title">
                  Task Tracker
                </h2>
                <p className="task-tracker-subtitle">{trackerTask.task_name}</p>

                {/* 4 Details Grid Card */}
                <div className="task-tracker-card">
                  <div className="task-tracker-card-col-left">
                    {/* Assigned To */}
                    <div className="task-tracker-info-item">
                      <div className="task-tracker-info-icon icon-orange">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <div className="task-tracker-info-text">
                        <span className="task-tracker-info-label">
                          Assigned To
                        </span>
                        <span className="task-tracker-info-value">
                          {trackerTask.assigned_to_name || "--"}
                        </span>
                      </div>
                    </div>

                    {/* Task Date */}
                    <div className="task-tracker-info-item">
                      <div className="task-tracker-info-icon icon-purple">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
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
                          ></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                      <div className="task-tracker-info-text">
                        <span className="task-tracker-info-label">
                          Task Date
                        </span>
                        <span className="task-tracker-info-value">
                          {formatDate(trackerTask.task_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="task-tracker-card-col-right">
                    {/* Status */}
                    <div className="task-tracker-info-item">
                      <div className="task-tracker-info-icon icon-green">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="8 12 11 15 16 9"></polyline>
                        </svg>
                      </div>
                      <div className="task-tracker-info-text">
                        <span className="task-tracker-info-label">Status</span>
                        <span
                          className={`task-tracker-status-pill ${
                            trackerStatus === "In Progress"
                              ? "status-in-progress"
                              : isCompleted
                                ? "status-completed"
                                : "status-pending"
                          }`}
                        >
                          {trackerStatus}
                        </span>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="task-tracker-info-item">
                      <div className="task-tracker-info-icon icon-blue">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
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
                          ></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </div>
                      <div className="task-tracker-info-text">
                        <span className="task-tracker-info-label">
                          Due Date
                        </span>
                        <span className="task-tracker-info-value">
                          {formatDate(trackerTask.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timer Row: Dial + Digits */}
                <div className="task-tracker-timer-row">
                  {/* Circular Stopwatch Dial */}
                  <div className="task-tracker-dial-wrap">
                    <svg
                      className="task-tracker-dial-svg"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#dbeafe"
                        strokeWidth="6"
                      />
                      {isCurrentRunning && (
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="6"
                          strokeDasharray="264"
                          strokeDashoffset={
                            264 - (264 * (elapsedSeconds % 60)) / 60
                          }
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                          style={{
                            transition: "stroke-dashoffset 0.5s linear",
                          }}
                        />
                      )}
                      <circle cx="50" cy="8" r="5" fill="#2563eb" />
                    </svg>
                    <div className="task-tracker-dial-center-icon">
                      <svg
                        width="30"
                        height="30"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="13" r="8"></circle>
                        <line x1="12" y1="2" x2="12" y2="5"></line>
                        <line x1="12" y1="13" x2="12" y2="9"></line>
                        <line x1="12" y1="13" x2="15.5" y2="13"></line>
                      </svg>
                    </div>
                  </div>

                  {/* Digital Display with Sub-labels */}
                  <div className="task-tracker-digits-block">
                    <div className="task-tracker-digits-row">
                      <span className="task-tracker-digits-val">
                        {hoursStr}
                      </span>
                      <span className="task-tracker-digits-sep">:</span>
                      <span className="task-tracker-digits-val">{minsStr}</span>
                      <span className="task-tracker-digits-sep">:</span>
                      <span className="task-tracker-digits-val">{secsStr}</span>
                    </div>
                    <div className="task-tracker-sublabels-row">
                      <span className="task-tracker-sublabel-item">Hours</span>
                      <span className="task-tracker-sublabel-item">
                        Minutes
                      </span>
                      <span className="task-tracker-sublabel-item">
                        Seconds
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hint / Helper text */}
                <p className="task-tracker-hint-text">
                  {isCurrentRunning ? (
                    <span style={{ color: "#2563eb", fontWeight: "600" }}>
                      ● Task tracking is currently in progress.
                    </span>
                  ) : isCompleted ? (
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>
                      ✓ This task is completed and cannot be restarted.
                    </span>
                  ) : activeSession ? (
                    <span style={{ color: "#dc2626" }}>
                      You already have an active session running on another task
                      ({activeSession.task_title || `#${activeSession.task_id}`}
                      ). Please end that session first.
                    </span>
                  ) : (
                    "Click “Start Tracking” to begin tracking time for this task."
                  )}
                </p>

                {/* Action Buttons */}
                <div className="task-tracker-actions-row">
                  <button
                    type="button"
                    className="task-tracker-btn-close"
                    onClick={() => setTrackerTask(null)}
                    disabled={trackerLoading}
                  >
                    Close
                  </button>

                  {isCurrentRunning ? (
                    <button
                      type="button"
                      className="task-tracker-btn-end"
                      onClick={() => {
                        setWorkSummary("");
                        setError("");
                        setShowEndSessionModal(true);
                      }}
                      disabled={trackerLoading}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                      End Task & Record Work
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="task-tracker-btn-start"
                      onClick={() => handleStartTracking(trackerTask.id)}
                      disabled={
                        trackerLoading ||
                        !isAssignedEmployee(trackerTask) ||
                        !trackerTask.is_active ||
                        isCompleted ||
                        (activeSession &&
                          activeSession.task_id !== trackerTask.id)
                      }
                      title={
                        !isAssignedEmployee(trackerTask)
                          ? "Only the assigned employee can start this task"
                          : isCompleted
                            ? "This task has already been completed"
                            : !trackerTask.is_active
                              ? "This task is inactive"
                              : activeSession
                                ? "You already have another running session. End it first."
                                : ""
                      }
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                      {trackerLoading ? "Starting..." : "Start Tracking"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* END SESSION MODAL (WORK SUMMARY INPUT - EXACT COPY OF REFERENCE IMAGE 1) */}
      {showEndSessionModal &&
        activeSession &&
        (() => {
          const runningTask =
            tasks.find((t) => String(t.id) === String(activeSession.task_id)) ||
            {};
          const runningTaskName =
            runningTask.task_name ||
            activeSession.task_title ||
            `Task #${activeSession.task_id}`;
          const displayTaskId =
            activeSession.task_uuid ||
            runningTask.task_uuid ||
            (String(activeSession.task_id).startsWith("#")
              ? activeSession.task_id
              : `#${activeSession.task_id}`);

          const hours = Math.floor(elapsedSeconds / 3600);
          const minutes = Math.floor((elapsedSeconds % 3600) / 60);
          const seconds = elapsedSeconds % 60;

          return (
            <div
              className="task-tracker-modal-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget && !trackerLoading) {
                  setShowEndSessionModal(false);
                }
              }}
            >
              <div
                className="task-end-session-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="end-session-title"
              >
                {/* Header: Title + Task ID on left, Close button on right */}
                <div className="task-end-session-header">
                  <div>
                    <h2 id="end-session-title">End Tracking Session</h2>
                    <p className="task-end-session-subtitle">
                      Task {displayTaskId}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="task-end-session-close-btn"
                    onClick={() => setShowEndSessionModal(false)}
                    disabled={trackerLoading}
                    aria-label="Close"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                {/* Middle Overview Card: Task Name on left, Duration on right */}
                <div className="task-end-session-card">
                  <div className="task-end-session-card-left">
                    <span className="task-end-session-card-label">Task</span>
                    <span
                      className="task-end-session-card-val"
                      title={runningTaskName}
                    >
                      {runningTaskName}
                    </span>
                  </div>

                  <div className="task-end-session-card-right">
                    <div className="task-end-session-clock-badge">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div className="task-end-session-duration-block">
                      <span className="task-end-session-duration-label">
                        Current Session Duration
                      </span>
                      <span className="task-end-session-duration-time">
                        {formatDuration(elapsedSeconds)}
                      </span>
                      <span className="task-end-session-duration-breakdown">
                        ({hours}h {minutes}m {seconds}s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Work Summary Input Field */}
                <div className="task-end-session-input-group">
                  <div className="task-end-session-label-row">
                    <label htmlFor="work-summary">
                      What work did you complete during this time?{" "}
                      <span className="task-end-session-required">*</span>
                    </label>
                    <span className="task-end-session-counter">
                      {workSummary.length}/1000
                    </span>
                  </div>

                  <textarea
                    id="work-summary"
                    value={workSummary}
                    maxLength={1000}
                    onChange={(event) => setWorkSummary(event.target.value)}
                    placeholder="Describe the tasks and work you completed during this session..."
                    rows={5}
                    required
                  />
                </div>

                {/* Action Buttons: Cancel + Save & End Task */}
                <div className="task-end-session-actions">
                  <button
                    type="button"
                    className="task-end-session-cancel-btn"
                    onClick={() => setShowEndSessionModal(false)}
                    disabled={trackerLoading}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="task-end-session-save-btn"
                    onClick={handleEndTracking}
                    disabled={trackerLoading || !workSummary.trim()}
                  >
                    {trackerLoading ? "Saving..." : "Save & End Task"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* SESSION HISTORY MODAL (EXACT COPY OF REFERENCE IMAGE 1) */}
      {sessionHistoryTask &&
        (() => {
          const totalDurationSeconds = sessionHistory.reduce(
            (acc, session) => acc + (Number(session.duration_seconds) || 0),
            0,
          );
          const assigneeName =
            sessionHistoryTask.assigned_to_name ||
            (sessionHistory[0] && sessionHistory[0].user_name) ||
            "--";

          const formatDateTime = (dateStr) => {
            if (!dateStr) return "--";
            try {
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return "--";
              return d.toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              });
            } catch (e) {
              return String(dateStr);
            }
          };

          return (
            <div
              className="task-tracker-modal-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setSessionHistoryTask(null);
                }
              }}
            >
              <div
                className="session-history-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-history-title"
              >
                {/* Header: Title + Task Name on left, Close cross button on right */}
                <div className="session-history-header">
                  <div>
                    <h2 id="session-history-title">Session History</h2>
                    <p className="session-history-subtitle">
                      {sessionHistoryTask.task_name}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="session-history-header-close-btn"
                    onClick={() => setSessionHistoryTask(null)}
                    aria-label="Close"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                {/* Top Summary Card: Task, Assignee, Total Sessions, Total Time */}
                <div className="session-history-summary-card">
                  <div className="session-history-summary-item">
                    <span className="session-history-summary-label">Task</span>
                    <span
                      className="session-history-summary-val"
                      title={sessionHistoryTask.task_name}
                    >
                      {sessionHistoryTask.task_name}
                    </span>
                  </div>

                  <div className="session-history-summary-item">
                    <span className="session-history-summary-label">
                      Assignee
                    </span>
                    <span
                      className="session-history-summary-val"
                      title={assigneeName}
                    >
                      {assigneeName}
                    </span>
                  </div>

                  <div className="session-history-summary-item">
                    <span className="session-history-summary-label">
                      Total Sessions
                    </span>
                    <span className="session-history-summary-val-number">
                      {sessionHistory.length}
                    </span>
                  </div>

                  <div className="session-history-summary-item">
                    <span className="session-history-summary-label">
                      Total Time
                    </span>
                    <span className="session-history-summary-val-time">
                      {formatDuration(totalDurationSeconds)}
                    </span>
                  </div>
                </div>

                {/* Data Table */}
                <div className="session-history-table-wrapper">
                  {sessionHistoryLoading ? (
                    <p
                      style={{
                        textAlign: "center",
                        padding: "28px",
                        color: "#64748b",
                      }}
                    >
                      Loading session history...
                    </p>
                  ) : sessionHistory.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        padding: "28px",
                        color: "#64748b",
                      }}
                    >
                      No tracking sessions have been recorded for this task.
                    </p>
                  ) : (
                    <table className="session-history-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Start Time</th>
                          <th>End Time</th>
                          <th>Duration</th>
                          <th>Status</th>
                          <th>Work Done</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionHistory.map((session, idx) => {
                          const sessionNum = sessionHistory.length - idx;
                          const durationDisplay =
                            session.formatted_duration ||
                            formatDuration(session.duration_seconds || 0);
                          const isRunning =
                            session.status === "running" ||
                            session.status === "In progress";

                          return (
                            <tr key={session.id || idx}>
                              <td>{sessionNum}</td>
                              <td>{formatDateTime(session.started_at)}</td>
                              <td>{formatDateTime(session.ended_at)}</td>
                              <td className="session-history-duration-td">
                                {durationDisplay}
                              </td>
                              <td>
                                <span
                                  className={`session-history-status-badge ${
                                    isRunning ? "in-progress" : "completed"
                                  }`}
                                >
                                  {isRunning ? "In progress" : "Completed"}
                                </span>
                              </td>
                              <td className="session-history-work-td">
                                {session.work_summary || "--"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer: Close button */}
                <div className="session-history-footer">
                  <button
                    type="button"
                    className="session-history-close-btn"
                    onClick={() => setSessionHistoryTask(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {confirmDeleteTaskId && (
        <ConfirmDialog
          title="Confirm Action"
          message="Are you sure you want to delete this task?"
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteTaskId(null)}
        />
      )}
    </div>
  );
};

export default Tasks;
