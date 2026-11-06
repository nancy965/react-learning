import React, { useState, useEffect, useRef } from "react";
import { getUsers, getAdmins, getRoles } from "../services/userService";
import { createDatabaseChangeRequest } from "../services/databaseApprovalService";
import "./CreateDatabaseChangeModal.css";

const extractList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.users)) return res.data.users;
  if (Array.isArray(res.data?.admins)) return res.data.admins;
  if (Array.isArray(res.data?.roles)) return res.data.roles;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.users)) return res.users;
  if (Array.isArray(res.admins)) return res.admins;
  if (Array.isArray(res.roles)) return res.roles;
  return [];
};

/**
 * CustomSelect: Matches the UI theme, limits view to 4-5 items with custom scrollbar,
 * and eliminates browser's native blue popovers.
 * Supports split layout with label on left and rightText on right.
 */
function CustomSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = "-- Select --",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange && onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`db-custom-select-container ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
    >
      <button
        type="button"
        id={id}
        className="db-custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div
          className={`db-custom-select-val-container ${
            !selectedOption || selectedOption.value === "" ? "placeholder" : ""
          }`}
        >
          {selectedOption && selectedOption.value !== "" ? (
            selectedOption.rightText ? (
              <div className="db-custom-select-trigger-split">
                <span className="db-trigger-left">{selectedOption.label}</span>
                <span className="db-trigger-right">{selectedOption.rightText}</span>
              </div>
            ) : (
              <span className="db-trigger-left">{selectedOption.label}</span>
            )
          ) : (
            <span className="db-trigger-placeholder">{placeholder}</span>
          )}
        </div>
        <svg
          className={`db-custom-select-arrow ${isOpen ? "rotated" : ""}`}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="db-custom-select-dropdown" role="listbox">
          <div className="db-custom-select-list">
            {options
              .filter((opt) => opt.value !== "")
              .map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    className={`db-custom-select-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelect(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="db-custom-select-item-content">
                      <span className="db-custom-select-item-label">{opt.label}</span>
                      {opt.rightText && (
                        <span className="db-custom-select-item-right">{opt.rightText}</span>
                      )}
                    </div>
                    {isSelected && (
                      <svg
                        className="db-custom-select-check"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateDatabaseChangeModal({ onClose, onSuccess }) {
  const [usersList, setUsersList] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [changeField, setChangeField] = useState("admin_id"); // "admin_id" | "role_id" | "is_active"
  const [targetAdminId, setTargetAdminId] = useState("");
  const [targetRoleId, setTargetRoleId] = useState("");
  const [targetStatus, setTargetStatus] = useState("true");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const [usersRes, adminsRes, rolesRes] = await Promise.all([
          getUsers(1, 100).catch((e) => {
            console.error("Failed to load users for DB change:", e);
            return [];
          }),
          getAdmins().catch((e) => {
            console.error("Failed to load admins for DB change:", e);
            return [];
          }),
          getRoles().catch((e) => {
            console.error("Failed to load roles for DB change:", e);
            return [];
          }),
        ]);

        if (isMounted) {
          setUsersList(extractList(usersRes));
          setAdminsList(extractList(adminsRes));
          setRolesList(extractList(rolesRes));
        }
      } catch (err) {
        console.error("Error fetching options for DB change modal:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const safeUsers = Array.isArray(usersList) ? usersList : [];
  const safeAdmins = Array.isArray(adminsList) ? adminsList : [];
  const safeRoles = Array.isArray(rolesList) ? rolesList : [];

  const selectedUser = safeUsers.find((u) => String(u.id) === String(selectedUserId));
  const currentAdminObj = selectedUser
    ? safeAdmins.find((a) => String(a.id) === String(selectedUser.admin_id))
    : null;
  const currentRoleObj = selectedUser
    ? safeRoles.find((r) => String(r.id) === String(selectedUser.role_id))
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedUser) {
      setError("Please select a target user / employee");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const diffFields = [];
      const oldData = {
        name: selectedUser.name || "",
        email: selectedUser.email || "",
        age: selectedUser.age || "",
        role: selectedUser.role || "",
        is_active: selectedUser.is_active ?? true,
        admin_id: selectedUser.admin_id || null,
        role_id: selectedUser.role_id || null,
      };
      const newData = { ...oldData };

      let summary = "";

      if (changeField === "admin_id") {
        if (!targetAdminId) {
          setError("Please select the new assigned admin");
          setSubmitting(false);
          return;
        }
        if (selectedUser && String(targetAdminId) === String(selectedUser.admin_id)) {
          setError("The selected employee is already assigned to this admin. Please choose a different admin.");
          setSubmitting(false);
          return;
        }
        const oldAdm = safeAdmins.find((a) => String(a.id) === String(selectedUser.admin_id));
        const newAdm = safeAdmins.find((a) => String(a.id) === String(targetAdminId));
        const oldAdmName = oldAdm?.name || "Unassigned";
        const newAdmName = newAdm?.name || targetAdminId;

        newData.admin_id = targetAdminId;
        diffFields.push({
          field: "Assigned Admin",
          fieldKey: "admin_id",
          oldValue: oldAdmName,
          newValue: newAdmName,
        });
        summary = `Reassign employee's assigned admin from '${oldAdmName}' to '${newAdmName}'`;
      } else if (changeField === "role_id") {
        if (!targetRoleId) {
          setError("Please select the new permission role");
          setSubmitting(false);
          return;
        }
        if (selectedUser && String(targetRoleId) === String(selectedUser.role_id)) {
          setError("The selected employee already has this permission role. Please choose a different role.");
          setSubmitting(false);
          return;
        }
        const oldR = safeRoles.find((r) => String(r.id) === String(selectedUser.role_id));
        const newR = safeRoles.find((r) => String(r.id) === String(targetRoleId));
        const oldRoleName = oldR?.name || selectedUser.permission_role || "Employee";
        const newRoleName = newR?.name || targetRoleId;

        newData.role_id = targetRoleId;
        diffFields.push({
          field: "Permission Role",
          fieldKey: "role_id",
          oldValue: oldRoleName,
          newValue: newRoleName,
        });
        summary = `Change permission role from '${oldRoleName}' to '${newRoleName}'`;
      } else if (changeField === "is_active") {
        const newActive = targetStatus === "true";
        if (selectedUser && newActive === Boolean(selectedUser.is_active)) {
          setError(`The selected employee is already ${selectedUser.is_active ? "Active" : "Inactive"}. Please choose a different status.`);
          setSubmitting(false);
          return;
        }
        newData.is_active = newActive;
        diffFields.push({
          field: "Account Status",
          fieldKey: "is_active",
          oldValue: selectedUser.is_active ? "Active" : "Inactive",
          newValue: newActive ? "Active" : "Inactive",
        });
        summary = `Change account status to '${newActive ? "Active" : "Inactive"}'`;
      }

      if (reason.trim()) {
        summary += ` (Reason: ${reason.trim()})`;
      }

      const res = await createDatabaseChangeRequest({
        moduleName: "USER_MANAGEMENT",
        tableName: "users",
        recordId: String(selectedUser.id),
        recordIdentifier: selectedUser.name || "Employee",
        changeType: "UPDATE",
        changeSummary: summary,
        oldData,
        newData,
        diffFields,
      });

      if (res.success) {
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create change request");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter out admins (Nency, Dhruvi, Ruhi, Khushil, admin roles, and safeAdmins entries)
  const excludedAdminNames = ["nency", "dhruvi", "ruhi", "khushil", "general admin"];
  const filteredEmployees = safeUsers.filter((u) => {
    // 1. Exclude if ID or email exists in safeAdmins
    if (safeAdmins.some((a) => String(a.id) === String(u.id))) return false;
    if (u.email && safeAdmins.some((a) => a.email && a.email.toLowerCase() === u.email.toLowerCase())) {
      return false;
    }
    // 2. Exclude if user has admin role
    const uRole = (u.role || u.permission_role || "").toLowerCase();
    if (uRole.includes("admin")) return false;
    // 3. Exclude if role_id maps to an admin role
    const matchedRole = safeRoles.find((r) => String(r.id) === String(u.role_id));
    if (matchedRole && matchedRole.name && matchedRole.name.toLowerCase().includes("admin")) {
      return false;
    }
    // 4. Exclude if name or email matches excludedAdminNames (nency, dhruvi, ruhi, khushil)
    const uName = (u.name || "").toLowerCase();
    const uEmail = (u.email || "").toLowerCase();
    if (excludedAdminNames.some((adm) => uName.includes(adm) || uEmail.includes(adm))) {
      return false;
    }
    return true;
  });

  // Dropdown options lists
  const employeeOptions = filteredEmployees.map((u) => {
    const curAdm = safeAdmins.find((a) => String(a.id) === String(u.admin_id));
    const admName = curAdm
      ? curAdm.name
      : (u.admin_name || (u.admin_id ? `Admin #${u.admin_id}` : "Unassigned"));
    return {
      value: String(u.id),
      label: u.name,
      rightText: `Current Admin: ${admName}`,
    };
  });

  const fieldOptions = [
    { value: "admin_id", label: "Assigned Admin (Manager Reassignment)", rightText: "" },
    { value: "role_id", label: "Permission Role", rightText: "" },
    { value: "is_active", label: "Account Status (Active / Inactive)", rightText: "" },
  ];

  const adminOptions = safeAdmins.map((a) => {
    const isCurrent = selectedUser && String(a.id) === String(selectedUser.admin_id);
    return {
      value: String(a.id),
      label: isCurrent ? `${a.name} (Current Admin)` : a.name,
      rightText: a.email || "",
    };
  });

  const roleOptions = [
    { value: "", label: "-- Choose New Role --" },
    ...safeRoles.map((r) => {
      const isCurrent = selectedUser && String(r.id) === String(selectedUser.role_id);
      return {
        value: String(r.id),
        label: isCurrent ? `${r.name} — [Current Role]` : r.name,
      };
    }),
  ];

  const statusOptions = [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ];

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="db-modal-header">
          <div className="db-modal-header-left">
            <div className="db-header-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
            </div>
            <div>
              <h2 className="db-modal-title">Propose Database Change</h2>
              <p className="db-modal-subtitle">
                Submit a request to modify database records. This change will be reviewed before approval.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="db-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="db-modal-form">
          <div className="db-modal-body-scroll">
            {/* LEFT COLUMN */}
            <div className="db-left-column">
              {/* 3D Database Illustration Box */}
              <div className="db-illustration-box">
                <svg width="150" height="116" viewBox="0 0 150 116" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Floating decorative elements */}
                  <circle cx="20" cy="30" r="3" fill="#cbd5e1" opacity="0.6" />
                  <circle cx="132" cy="24" r="2.5" fill="#c7d2fe" opacity="0.8" />
                  <circle cx="126" cy="84" r="3.5" fill="#e0e7ff" opacity="0.7" />
                  <circle cx="24" cy="80" r="2" fill="#e2e8f0" opacity="0.6" />
                  <path d="M128 40L130 44L134 46L130 48L128 52L126 48L122 46L126 44Z" fill="#a5b4fc" opacity="0.8" />
                  <path d="M18 50L19.5 53L22.5 54.5L19.5 56L18 59L16.5 56L13.5 54.5L16.5 53Z" fill="#c7d2fe" opacity="0.8" />

                  {/* 3-Tier Database Cylinder */}
                  <g filter="url(#dbShadow)">
                    {/* Bottom Cylinder */}
                    <path d="M42 62C42 56.5 57 52 75.5 52C94 52 109 56.5 109 62V76C109 81.5 94 86 75.5 86C57 86 42 81.5 42 76V62Z" fill="url(#dbGrad3)" />
                    <ellipse cx="75.5" cy="62" rx="33.5" ry="9" fill="#a5b4fc" />

                    {/* Middle Cylinder */}
                    <path d="M42 43C42 37.5 57 33 75.5 33C94 33 109 37.5 109 43V57C109 62.5 94 67 75.5 67C57 67 42 62.5 42 57V43Z" fill="url(#dbGrad2)" />
                    <ellipse cx="75.5" cy="43" rx="33.5" ry="9" fill="#c7d2fe" />

                    {/* Top Cylinder */}
                    <path d="M42 24C42 18.5 57 14 75.5 14C94 14 109 18.5 109 24V38C109 43.5 94 48 75.5 48C57 48 42 43.5 42 38V24Z" fill="url(#dbGrad1)" />
                    <ellipse cx="75.5" cy="24" rx="33.5" ry="9" fill="#e0e7ff" />
                  </g>

                  {/* Floating Circular Pencil Badge */}
                  <g transform="translate(94, 62)">
                    <circle cx="16" cy="16" r="16" fill="#ffffff" filter="url(#badgeShadow)" />
                    <circle cx="16" cy="16" r="14.5" fill="#ede9fe" />
                    <path d="M12 18L10.5 20L11.5 17L17.2 11.3C17.58 10.92 18.22 10.92 18.6 11.3L19.7 12.4C20.08 12.78 20.08 13.42 19.7 13.8L14 19.5L12 18Z" fill="#6366f1" />
                    <path d="M16 12.5L18.5 15" stroke="#ede9fe" strokeWidth="1" strokeLinecap="round" />
                  </g>

                  <defs>
                    <linearGradient id="dbGrad1" x1="42" y1="24" x2="109" y2="38" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#93c5fd" />
                      <stop offset="0.5" stopColor="#a5b4fc" />
                      <stop offset="1" stopColor="#818cf8" />
                    </linearGradient>
                    <linearGradient id="dbGrad2" x1="42" y1="43" x2="109" y2="57" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#93c5fd" />
                      <stop offset="0.5" stopColor="#818cf8" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="dbGrad3" x1="42" y1="62" x2="109" y2="76" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#818cf8" />
                      <stop offset="0.5" stopColor="#6366f1" />
                      <stop offset="1" stopColor="#4f46e5" />
                    </linearGradient>
                    <filter id="dbShadow" x="36" y="12" width="79" height="80" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#4338ca" floodOpacity="0.16" />
                    </filter>
                    <filter id="badgeShadow" x="-2" y="-2" width="36" height="36" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.1" />
                    </filter>
                  </defs>
                </svg>
              </div>

              {/* How it works Section */}
              <div className="db-steps-card">
                <h4 className="db-steps-title">How it works?</h4>

                {/* Step 1 */}
                <div className="db-step-item">
                  <div className="db-step-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div className="db-step-content">
                    <span className="db-step-name">1. Submit Request</span>
                    <p className="db-step-desc">Fill in the required details and submit.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="db-step-item">
                  <div className="db-step-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="db-step-content">
                    <span className="db-step-name">2. Review Process</span>
                    <p className="db-step-desc">Your request will be queued for review by an authorized reviewer.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="db-step-item">
                  <div className="db-step-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div className="db-step-content">
                    <span className="db-step-name">3. Approval & Update</span>
                    <p className="db-step-desc">Once approved, the change will be applied to the database.</p>
                  </div>
                </div>
              </div>

              {/* Important Alert Box */}
              <div className="db-important-box">
                <svg className="db-important-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" clipRule="evenodd"></path>
                </svg>
                <div className="db-important-content">
                  <span className="db-important-title">Important</span>
                  <p className="db-important-text">
                    This change will NOT be applied directly to the database. It will be placed into the review queue for an authorized reviewer to verify and approve.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="db-right-column">
              {error && (
                <div className="db-error-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Card 1: Select Employee / Record */}
              <div className="db-form-card">
                <div className="db-card-header">
                  <div className="db-card-icon-badge purple">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div className="db-card-titles">
                    <label className="db-card-label" htmlFor="db-select-employee">
                      Select Employee / Record <span className="db-required-asterisk">*</span>
                    </label>
                  </div>
                </div>
                <div className="db-select-wrapper">
                  <CustomSelect
                    id="db-select-employee"
                    value={selectedUserId}
                    onChange={(val) => setSelectedUserId(val)}
                    options={employeeOptions}
                    placeholder={loading ? "-- Loading Employees... --" : "-- Choose Employee --"}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Card 2: Field to Change */}
              <div className="db-form-card">
                <div className="db-card-header">
                  <div className="db-card-icon-badge green">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                  </div>
                  <div className="db-card-titles">
                    <label className="db-card-label" htmlFor="db-field-to-change">
                      Field to Change <span className="db-required-asterisk">*</span>
                    </label>
                  </div>
                </div>
                <div className="db-select-wrapper">
                  <CustomSelect
                    id="db-field-to-change"
                    value={changeField}
                    onChange={(val) => setChangeField(val)}
                    options={fieldOptions}
                  />
                </div>
              </div>

              {/* Card 3: Dynamic Target Field */}
              {changeField === "admin_id" && (
                <div className="db-form-card">
                  <div className="db-card-header">
                    <div className="db-card-icon-badge pink">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    </div>
                    <div className="db-card-titles">
                      <label className="db-card-label" htmlFor="db-new-admin">
                        New Assigned Admin <span className="db-required-asterisk">*</span>
                      </label>
                    </div>
                  </div>

                  {/* Current Admin Informational Card */}
                  {selectedUser && (
                    <div className="db-current-val-banner">
                      <div className="db-current-val-label">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        Current Assigned Admin:
                      </div>
                      <div className="db-current-val-pill">
                        <span className="db-current-val-dot purple" />
                        <span className="db-current-val-text">
                          {currentAdminObj
                            ? `${currentAdminObj.name} (${currentAdminObj.email})`
                            : selectedUser.admin_id
                            ? `Admin #${selectedUser.admin_id}`
                            : "Unassigned (No Admin Assigned)"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="db-select-wrapper">
                    <CustomSelect
                      id="db-new-admin"
                      value={targetAdminId}
                      onChange={(val) => setTargetAdminId(val)}
                      options={adminOptions}
                      placeholder="-- Choose New Admin --"
                    />
                  </div>
                </div>
              )}

              {changeField === "role_id" && (
                <div className="db-form-card">
                  <div className="db-card-header">
                    <div className="db-card-icon-badge purple">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <polyline points="9 12 11 14 15 9"></polyline>
                      </svg>
                    </div>
                    <div className="db-card-titles">
                      <label className="db-card-label" htmlFor="db-new-role">
                        New Permission Role <span className="db-required-asterisk">*</span>
                      </label>
                    </div>
                  </div>

                  {/* Current Role Informational Card */}
                  {selectedUser && (
                    <div className="db-current-val-banner">
                      <div className="db-current-val-label">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Current Permission Role:
                      </div>
                      <div className="db-current-val-pill">
                        <span className="db-current-val-dot green" />
                        <span className="db-current-val-text">
                          {currentRoleObj?.name || selectedUser.permission_role || selectedUser.role || "Employee"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="db-select-wrapper">
                    <CustomSelect
                      id="db-new-role"
                      value={targetRoleId}
                      onChange={(val) => setTargetRoleId(val)}
                      options={roleOptions}
                      placeholder="-- Choose New Role --"
                    />
                  </div>
                </div>
              )}

              {changeField === "is_active" && (
                <div className="db-form-card">
                  <div className="db-card-header">
                    <div className="db-card-icon-badge green">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                        <line x1="12" y1="2" x2="12" y2="12"></line>
                      </svg>
                    </div>
                    <div className="db-card-titles">
                      <label className="db-card-label" htmlFor="db-new-status">
                        New Account Status <span className="db-required-asterisk">*</span>
                      </label>
                    </div>
                  </div>

                  {/* Current Status Informational Card */}
                  {selectedUser && (
                    <div className="db-current-val-banner">
                      <div className="db-current-val-label">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        Current Account Status:
                      </div>
                      <div className="db-current-val-pill">
                        <span className={`db-current-val-dot ${selectedUser.is_active ? "green" : "red"}`} />
                        <span className="db-current-val-text">
                          {selectedUser.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="db-select-wrapper">
                    <CustomSelect
                      id="db-new-status"
                      value={targetStatus}
                      onChange={(val) => setTargetStatus(val)}
                      options={statusOptions}
                    />
                  </div>
                </div>
              )}

              {/* Card 4: Reason / Justification */}
              <div className="db-form-card">
                <div className="db-card-header">
                  <div className="db-card-icon-badge amber">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div className="db-card-titles">
                    <label className="db-card-label" htmlFor="db-reason">
                      Reason / Justification <span className="db-required-asterisk">*</span>
                    </label>
                  </div>
                </div>
                <div className="db-card-textarea-wrapper">
                  <textarea
                    id="db-reason"
                    className="db-card-textarea"
                    rows="3"
                    placeholder="Why is this database change needed?"
                    value={reason}
                    maxLength={500}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="db-char-counter">{reason.length}/500</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="db-modal-footer">
            <button
              type="button"
              className="db-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="db-submit-btn"
              disabled={submitting}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>{submitting ? "Submitting..." : "Submit for Approval"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
