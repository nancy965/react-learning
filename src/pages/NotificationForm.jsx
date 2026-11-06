import "./NotificationForm.css";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Loader from "../components/Loader";
import {
  getManagementNotificationById,
  getManagementRecipients,
  createManagementNotification,
  updateManagementNotification,
} from "../services/notificationService";
import PATHS from "../config/path.config";
import CustomSelect from "../components/CustomSelect";
import CustomDatePicker from "../components/CustomDatePicker";

function NotificationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { theme } = useTheme();

  // ─── Form state ───────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [notificationType, setNotificationType] = useState("all_users");
  const [status, setStatus] = useState("active");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  // ─── Custom dropdown states ───────────────────────────────────────────
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const adminDropdownRef = useRef(null);
  const employeeDropdownRef = useRef(null);

  // ─── Data ─────────────────────────────────────────────────────────────
  const [allAdmins, setAllAdmins] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);

  // ─── UI ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(isEdit);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Today's date string for min date on picker
  const todayStr = new Date().toISOString().slice(0, 10);

  // ─── Close dropdowns on outside click ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        adminDropdownRef.current &&
        !adminDropdownRef.current.contains(e.target)
      ) {
        setShowAdminDropdown(false);
        setIsAdminTyping(false);
        setAdminSearch("");
      }
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(e.target)
      ) {
        setShowEmployeeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ─── Fetch recipients (admins + employees) ────────────────────────────
  const fetchRecipients = useCallback(async () => {
    try {
      setRecipientsLoading(true);
      const res = await getManagementRecipients();
      setAllAdmins(res.data?.admins || []);
      setAllEmployees(res.data?.employees || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load recipient list.");
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  // ─── Fetch existing notification (edit mode) ──────────────────────────
  const fetchNotification = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getManagementNotificationById(id);
      const n = res.data;
      setTitle(n.title || "");
      setDetails(n.details || "");
      setNotificationType(n.notification_type || "all_users");
      setStatus(n.status || "active");
      setExpiresAt(n.expires_at ? String(n.expires_at).slice(0, 10) : "");
      if (Array.isArray(n.adminIds) && n.adminIds.length > 0) {
        setSelectedAdminId(String(n.adminIds[0]));
      }
      if (Array.isArray(n.employeeIds) && n.employeeIds.length > 0) {
        setSelectedEmployeeIds(n.employeeIds.map(String));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notification.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  useEffect(() => {
    if (isEdit) fetchNotification();
  }, [isEdit, fetchNotification]);

  // ─── Filter only admin role & employee role ───────────────────────────
  const adminOptions = useMemo(() => {
    return allAdmins.filter(
      (a) => !a.role || a.role.toLowerCase() === "admin",
    );
  }, [allAdmins]);

  const employeeOptions = useMemo(() => {
    return allEmployees.filter(
      (e) => !e.role || e.role.toLowerCase() === "employee",
    );
  }, [allEmployees]);

  const selectedAdmin = useMemo(() => {
    return (
      adminOptions.find((a) => String(a.id) === String(selectedAdminId)) || null
    );
  }, [adminOptions, selectedAdminId]);

  // Filtered employees list:
  // - If no admin is selected: shows all active employees
  // - If admin is selected: shows ONLY employees created under that admin
  const filteredEmployees = useMemo(() => {
    if (!selectedAdminId) {
      return employeeOptions;
    }
    return employeeOptions.filter(
      (emp) => String(emp.admin_id) === String(selectedAdminId),
    );
  }, [employeeOptions, selectedAdminId]);

  // Filter options by search term (name only)
  const searchedAdmins = useMemo(() => {
    if (!isAdminTyping) return adminOptions;
    const q = adminSearch.trim().toLowerCase();
    if (!q) return adminOptions;
    return adminOptions.filter((a) => a.name.toLowerCase().includes(q));
  }, [adminOptions, adminSearch, isAdminTyping]);

  const searchedEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return filteredEmployees;
    return filteredEmployees.filter((e) => e.name.toLowerCase().includes(q));
  }, [filteredEmployees, employeeSearch]);

  // ─── When type changes to all_users, clear selections ─────────────────
  useEffect(() => {
    if (notificationType === "all_users") {
      setSelectedAdminId("");
      setSelectedEmployeeIds([]);
      setShowAdminDropdown(false);
      setShowEmployeeDropdown(false);
      setIsAdminTyping(false);
      setAdminSearch("");
      setEmployeeSearch("");
      setFieldErrors((prev) => ({ ...prev, recipients: "" }));
    }
  }, [notificationType]);

  // ─── Handle Admin Selection ───────────────────────────────────────────
  const handleSelectAdmin = (admin) => {
    setSelectedAdminId(String(admin.id));
    setShowAdminDropdown(false);
    setIsAdminTyping(false);
    setAdminSearch("");
    setFieldErrors((prev) => ({ ...prev, recipients: "" }));

    // Keep only selected employees that belong to this admin
    setSelectedEmployeeIds((prev) =>
      prev.filter((empId) => {
        const emp = employeeOptions.find((e) => String(e.id) === String(empId));
        return emp && String(emp.admin_id) === String(admin.id);
      })
    );
  };

  const handleClearAdmin = (e) => {
    e.stopPropagation();
    setSelectedAdminId("");
    setIsAdminTyping(false);
    setAdminSearch("");
    setFieldErrors((prev) => ({ ...prev, recipients: "" }));
  };

  // ─── Handle Employee Selection (Multi-select) ─────────────────────────
  const handleToggleEmployee = (emp) => {
    const empIdStr = String(emp.id);
    const isAlreadySelected = selectedEmployeeIds.includes(empIdStr);

    if (isAlreadySelected) {
      setSelectedEmployeeIds((prev) => prev.filter((id) => id !== empIdStr));
    } else {
      setSelectedEmployeeIds((prev) => [...prev, empIdStr]);
      // If employee has creator admin, auto-select this admin
      if (emp.admin_id) {
        setSelectedAdminId(String(emp.admin_id));
      }
    }
    setFieldErrors((prev) => ({ ...prev, recipients: "" }));
  };

  const handleRemoveEmployee = (empId, e) => {
    if (e) e.stopPropagation();
    setSelectedEmployeeIds((prev) => prev.filter((id) => id !== String(empId)));
  };

  // ─── Validate ─────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!title.trim()) errors.title = "Title is required.";
    if (!details.trim()) errors.details = "Details are required.";
    if (!expiresAt) {
      errors.expiresAt = "Expiry date is required.";
    } else if (expiresAt < todayStr) {
      errors.expiresAt = "Expiry date cannot be in the past.";
    }
    if (
      notificationType === "separate_users" &&
      !selectedAdminId &&
      selectedEmployeeIds.length === 0
    ) {
      errors.recipients = "Select at least an Admin or Employee.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    let adminIds = [];
    if (notificationType === "separate_users") {
      if (selectedAdminId) {
        adminIds.push(selectedAdminId);
      }

      // If no admin selected, auto-add creator admins of selected employees
      if (adminIds.length === 0 && selectedEmployeeIds.length > 0) {
        selectedEmployeeIds.forEach((empId) => {
          const emp = employeeOptions.find((item) => String(item.id) === String(empId));
          if (emp && emp.admin_id && !adminIds.includes(emp.admin_id)) {
            adminIds.push(emp.admin_id);
          }
        });
      }
    }

    const employeeIds =
      notificationType === "separate_users"
        ? [...new Set(selectedEmployeeIds.filter(Boolean))]
        : [];

    const payload = {
      title: title.trim(),
      details: details.trim(),
      notificationType,
      status,
      expiresAt,
      adminIds,
      employeeIds,
    };

    try {
      setSubmitting(true);
      setError("");
      if (isEdit) {
        await updateManagementNotification(id, payload);
      } else {
        await createManagementNotification(payload);
      }
      navigate(PATHS.NOTIFICATIONS_MANAGEMENT);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save notification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || recipientsLoading) {
    return (
      <div className={`nf-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
        <div className="nf-loader-wrap"><Loader /></div>
      </div>
    );
  }

  return (
    <div className={`nf-page ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      {/* Header */}
      <div className="nf-header">
        <div className="nf-title-wrap">
          <span className="nf-category">ADMIN MANAGEMENT</span>
          <h1 className="nf-title">
            {isEdit ? "Edit Notification" : "Create Notification"}
          </h1>
          <p className="nf-subtitle">
            {isEdit
              ? "Update the notification details below"
              : "Fill in the details to create a new notification"}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="nf-alert nf-alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Form Card */}
      <div className="nf-card">
        <form id="notification-form" onSubmit={handleSubmit} noValidate>

          {/* Title */}
          <div className="nf-field">
            <label htmlFor="nf-title" className="nf-label">
              Title <span className="nf-required">*</span>
            </label>
            <input
              id="nf-title"
              type="text"
              className={`nf-input ${fieldErrors.title ? "nf-input-error" : ""}`}
              placeholder="Enter notification title..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((p) => ({ ...p, title: "" }));
              }}
            />
            {fieldErrors.title && (
              <span className="nf-field-error">{fieldErrors.title}</span>
            )}
          </div>

          {/* Details */}
          <div className="nf-field">
            <label htmlFor="nf-details" className="nf-label">
              Details <span className="nf-required">*</span>
            </label>
            <textarea
              id="nf-details"
              className={`nf-textarea ${fieldErrors.details ? "nf-input-error" : ""}`}
              placeholder="Enter notification details / message..."
              rows={4}
              value={details}
              onChange={(e) => {
                setDetails(e.target.value);
                setFieldErrors((p) => ({ ...p, details: "" }));
              }}
            />
            {fieldErrors.details && (
              <span className="nf-field-error">{fieldErrors.details}</span>
            )}
          </div>

          {/* Form Grid */}
          <div className="nf-grid">
            {/* Notification Type */}
            <div className="nf-field">
              <label htmlFor="nf-type" className="nf-label">
                Notification Type <span className="nf-required">*</span>
              </label>
              <CustomSelect
                id="nf-type"
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                options={[
                  { value: "all_users", label: "All Users" },
                  { value: "separate_users", label: "Separate Users" },
                ]}
                placeholder="Select Notification Type"
                isClearable={true}
              />
            </div>

            {/* When separate_users is selected: Admin and Employee come immediately after Notification Type */}
            {notificationType === "separate_users" && (
              <>
                {/* Admin Dropdown */}
                <div className="nf-field nf-custom-select-wrapper" ref={adminDropdownRef}>
                  <label className="nf-label">
                    Admin <span className="nf-required">*</span>
                  </label>
                  <div className="nf-searchable-field-box">
                    <input
                      id="nf-admin-input"
                      type="text"
                      className={`nf-combobox-input ${
                        fieldErrors.recipients && !selectedAdminId && selectedEmployeeIds.length === 0
                          ? "nf-input-error"
                          : ""
                      }`}
                      placeholder="Select Admin"
                      value={isAdminTyping ? adminSearch : (selectedAdmin ? selectedAdmin.name : "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIsAdminTyping(true);
                        setAdminSearch(val);
                        if (!showAdminDropdown) setShowAdminDropdown(true);
                        if (!val.trim()) {
                          setSelectedAdminId("");
                        }
                      }}
                      onFocus={() => {
                        setShowAdminDropdown(true);
                      }}
                      autoComplete="off"
                    />
                    {Boolean(selectedAdminId || selectedAdmin) && (
                      <button
                        type="button"
                        className="nf-select-clear-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedAdminId("");
                          setIsAdminTyping(false);
                          setAdminSearch("");
                          setShowAdminDropdown(false);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        tabIndex={-1}
                        aria-label="Clear admin"
                      >
                        ×
                      </button>
                    )}
                    <span
                      className="nf-select-arrow"
                      onClick={() => setShowAdminDropdown((prev) => !prev)}
                    >
                      ▾
                    </span>
                  </div>

                  {showAdminDropdown && (
                    <div className="nf-custom-dropdown-menu">
                      <div className="nf-custom-dropdown-list">
                        {searchedAdmins.length === 0 ? (
                          <div className="nf-dropdown-empty">No admins found</div>
                        ) : (
                          searchedAdmins.map((admin) => {
                            const isSelected = String(admin.id) === String(selectedAdminId);
                            return (
                              <div
                                key={admin.id}
                                className={`nf-dropdown-item ${isSelected ? "selected" : ""}`}
                                onClick={() => handleSelectAdmin(admin)}
                              >
                                <span>{admin.name}</span>
                                {isSelected && <span className="nf-check-icon">✓</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Employee Multi-Select Dropdown */}
                <div className="nf-field nf-custom-select-wrapper" ref={employeeDropdownRef}>
                  <label className="nf-label">Employee</label>
                  <div
                    id="nf-employee-select-box"
                    className={`nf-custom-select-box nf-multi-select-box ${
                      fieldErrors.recipients && !selectedAdminId && selectedEmployeeIds.length === 0
                        ? "nf-input-error"
                        : ""
                    }`}
                    onClick={() => setShowEmployeeDropdown((prev) => !prev)}
                  >
                    <div className="nf-selected-tags-container">
                      {selectedEmployeeIds.map((id) => {
                        const emp = employeeOptions.find((e) => String(e.id) === String(id));
                        const name = emp ? emp.name : `Emp ${id}`;
                        return (
                          <span className="nf-tag" key={id}>
                            <span className="nf-tag-text">{name}</span>
                            <button
                              type="button"
                              className="nf-tag-remove"
                              onClick={(e) => handleRemoveEmployee(id, e)}
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                      <input
                        type="text"
                        className="nf-inline-search-input"
                        placeholder={selectedEmployeeIds.length === 0 ? "Select Employee" : "Search employee..."}
                        value={employeeSearch}
                        onChange={(e) => {
                          setEmployeeSearch(e.target.value);
                          if (!showEmployeeDropdown) setShowEmployeeDropdown(true);
                        }}
                        onFocus={() => setShowEmployeeDropdown(true)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <span className="nf-select-arrow">▾</span>
                  </div>

                  {showEmployeeDropdown && (
                    <div className="nf-custom-dropdown-menu">
                      <div className="nf-custom-dropdown-list">
                        {searchedEmployees.length === 0 ? (
                          <div className="nf-dropdown-empty">No employees found</div>
                        ) : (
                          searchedEmployees.map((emp) => {
                            const isSelected = selectedEmployeeIds.includes(String(emp.id));
                            return (
                              <div
                                key={emp.id}
                                className={`nf-dropdown-item ${isSelected ? "selected" : ""}`}
                                onClick={() => handleToggleEmployee(emp)}
                              >
                                <span>{emp.name}</span>
                                {isSelected && <span className="nf-check-icon">✓</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Timeline / Expires At */}
            <div className="nf-field">
              <label htmlFor="nf-expires" className="nf-label">
                Timeline (Expires On) <span className="nf-required">*</span>
              </label>
              <CustomDatePicker
                id="nf-expires"
                value={expiresAt}
                min={todayStr}
                onChange={(e) => {
                  setExpiresAt(e.target.value);
                  setFieldErrors((p) => ({ ...p, expiresAt: "" }));
                }}
              />
              {fieldErrors.expiresAt && (
                <span className="nf-field-error">{fieldErrors.expiresAt}</span>
              )}
            </div>

            {/* Active Status (Same size and style as Notification Type field) */}
            <div className="nf-field">
              <label className="nf-label">Active Status</label>
              <div
                className="nf-status-field-box"
                onClick={() =>
                  setStatus((prev) => (prev === "active" ? "inactive" : "active"))
                }
              >
                <span className="nf-status-field-label">
                  {status === "active" ? "Active" : "Disabled"}
                </span>
                <button
                  type="button"
                  id="nf-status-toggle"
                  className={`nf-toggle ${status === "active" ? "nf-toggle-on" : "nf-toggle-off"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatus((prev) => (prev === "active" ? "inactive" : "active"));
                  }}
                  aria-pressed={status === "active"}
                >
                  <span className="nf-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* Recipients validation error if any */}
            {notificationType === "separate_users" && fieldErrors.recipients && (
              <div className="nf-dropdown-error-row" style={{ gridColumn: "1 / -1" }}>
                <span className="nf-field-error">{fieldErrors.recipients}</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="nf-form-actions">
            <button
              id="nf-cancel-btn"
              type="button"
              className="nf-btn nf-btn-cancel"
              onClick={() => navigate(PATHS.NOTIFICATIONS_MANAGEMENT)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              id="nf-submit-btn"
              type="submit"
              className="nf-btn nf-btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="nf-spinner" />
                  {isEdit ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {isEdit ? "Update Notification" : "Create Notification"}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default NotificationForm;
