import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import ConfirmDialog from "./ConfirmDialog";

import {
  deleteUser,
  getUserPermissions,
  saveUserPermissions,
} from "../services/userService";

import "./UserCard.css";

function UserCard({
  user,
  index,
  gridTemplate,
  refreshUsers,
  isAdmin,
  userRole,
  canViewUsers = true,
  canEditUsers,
  canDeleteUsers,
  onSuccess,
  onView,
  openUserMenuId,
  setOpenUserMenuId,
  openMenuUp,
}) {
  const navigate = useNavigate();

  const [showConfirm, setShowConfirm] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showPermissions, setShowPermissions] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");

  const showActions = openUserMenuId === user.id;
  const actionButtonRef = useRef(null);

  const handleActionMenuToggle = () => {
    if (showActions) {
      setOpenUserMenuId(null);
      return;
    }

    setOpenUserMenuId(user.id);
  };

  const handleEdit = () => {
    setOpenUserMenuId(null);
    navigate(`/${user.id}/users/edit`);
  };

  const handleView = () => {
    setOpenUserMenuId(null);

    if (onView) {
      onView(user.id);
      return;
    }

    navigate(`/${user.id}/users`);
  };

  const handlePermissions = async () => {
    setOpenUserMenuId(null);
    setShowPermissions(true);
    setPermissionsLoading(true);
    setPermissionsError("");

    try {
      const response = await getUserPermissions(user.id);

      setPermissions(response?.data || []);
    } catch (error) {
      console.log("PERMISSIONS ERROR:", error);

      setPermissionsError(
        error.response?.data?.message || "Failed to load permissions",
      );
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionIdentifier) => {
    setPermissions((prev) =>
      prev.map((permission) => {
        if (permission.permission_identifier !== permissionIdentifier) {
          return permission;
        }

        const newValue = !permission.is_allowed;

        return {
          ...permission,
          is_allowed: newValue,
          is_overridden: newValue !== permission.role_allowed,
        };
      }),
    );
  };

  const handleResetPermission = (permissionIdentifier) => {
    setPermissions((prev) =>
      prev.map((permission) =>
        permission.permission_identifier === permissionIdentifier
          ? {
            ...permission,
            is_allowed: permission.role_allowed,
            is_overridden: false,
          }
          : permission,
      ),
    );
  };

  const handleSavePermissions = async () => {
    if (permissionsSaving) return;

    try {
      setPermissionsSaving(true);
      setPermissionsError("");

      const selectedPermissions = permissions
        .filter((permission) => permission.is_allowed)
        .map((permission) => permission.permission_identifier);

      await saveUserPermissions(user.id, selectedPermissions);

      setShowPermissions(false);

      onSuccess("User permissions updated successfully!");
    } catch (error) {
      console.log("SAVE PERMISSIONS ERROR:", error);

      setPermissionsError(
        error.response?.data?.message || "Failed to save permissions",
      );
    } finally {
      setPermissionsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteLoading) return;

    if (!canDeleteUsers) {
      setShowConfirm(false);
      onSuccess("Access Denied: You do not have permission to delete users.");
      return;
    }

    try {
      setDeleteLoading(true);

      await deleteUser(user.id);

      setShowConfirm(false);
      setOpenUserMenuId(null);

      onSuccess("User deleted successfully!");

      refreshUsers();
    } catch (error) {
      console.log("DELETE ERROR:", error);

      setShowConfirm(false);

      alert(
        error.response?.data?.message || "Failed to delete user",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div
        className="user-table-row"
        style={{
          gridTemplateColumns: gridTemplate,
          cursor: "pointer",
        }}
        onClick={handleView}
      >
        <div className="user-index">{index}</div>

        <div className="user-name">
          <span className="user-name-title">{user.name || "-"}</span>
          {user.age ? (
            <span className="user-name-age">{user.age} years</span>
          ) : null}
        </div>

        <div className="user-email">{user.email || "-"}</div>

        <div className="user-country">{user.country_name || "-"}</div>

        <div className="user-state">{user.state_name || "-"}</div>

        <div className="user-city">{user.city_name || "-"}</div>

        <div className="user-pincode">{user.pincode || "-"}</div>

        <div className="user-role-cell">
          <span className="role-badge">
            {user.role
              ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
              : "Employee"}
          </span>
        </div>

        <div className="user-permission-role-cell">
          <span
            className={
              !user.permission_role ||
              user.permission_role === "No Permission Role"
                ? "role-badge empty"
                : "role-badge permission"
            }
          >
            {user.permission_role || "Employee"}
          </span>
        </div>

        <div className="user-status-cell">
          <span
            className={`user-status-pill ${
              user.is_active === false || user.status === "Inactive"
                ? "inactive"
                : "active"
            }`}
          >
            {user.is_active === false || user.status === "Inactive"
              ? "Inactive"
              : "Active"}
          </span>
        </div>

        <div className="user-created-cell">
          {(() => {
            const raw = user.created_at || user.createdAt;
            if (!raw) return "10/7/2026";
            try {
              const d = new Date(raw);
              if (isNaN(d.getTime())) return "10/7/2026";
              return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
            } catch {
              return "10/7/2026";
            }
          })()}
        </div>

        <div
          className="user-action-cell"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="action-menu-wrapper">
            <button
              ref={actionButtonRef}
              type="button"
              className="action-menu-btn"
              onClick={handleActionMenuToggle}
              title="Actions"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            {showActions &&
              actionButtonRef.current &&
              (() => {
                const btnRect = actionButtonRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - btnRect.bottom;
                const shouldOpenUp = openMenuUp || spaceBelow < 160;
                return createPortal(
                  <div
                    className="action-dropdown"
                    style={{
                      position: "fixed",
                      right: `${Math.max(
                        10,
                        window.innerWidth - btnRect.right
                      )}px`,
                      top: shouldOpenUp
                        ? "auto"
                        : `${btnRect.bottom + 4}px`,
                      bottom: shouldOpenUp
                        ? `${
                            window.innerHeight - btnRect.top + 4
                          }px`
                        : "auto",
                      maxHeight: "calc(100vh - 20px)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onView && (
                      <button
                        type="button"
                        className="action-dropdown-item view-task-btn"
                        onClick={handleView}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="3" r="3" />
                        </svg>
                        <span>View</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="action-dropdown-item edit-task-btn"
                      onClick={handleEdit}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Edit</span>
                    </button>

                    <div className="action-dropdown-divider" />

                    <button
                      type="button"
                      className="action-dropdown-item delete-task-btn"
                      onClick={() => {
                        setOpenUserMenuId(null);
                        setShowConfirm(true);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>,
                  document.body,
                );
              })()}
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          message="Are you sure you want to delete this user?"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {showPermissions && (
        <div
          className="user-edit-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPermissions(false);
            }
          }}
        >
          <div className="user-edit-modal-content permissions-modal-content">
            <h2>User Permissions</h2>

            <p className="permissions-user-name">
              Manage permissions for <strong>{user.name}</strong>
            </p>

            {permissionsError && (
              <p className="user-edit-error">{permissionsError}</p>
            )}

            {permissionsLoading ? (
              <div className="user-edit-loading">
                Loading permissions...
              </div>
            ) : (
              <div className="permissions-list">
                {permissions.map((permission) => (
                  <div
                    key={permission.permission_identifier}
                    className="permission-row"
                  >
                    <div className="permission-info">
                      <div className="permission-name">
                        {permission.operation
                          ? permission.operation
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (character) =>
                              character.toUpperCase(),
                            )
                          : permission.name}
                      </div>

                      <div className="permission-identifier">
                        {permission.permission_identifier}
                      </div>
                    </div>

                    <div className="permission-actions">
                      <span
                        className={`permission-status ${permission.is_overridden
                            ? "custom"
                            : "inherited"
                          }`}
                      >
                        {permission.is_overridden
                          ? "Custom"
                          : "Role Default"}
                      </span>

                      <button
                        type="button"
                        className={`permission-toggle ${permission.is_allowed ? "active" : ""
                          }`}
                        onClick={() =>
                          handlePermissionToggle(
                            permission.permission_identifier,
                          )
                        }
                      >
                        <span className="permission-toggle-circle"></span>
                      </button>

                      {permission.is_overridden && (
                        <button
                          type="button"
                          className="permission-reset-button"
                          onClick={() =>
                            handleResetPermission(
                              permission.permission_identifier,
                            )
                          }
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="user-edit-form-buttons">
              <button
                type="button"
                onClick={() => setShowPermissions(false)}
                disabled={permissionsSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permissionsSaving || permissionsLoading}
              >
                {permissionsSaving
                  ? "Saving..."
                  : "Save Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UserCard;