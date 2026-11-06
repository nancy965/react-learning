import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./CreateRole.css";
import PATHS from "../config/path.config";
import { API_URL } from "../config/axios.util";

const ALLOWED_OPERATIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "import",
  "export",
];

function EditRole() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [roleName, setRoleName] = useState("");
  const [menus, setMenus] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [expandedMenus, setExpandedMenus] = useState([]);
  const [selectedAccess, setSelectedAccess] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRoleData();
  }, [id]);

  const getHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const loadRoleData = async () => {
    try {
      setLoading(true);
      setError("");

      const [roleResponse, menusResponse, permissionsResponse] =
        await Promise.all([
          axios.get(`${API_URL}/role-permissions/roles/${id}`, {
            headers: getHeaders(),
          }),
          axios.get(`${API_URL}/role-permissions/menus`, {
            headers: getHeaders(),
          }),
          axios.get(`${API_URL}/role-permissions/permissions`, {
            headers: getHeaders(),
          }),
        ]);

      const roleData = roleResponse.data.data?.role;

      const rolePermissions = roleResponse.data.data?.permissions || [];

      const loadedMenus = menusResponse.data.data || [];

      const rawPermissions = permissionsResponse.data.data || [];

      const sortedPermissions = ALLOWED_OPERATIONS.map((op) => {
        const existing = rawPermissions.find((p) => p.operation === op);
        return (
          existing || {
            id: op,
            name: op.charAt(0).toUpperCase() + op.slice(1),
            operation: op,
          }
        );
      });

      setRoleName(roleData?.name || "");
      setMenus(loadedMenus);
      setPermissions(sortedPermissions);

      const accessMap = {};

      rolePermissions.forEach((item) => {
        const ops = Array.isArray(item.operations)
          ? item.operations.filter((op) => ALLOWED_OPERATIONS.includes(op))
          : [];
        accessMap[item.identifier_id] = {
          selected: true,
          operations:
            ops.length > 0 ? ops : sortedPermissions.map((p) => p.operation),
        };
      });

      loadedMenus.forEach((menu) => {
        const hasSubmenus =
          Array.isArray(menu.submenus) && menu.submenus.length > 0;

        if (!hasSubmenus) {
          const existing = accessMap[menu.id];
          accessMap[menu.id] = {
            selected: Boolean(existing?.selected),
            operations:
              existing?.operations ||
              (existing?.selected
                ? sortedPermissions.map((p) => p.operation)
                : []),
          };
          return;
        }

        const submenuIds = menu.submenus.map((submenu) => submenu.id);
        const someSubmenusSelected = submenuIds.some((submenuId) =>
          Boolean(accessMap[submenuId]?.selected),
        );
        const parentExplicitlySelected = Boolean(accessMap[menu.id]?.selected);

        accessMap[menu.id] = {
          selected: parentExplicitlySelected || someSubmenusSelected,
          operations: accessMap[menu.id]?.operations || [],
        };
      });

      setSelectedAccess(accessMap);
    } catch (error) {
      console.error("Load edit role error:", error);

      setError(error.response?.data?.message || "Failed to load role");
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (menuId) => {
    setExpandedMenus((current) => {
      if (current.includes(menuId)) {
        return current.filter((id) => id !== menuId);
      }

      return [...current, menuId];
    });
  };

  const isParentMenuFullySelected = (menu, currentAccess = selectedAccess) => {
    if (!menu.submenus || menu.submenus.length === 0) {
      return Boolean(currentAccess[menu.id]?.selected);
    }
    return menu.submenus.every((submenu) => {
      const subData = currentAccess[submenu.id];
      if (!subData?.selected) return false;
      const subOps = subData.operations || [];
      return (
        permissions.length > 0 &&
        permissions.every((p) => subOps.includes(p.operation))
      );
    });
  };

  const isMenuChecked = (menu) => {
    if (menu.submenus && menu.submenus.length > 0) {
      return isParentMenuFullySelected(menu, selectedAccess);
    }
    return Boolean(selectedAccess[menu.id]?.selected);
  };

  const toggleMenuSelection = (menuId) => {
    setSelectedAccess((current) => {
      const menu = menus.find((item) => item.id === menuId);
      if (!menu) return current;

      const hasSubmenus =
        Array.isArray(menu.submenus) && menu.submenus.length > 0;
      if (!hasSubmenus) {
        const isCurrentlySelected = Boolean(current[menuId]?.selected);
        return {
          ...current,
          [menuId]: {
            selected: !isCurrentlySelected,
            operations: isCurrentlySelected
              ? []
              : permissions.map((p) => p.operation),
          },
        };
      }

      const allFullySelected = isParentMenuFullySelected(menu, current);
      const targetState = !allFullySelected;

      const updatedAccess = { ...current };

      updatedAccess[menuId] = {
        selected: targetState,
        operations: targetState ? permissions.map((p) => p.operation) : [],
      };

      menu.submenus.forEach((submenu) => {
        updatedAccess[submenu.id] = {
          selected: targetState,
          operations: targetState ? permissions.map((p) => p.operation) : [],
        };
      });

      return updatedAccess;
    });
  };

  const toggleSubmenuSelection = (submenuId, parentMenuId) => {
    setSelectedAccess((current) => {
      const existing = current[submenuId];
      const isCurrentlySelected = Boolean(existing?.selected);
      const updatedAccess = {
        ...current,
        [submenuId]: {
          selected: !isCurrentlySelected,
          operations: isCurrentlySelected
            ? []
            : permissions.map((p) => p.operation),
        },
      };

      const parentMenu = menus.find((m) => m.id === parentMenuId);
      const submenuIds = parentMenu?.submenus?.map((s) => s.id) || [];
      const anySubmenuSelected = submenuIds.some((id) => {
        if (id === submenuId) return !isCurrentlySelected;
        return Boolean(current[id]?.selected);
      });

      updatedAccess[parentMenuId] = {
        selected: anySubmenuSelected,
        operations: current[parentMenuId]?.operations || [],
      };

      return updatedAccess;
    });
  };

  const togglePermission = (identifierId, operation, parentMenuId = null) => {
    setSelectedAccess((current) => {
      const existing = current[identifierId];
      const operations = existing?.operations || [];
      const updatedOperations = operations.includes(operation)
        ? operations.filter((item) => item !== operation)
        : [...operations, operation];

      const identifierSelected = updatedOperations.length > 0;

      const updatedAccess = {
        ...current,
        [identifierId]: {
          selected: identifierSelected,
          operations: updatedOperations,
        },
      };

      if (parentMenuId) {
        const parentMenu = menus.find((m) => m.id === parentMenuId);
        const submenuIds = parentMenu?.submenus?.map((s) => s.id) || [];
        const anySubmenuSelected = submenuIds.some((id) => {
          if (id === identifierId) return identifierSelected;
          return Boolean(current[id]?.selected);
        });

        updatedAccess[parentMenuId] = {
          selected: anySubmenuSelected,
          operations: current[parentMenuId]?.operations || [],
        };
      }

      return updatedAccess;
    });
  };

  const isSelected = (identifierId) => {
    return Boolean(selectedAccess[identifierId]?.selected);
  };

  const isPermissionSelected = (identifierId, operation) => {
    return Boolean(
      selectedAccess[identifierId]?.operations?.includes(operation),
    );
  };

  const handleUpdateRole = async () => {
    if (!roleName.trim()) {
      setError("Role name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const access = [];
      const addedIds = new Set();

      menus.forEach((menu) => {
        const hasSubmenus =
          Array.isArray(menu.submenus) && menu.submenus.length > 0;

        if (!hasSubmenus) {
          const ops = selectedAccess[menu.id]?.operations || [];
          const isSel = Boolean(selectedAccess[menu.id]?.selected);
          if (isSel || ops.length > 0) {
            access.push({
              identifierId: menu.id,
              operations:
                ops.length > 0 ? ops : permissions.map((p) => p.operation),
            });
            addedIds.add(menu.id);
          }
          return;
        }

        const submenus = menu.submenus || [];
        let hasActiveSubmenu = false;

        submenus.forEach((sub) => {
          const ops = selectedAccess[sub.id]?.operations || [];
          const isSel = Boolean(selectedAccess[sub.id]?.selected);
          if (isSel || ops.length > 0) {
            access.push({
              identifierId: sub.id,
              operations:
                ops.length > 0 ? ops : permissions.map((p) => p.operation),
            });
            addedIds.add(sub.id);
            hasActiveSubmenu = true;
          }
        });

        const parentOps = selectedAccess[menu.id]?.operations || [];
        const parentSel = Boolean(selectedAccess[menu.id]?.selected);
        if (hasActiveSubmenu || parentSel || parentOps.length > 0) {
          access.push({
            identifierId: menu.id,
            operations:
              parentOps.length > 0
                ? parentOps
                : permissions.map((p) => p.operation),
          });
          addedIds.add(menu.id);
        }
      });

      Object.entries(selectedAccess).forEach(([idStr, val]) => {
        if (!addedIds.has(idStr) && val?.selected) {
          access.push({
            identifierId: idStr,
            operations:
              val.operations?.length > 0
                ? val.operations
                : permissions.map((p) => p.operation),
          });
          addedIds.add(idStr);
        }
      });

      await axios.put(
        `${API_URL}/role-permissions/roles/${id}`,
        {
          name: roleName.trim(),
          access,
        },
        {
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json",
          },
        },
      );

      localStorage.setItem("rolePermissionsLastUpdated", String(Date.now()));
      window.dispatchEvent(new Event("permissionsUpdated"));
      window.dispatchEvent(new Event("storage"));
      navigate(PATHS.ROLES);
    } catch (error) {
      console.error("Update role error:", error);

      setError(error.response?.data?.message || "Failed to update role");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="create-role-page">
        <div className="create-role-loading">Loading role...</div>
      </div>
    );
  }

  return (
    <div className="create-role-page">
      <div className="create-role-header">
        <div>
          <span className="role-breadcrumb-tag">ROLE MANAGEMENT</span>
          <h1>Edit Role</h1>

          <p>Update role name and assigned permissions.</p>
        </div>
      </div>

      {error && <div className="create-role-error">{error}</div>}

      <div className="create-role-card">
        <div className="role-name-section">
          <label htmlFor="roleName">Role Name</label>

          <input
            id="roleName"
            type="text"
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="Enter role name"
          />
        </div>

        <div className="permissions-section">
          <h2>Permissions</h2>

          <div className="permissions-list">
            {menus.map((menu) => {
              const isOpen = expandedMenus.includes(menu.id);

              const isDirectPermissionMenu =
                !menu.submenus || menu.submenus.length === 0;

              return (
                <div className="permission-menu" key={menu.id}>
                  <div
                    className={`permission-menu-row ${
                      isDirectPermissionMenu ? "direct-permission-row" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isMenuChecked(menu)}
                      onChange={(event) => {
                        event.stopPropagation();

                        toggleMenuSelection(menu.id);
                      }}
                    />

                    <span
                      className="permission-menu-name"
                      onClick={() => toggleMenu(menu.id)}
                    >
                      {menu.name}
                    </span>

                    {isDirectPermissionMenu && isOpen && (
                      <div className="permission-options">
                        {permissions.map((permission) => (
                          <label
                            className="permission-option"
                            key={`${menu.id}-${permission.operation}`}
                          >
                            <input
                              type="checkbox"
                              checked={isPermissionSelected(
                                menu.id,
                                permission.operation,
                              )}
                              onChange={() =>
                                togglePermission(menu.id, permission.operation)
                              }
                            />

                            <span>{permission.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isDirectPermissionMenu &&
                    isOpen &&
                    menu.submenus?.map((submenu) => (
                      <div className="permission-submenu-row" key={submenu.id}>
                        <div className="submenu-name-wrapper">
                          <input
                            type="checkbox"
                            checked={isSelected(submenu.id)}
                            onChange={(event) => {
                              event.stopPropagation();

                              toggleSubmenuSelection(submenu.id, menu.id);
                            }}
                          />

                          <span>{submenu.name}</span>
                        </div>

                        <div className="permission-options">
                          {permissions.map((permission) => (
                            <label
                              className="permission-option"
                              key={`${submenu.id}-${permission.operation}`}
                            >
                              <input
                                type="checkbox"
                                checked={isPermissionSelected(
                                  submenu.id,
                                  permission.operation,
                                )}
                                onChange={() =>
                                  togglePermission(
                                    submenu.id,
                                    permission.operation,
                                    menu.id,
                                  )
                                }
                              />

                              <span>{permission.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="create-role-actions">
          <button
            type="button"
            className="cancel-role-button"
            onClick={() => navigate(PATHS.ROLE_DETAILS.replace(":id", id))}
          >
            Cancel
          </button>

          <button
            type="button"
            className="save-role-button"
            onClick={handleUpdateRole}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditRole;
