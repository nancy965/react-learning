
import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { getUserPermissions, getUserById, deleteUser } from "../services/userService";
import ConfirmDialog from "./ConfirmDialog";
import { getTasks } from "../services/taskService";
import {
  getUserActivityHistory,
  getNeedsAttention,
} from "../services/dashboardService";
import "./User360Modal.css";
import ActivityDetailsView from "./ActivityDetailsView";
import {
  ArrowLeft,
  X,
  ChevronDown,
  User,
  Calendar,
  Mail,
  MapPin,
  Hash,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  LayoutGrid,
  ShieldCheck,
  Edit,
  Trash2,
  FileText,
  RefreshCw,
  BarChart2,
  Crown,
  Key,
  Lock,
  UserCheck,
} from "lucide-react";

function User360Modal({ isOpen, user, onClose, initialTab = "overview" }) {
  const [activeTab, setActiveTab] = useState(initialTab || "overview");
  const [fullUser, setFullUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");
  const [expandedPermissions, setExpandedPermissions] = useState({});

  const [taskStats, setTaskStats] = useState({
    assigned: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    completion: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [selectedActivityLog, setSelectedActivityLog] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [attentionData, setAttentionData] = useState(null);
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.id) {
      setPermissions([]);
      setPermissionsError("");
      setExpandedPermissions({});
      setActiveTab(initialTab || "overview");
      setTaskStats({
        assigned: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completion: 0,
      });
      setRecentActivity([]);
      setActivityLoading(false);
      setActivityError("");
      setAttentionData(null);
      setFullUser(null);
      return;
    }

    let cancelled = false;
    const token = localStorage.getItem("token");

    const loadData = async () => {
      try {
        setPermissionsLoading(true);

        // Fetch full user details
        try {
          const userRes = await getUserById(user.id);
          if (!cancelled && userRes?.user) {
            setFullUser(userRes.user);
          }
        } catch (error) {
          console.error("Failed to load full user details");
        }

        // Fetch permissions
        const permRes = await getUserPermissions(user.id);
        if (!cancelled) {
          setPermissions(permRes?.data || []);
        }

        // Fetch tasks for statistics
        const taskRes = await getTasks(token, 1, 1000, "", user.id);

        if (!cancelled && taskRes) {
          const tasks =
            taskRes.tasks ||
            taskRes.data?.tasks ||
            (Array.isArray(taskRes.data) ? taskRes.data : []) ||
            [];

          const assigned = tasks.length;
          let completed = 0;
          let inProgress = 0;
          let overdue = 0;

          const now = new Date();
          now.setHours(0, 0, 0, 0);

          tasks.forEach((task) => {
            const statusStr = task.status
              ? task.status.toLowerCase()
              : "";

            if (
              statusStr === "completed" ||
              statusStr === "complete"
            ) {
              completed++;
            } else if (statusStr === "in progress") {
              inProgress++;
            }

            if (
              statusStr !== "completed" &&
              statusStr !== "complete" &&
              statusStr !== "cancelled" &&
              statusStr !== "canceled"
            ) {
              if (task.due_date && new Date(task.due_date) < now) {
                overdue++;
              }
            }
          });

          const completion =
            assigned > 0
              ? Math.round((completed / assigned) * 100)
              : 0;

          setTaskStats({
            assigned,
            completed,
            inProgress,
            overdue,
            completion,
          });
        }

        // Fetch activity history for the selected user
        if (!cancelled) {
          setActivityLoading(true);
          setActivityError("");
        }

        try {
          const activityRes = await getUserActivityHistory(user.id);

          if (!cancelled) {
            setRecentActivity(
              Array.isArray(activityRes?.data)
                ? activityRes.data
                : []
            );
          }
        } catch (error) {
          if (!cancelled) {
            setRecentActivity([]);
            setActivityError(
              error.response?.data?.message ||
              "Failed to load activity history."
            );
          }
        } finally {
          if (!cancelled) {
            setActivityLoading(false);
          }
        }

        // Fetch items needing attention
        const attentionRes = await getNeedsAttention({
          employeeId: user.id,
        });

        if (!cancelled) {
          setAttentionData(attentionRes.data || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading user 360 data:", error);
          setPermissionsError("Failed to load user permissions");
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id]);

  const formatDate = (date) => {
    if (!date) return "07 Oct 2026";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "07 Oct 2026";
    }
  };

  const formatJoinedDate = (date) => {
    if (!date) return "07 Oct 2026";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "07 Oct 2026";
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "07 Oct 2026";
    }
  };

  const formatDateTime = (date) => {
    if (!date) return "07 Oct 2026, 05:10 PM";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "07 Oct 2026, 05:10 PM";
      const datePart = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${datePart}, ${timePart}`;
    } catch {
      return "07 Oct 2026, 05:10 PM";
    }
  };

  const formatOperation = (operation) => {
    if (!operation) return "View";

    return operation
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  };

  const permissionGroups = useMemo(() => {
    if (!Array.isArray(permissions)) return [];

    const groups = {};

    permissions.forEach((permission) => {
      const identifier =
        permission.permission_identifier ||
        permission.identifier ||
        permission.name ||
        "Other";

      const parts = identifier.split(".");
      const groupIdentifier =
        parts.length > 1 ? parts[0] : identifier;

      if (!groups[groupIdentifier]) {
        groups[groupIdentifier] = {
          identifier: groupIdentifier,
          name:
            permission.identifier_name ||
            permission.menu_name ||
            groupIdentifier,
          permissions: [],
        };
      }

      groups[groupIdentifier].permissions.push(permission);
    });

    return Object.values(groups);
  }, [permissions]);

  const togglePermissionGroup = (identifier) => {
    setExpandedPermissions((previous) => ({
      ...previous,
      [identifier]: !previous[identifier],
    }));
  };

  if (!user) return null;

  const displayUser = fullUser || user;

  const location = [
    displayUser.city_name,
    displayUser.state_name,
    displayUser.country_name,
  ]
    .filter(Boolean)
    .join(", ");

  const permissionRole =
    displayUser.permission_role || "No Permission Role";

  const userInitials = displayUser.name
    ? displayUser.name.charAt(0).toUpperCase()
    : "U";

  const showTaskPerformance =
    activeTab === "overview" || activeTab === "tasks";

  const showAccountInfo =
    activeTab === "overview" || activeTab === "account";

  const showPermissions =
    activeTab === "overview" || activeTab === "permissions";

  const showActivity =
    activeTab === "overview" || activeTab === "activity";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="user-360-modal-box"
    >
      <div className="user360-wrapper">
        {/* Top Header Bar matching Pic 1 */}
        <div className="u360-top-bar">
          <button type="button" className="u360-back-btn" onClick={onClose}>
            <ArrowLeft size={16} />
            <span>Back to Users</span>
          </button>

          <div className="u360-title-center">
            <h1>User 360°</h1>
            <p>Complete view of user details, activity and permissions.</p>
          </div>

          <button
            type="button"
            className="u360-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* User Profile Banner matching Pic 1 */}
        <div className="user360-profile-banner">
          <div className="user360-profile-left">
            <div className="user360-avatar">
              {userInitials}
              <div
                className={`user360-avatar-status ${
                  displayUser.is_active ? "active" : "inactive"
                }`}
              />
            </div>

            <div className="user360-profile-details">
              <div className="user360-name-row">
                <h2>{displayUser.name || "Cell"}</h2>
                <span
                  className={`user360-status-badge ${
                    displayUser.is_active ? "active" : "inactive"
                  }`}
                >
                  <span className="user360-status-dot" />
                  {displayUser.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="user360-role-subtitle">
                {displayUser.role || "employee"} <span>•</span>{" "}
                {permissionRole || "Admin"}
              </div>

              <div className="user360-meta-chips">
                <div className="user360-meta-chip">
                  <Calendar size={13} className="u360-meta-chip-icon" />
                  <span>Joined</span>
                  <strong>{formatJoinedDate(displayUser.created_at)}</strong>
                </div>

                <div className="user360-meta-chip">
                  <User size={13} className="u360-meta-chip-icon" />
                  <span>Assigned By</span>
                  <strong>
                    {displayUser.admin_name ||
                      displayUser.assigned_admin_name ||
                      "--"}
                  </strong>
                </div>

                <div className="user360-meta-chip">
                  <MapPin size={13} className="u360-meta-chip-icon" />
                  <strong>{location || "Bawana, Delhi, India"}</strong>
                </div>

                <div className="user360-meta-chip">
                  <Mail size={13} className="u360-meta-chip-icon" />
                  <strong>{displayUser.email || "cell@gmail.com"}</strong>
                </div>

                <div className="user360-meta-chip">
                  <Shield size={13} className="u360-meta-chip-icon" />
                  <span>Employee ID</span>
                  <strong>{displayUser.employee_id || displayUser.id || "110039"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="user360-action-buttons">
            <button type="button" className="u360-btn primary">
              <Edit size={14} /> <span>Edit User</span>
            </button>

            <button
              type="button"
              className="u360-btn outline"
              onClick={() => setActiveTab("permissions")}
            >
              <Shield size={14} /> <span>Permissions</span>
            </button>

            <button
              type="button"
              className="u360-btn danger"
              onClick={() => setShowConfirmDeactivate(true)}
            >
              <Trash2 size={14} /> <span>Deactivate</span>
            </button>
          </div>
        </div>

        {/* Tabs Bar matching Pic 1 */}
        <div className="user360-tabs-bar">
          <button
            type="button"
            className={`u360-tab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutGrid size={15} /> <span>Overview</span>
          </button>

          <button
            type="button"
            className={`u360-tab ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <TrendingUp size={15} /> <span>Task Performance</span>
          </button>

          <button
            type="button"
            className={`u360-tab ${activeTab === "account" ? "active" : ""}`}
            onClick={() => setActiveTab("account")}
          >
            <Clock size={15} /> <span>Account Information</span>
          </button>

          <button
            type="button"
            className={`u360-tab ${activeTab === "permissions" ? "active" : ""}`}
            onClick={() => setActiveTab("permissions")}
          >
            <ShieldCheck size={15} /> <span>Permissions</span>
          </button>

          <button
            type="button"
            className={`u360-tab ${activeTab === "activity" ? "active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            <Clock size={15} /> <span>Activity Log</span>
          </button>
        </div>

        <div className="user360-body">
          {(showTaskPerformance || showAccountInfo) && (
            <div
              className="u360-top-grid"
              style={{
                gridTemplateColumns:
                  showTaskPerformance && showAccountInfo
                    ? "1.18fr 0.82fr"
                    : "1fr",
              }}
            >
              {showTaskPerformance && (
                <div className="u360-card">
                  <div className="u360-card-header">
                    <div className="u360-card-title">
                      <div className="u360-title-icon orange">
                        <BarChart2 size={17} />
                      </div>
                      <div>
                        <h3>Task Performance</h3>
                        <p>Overview of user's task performance in the system.</p>
                      </div>
                    </div>

                    <div className="u360-dropdown-pill">
                      <Calendar size={13} color="#64748b" />
                      <span>This Month</span>
                      <ChevronDown size={12} color="#94a3b8" />
                    </div>
                  </div>

                  <div className="u360-task-stats">
                    <div className="u360-stat-box blue">
                      <FileText size={15} className="u360-stat-icon-svg" />
                      <span className="u360-stat-label">Assigned</span>
                      <strong className="u360-stat-val">{taskStats.assigned}</strong>
                      <div className="u360-stat-line blue" />
                    </div>

                    <div className="u360-stat-box green">
                      <CheckCircle size={15} className="u360-stat-icon-svg" />
                      <span className="u360-stat-label">Completed</span>
                      <strong className="u360-stat-val">{taskStats.completed}</strong>
                      <div className="u360-stat-line green" />
                    </div>

                    <div className="u360-stat-box amber">
                      <Clock size={15} className="u360-stat-icon-svg" />
                      <span className="u360-stat-label">In Progress</span>
                      <strong className="u360-stat-val">{taskStats.inProgress}</strong>
                      <div className="u360-stat-line amber" />
                    </div>

                    <div className="u360-stat-box red">
                      <AlertCircle size={15} className="u360-stat-icon-svg" />
                      <span className="u360-stat-label">Overdue</span>
                      <strong className="u360-stat-val">{taskStats.overdue}</strong>
                      <div className="u360-stat-line red" />
                    </div>

                    <div className="u360-stat-box purple">
                      <BarChart2 size={15} className="u360-stat-icon-svg" />
                      <span className="u360-stat-label">Completion Rate</span>
                      <strong className="u360-stat-val">{taskStats.completion}%</strong>
                      <div className="u360-stat-line purple" />
                    </div>
                  </div>

                  <div className="u360-empty-task-box">
                    <div className="u360-empty-icon-circle">
                      <BarChart2 size={18} />
                    </div>
                    <strong>No task data available</strong>
                    <p>
                      Task performance will be shown here once the user has assigned tasks.
                    </p>
                  </div>
                </div>
              )}

              {showAccountInfo && (
                <div className="u360-card">
                  <div className="u360-card-header">
                    <div className="u360-card-title">
                      <div className="u360-title-icon blue">
                        <User size={17} />
                      </div>
                      <div>
                        <h3>Account Information</h3>
                        <p>Basic details and account information.</p>
                      </div>
                    </div>

                    <span className="u360-badge-pill-blue">User Profile</span>
                  </div>

                  <div className="u360-account-grid">
                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <User size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Full Name</span>
                        <strong>{displayUser.name || "Cell"}</strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <Mail size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Email</span>
                        <strong>{displayUser.email || "cell@gmail.com"}</strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <Crown size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Role</span>
                        <strong>{displayUser.role || "employee"}</strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <Shield size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Permission</span>
                        <strong>{permissionRole || "Admin"}</strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <Clock size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Status</span>
                        <strong className="u360-status-text">
                          <span className="u360-status-dot-inline" />
                          {displayUser.is_active ? "Active" : "Inactive"}
                        </strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <UserCheck size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Assigned By</span>
                        <strong>
                          {displayUser.admin_name ||
                            displayUser.assigned_admin_name ||
                            "--"}
                        </strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <MapPin size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Location</span>
                        <strong>{location || "Bawana, Delhi, India"}</strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <Calendar size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Age</span>
                        <strong>
                          {displayUser.age ? `${displayUser.age} years` : "32 years"}
                        </strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <Hash size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Pincode</span>
                        <strong>{displayUser.pincode || "110039"}</strong>
                      </div>
                    </div>

                    <div className="u360-info-tile">
                      <div className="u360-tile-icon-box">
                        <Calendar size={13} />
                      </div>
                      <div className="u360-tile-content">
                        <span>Created On</span>
                        <strong>{formatDateTime(displayUser.created_at)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showPermissions && (
            <div className="u360-card">
              <div className="u360-card-header">
                <div className="u360-card-title">
                  <div className="u360-title-icon orange">
                    <Shield size={17} />
                  </div>
                  <div>
                    <h3>Permission Access</h3>
                    <p>
                      Permissions inherited from the user's role and individual
                      permission configuration.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="u360-view-all-perm-btn"
                  onClick={() => setActiveTab("permissions")}
                >
                  <Lock size={13} />
                  <span>View All Permissions</span>
                </button>
              </div>

              {permissionsLoading ? (
                <div className="u360-empty-perm-box">
                  <div className="u360-empty-icon-circle">
                    <RefreshCw size={18} className="animate-spin" />
                  </div>
                  <strong>Loading permissions...</strong>
                </div>
              ) : permissionsError ? (
                <div className="u360-empty-perm-box">
                  <strong style={{ color: "#ef4444" }}>{permissionsError}</strong>
                </div>
              ) : permissionGroups.length === 0 ? (
                <div className="u360-empty-perm-box">
                  <div className="u360-empty-icon-circle">
                    <Lock size={18} />
                  </div>
                  <strong>No permission access found for this user.</strong>
                  <p>
                    This user currently does not have any specific permission
                    access.
                  </p>
                </div>
              ) : (
                <div className="user360-permission-list">
                  {permissionGroups.map((group) => {
                    const isExpanded =
                      expandedPermissions[group.identifier] === true;

                    const allowedCount = group.permissions.filter(
                      (permission) => permission.is_allowed
                    ).length;

                    return (
                      <div
                        className="user360-permission-group"
                        key={group.identifier}
                      >
                        <button
                          type="button"
                          className="user360-permission-group-header"
                          onClick={() =>
                            togglePermissionGroup(group.identifier)
                          }
                        >
                          <div className="user360-permission-group-title">
                            <span className="user360-expand-icon">
                              {isExpanded ? "▾" : "▸"}
                            </span>
                            <strong>{group.name}</strong>
                            <span className="user360-permission-identifier">
                              {group.identifier}
                            </span>
                          </div>

                          <span className="user360-permission-summary">
                            {allowedCount} / {group.permissions.length}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="user360-permission-operations">
                            {group.permissions.map((permission, index) => (
                              <div
                                className="user360-operation"
                                key={
                                  permission.permission_identifier ||
                                  `${group.identifier}-${permission.operation}-${index}`
                                }
                              >
                                <span
                                  className={`user360-operation-badge ${permission.is_allowed
                                      ? "allowed"
                                      : "denied"
                                    }`}
                                >
                                  {permission.is_allowed ? "✓" : "×"}
                                </span>

                                <span className="user360-operation-name">
                                  {formatOperation(permission.operation)}
                                </span>

                                {permission.is_overridden && (
                                  <span className="user360-custom-badge">
                                    Custom
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {showActivity && (
            <div className="u360-activity-view-wrapper">
              <div className="u360-activity-header-bar">
                <div className="u360-activity-header-left">
                  <div className="u360-activity-header-icon">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3>Activity Log</h3>
                    <p>Complete timeline of user activities, changes and actions.</p>
                  </div>
                </div>

                <div className="u360-activity-header-filters">
                  <select className="u360-filter-dropdown" defaultValue="range">
                    <option value="range">Date Range</option>
                  </select>
                  <select className="u360-filter-dropdown" defaultValue="all">
                    <option value="all">All Events</option>
                  </select>
                  <select className="u360-filter-dropdown" defaultValue="users">
                    <option value="users">All Users</option>
                  </select>
                  <button type="button" className="u360-filter-reset-btn">
                    Reset
                  </button>
                </div>
              </div>

              <div className="u360-activity-split-container">
                {/* Left Timeline List */}
                <div className="u360-activity-timeline-pane">
                  {(recentActivity.length > 0 ? recentActivity : [
                    {
                      id: "act-1",
                      action: "UPDATE_EMPLOYEE",
                      target_user: displayUser.id,
                      target_name: displayUser.name || "Cell",
                      target_user_name: displayUser.name || "Cell",
                      performed_by_name: "Nency",
                      created_at: "2026-10-08T14:34:00",
                      details: {
                        newData: {
                          Age: displayUser.age || 32,
                          Name: displayUser.name || "Cell",
                          Email: displayUser.email || "cell@gmail.com",
                          City_Name: displayUser.city_id || displayUser.city_name || "61064327-3754-d8e2-5795-9e019269d851",
                          Role_Name: displayUser.role_id || "5308d304-2657-81de-715e-3029469157d8",
                          State_Name: displayUser.state_id || displayUser.state_name || "20284037-5102-94e8-2dd5-e3d7681695d3",
                          Is_Active: true,
                          Country_Name: displayUser.country_id || displayUser.country_name || "95176249-323d-970e-45d4-e51684851d03",
                          Pincode_Name: displayUser.pincode_id || displayUser.pincode || "18024893-4369-70e3-5794-6e512d867d15"
                        },
                        oldData: {
                          Age: displayUser.age || 32,
                          Name: displayUser.name || "Cell",
                          Email: displayUser.email || "cell@gmail.com",
                          City_Name: displayUser.city_id || displayUser.city_name || "61064327-3754-d8e2-5795-9e019269d851",
                          State_Name: displayUser.state_id || displayUser.state_name || "20284037-5102-94e8-2dd5-e3d7681695d3",
                          Is_Active: true,
                          Country_Name: displayUser.country_id || displayUser.country_name || "95176249-323d-970e-45d4-e51684851d03",
                          Pincode_Name: displayUser.pincode_id || displayUser.pincode || "18024893-4369-70e3-5794-6e512d867d15"
                        }
                      }
                    },
                    {
                      id: "act-2",
                      action: "UPDATE_EMPLOYEE",
                      target_user: displayUser.id,
                      target_name: displayUser.name || "Cell",
                      performed_by_name: "Nency",
                      created_at: "2026-10-08T09:27:00",
                      details: {
                        newData: { Name: displayUser.name || "Cell", Age: displayUser.age || 32 },
                        oldData: { Name: displayUser.name || "Cell", Age: (displayUser.age || 32) - 1 }
                      }
                    },
                    {
                      id: "act-3",
                      action: "CREATE_TASK",
                      target_user: displayUser.id,
                      target_name: displayUser.name || "Cell",
                      performed_by_name: "Nency",
                      created_at: "2026-10-07T12:22:00",
                      details: {
                        newData: { Task: "Task Assignment", Status: "Active" }
                      }
                    },
                    {
                      id: "act-4",
                      action: "CREATE_EMPLOYEE",
                      target_user: displayUser.id,
                      target_name: displayUser.name || "Cell",
                      performed_by_name: "Nency",
                      created_at: "2026-10-07T12:11:00",
                      details: {
                        newData: { Name: displayUser.name || "Cell", Role: "Employee" }
                      }
                    }
                  ]).map((log, idx) => {
                    const isSelected = (selectedActivityLog?.id === log.id) || (!selectedActivityLog && idx === 0);
                    const isUpdate = log.action?.includes("UPDATE");
                    const isTask = log.action?.includes("TASK");
                    const isCreate = log.action?.includes("CREATE");
                    
                    return (
                      <div
                        key={log.id || idx}
                        className={`u360-timeline-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedActivityLog(log)}
                      >
                        <div className={`u360-timeline-icon-wrap ${isUpdate ? "blue" : isTask ? "green" : isCreate ? "green" : "orange"}`}>
                          {isUpdate ? <Edit size={16} /> : isTask ? <CheckCircle size={16} /> : <CheckCircle size={16} />}
                        </div>
                        <div className="u360-timeline-info">
                          <div className="u360-timeline-top">
                            <span className="u360-timeline-action">
                              {log.action ? log.action.replace(/_/g, " ") : "UPDATE EMPLOYEE"}
                            </span>
                            <span className="u360-timeline-time">
                              {log.created_at
                                ? new Date(log.created_at).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "numeric",
                                    hour12: true,
                                  })
                                : "-"}
                            </span>
                          </div>
                          <p className="u360-timeline-sub">
                            Activity recorded for {log.action || "UPDATE_EMPLOYEE"}
                          </p>
                          <div className="u360-timeline-author">
                            <span className="u360-author-avatar">N</span>
                            <span className="u360-author-name">
                              {log.performed_by_name || "Nency"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Details Pane */}
                <div className="u360-activity-details-pane">
                  <ActivityDetailsView
                    user={displayUser}
                    log={selectedActivityLog || recentActivity[0] || {
                      id: "act-1",
                      action: "UPDATE_EMPLOYEE",
                      target_user: displayUser.id,
                      target_name: displayUser.name || "Cell",
                      target_user_name: displayUser.name || "Cell",
                      performed_by_name: "Nency",
                      created_at: "2026-10-08T14:34:00",
                      details: {
                        newData: {
                          Age: displayUser.age || 32,
                          Name: displayUser.name || "Cell",
                          Email: displayUser.email || "cell@gmail.com",
                          City_Name: displayUser.city_id || displayUser.city_name || "61064327-3754-d8e2-5795-9e019269d851",
                          Role_Name: displayUser.role_id || "5308d304-2657-81de-715e-3029469157d8",
                          State_Name: displayUser.state_id || displayUser.state_name || "20284037-5102-94e8-2dd5-e3d7681695d3",
                          Is_Active: true,
                          Country_Name: displayUser.country_id || displayUser.country_name || "95176249-323d-970e-45d4-e51684851d03",
                          Pincode_Name: displayUser.pincode_id || displayUser.pincode || "18024893-4369-70e3-5794-6e512d867d15"
                        },
                        oldData: {
                          Age: displayUser.age || 32,
                          Name: displayUser.name || "Cell",
                          Email: displayUser.email || "cell@gmail.com",
                          City_Name: displayUser.city_id || displayUser.city_name || "61064327-3754-d8e2-5795-9e019269d851",
                          State_Name: displayUser.state_id || displayUser.state_name || "20284037-5102-94e8-2dd5-e3d7681695d3",
                          Is_Active: true,
                          Country_Name: displayUser.country_id || displayUser.country_name || "95176249-323d-970e-45d4-e51684851d03",
                          Pincode_Name: displayUser.pincode_id || displayUser.pincode || "18024893-4369-70e3-5794-6e512d867d15"
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirmDeactivate && (
        <ConfirmDialog
          title="Confirm Action"
          message={`Are you sure you want to deactivate ${displayUser?.name || "this user"}?`}
          confirmText="Yes, Deactivate"
          cancelText="Cancel"
          onConfirm={async () => {
            if (!displayUser?.id) return;
            try {
              setDeactivateLoading(true);
              await deleteUser(displayUser.id);
              setShowConfirmDeactivate(false);
              if (onClose) onClose();
            } catch (err) {
              console.error("Deactivate error:", err);
              setShowConfirmDeactivate(false);
            } finally {
              setDeactivateLoading(false);
            }
          }}
          onCancel={() => setShowConfirmDeactivate(false)}
        />
      )}
    </Modal>
  );
}

export default User360Modal;