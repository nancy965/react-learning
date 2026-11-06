import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./ViewRole.css";
import PATHS from "../config/path.config";
import {
  ArrowLeft,
  Edit,
  Shield,
  Info,
  Layers,
  Search,
  ChevronRight,
  User,
  Clock,
  ExternalLink,
  Lock,
  FileText,
  Home,
  Users,
  UserCheck,
  CheckSquare,
  MessageSquare,
  Megaphone,
  BarChart2,
  MapPin,
  Globe,
  Building,
  Hash,
  Activity,
} from "lucide-react";
import { API_URL } from "../config/axios.util";

const ALLOWED_OPS = ["view", "create", "edit", "delete", "import", "export"];

function ViewRole() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("permissions");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadRole();
  }, [id]);

  const loadRole = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${API_URL}/role-permissions/roles/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setRole(response.data.data?.role || null);
      setPermissions(response.data.data?.permissions || []);
    } catch (err) {
      console.error("Load role error:", err);
      setError(err.response?.data?.message || "Failed to load role");
    } finally {
      setLoading(false);
    }
  };

  const getOperations = (operations) => {
    if (!operations) return [];
    if (Array.isArray(operations)) return operations;
    try {
      const parsed = JSON.parse(operations);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const visiblePermissions = useMemo(() => {
    return permissions.filter((permission) => {
      const ops = getOperations(permission.operations).filter((operation) =>
        ALLOWED_OPS.includes(operation.toLowerCase()),
      );
      return (
        ops.length > 0 || Boolean(permission.identifier_id || permission.id)
      );
    });
  }, [permissions]);

  const totalModules = visiblePermissions.length;

  const totalPermissions = useMemo(() => {
    return visiblePermissions.reduce((acc, curr) => {
      const ops = getOperations(curr.operations).filter((operation) =>
        ALLOWED_OPS.includes(operation.toLowerCase()),
      );
      return acc + (ops.length > 0 ? ops.length : 1);
    }, 0);
  }, [visiblePermissions]);

  const formatDateTime = (
    dateStr,
    defaultDate = "07 Oct 2026",
    defaultTime = "09:30 AM",
  ) => {
    if (!dateStr) return { date: defaultDate, time: defaultTime };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: defaultDate, time: defaultTime };
      const date = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const time = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return { date, time };
    } catch {
      return { date: defaultDate, time: defaultTime };
    }
  };

  const createdInfo = formatDateTime(
    role?.created_at || role?.createdAt,
    "07 Oct 2026",
    "09:30 AM",
  );
  const updatedInfo = formatDateTime(
    role?.updated_at || role?.updatedAt,
    "12 Oct 2026",
    "04:15 PM",
  );

  const getModuleConfig = (identifier, name) => {
    const key = (identifier || name || "").toLowerCase().trim();

    if (key.includes("dashboard")) {
      return {
        icon: <Home size={16} />,
        bg: "#fff7ed",
        color: "#ea580c",
        desc: "Access to dashboard and analytics overview.",
      };
    }
    if (key.includes("user")) {
      return {
        icon: <Users size={16} />,
        bg: "#fee2e2",
        color: "#ef4444",
        desc: "Manage user accounts and employee information.",
      };
    }
    if (key.includes("admin")) {
      return {
        icon: <UserCheck size={16} />,
        bg: "#f3e8ff",
        color: "#a855f7",
        desc: "Manage admin accounts and permissions.",
      };
    }
    if (key.includes("task_analytic") || key.includes("task analytics")) {
      return {
        icon: <BarChart2 size={16} />,
        bg: "#ede9fe",
        color: "#6366f1",
        desc: "View task analytics and reports.",
      };
    }
    if (key.includes("task")) {
      return {
        icon: <CheckSquare size={16} />,
        bg: "#dcfce7",
        color: "#16a34a",
        desc: "Manage tasks, assignments and tracking.",
      };
    }
    if (key.includes("chat")) {
      return {
        icon: <MessageSquare size={16} />,
        bg: "#e0f2fe",
        color: "#0284c7",
        desc: "Access and manage chat functionality.",
      };
    }
    if (key.includes("ad")) {
      return {
        icon: <Megaphone size={16} />,
        bg: "#fef3c7",
        color: "#d97706",
        desc: "Manage advertisement content.",
      };
    }
    if (key.includes("state")) {
      return {
        icon: <MapPin size={16} />,
        bg: "#e0f2fe",
        color: "#0284c7",
        desc: "Manage state information.",
      };
    }
    if (key.includes("countr")) {
      return {
        icon: <Globe size={16} />,
        bg: "#e0f2fe",
        color: "#0284c7",
        desc: "Manage country information.",
      };
    }
    if (key.includes("cit")) {
      return {
        icon: <Building size={16} />,
        bg: "#fef3c7",
        color: "#d97706",
        desc: "Manage city information.",
      };
    }
    if (key.includes("pincode")) {
      return {
        icon: <Hash size={16} />,
        bg: "#dcfce7",
        color: "#16a34a",
        desc: "Manage postal code information.",
      };
    }
    if (key.includes("activ") || key.includes("log")) {
      return {
        icon: <Activity size={16} />,
        bg: "#fee2e2",
        color: "#ef4444",
        desc: "View system audit logs and activity history.",
      };
    }
    if (key.includes("profile")) {
      return {
        icon: <User size={16} />,
        bg: "#f3e8ff",
        color: "#a855f7",
        desc: "Manage user profile and account details.",
      };
    }
    return {
      icon: <Layers size={16} />,
      bg: "#f1f5f9",
      color: "#64748b",
      desc: `Manage ${name || identifier} module permissions.`,
    };
  };

  const filteredPermissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return visiblePermissions;
    return visiblePermissions.filter((item) => {
      return (
        (item.name || "").toLowerCase().includes(query) ||
        (item.identifier || "").toLowerCase().includes(query)
      );
    });
  }, [visiblePermissions, searchQuery]);

  if (loading) {
    return (
      <div className="view-role-page">
        <div className="view-role-loading">Loading role details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-role-page">
        <div className="view-role-error">
          <h2 style={{ margin: "0 0 6px 0", fontSize: "16px" }}>
            Unable to load role
          </h2>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
        <button
          type="button"
          className="btn-back-white"
          onClick={() => navigate(PATHS.ROLES)}
        >
          <ArrowLeft size={16} /> Back to Roles
        </button>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="view-role-page">
        <div className="view-role-error">Role not found.</div>
        <button
          type="button"
          className="btn-back-white"
          onClick={() => navigate(PATHS.ROLES)}
        >
          <ArrowLeft size={16} /> Back to Roles
        </button>
      </div>
    );
  }

  return (
    <div className="view-role-page">
      <div className="view-role-container">
        {/* Header Top */}
        <div className="view-role-header-top">
          <div>
            <div className="view-role-breadcrumb">
              ROLES <span>/</span> VIEW
            </div>
            <h1 className="view-role-title">View Role</h1>
            <p className="view-role-subtitle">
              View role details, assigned permissions and manage role settings.
            </p>
          </div>

          <div className="view-role-header-actions">
            <button
              type="button"
              className="btn-back-white"
              onClick={() => navigate(PATHS.ROLES)}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              className="btn-edit-orange"
              onClick={() => navigate(`/roles/${role.id}/edit`)}
            >
              <Edit size={16} /> Edit Role
            </button>
          </div>
        </div>

        {/* Role Stats Card */}
        <div className="role-stats-card">
          <div className="stat-group-1">
            <div className="stat-icon-large">
              <Shield size={24} />
            </div>
            <div className="stat-role-info">
              <div className="stat-title-row">
                <span className="stat-role-name">{role.name}</span>
                <span
                  className={
                    role.is_active !== false ? "badge-active" : "badge-inactive"
                  }
                >
                  {role.is_active !== false ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="stat-role-desc">
                {role.description ||
                  "Full system access with administrative privileges."}
              </div>
            </div>
          </div>

          <div className="stat-group-small">
            <div className="stat-icon-small">
              <User size={16} />
            </div>
            <div>
              <div className="stat-label">Created By</div>
              <div className="stat-value">
                {role.created_by_name || "Nency Gajera"}
              </div>
              <div className="stat-subvalue">
                {role.created_by_role || "General_admin"}
              </div>
            </div>
          </div>

          <div className="stat-group-small">
            <div className="stat-icon-small grey">
              <Clock size={16} />
            </div>
            <div>
              <div className="stat-label">Created On</div>
              <div className="stat-value">{createdInfo.date}</div>
              <div className="stat-subvalue">{createdInfo.time}</div>
            </div>
          </div>

          <div className="stat-group-small">
            <div className="stat-icon-small grey">
              <ExternalLink size={16} />
            </div>
            <div>
              <div className="stat-label">Last Updated</div>
              <div className="stat-value">{updatedInfo.date}</div>
              <div className="stat-subvalue">{updatedInfo.time}</div>
            </div>
          </div>

          <div className="stat-group-box">
            <div className="stat-icon-box">
              <Lock size={16} />
            </div>
            <div>
              <div className="stat-label">Total Modules</div>
              <div className="stat-box-value">{totalModules}</div>
            </div>
          </div>

          <div className="stat-group-box">
            <div className="stat-icon-box">
              <FileText size={16} />
            </div>
            <div>
              <div className="stat-label">Total Permissions</div>
              <div className="stat-box-value">{totalPermissions}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="view-role-tabs">
          <div
            className={`view-role-tab ${
              activeTab === "permissions" ? "active" : ""
            }`}
            onClick={() => setActiveTab("permissions")}
          >
            <Shield size={16} /> Permissions
          </div>
          <div
            className={`view-role-tab ${
              activeTab === "details" ? "active" : ""
            }`}
            onClick={() => setActiveTab("details")}
          >
            <Info size={16} /> Role Details
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "permissions" ? (
          <div className="permissions-card">
            <div className="permissions-card-header">
              <div className="permissions-header-left">
                <div className="permissions-icon-box">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="permissions-title">Module Permissions</h2>
                  <p className="permissions-subtitle">
                    Manage permissions for each module assigned to this role.
                  </p>
                </div>
              </div>

              <div className="permissions-header-right">
                <div className="search-input-wrapper">
                  <Search size={16} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search module..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredPermissions.length === 0 ? (
              <div className="no-permissions">
                No permissions found matching your criteria.
              </div>
            ) : (
              <table className="permissions-table">
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "23%" }} />
                  <col style={{ width: "37%" }} />
                  <col style={{ width: "29%" }} />
                  <col style={{ width: "6%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>MODULE</th>
                    <th>DESCRIPTION</th>
                    <th>ASSIGNED PERMISSIONS</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((permission, index) => {
                    const mod = getModuleConfig(
                      permission.identifier,
                      permission.name,
                    );
                    const ops = getOperations(permission.operations).filter(
                      (op) => ALLOWED_OPS.includes(op.toLowerCase()),
                    );

                    return (
                      <tr
                        key={permission.identifier_id || permission.identifier}
                      >
                        <td style={{ color: "#64748b", fontWeight: 600 }}>
                          {index + 1}
                        </td>
                        <td>
                          <div className="module-cell">
                            <div
                              className="module-icon"
                              style={{
                                background: mod.bg,
                                color: mod.color,
                              }}
                            >
                              {mod.icon}
                            </div>
                            <span>{permission.name}</span>
                          </div>
                        </td>
                        <td className="module-desc">{mod.desc}</td>
                        <td>
                          <div className="badges-cell">
                            {(ops.length > 0 ? ops : ["view"]).map(
                              (operation) => {
                                const lower = operation.toLowerCase();
                                let badgeClass = "perm-badge";
                                if (lower === "view")
                                  badgeClass += " perm-view";
                                else if (lower === "create")
                                  badgeClass += " perm-create";
                                else if (lower === "edit")
                                  badgeClass += " perm-edit";
                                else if (lower === "delete")
                                  badgeClass += " perm-delete";
                                else if (lower === "export")
                                  badgeClass += " perm-export";
                                else if (lower === "import")
                                  badgeClass += " perm-import";
                                else badgeClass += " perm-view";

                                const label =
                                  lower.charAt(0).toUpperCase() +
                                  lower.slice(1);

                                return (
                                  <span
                                    key={`${permission.identifier}-${operation}`}
                                    className={badgeClass}
                                  >
                                    {label}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="action-cell">
                            <ChevronRight size={18} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="permissions-card">
            <div className="role-details-tab-content">
              <div className="role-detail-box">
                <div className="stat-label">Role Name</div>
                <div className="stat-value">{role.name}</div>
              </div>

              <div className="role-detail-box">
                <div className="stat-label">Identifier</div>
                <div className="stat-value">{role.identifier || "-"}</div>
              </div>

              <div className="role-detail-box">
                <div className="stat-label">Status</div>
                <div style={{ marginTop: "6px" }}>
                  <span
                    className={
                      role.is_active !== false
                        ? "badge-active"
                        : "badge-inactive"
                    }
                  >
                    {role.is_active !== false ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="role-detail-box">
                <div className="stat-label">Total Modules Assigned</div>
                <div className="stat-value">{totalModules} Modules</div>
              </div>

              <div className="role-detail-box">
                <div className="stat-label">Total Operations Assigned</div>
                <div className="stat-value">{totalPermissions} Permissions</div>
              </div>

              <div className="role-detail-box">
                <div className="stat-label">Description</div>
                <div
                  className="stat-value"
                  style={{ fontWeight: 400, color: "#64748b" }}
                >
                  {role.description ||
                    "Full system access with administrative privileges."}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewRole;
