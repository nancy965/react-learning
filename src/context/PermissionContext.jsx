import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { API_URL } from "../config/axios.util";
const PermissionContext = createContext();

export function PermissionProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const [accessData, setAccessData] = useState(() => {
    try {
      const stored = localStorage.getItem("accessData");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const navStored = localStorage.getItem("sessionNavigation");
      if (navStored) {
        const parsedNav = JSON.parse(navStored);
        if (Array.isArray(parsedNav) && parsedNav.length > 0) return parsedNav;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  // Sync / refresh access data from backend
  const refreshPermissions = useCallback(
    async (isInitial = false) => {
      const currentToken = token || localStorage.getItem("token");
      if (!currentToken) {
        setAccessData([]);
        return;
      }

      try {
        if (isInitial) {
          setLoading(true);
        }
        const res = await axios.post(
          `${API_URL}/auth/refresh-access`,
          {},
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          },
        );

        if (
          res.data?.access &&
          Array.isArray(res.data.access) &&
          res.data.access.length > 0
        ) {
          setAccessData(res.data.access);
          localStorage.setItem("accessData", JSON.stringify(res.data.access));
        }
      } catch (err) {
        console.error("Failed to refresh access data:", err);
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    },
    [token],
  );

  const hasFetchedTokenRef = useRef(null);

  useEffect(() => {
    const activeToken = token || localStorage.getItem("token");
    if (activeToken) {
      try {
        const stored = localStorage.getItem("accessData");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAccessData(parsed);
          }
        } else {
          const navStored = localStorage.getItem("sessionNavigation");
          if (navStored) {
            const parsedNav = JSON.parse(navStored);
            if (Array.isArray(parsedNav) && parsedNav.length > 0) {
              setAccessData(parsedNav);
            }
          }
        }
      } catch (e) {
        console.error("Failed parsing accessData:", e);
      }

      if (hasFetchedTokenRef.current !== activeToken) {
        hasFetchedTokenRef.current = activeToken;
        refreshPermissions();
      }
    } else {
      setAccessData([]);
      hasFetchedTokenRef.current = null;
    }
  }, [token, refreshPermissions]);

  const checkIsGeneralAdmin = useCallback((u, t) => {
    const checkObj = (obj) => {
      if (!obj || typeof obj !== "object") return false;
      const r = String(obj.role || "")
        .toLowerCase()
        .trim();
      const br = String(obj.baseRole || obj.base_role || "")
        .toLowerCase()
        .trim();
      const rn = String(obj.role_name || obj.roleName || "")
        .toLowerCase()
        .trim();
      const email = String(obj.email || "")
        .toLowerCase()
        .trim();
      const name = String(obj.name || "")
        .toLowerCase()
        .trim();

      return (
        r === "general_admin" ||
        r === "general admin" ||
        r.includes("general") ||
        r === "super_admin" ||
        r === "super admin" ||
        br === "general_admin" ||
        br === "general admin" ||
        br.includes("general") ||
        rn === "general admin" ||
        rn === "general_admin" ||
        rn.includes("general") ||
        email === "nency@gmail.com" ||
        name === "nency"
      );
    };

    if (checkObj(u)) return true;

    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser && checkObj(JSON.parse(rawUser))) return true;
    } catch {}

    const rawRole = String(localStorage.getItem("role") || "")
      .toLowerCase()
      .trim();
    if (
      rawRole === "general_admin" ||
      rawRole === "general admin" ||
      rawRole === "super_admin" ||
      rawRole.includes("general")
    ) {
      return true;
    }

    const activeToken = t || localStorage.getItem("token");
    if (activeToken) {
      try {
        const parts = activeToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (checkObj(payload)) return true;
        }
      } catch {}
    }

    return false;
  }, []);

  useEffect(() => {
    const handlePermissionsUpdated = () => {
      refreshPermissions();
    };
    window.addEventListener("permissionsUpdated", handlePermissionsUpdated);
    window.addEventListener("storage", handlePermissionsUpdated);

    return () => {
      window.removeEventListener(
        "permissionsUpdated",
        handlePermissionsUpdated,
      );
      window.removeEventListener("storage", handlePermissionsUpdated);
    };
  }, [refreshPermissions]);

  // Extract all permissions into a flat Set
  // 1. General Admin gets all permissions unconditionally.
  // 2. Other roles:
  //    - Newly added permissions to role in DB are NOT granted until logout & re-login (baseline is session ceiling).
  //    - Removed permissions in DB are immediately dropped in real-time (Access Denied).
  const permissionsList = useMemo(() => {
    const list = new Set();
    const isGA = checkIsGeneralAdmin(user, token);

    let baseline = null;
    if (!isGA) {
      try {
        const stored = localStorage.getItem("baselinePermissions");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseline = new Set(parsed);
          }
        }

        if (!baseline) {
          // If baseline not yet in localStorage, seed once from JWT token permissions
          const activeToken = token || localStorage.getItem("token");
          if (activeToken) {
            const decoded = JSON.parse(atob(activeToken.split(".")[1]));
            if (
              Array.isArray(decoded.permissions) &&
              decoded.permissions.length > 0
            ) {
              baseline = new Set(decoded.permissions);
              localStorage.setItem(
                "baselinePermissions",
                JSON.stringify(decoded.permissions),
              );
            }
          }
        }
      } catch {}
    }

    // Determine the source of access data: accessData state, or localStorage fallback
    let effectiveAccess = accessData;
    if (!Array.isArray(effectiveAccess) || effectiveAccess.length === 0) {
      try {
        const stored = localStorage.getItem("accessData");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0)
            effectiveAccess = parsed;
        }
        if (!effectiveAccess || effectiveAccess.length === 0) {
          const navStored = localStorage.getItem("sessionNavigation");
          if (navStored) {
            const parsedNav = JSON.parse(navStored);
            if (Array.isArray(parsedNav) && parsedNav.length > 0)
              effectiveAccess = parsedNav;
          }
        }
      } catch {}
    }

    const shouldFilterWithBaseline = !isGA && baseline && baseline.size > 0;

    if (Array.isArray(effectiveAccess)) {
      effectiveAccess.forEach((menu) => {
        if (menu.identifier) {
          if (!shouldFilterWithBaseline || baseline.has(menu.identifier)) {
            list.add(menu.identifier);
          }
        }
        if (Array.isArray(menu.permissions)) {
          menu.permissions.forEach((p) => {
            if (!shouldFilterWithBaseline || baseline.has(p)) {
              list.add(p);
            }
          });
        }
        if (Array.isArray(menu.submenus)) {
          menu.submenus.forEach((sub) => {
            if (sub.identifier) {
              if (!shouldFilterWithBaseline || baseline.has(sub.identifier)) {
                list.add(sub.identifier);
              }
            }
            if (Array.isArray(sub.permissions)) {
              sub.permissions.forEach((p) => {
                if (!shouldFilterWithBaseline || baseline.has(p)) {
                  list.add(p);
                }
              });
            }
          });
        }
      });
    }

    // Also include permissions directly embedded in the active JWT token
    try {
      const activeToken = token || localStorage.getItem("token");
      if (activeToken) {
        const parts = activeToken.split(".");
        if (parts.length === 3) {
          const decoded = JSON.parse(atob(parts[1]));
          if (Array.isArray(decoded.permissions)) {
            decoded.permissions.forEach((p) => {
              if (!shouldFilterWithBaseline || baseline.has(p)) {
                list.add(p);
              }
            });
          }
        }
      }
    } catch {}

    return list;
  }, [accessData, user, token, checkIsGeneralAdmin]);

  const hasPermission = useCallback(
    (requiredPermission) => {
      const activeToken = token || localStorage.getItem("token");
      if (!isAuthenticated && !activeToken) return false;

      // 1. Unconditional full access for General Admin
      if (checkIsGeneralAdmin(user, activeToken)) return true;

      // 2. Full access for system admin
      const currentUser =
        user ||
        (() => {
          try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();

      if (
        currentUser?.role === "general_admin" ||
        currentUser?.baseRole === "general_admin" ||
        String(currentUser?.role_name || currentUser?.roleName || "")
          .toLowerCase()
          .includes("general")
      ) {
        return true;
      }

      if (!requiredPermission) return true;

      const permsToCheck = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      return permsToCheck.some((reqPerm) => {
        if (!reqPerm) return true;

        const separatorIndex = reqPerm.lastIndexOf(".");

        // Identifier-only check (e.g. "chat") -> check if any permission starts with "chat." or equals "chat"
        if (separatorIndex === -1) {
          if (permissionsList.has(reqPerm)) return true;
          for (const p of permissionsList) {
            if (p === reqPerm || p.startsWith(reqPerm + ".")) return true;
          }
          return false;
        }

        // Direct match
        if (permissionsList.has(reqPerm)) return true;

        // Prefix match (e.g. identifier itself like "user_dashboard" or "dashboard")
        const prefix = reqPerm.substring(0, separatorIndex);
        if (permissionsList.has(prefix)) return true;

        return false;
      });
    },
    [isAuthenticated, token, user, permissionsList, checkIsGeneralAdmin],
  );

  return (
    <PermissionContext.Provider
      value={{
        accessData,
        permissionsList,
        permissions: Array.from(permissionsList),
        reloadPermissions: refreshPermissions,
        hasPermission,
        refreshPermissions,
        loading,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    return {
      accessData: [],
      permissionsList: new Set(),
      permissions: [],
      reloadPermissions: async () => {},
      hasPermission: () => false,
      refreshPermissions: async () => {},
      loading: false,
    };
  }
  return context;
}
