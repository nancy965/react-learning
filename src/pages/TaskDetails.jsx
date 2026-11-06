import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  FileText,
  List,
  User,
  Edit,
  Trash2,
  GitFork,
  CheckCircle2,
  AlertCircle,
  Link2,
} from "lucide-react";
import { usePermission } from "../context/PermissionContext";
import { useTheme } from "../context/ThemeContext";
import { getTaskById, getTaskLogs, deleteTask, getTaskDependencies } from "../services/taskService";
import { getUserById } from "../services/userService";
import Loader from "../components/Loader";
import ConfirmDialog from "../components/ConfirmDialog";
import "./TaskDetails.css";

function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const {
    hasPermission,
    loading: permissionsLoading,
  } = usePermission();

  const [task, setTask] = useState(null);
  const [assignedUser, setAssignedUser] = useState(null);
  const [taskLogs, setTaskLogs] = useState([]);
  const [dependencyData, setDependencyData] = useState({
    predecessors: [],
    successors: [],
    is_blocked: false,
    blocking_tasks: [],
  });
  const [loading, setLoading] = useState(true);
  const [taskLogsLoading, setTaskLogsLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadTask = async () => {
      if (permissionsLoading) return;

      const canViewTask =
        hasPermission("tasks.view_employees") ||
        hasPermission("tasks.view_logs") ||
        hasPermission("tasks.view");

      if (!canViewTask) {
        setError("You do not have permission to view task details");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [response, depResponse] = await Promise.all([
          getTaskById(id, token),
          getTaskDependencies(id, token).catch(() => ({ data: null })),
        ]);
        const taskData = response?.data || response?.task;

        if (!taskData) {
          setError("Task not found");
          return;
        }

        setTask(taskData);
        if (depResponse?.data) {
          setDependencyData(depResponse.data);
        } else if (taskData.dependencies) {
          setDependencyData(taskData.dependencies);
        }

        // Fetch assigned employee/user details for Personal Information
        const assignedId =
          taskData.assigned_to ||
          taskData.assigned_to_id ||
          taskData.employee_id;

        if (assignedId) {
          try {
            const userRes = await getUserById(assignedId);
            if (userRes && (userRes.data || userRes.user)) {
              setAssignedUser(userRes.data || userRes.user);
            } else if (userRes) {
              setAssignedUser(userRes);
            }
          } catch (userErr) {
            console.error("Error fetching assigned user details:", userErr);
          }
        }

        // Fetch task activity logs if allowed
        if (hasPermission("tasks.view_logs")) {
          setTaskLogsLoading(true);
          try {
            const logsResponse = await getTaskLogs(id, token);
            setTaskLogs(logsResponse?.data || []);
          } catch (err) {
            console.error("GET TASK LOGS ERROR:", err);
            setTaskLogs([]);
          } finally {
            setTaskLogsLoading(false);
          }
        }
      } catch (err) {
        console.error("GET TASK ERROR:", err);
        setError(
          err.response?.data?.message || "Failed to load task details"
        );
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [id, permissionsLoading]);

  const formatDate = (date) => {
    if (!date) return "--";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDateTime = (date) => {
    if (!date) return "--";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${day} ${month} ${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  const formatLogTime = (date) => {
    if (!date) return "--";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${day}/${month}/${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  const formatRole = (role) => {
    if (!role) return "Employee";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getInitial = (name) => {
    if (!name) return "T";
    return name.trim().charAt(0).toUpperCase();
  };

  const formatCreatedBy = (t) => {
    const creatorName =
      t?.assigned_by_name ||
      t?.created_by_name ||
      t?.admin_name ||
      t?.created_by ||
      "Nency";
    const isGeneralAdmin =
      String(creatorName).trim().toLowerCase() === "nency" ||
      String(creatorName).toLowerCase().includes("nency") ||
      String(t?.admin_role).toLowerCase() === "general_admin";

    if (isGeneralAdmin) {
      return `${creatorName} (General Admin)`;
    }
    return `${creatorName} (Admin)`;
  };

  const handleDeleteTask = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await deleteTask(task.id, token);
      setConfirmDelete(false);
      navigate("/tasks");
    } catch (err) {
      console.error("Error deleting task:", err);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || permissionsLoading) {
    return (
      <div className={`task-details-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <div className="task-details-loading-state">
          <Loader />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className={`task-details-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <div className="task-details-nav-row">
          <button
            type="button"
            className="task-details-back-link"
            onClick={() => navigate("/tasks")}
          >
            ← Back to Tasks
          </button>
        </div>
        <div className="task-details-error-card">
          <h2>Unable to load task details</h2>
          <p>{error || "Task record was not found."}</p>
        </div>
      </div>
    );
  }

  const assignedName =
    assignedUser?.name ||
    task.assigned_to_name ||
    task.employee_name ||
    "--";

  const assignedEmail =
    assignedUser?.email ||
    task.assigned_to_email ||
    task.email ||
    "--";

  const assignedAge =
    assignedUser?.age !== undefined && assignedUser?.age !== null
      ? assignedUser.age
      : (task.assigned_to_age ?? "-");

  const assignedPhone =
    assignedUser?.phone ||
    assignedUser?.phone_number ||
    task.assigned_to_phone ||
    "-";

  const assignedRole =
    assignedUser?.permission_role ||
    assignedUser?.role ||
    task.assigned_role ||
    "Employee";

  const isUserActive =
    assignedUser !== null && assignedUser !== undefined
      ? Boolean(assignedUser.is_active)
      : Boolean(task.is_active);

  return (
    <div className={`task-details-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      {/* Top Back Navigation Link */}
      <div className="task-details-nav-row">
        <button
          type="button"
          className="task-details-back-link"
          onClick={() => navigate("/tasks")}
        >
          ← Back to Tasks
        </button>
      </div>

      {/* Header Section */}
      <div className="task-details-header">
        <div className="task-details-header-left">
          <span className="task-details-breadcrumb-tag">TASKS</span>
          <h1 className="task-details-title">Task Details</h1>
          <p className="task-details-subtitle">
            View complete information about the task.
          </p>
        </div>
      </div>

      {/* Main Task Summary Card */}
      <div className="task-details-summary-card">
        <div className="task-summary-left">
          <div className="task-avatar-circle">
            {getInitial(task.task_name)}
          </div>

          <div className="task-avatar-divider" />

          <div className="task-main-info">
            <h2 className="task-main-name">{task.task_name || "Task"}</h2>
            <div className="task-assignee-row">
              <User size={13} className="task-assignee-icon" />
              <span>Assigned to: {assignedName}</span>
            </div>
          </div>
        </div>

        <div className="task-summary-right">
          <span
            className={`task-status-pill ${
              task.is_active ? "status-active" : "status-inactive"
            }`}
          >
            <span className="status-dot"></span>
            {task.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Row of 4 KPI / Stat Cards */}
      <div className="task-kpi-grid">
        {/* Card 1: Created On */}
        <div className="task-kpi-card">
          <div className="task-kpi-icon-wrap blue-kpi">
            <Calendar size={18} />
          </div>
          <div className="task-kpi-text-wrap">
            <span className="task-kpi-label">Created On</span>
            <strong className="task-kpi-value">
              {formatDate(task.created_at || task.task_date)}
            </strong>
          </div>
        </div>

        {/* Card 2: Due Date */}
        <div className="task-kpi-card">
          <div className="task-kpi-icon-wrap purple-kpi">
            <Calendar size={18} />
          </div>
          <div className="task-kpi-text-wrap">
            <span className="task-kpi-label">Due Date</span>
            <strong className="task-kpi-value">
              {formatDate(task.due_date)}
            </strong>
          </div>
        </div>

        {/* Card 3: Start Time */}
        <div className="task-kpi-card">
          <div className="task-kpi-icon-wrap green-kpi">
            <Clock size={18} />
          </div>
          <div className="task-kpi-text-wrap">
            <span className="task-kpi-label">Start Time</span>
            <strong className="task-kpi-value">
              {formatDateTime(task.start_time)}
            </strong>
          </div>
        </div>

        {/* Card 4: End Time */}
        <div className="task-kpi-card">
          <div className="task-kpi-icon-wrap slate-kpi">
            <Clock size={18} />
          </div>
          <div className="task-kpi-text-wrap">
            <span className="task-kpi-label">End Time</span>
            <strong className="task-kpi-value">
              {formatDateTime(task.end_time)}
            </strong>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="task-section-card">
        <div className="section-card-header">
          <div className="section-header-icon-badge blue-badge">
            <User size={16} />
          </div>
          <div className="section-header-text">
            <h3>Personal Information</h3>
            <p>Basic details of the user.</p>
          </div>
        </div>

        <div className="personal-info-grid">
          <div className="info-field-group">
            <span className="field-label">Full Name</span>
            <span className="field-value">{assignedName}</span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Email Address</span>
            <span className="field-value">{assignedEmail}</span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Age</span>
            <span className="field-value">{assignedAge}</span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Phone Number</span>
            <span className="field-value">{assignedPhone}</span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Assigned Role</span>
            <div className="field-value">
              <span className="assigned-role-tag">
                {formatRole(assignedRole)}
              </span>
            </div>
          </div>

          <div className="info-field-group">
            <span className="field-label">Account Status</span>
            <span
              className={`status-inline-value ${
                isUserActive ? "is-active" : "is-inactive"
              }`}
            >
              <span className="inline-dot">●</span>
              {isUserActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Task Dependencies & Critical Workflow Card */}
      <div className="task-section-card task-dependencies-card" style={{ marginBottom: "24px" }}>
        <div className="section-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="section-header-icon-badge purple-badge">
              <GitFork size={16} />
            </div>
            <div className="section-header-text">
              <h3>Task Dependencies & Critical Workflow</h3>
              <p>Manage prerequisite requirements and successor task flow.</p>
            </div>
          </div>

          <div>
            {dependencyData.is_blocked ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                }}
              >
                <AlertCircle size={13} />
                Blocked ({dependencyData.blocking_tasks?.length || 0} pending)
              </span>
            ) : dependencyData.predecessors?.length > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background: "#dcfce7",
                  color: "#15803d",
                  border: "1px solid #bbf7d0",
                }}
              >
                <CheckCircle2 size={13} />
                Prerequisites Satisfied
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Link2 size={13} />
                Independent Task
              </span>
            )}
          </div>
        </div>

        {/* Blocking Warning Banner */}
        {dependencyData.is_blocked && (
          <div
            style={{
              margin: "16px 0",
              padding: "12px 16px",
              background: "#fff1f2",
              border: "1px solid #ffe4e6",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#9f1239",
              fontSize: "12px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, color: "#e11d48" }} />
            <div>
              <strong>This task is currently blocked from starting.</strong>
              <div style={{ marginTop: "2px", color: "#881337" }}>
                The prerequisite task(s){" "}
                {dependencyData.blocking_tasks?.map((b) => `"${b.task_name}"`).join(", ")} must be marked as Completed first.
              </div>
            </div>
          </div>
        )}

        {/* Dependencies 2-column Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginTop: "16px" }}>
          {/* Column 1: Predecessors */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <strong style={{ fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⬅️ Prerequisite Tasks (Predecessors)</span>
              </strong>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                {dependencyData.predecessors?.length || 0}
              </span>
            </div>

            {(!dependencyData.predecessors || dependencyData.predecessors.length === 0) ? (
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, fontStyle: "italic" }}>
                No prerequisite tasks. This task can be started directly.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {dependencyData.predecessors.map((p) => {
                  const isDone = String(p.status).toLowerCase() === "completed";
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/tasks/${p.id}`)}
                      style={{
                        padding: "10px 12px",
                        background: "#ffffff",
                        border: isDone ? "1px solid #bbf7d0" : "1px solid #fecaca",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.15s ease",
                      }}
                      title="Click to view task details"
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "12px", color: "#0f172a", display: "block" }}>
                          {p.task_name}
                        </span>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>
                          Assigned: {p.assigned_to_name || "Employee"} | Due: {p.due_date ? String(p.due_date).slice(0, 10) : "N/A"}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: isDone ? "#dcfce7" : "#fee2e2",
                          color: isDone ? "#15803d" : "#b91c1c",
                        }}
                      >
                        {isDone ? "✓ Done" : p.status || "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Successors */}
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <strong style={{ fontSize: "13px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>➡️ Dependent Tasks (Successors)</span>
              </strong>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                {dependencyData.successors?.length || 0}
              </span>
            </div>

            {(!dependencyData.successors || dependencyData.successors.length === 0) ? (
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, fontStyle: "italic" }}>
                No succeeding tasks depend on this task.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {dependencyData.successors.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/tasks/${s.id}`)}
                    style={{
                      padding: "10px 12px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s ease",
                    }}
                    title="Click to view task details"
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: "12px", color: "#0f172a", display: "block" }}>
                        {s.task_name}
                      </span>
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        Assigned: {s.assigned_to_name || "Employee"} | Due: {s.due_date ? String(s.due_date).slice(0, 10) : "N/A"}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "#f1f5f9",
                        color: "#475569",
                      }}
                    >
                      {s.status || "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Additional Information + Task Logs */}
      <div className="task-details-bottom-row">
        {/* Additional Information Card */}
        <div className="task-section-card task-additional-card">
          <div className="section-card-header">
            <div className="section-header-icon-badge orange-badge">
              <FileText size={16} />
            </div>
            <div className="section-header-text">
              <h3>Additional Information</h3>
              <p>Other related information.</p>
            </div>
          </div>

          <div className="additional-info-row">
            <div className="additional-field-item">
              <span className="field-label">Created By</span>
              <span className="field-value">{formatCreatedBy(task)}</span>
            </div>

            <div className="additional-divider" />

            <div className="additional-field-item">
              <span className="field-label">Updated On</span>
              <span className="field-value">
                {formatDate(task.updated_at || task.updatedAt || task.created_at || task.task_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Task Logs Card */}
        <div className="task-section-card task-logs-card">
          <div className="section-card-header">
            <div className="section-header-icon-badge purple-badge">
              <List size={16} />
            </div>
            <div className="section-header-text">
              <div className="logs-title-row">
                <h3>Task Logs</h3>
                {taskLogs && taskLogs.length > 0 && (
                  <span className="task-logs-count-badge">
                    {taskLogs.length}
                  </span>
                )}
              </div>
              <p>Track all activity related to this task.</p>
            </div>
          </div>

          <div className="task-logs-timeline-container">
            {taskLogsLoading ? (
              <p className="task-logs-empty">Loading logs...</p>
            ) : !taskLogs || taskLogs.length === 0 ? (
              <p className="task-logs-empty">No task logs found.</p>
            ) : (
              <div className="task-logs-timeline">
                <div className="timeline-connecting-line" />
                {taskLogs.map((log, index) => (
                  <div className="timeline-item" key={log.id || index}>
                    <div className="timeline-dot" />
                    <div className="timeline-card">
                      <span className="timeline-message">
                        {log.task_details || log.action || log.status || "Task activity"}
                      </span>
                      <span className="timeline-timestamp">
                        {formatLogTime(
                          log.created_at || log.start_time || log.end_time
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ConfirmDialog
          title="Confirm Action"
          message="Are you sure you want to delete this task?"
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteTask}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

export default TaskDetails;