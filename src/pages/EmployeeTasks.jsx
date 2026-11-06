
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SuccessToast from "../components/SuccessToast";
import "./Tasks.css";
import Table from "../components/Table";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  getMyTasks,
  endTask,
  getTaskLogs,
  startTrackingSession,
  endTrackingSession,
  getActiveTrackingSession,
  getTrackingSessionHistory,
} from "../services/taskService";

const EmployeeTasks = () => {
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [viewTask, setViewTask] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 5;

  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [taskLogs, setTaskLogs] = useState([]);
  const [taskLogsLoading, setTaskLogsLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [confirmCompleteTaskId, setConfirmCompleteTaskId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [workSummary, setWorkSummary] = useState("");

  const [sessionHistoryTask, setSessionHistoryTask] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);

  const [trackerLoading, setTrackerLoading] = useState(false);

  const token = localStorage.getItem("token");
  const status = searchParams.get("status") || "all";

  const loadMyTasks = async (page = currentPage) => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyTasks(
        token,
        page,
        tasksPerPage,
        search,
        status === "all" ? "" : status
      );

      setTasks(response.tasks || []);
      setTotalRecords(response.pagination?.totalRecords || 0);
      setTotalPages(response.pagination?.totalPages || 0);
    } catch (error) {
      console.error("GET MY TASKS ERROR:", error);
      setError(error.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyTasks(currentPage);
  }, [currentPage, search, status]);

  useEffect(() => {
    let cancelled = false;

    const loadActiveSession = async () => {
      try {
        const response = await getActiveTrackingSession();

        if (!cancelled) {
          setActiveSession(response.data || null);
        }
      } catch (error) {
        console.error("Failed to restore active tracking session:", error);
      }
    };

    loadActiveSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSession?.started_at) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsedTime = () => {
      const startedAt = new Date(activeSession.started_at).getTime();
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      );

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
    setCurrentPage(1);
  }, [search, status]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".action-menu-wrapper")) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const formatDuration = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  const isTaskOverdue = (task) => {
    if (task.end_time || !task.due_date) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
  };

  const getTaskStatus = (task) => {
    if (task.start_time && task.end_time) {
      return "Completed";
    }

    if (isTaskOverdue(task)) {
      return "Overdue";
    }

    if (task.start_time && !task.end_time) {
      return "In Progress";
    }

    return "Pending";
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

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
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleStartTracking = async (taskId) => {
    if (activeSession) {
      setError(
        "End your current tracking session before starting another task."
      );
      return;
    }

    const targetTask = tasks.find((t) => String(t.id) === String(taskId));
    if (targetTask?.is_blocked) {
      const names = targetTask.blocking_tasks?.map((b) => `"${b.task_name}"`).join(", ") || "prerequisites pending";
      setError(`Cannot start task: prerequisite task(s) must be completed first: ${names}`);
      return;
    }
    if (isFutureTask(targetTask?.task_date)) {
      setError(`Cannot start task yet: this task is scheduled to start on ${formatDate(targetTask.task_date)}. It cannot be started before its start date.`);
      return;
    }

    setTrackerLoading(true);
    setError("");

    try {
      const response = await startTrackingSession(taskId);

      setActiveSession(response.data || null);
      setOpenMenu(null);
      setSuccessMessage("Tracking session started successfully!");

      await loadMyTasks();
    } catch (error) {
      console.error("START TRACKING SESSION ERROR:", error);
      setError(
        error.response?.data?.message ||
          "Failed to start tracking session."
      );
    } finally {
      setTrackerLoading(false);
    }
  };

  const handleEndTracking = async () => {
    if (!activeSession) {
      return;
    }

    if (!workSummary.trim()) {
      setError("Please enter a summary of the work you completed.");
      return;
    }

    setTrackerLoading(true);
    setError("");

    try {
      await endTrackingSession(
        activeSession.task_id,
        activeSession.id,
        workSummary.trim()
      );

      setActiveSession(null);
      setShowEndSessionModal(false);
      setWorkSummary("");
      setSuccessMessage("Tracking session saved successfully!");

      await loadMyTasks();
    } catch (error) {
      console.error("END TRACKING SESSION ERROR:", error);
      setError(
        error.response?.data?.message ||
          "Failed to save tracking session."
      );
    } finally {
      setTrackerLoading(false);
    }
  };

  const handleEndTask = (taskId) => {
    if (activeSession) {
      setError(
        "Please end your active tracking session before completing a task."
      );
      return;
    }
    setOpenMenu(null);
    setConfirmCompleteTaskId(taskId);
  };

  const handleConfirmEndTask = async () => {
    if (!confirmCompleteTaskId) return;

    try {
      setActionLoading(confirmCompleteTaskId);
      setError("");

      const response = await endTask(confirmCompleteTaskId, token);

      setConfirmCompleteTaskId(null);
      setSuccessMessage(response?.message || "Task completed successfully!");

      await loadMyTasks();
    } catch (error) {
      console.error("COMPLETE TASK ERROR:", error);
      setError(error.response?.data?.message || "Failed to complete task");
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewTask = async (task) => {
    setViewTask(task);
    setOpenMenu(null);
    setTaskLogs([]);
    setTaskLogsLoading(true);

    try {
      const response = await getTaskLogs(task.id, token);
      setTaskLogs(response.data || []);
    } catch (error) {
      console.error("GET TASK LOGS ERROR:", error);
      setTaskLogs([]);
    } finally {
      setTaskLogsLoading(false);
    }
  };

  const handleCloseView = () => {
    setViewTask(null);
    setTaskLogs([]);
  };

  const handleViewSessionHistory = async (task) => {
    setSessionHistoryTask(task);
    setSessionHistory([]);
    setSessionHistoryLoading(true);
    setOpenMenu(null);
    setError("");

    try {
      const response = await getTrackingSessionHistory(task.id);
      setSessionHistory(response.data || []);
    } catch (error) {
      console.error("GET SESSION HISTORY ERROR:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load session history."
      );
    } finally {
      setSessionHistoryLoading(false);
    }
  };

  const currentSessionTaskId = activeSession
    ? String(activeSession.task_id)
    : null;

  const handlePrevious = () => {
    if (currentPage <= 1 || loading) {
      return;
    }

    setCurrentPage((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentPage >= totalPages || loading) {
      return;
    }

    setCurrentPage((prev) => prev + 1);
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
      pages.push(1, 2, 3, "...", totalPages);
      return pages;
    }

    if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      return pages;
    }

    pages.push(
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages
    );

    return pages;
  };

  const paginatedTasks = tasks;

  return (
    <div className="tasks-page employee-tasks-page">
      <SuccessToast
        message={successMessage}
        onClose={() => setSuccessMessage("")}
      />

      <div className="tasks-header">
        <div className="tasks-title">
          <span className="task-breadcrumb-tag">TASK MANAGEMENT</span>
          <h1>My Tasks</h1>
          <p className="task-subtitle">
            View and manage tasks assigned to you.
          </p>
        </div>
      </div>

      <div className="users-controls task-controls">
        <div className="search-wrapper task-search-wrapper">
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <select
          className="user-range-select task-range-select"
          value={tasksPerPage}
          disabled
        >
          <option value={5}>Show 5</option>
        </select>
      </div>

      {error && <p className="task-error">{error}</p>}

      {activeSession && (
        <div className="task-tracker-banner">
          <div className="task-tracker-banner-info">
            <span className="task-tracker-live-dot" />
            <div>
              <strong>Task session in progress</strong>
              <p>
                {activeSession.task_title ||
                  `Task #${activeSession.task_id}`}
              </p>
            </div>
          </div>

          <div
            className="task-tracker-timer"
            aria-live="off"
            aria-label={`Elapsed time ${formatDuration(elapsedSeconds)}`}
          >
            {formatDuration(elapsedSeconds)}
          </div>

          <button
            type="button"
            className="task-tracker-end-button"
            onClick={() => {
              setWorkSummary("");
              setError("");
              setShowEndSessionModal(true);
            }}
            disabled={trackerLoading}
          >
            End Session
          </button>
        </div>
      )}

      <Table
        columns={[
          {
            key: "assignedBy",
            label: "Assign By",
            width: "1.1fr",
            minWidth: 125,
            align: "left",
          },
          {
            key: "taskName",
            label: "Task Name",
            width: "1.8fr",
            minWidth: 220,
            align: "left",
          },
          {
            key: "taskDate",
            label: "Task Date",
            width: "1fr",
            minWidth: 120,
            align: "left",
          },
          {
            key: "dueDate",
            label: "Due Date",
            width: "1fr",
            minWidth: 120,
            align: "left",
          },
          {
            key: "status",
            label: "Status",
            width: "1fr",
            minWidth: 110,
            align: "left",
          },
          {
            key: "taskType",
            label: "Task Type",
            width: "0.9fr",
            minWidth: 115,
            align: "left",
          },
          {
            key: "startingAt",
            label: "Starting At",
            width: "1.2fr",
            minWidth: 145,
            align: "left",
          },
          {
            key: "endingAt",
            label: "Ending At",
            width: "1.2fr",
            minWidth: 145,
            align: "left",
          },
          {
            key: "taskStatus",
            label: "Task Status",
            width: "1.2fr",
            minWidth: 165,
            align: "center",
          },
          {
            key: "action",
            label: "Action",
            width: "0.9fr",
            minWidth: 90,
            align: "center",
          },
        ]}
        data={paginatedTasks}
        emptyMessage={
          loading
            ? "Loading tasks..."
            : status === "completed"
              ? "No completed tasks found"
              : status === "pending"
                ? "No pending tasks found"
                : status === "in-progress" || status === "active"
                  ? "No in-progress tasks found"
                  : status === "overdue"
                    ? "No overdue tasks found"
                    : "No tasks assigned"
        }
        renderRow={(task, index, gridTemplate) => {
          const taskStatus = getTaskStatus(task);
          const taskId = String(task.id);
          const isCurrentSession = currentSessionTaskId === taskId;
          const isCompleted = taskStatus === "Completed";
          const isScheduledFuture = isFutureTask(task.task_date);
          const canStartSession =
            !isCompleted && task.is_active && !activeSession && !task.is_blocked && !isScheduledFuture;
          const canCompleteTask =
            !isCompleted &&
            Boolean(task.start_time) &&
            !activeSession &&
            task.is_active;

          return (
            <div
              className="task-table-row"
              key={task.id}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div>{task.assigned_by_name || "-"}</div>

              <div className="task-name-cell" title={task.task_name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.task_name}</span>
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
                      cursor: "help",
                    }}
                    title={`Blocked by prerequisite tasks: ${task.blocking_tasks?.map((b) => b.task_name).join(", ")}`}
                  >
                    🔒 Blocked
                  </span>
                )}
              </div>

              <div className="task-date-cell">
                {formatDate(task.task_date)}
              </div>

              <div className="task-date-cell">
                {formatDate(task.due_date)}
              </div>

              <div>
                <span
                  className={
                    task.is_active ? "status-active" : "status-inactive"
                  }
                >
                  {task.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div>{task.task_type || "-"}</div>

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
                <div
                  className="action-menu-wrapper"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="action-menu-btn"
                    aria-label={`Actions for ${task.task_name}`}
                    aria-expanded={openMenu === task.id}
                    onClick={() =>
                      setOpenMenu(openMenu === task.id ? null : task.id)
                    }
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  </button>

                  {openMenu === task.id && (
                    <div
                      className={`action-dropdown ${
                        tasks.findIndex((item) => item.id === task.id) >=
                        tasks.length - 2
                          ? "action-dropdown-up"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleViewTask(task)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>View</span>
                      </button>

                      {isCurrentSession ? (
                        <button
                          type="button"
                          className="end-task-btn"
                          onClick={() => {
                            setWorkSummary("");
                            setError("");
                            setShowEndSessionModal(true);
                            setOpenMenu(null);
                          }}
                          disabled={trackerLoading}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                          </svg>
                          <span>End Session</span>
                        </button>
                      ) : (
                        !isCompleted && (
                          <button
                            type="button"
                            className={`start-task-btn ${task.is_blocked || isScheduledFuture ? "disabled" : ""}`}
                            onClick={() => handleStartTracking(task.id)}
                            disabled={!canStartSession || trackerLoading}
                            title={
                              task.is_blocked
                                ? `Cannot start: blocked by ${task.blocking_tasks?.map((b) => b.task_name).join(", ")}`
                                : isScheduledFuture
                                ? `Cannot start yet: scheduled to start on ${formatDate(task.task_date)}`
                                : activeSession
                                ? "End your current session first"
                                : !task.is_active
                                ? "This task is inactive"
                                : "Start Session"
                            }
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span>
                              {task.is_blocked
                                ? "🔒 Blocked"
                                : isScheduledFuture
                                ? "📅 Scheduled"
                                : trackerLoading
                                ? "Please wait..."
                                : activeSession
                                ? "End current session first"
                                : "Start Session"}
                            </span>
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        className="history-task-btn"
                        onClick={() => handleViewSessionHistory(task)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>Session History</span>
                      </button>

                      {canCompleteTask && (
                        <button
                          type="button"
                          onClick={() => handleEndTask(task.id)}
                          disabled={actionLoading === task.id}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                          <span>
                            {actionLoading === task.id
                              ? "Completing..."
                              : "Complete Task"}
                          </span>
                        </button>
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
            onClick={() => setCurrentPage(1)}
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
                key={page}
                type="button"
                className={`pagination-number ${
                  currentPage === page ? "active" : ""
                }`}
                onClick={() => setCurrentPage(page)}
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
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || loading}
            aria-label="Last page"
            title="Last page"
          >
            »
          </button>
        </div>
      )}

      {viewTask && (
        <div
          className="task-view-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseView();
            }
          }}
        >
          <div className="task-view-panel">
            <div className="task-view-header">
              <div>
                <h2>Task Details</h2>
                <p>Complete task information</p>
              </div>

              <button
                type="button"
                className="task-view-close"
                onClick={handleCloseView}
              >
                ×
              </button>
            </div>

            <div className="task-view-columns">
              <div className="task-details-column">
                <div className="task-view-section">
                  <h3>Task Information</h3>

                  <div className="task-view-grid">
                    <div className="task-name-detail">
                      <span>Task Name</span>
                      <strong>{viewTask.task_name || "-"}</strong>
                    </div>

                    <div>
                      <span>Task Type</span>
                      <strong>{viewTask.task_type || "-"}</strong>
                    </div>

                    <div>
                      <span>Task Date</span>
                      <strong>{formatDate(viewTask.task_date)}</strong>
                    </div>

                    <div>
                      <span>Due Date</span>
                      <strong>{formatDate(viewTask.due_date)}</strong>
                    </div>

                    <div>
                      <span>Active Status</span>
                      <strong>{viewTask.is_active ? "Active" : "Inactive"}</strong>
                    </div>

                    <div>
                      <span>Task Status</span>
                      <strong>{getTaskStatus(viewTask)}</strong>
                    </div>
                  </div>
                </div>

                <div className="task-view-section">
                  <h3>Assignment Information</h3>

                  <div className="task-view-grid">
                    <div>
                      <span>Assigned By</span>
                      <strong>{viewTask.assigned_by_name || "-"}</strong>
                    </div>

                    <div>
                      <span>Admin Email</span>
                      <strong>{viewTask.assigned_by_email || "-"}</strong>
                    </div>
                  </div>
                </div>

                <div className="task-view-section">
                  <h3>Task Progress</h3>

                  <div className="task-view-grid">
                    <div>
                      <span>Started At</span>
                      <strong>{formatDateTime(viewTask.start_time)}</strong>
                    </div>

                    <div>
                      <span>Ended At</span>
                      <strong>{formatDateTime(viewTask.end_time)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="task-log-column">
                <div className="task-log-header">
                  <div>
                    <h3>Task Log</h3>
                    <p>Task activity and assignment history</p>
                  </div>

                  <span className="task-log-count">{taskLogs.length}</span>
                </div>

                <div className="task-log-content">
                  {taskLogsLoading ? (
                    <div className="task-log-empty">
                      <span>Loading task log...</span>
                    </div>
                  ) : taskLogs.length === 0 ? (
                    <div className="task-log-empty">
                      <span>No task log available</span>
                    </div>
                  ) : (
                    taskLogs.map((log) => (
                      <div className="task-log-item" key={log.id}>
                        <strong>
                          {log.task_details || "Task Activity"}
                        </strong>
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEndSessionModal && activeSession && (
        <div
          className="task-tracker-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget && !trackerLoading) {
              setShowEndSessionModal(false);
            }
          }}
        >
          <div
            className="task-tracker-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-session-title"
          >
            <div className="task-tracker-modal-header">
              <div>
                <h2 id="end-session-title">End Tracking Session</h2>
                <p>
                  {activeSession.task_title ||
                    `Task #${activeSession.task_id}`}
                </p>
              </div>

              <button
                type="button"
                className="task-tracker-close-button"
                onClick={() => setShowEndSessionModal(false)}
                disabled={trackerLoading}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="task-tracker-modal-body">
              <label htmlFor="work-summary">Work summary *</label>
              <textarea
                id="work-summary"
                value={workSummary}
                onChange={(event) => setWorkSummary(event.target.value)}
                placeholder="Describe what you worked on during this session..."
                rows={5}
                required
              />

              <p className="task-tracker-duration-label">
                Session duration:{" "}
                <strong>{formatDuration(elapsedSeconds)}</strong>
              </p>
            </div>

            <div className="task-tracker-modal-actions">
              <button
                type="button"
                className="task-tracker-cancel-button"
                onClick={() => setShowEndSessionModal(false)}
                disabled={trackerLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="task-tracker-save-button"
                onClick={handleEndTracking}
                disabled={trackerLoading || !workSummary.trim()}
              >
                {trackerLoading ? "Saving..." : "Save & End Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionHistoryTask && (
        <div
          className="task-tracker-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSessionHistoryTask(null);
            }
          }}
        >
          <div
            className="task-tracker-modal task-tracker-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-history-title"
          >
            <div className="task-tracker-modal-header">
              <div>
                <h2 id="session-history-title">Session History</h2>
                <p>{sessionHistoryTask.task_name}</p>
              </div>

              <button
                type="button"
                className="task-tracker-close-button"
                onClick={() => setSessionHistoryTask(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="task-tracker-history-list">
              {sessionHistoryLoading ? (
                <p>Loading session history...</p>
              ) : sessionHistory.length === 0 ? (
                <p>No tracking sessions have been recorded for this task.</p>
              ) : (
                sessionHistory.map((session) => (
                  <div
                    className="task-tracker-history-item"
                    key={session.id}
                  >
                    <div className="task-tracker-history-top">
                      <strong>Session #{session.id}</strong>
                      <span>
                        {session.status === "running"
                          ? "In progress"
                          : "Completed"}
                      </span>
                    </div>

                    <p>
                      <strong>Started:</strong>{" "}
                      {formatDateTime(session.started_at)}
                    </p>

                    <p>
                      <strong>Ended:</strong>{" "}
                      {session.ended_at
                        ? formatDateTime(session.ended_at)
                        : "Not ended"}
                    </p>

                    <p>
                      <strong>Duration:</strong>{" "}
                      {session.duration_seconds != null
                        ? formatDuration(Number(session.duration_seconds))
                        : "In progress"}
                    </p>

                    <p>
                      <strong>Work summary:</strong>{" "}
                      {session.work_summary || "Not submitted yet"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {confirmCompleteTaskId && (
        <ConfirmDialog
          title="Confirm Action"
          message="Are you sure you want to mark this task as completed?"
          confirmText="Yes, Complete"
          cancelText="Cancel"
          onConfirm={handleConfirmEndTask}
          onCancel={() => setConfirmCompleteTaskId(null)}
        />
      )}
    </div>
  );
};

export default EmployeeTasks;
