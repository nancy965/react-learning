import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";
import { API_URL } from "../config/axios.util";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const isLoggingOutRef = useRef(false);

  // Helper to test if a JWT is expired
  const isTokenExpired = useCallback((jwtToken) => {
    if (!jwtToken) return true;
    try {
      const parts = jwtToken.split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      // 1-second buffer before actual expiry
      return Date.now() >= payload.exp * 1000 - 1000;
    } catch {
      return true;
    }
  }, []);

  // Helper to get milliseconds remaining on a JWT
  const getTokenRemainingMs = useCallback((jwtToken) => {
    if (!jwtToken) return 0;
    try {
      const parts = jwtToken.split(".");
      if (parts.length !== 3) return 0;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return 0;
      return Math.max(0, payload.exp * 1000 - Date.now());
    } catch {
      return 0;
    }
  }, []);

  // LOGOUT: Stops task tracker, notifies backend, clears storage, and resets state
  const logout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    // 1. Immediately stop any running task tracker in memory and notify components
    try {
      window.__activeTaskSession = null;
      window.dispatchEvent(new CustomEvent("stopActiveTaskTracker"));
    } catch (e) {
      console.error("Error dispatching stopActiveTaskTracker:", e);
    }

    // 2. Notify backend to mark user offline and end active time entries in DB
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (storedToken || storedUser?.id) {
        axios
          .post(
            `${API_URL}/auth/logout`,
            {
              userId: storedUser?.id || storedUser?.registerId,
              email: storedUser?.email,
            },
            {
              headers: storedToken
                ? { Authorization: `Bearer ${storedToken}` }
                : {},
            },
          )
          .catch(() => {});
      }
    } catch (e) {
      // Ignore network errors on logout
    }

    // 3. Clear all authentication-related storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("accessData");
    localStorage.removeItem("sessionNavigation");
    localStorage.removeItem("baselinePermissions");
    sessionStorage.removeItem("sessionRevokedPermissions");

    // Clear email compose state on logout so it does not persist across sessions
    try {
      localStorage.removeItem("email_compose_open_state");
      localStorage.removeItem("email_compose_draft_state");
      window.dispatchEvent(new CustomEvent("close-compose-email"));
    } catch (e) {}

    setToken(null);
    setUser(null);

    // Reset flag after a tick
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 500);
  }, []);

  // Sync current user on mount / token change
  useEffect(() => {
    const syncCurrentUser = async () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) return;

      if (isTokenExpired(storedToken)) {
        console.warn("Token expired on init sync. Auto-logging out...");
        logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.data?.user) {
          const freshUser = response.data.user;
          localStorage.setItem("user", JSON.stringify(freshUser));
          setUser(freshUser);
        }
      } catch (err) {
        console.error("Failed to sync current user:", err);
        if (
          err.response?.status === 401 ||
          String(err.response?.data?.message || "")
            .toLowerCase()
            .includes("token")
        ) {
          logout();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }
    };

    syncCurrentUser();
  }, [token, isTokenExpired, logout]);

  // Proactive token expiration timer & listeners (handles in-session expiry)
  useEffect(() => {
    if (!token) return;

    // Immediate check
    if (isTokenExpired(token)) {
      console.warn(
        "Token already expired. Automatically stopping tracker and logging out...",
      );
      logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return;
    }

    // Timer for exact expiration moment
    const remainingMs = getTokenRemainingMs(token);
    let timerId = null;
    if (remainingMs > 0) {
      timerId = setTimeout(() => {
        console.warn(
          "Token lifetime reached. Automatically stopping tracker and logging out...",
        );
        logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, remainingMs);
    }

    // Periodic check every 5 seconds (handles system wake from sleep / tab backgrounding)
    const intervalId = setInterval(() => {
      const currentStoredToken = localStorage.getItem("token");
      if (!currentStoredToken || isTokenExpired(currentStoredToken)) {
        console.warn(
          "Token expiration detected in periodic check. Auto-logging out...",
        );
        logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }, 5000);

    // Event listener for tab focus / visibilitychange
    const handleFocusOrVisible = () => {
      const currentStoredToken = localStorage.getItem("token");
      if (currentStoredToken && isTokenExpired(currentStoredToken)) {
        console.warn(
          "Token expiration detected on tab focus. Auto-logging out...",
        );
        logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      if (timerId) clearTimeout(timerId);
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [token, isTokenExpired, getTokenRemainingMs, logout]);

  // Global Axios response interceptor: Catches any 401 / expired token error across the app
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const msg = String(error.response?.data?.message || "").toLowerCase();

        const isTokenError =
          status === 401 ||
          (status === 403 &&
            (msg.includes("token") ||
              msg.includes("expired") ||
              msg.includes("unauthorized")));

        const isLoginPage = window.location.pathname === "/login";

        if (isTokenError && !isLoginPage) {
          console.warn(
            "401/Token expired encountered. Automatically stopping tracker and logging out...",
          );
          logout();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  // LOGIN
  const login = (token, user, accessData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    if (accessData) {
      localStorage.setItem("accessData", JSON.stringify(accessData));
    }

    // Clear stale compose email state on new login
    try {
      localStorage.removeItem("email_compose_open_state");
      localStorage.removeItem("email_compose_draft_state");
      window.dispatchEvent(new CustomEvent("close-compose-email"));
    } catch (e) {}

    // Establish session baseline permissions at login time
    const baseline = [];
    if (Array.isArray(accessData)) {
      accessData.forEach((menu) => {
        if (Array.isArray(menu.permissions)) baseline.push(...menu.permissions);
        if (Array.isArray(menu.submenus)) {
          menu.submenus.forEach((sub) => {
            if (Array.isArray(sub.permissions))
              baseline.push(...sub.permissions);
          });
        }
      });
    } else if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        if (Array.isArray(decoded.permissions))
          baseline.push(...decoded.permissions);
      } catch {}
    }
    const uniqueBaseline = [...new Set(baseline)];
    localStorage.setItem("baselinePermissions", JSON.stringify(uniqueBaseline));

    // Clear session-revoked cache so new login starts clean
    sessionStorage.removeItem("sessionRevokedPermissions");

    setToken(token);
    setUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook
export function useAuth() {
  return useContext(AuthContext);
}
