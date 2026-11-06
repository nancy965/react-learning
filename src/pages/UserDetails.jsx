import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  User,
  Calendar,
  Clock,
  FileText,
  Edit,
  Trash2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { getUserById, deleteUser } from "../services/userService";
import Loader from "../components/Loader";
import ConfirmDialog from "../components/ConfirmDialog";
import "./UserDetails.css";

function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getUserById(id);

        if (response && response.success && response.data) {
          setUser(response.data);
        } else if (response && response.data) {
          setUser(response.data);
        } else if (response) {
          setUser(response);
        } else {
          setError("Unable to load user details");
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        setError(
          err.response?.data?.message || "Unable to load user details"
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id]);

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

  const formatRole = (role) => {
    if (!role) return "Employee";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getInitial = (name) => {
    if (!name) return "U";
    return name.trim().charAt(0).toUpperCase();
  };

  const formatUserId = (u) => {
    if (!u) return "USR0001";
    if (u.user_code) return u.user_code;
    if (u.custom_id) return u.custom_id;
    const num = u.id ? String(u.id).replace(/\D/g, "") : "1";
    return `USR${(num || "1").padStart(4, "0")}`;
  };

  const formatCreatedBy = (u) => {
    const creatorName = u?.admin_name || u?.created_by || "Admin";
    const isGeneralAdmin =
      String(creatorName).trim().toLowerCase() === "nency" ||
      String(creatorName).toLowerCase().includes("nency") ||
      String(u?.admin_role).toLowerCase() === "general_admin";

    if (isGeneralAdmin) {
      return `${creatorName} (General Admin)`;
    }
    return `${creatorName} (Admin)`;
  };

  const handleDeactivate = async () => {
    if (deactivating) return;
    try {
      setDeactivating(true);
      await deleteUser(user.id);
      setConfirmDeactivate(false);
      navigate("/users");
    } catch (err) {
      console.error("Error deactivating user:", err);
      setConfirmDeactivate(false);
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className={`user-details-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <div className="user-details-loading-state">
          <Loader />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className={`user-details-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <div className="user-details-nav-row">
          <button
            type="button"
            className="user-details-back-link"
            onClick={() => navigate("/users")}
          >
            ← Back to Users
          </button>
        </div>
        <div className="user-details-error-card">
          <h2>Unable to load user details</h2>
          <p>{error || "User record was not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`user-details-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      {/* Top Back Navigation Link */}
      <div className="user-details-nav-row">
        <button
          type="button"
          className="user-details-back-link"
          onClick={() => navigate("/users")}
        >
          ← Back to Users
        </button>
      </div>

      {/* Header Section */}
      <div className="user-details-header">
        <div className="user-details-header-left">
          <span className="task-breadcrumb-tag">USER MANAGEMENT</span>
          <h1 className="user-details-title">User Details</h1>
          <p className="user-details-subtitle">
            View complete information about the user.
          </p>
        </div>

        <div className="user-details-header-actions">
          <button
            type="button"
            className="user-details-edit-btn"
            onClick={() => navigate(`/users/${user.id}/edit`)}
          >
            <Edit size={14} />
            <span>Edit User</span>
          </button>

          <button
            type="button"
            className="user-details-deactivate-btn"
            onClick={() => setConfirmDeactivate(true)}
          >
            <Trash2 size={14} />
            <span>Deactivate</span>
          </button>
        </div>
      </div>

      {/* Main Profile Summary Card */}
      <div className="user-details-summary-card">
        <div className="summary-card-left">
          <div className="user-avatar-circle">
            {getInitial(user.name)}
          </div>

          <div className="user-main-info">
            <h2 className="user-main-name">{user.name || "--"}</h2>
            <p className="user-main-email">{user.email || "--"}</p>

            <div className="user-badges-row">
              <span className="user-role-badge">
                <User size={12} /> {formatRole(user.permission_role || user.role)}
              </span>

              <span
                className={`user-status-pill ${
                  user.is_active ? "status-active" : "status-inactive"
                }`}
              >
                <span className="status-dot"></span>
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="summary-card-stats">
          <div className="stat-widget user-detail-stat-widget">
            <div className="stat-icon-wrap">
              <Calendar size={15} />
            </div>
            <div className="stat-text-wrap">
              <span className="user-detail-stat-label">Created On</span>
              <span className="user-detail-stat-value">{formatDate(user.created_at)}</span>
            </div>
          </div>

          <div className="stat-vertical-divider" />

          <div className="stat-widget user-detail-stat-widget">
            <div className="stat-icon-wrap">
              <Clock size={15} />
            </div>
            <div className="stat-text-wrap">
              <span className="user-detail-stat-label">Last Login</span>
              <span className="user-detail-stat-value">
                {user.last_login
                  ? formatDate(user.last_login)
                  : formatDate(user.created_at)}
              </span>
            </div>
          </div>

          <div className="stat-vertical-divider" />

          <div className="stat-widget user-detail-stat-widget">
            <div className="stat-icon-wrap">
              <FileText size={15} />
            </div>
            <div className="stat-text-wrap">
              <span className="user-detail-stat-label">User ID</span>
              <span className="user-detail-stat-value">{formatUserId(user)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="user-details-section-card">
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
            <span className="field-value">{user.name || "--"}</span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Email Address</span>
            <span className="field-value">{user.email || "--"}</span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Age</span>
            <span className="field-value">
              {user.age !== undefined && user.age !== null ? user.age : "-"}
            </span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Phone Number</span>
            <span className="field-value">
              {user.phone || user.phone_number || "-"}
            </span>
          </div>

          <div className="info-field-group">
            <span className="field-label">Assigned Role</span>
            <div className="field-value">
              <span className="assigned-role-tag">
                {formatRole(user.permission_role || user.role)}
              </span>
            </div>
          </div>

          <div className="info-field-group">
            <span className="field-label">Account Status</span>
            <span className={`status-inline-value ${user.is_active ? "is-active" : "is-inactive"}`}>
              <span className="inline-dot">●</span>
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Information Card */}
      <div className="user-details-section-card last-card">
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
            <span className="field-value">
              {formatCreatedBy(user)}
            </span>
          </div>

          <div className="additional-divider" />

          <div className="additional-field-item">
            <span className="field-label">Updated On</span>
            <span className="field-value">
              {formatDate(user.updated_at || user.updatedAt || user.created_at)}
            </span>
          </div>
        </div>
      </div>

      {confirmDeactivate && (
        <ConfirmDialog
          title="Confirm Action"
          message="Are you sure you want to deactivate this user?"
          confirmText="Yes, Deactivate"
          cancelText="Cancel"
          onConfirm={handleDeactivate}
          onCancel={() => setConfirmDeactivate(false)}
        />
      )}
    </div>
  );
}

export default UserDetails;