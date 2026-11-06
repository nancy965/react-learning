import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  getNavigation,
  getNavigationRoute,
  sortSubmenus,
  getFirstAvailableRoute,
} from "../services/navigationService";
import { useAuth } from "../context/AuthContext";
import {
  getAdminNotifications,
  getEmployeeNotifications,
  getAdminNotificationById,
  getEmployeeNotificationById,
  markAllAdminNotificationsAsRead,
  markAllEmployeeNotificationsAsRead,
} from "../services/notificationService";
import {
  getActiveTrackingSession,
  endTrackingSession,
} from "../services/taskService";
import CommandPaletteModal from "../components/CommandPaletteModal";
import EmailComposeModal from "../components/EmailComposeModal";
import { useEmailCompose } from "../context/EmailComposeContext";
import "./MainLayout.css";
import logo from "../assets/logo.jpg";

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout, user } = useAuth();
  const { isComposeOpen, closeCompose, composeInitialData, expandTrigger } = useEmailCompose();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [emailToast, setEmailToast] = useState(null);
  const knownNotifIdsRef = useRef(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [navigation, setNavigation] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);

  // Active Task Tracker check during Logout
  const [showLogoutTrackerModal, setShowLogoutTrackerModal] = useState(false);
  const [runningSession, setRunningSession] = useState(null);
  const [logoutTrackerWorkSummary, setLogoutTrackerWorkSummary] = useState("");
  const [logoutTrackerLoading, setLogoutTrackerLoading] = useState(false);
  const [logoutChecking, setLogoutChecking] = useState(false);
  const [logoutTrackerError, setLogoutTrackerError] = useState("");
  const [logoutElapsedSeconds, setLogoutElapsedSeconds] = useState(0);

  const notificationRef = useRef(null);

  const token = localStorage.getItem("token");

  const formatTrackerDuration = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    return [hours, minutes, seconds]
      .map((val) => String(val).padStart(2, "0"))
      .join(":");
  };

  useEffect(() => {
    if (!showLogoutTrackerModal || !runningSession?.started_at) {
      setLogoutElapsedSeconds(0);
      return;
    }

    const updateElapsedTime = () => {
      const startedAt = new Date(runningSession.started_at).getTime();
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setLogoutElapsedSeconds(elapsed);
    };

    updateElapsedTime();
    const intervalId = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(intervalId);
  }, [showLogoutTrackerModal, runningSession]);

  // Global Keyboard Shortcut: Ctrl + K (or Cmd + K on macOS) to open/toggle Command Palette
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Listen for global stopActiveTaskTracker event
  useEffect(() => {
    const handleStopTracker = () => {
      setShowLogoutTrackerModal(false);
      setRunningSession(null);
      setLogoutTrackerError("");
      window.__activeTaskSession = null;
    };
    window.addEventListener("stopActiveTaskTracker", handleStopTracker);
    return () => window.removeEventListener("stopActiveTaskTracker", handleStopTracker);
  }, []);

  const handleLogout = async () => {
    if (logoutChecking || logoutTrackerLoading) return;

    const currentToken = localStorage.getItem("token") || token;

    // Check if token is already expired
    const isTokenExpired = (() => {
      if (!currentToken) return true;
      try {
        const payload = JSON.parse(atob(currentToken.split(".")[1]));
        return payload.exp && Date.now() >= payload.exp * 1000;
      } catch {
        return true;
      }
    })();

    if (isTokenExpired) {
      window.__activeTaskSession = null;
      window.dispatchEvent(new CustomEvent("stopActiveTaskTracker"));
      setShowLogoutTrackerModal(false);
      setRunningSession(null);
      logout();
      navigate("/login");
      return;
    }

    // 1. Check if there's an immediate active session known on the page (Tasks / EmployeeTasks)
    const immediateSession = window.__activeTaskSession;
    if (
      immediateSession &&
      immediateSession.id &&
      (immediateSession.status === "running" || !immediateSession.status)
    ) {
      setRunningSession(immediateSession);
      setLogoutTrackerWorkSummary("");
      setLogoutTrackerError("");
      setShowLogoutTrackerModal(true);
      return;
    }

    // 2. Query backend to verify if any running session exists in database
    if (currentToken) {
      try {
        setLogoutChecking(true);
        const response = await getActiveTrackingSession(currentToken);
        const active = response?.data;
        if (
          active &&
          active.id &&
          (active.status === "running" || !active.status)
        ) {
          setRunningSession(active);
          setLogoutTrackerWorkSummary("");
          setLogoutTrackerError("");
          setShowLogoutTrackerModal(true);
          return;
        }
      } catch (error) {
        console.warn("Could not check active task session before logout:", error);
        // If 401 or token expired, log out immediately
        const isAuthError =
          error.response?.status === 401 ||
          error.response?.status === 403 ||
          String(error.response?.data?.message || "")
            .toLowerCase()
            .includes("token");

        if (isAuthError) {
          window.__activeTaskSession = null;
          window.dispatchEvent(new CustomEvent("stopActiveTaskTracker"));
          setShowLogoutTrackerModal(false);
          setRunningSession(null);
          logout();
          navigate("/login");
          return;
        }
      } finally {
        setLogoutChecking(false);
      }
    }

    // 3. No active tracker running, proceed with normal logout
    window.__activeTaskSession = null;
    logout();
    navigate("/login");
  };

  const handleEndTaskAndLogout = async () => {
    if (!runningSession) {
      window.__activeTaskSession = null;
      logout();
      navigate("/login");
      return;
    }

    const currentToken = localStorage.getItem("token") || token;

    // Check if token is already expired before making network call
    const isTokenExpired = (() => {
      if (!currentToken) return true;
      try {
        const payload = JSON.parse(atob(currentToken.split(".")[1]));
        return payload.exp && Date.now() >= payload.exp * 1000;
      } catch {
        return true;
      }
    })();

    if (isTokenExpired) {
      window.__activeTaskSession = null;
      window.dispatchEvent(new CustomEvent("stopActiveTaskTracker"));
      setShowLogoutTrackerModal(false);
      setRunningSession(null);
      logout();
      navigate("/login");
      return;
    }

    try {
      setLogoutTrackerLoading(true);
      setLogoutTrackerError("");

      const summary =
        logoutTrackerWorkSummary.trim() ||
        "Completed task session and logged out.";

      await endTrackingSession(
        runningSession.task_id,
        runningSession.id,
        summary,
        currentToken
      );

      window.__activeTaskSession = null;
      window.dispatchEvent(new CustomEvent("stopActiveTaskTracker"));
      setShowLogoutTrackerModal(false);
      setRunningSession(null);

      logout();
      navigate("/login");
    } catch (err) {
      console.error("END TRACKING SESSION ON LOGOUT ERROR:", err);

      const isAuthError =
        err.response?.status === 401 ||
        err.response?.status === 403 ||
        String(err.response?.data?.message || "")
          .toLowerCase()
          .includes("token") ||
        String(err.response?.data?.message || "")
          .toLowerCase()
          .includes("expired");

      if (isAuthError) {
        // Token is expired: stop tracker cleanly, close modal, logout and navigate to /login
        window.__activeTaskSession = null;
        window.dispatchEvent(new CustomEvent("stopActiveTaskTracker"));
        setShowLogoutTrackerModal(false);
        setRunningSession(null);
        logout();
        navigate("/login");
        return;
      }

      setLogoutTrackerError(
        err.response?.data?.message ||
          "Failed to end task tracking session. Please try again."
      );
    } finally {
      setLogoutTrackerLoading(false);
    }
  };

  const handleCloseLogoutModal = () => {
    if (logoutTrackerLoading) return;
    setShowLogoutTrackerModal(false);
    setLogoutTrackerError("");
  };

  const loadNotifications = async () => {
    try {
      const response =
        user?.role === "employee"
          ? await getEmployeeNotifications(token)
          : await getAdminNotifications(token);

      const notifs = response.notifications || [];
      setNotifications(notifs);

      // Detect incoming new emails in real time
      if (knownNotifIdsRef.current) {
        const newUnreadEmails = notifs.filter(
          (n) =>
            !n.is_read &&
            (n.type === "email" || (n.title || "").toLowerCase().includes("email")) &&
            !knownNotifIdsRef.current.has(n.id)
        );

        if (newUnreadEmails.length > 0) {
          const newest = newUnreadEmails[0];
          newUnreadEmails.forEach((n) => knownNotifIdsRef.current.add(n.id));

          // Notify EmailCenter view to auto-refresh inbox
          window.dispatchEvent(
            new CustomEvent("new-email-received", { detail: newest })
          );

          // Show floating toast
          setEmailToast({
            id: newest.id,
            title: newest.title,
            message: newest.message,
          });
        } else {
          notifs.forEach((n) => knownNotifIdsRef.current.add(n.id));
        }
      } else {
        // Initial load
        knownNotifIdsRef.current = new Set(notifs.map((n) => n.id));
      }
    } catch (error) {
      console.error("GET NOTIFICATIONS ERROR:", error);
    }
  };

  useEffect(() => {
    if (!user?.role) {
      return;
    }

    // Load notifications once when page loads
    loadNotifications();
  }, [user?.role, token]);

  // Auto-dismiss email toast after 6 seconds
  useEffect(() => {
    if (!emailToast) return;
    const timer = setTimeout(() => {
      setEmailToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [emailToast]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const loadNavigation = async () => {
      // 1. If sessionNavigation is already saved in localStorage for this login session, use it for immediate display!
      const cached = localStorage.getItem("sessionNavigation");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cachedLeave = parsed.find((m) => m.identifier === "leave_management");
            if (cachedLeave && (!cachedLeave.submenus || cachedLeave.submenus.length === 0)) {
              localStorage.removeItem("sessionNavigation");
            } else {
              setNavigation(parsed);
            }
            // Navigation menus stay in panel until logout as explicitly required by user:
            // "e role na panel ma e page log out tya sudhi ny jai pn log out pela j e page ni access bandh ty javu joiye access denied avvu avuu joiye che"
            const isGA =
              user?.role === "general_admin" ||
              user?.role === "super_admin" ||
              (user?.role_name || "").toLowerCase() === "general admin" ||
              (user?.roleName || "").toLowerCase() === "general admin" ||
              user?.baseRole === "general_admin" ||
              user?.email === "nency@gmail.com";

            if (!isGA) {
              return;
            }
          }
        } catch (e) {
          console.error("Failed to parse cached sessionNavigation:", e);
        }
      }

      // 2. Fetch fresh navigation from server and persist for this session
      try {
        const response = await getNavigation();

        if (response.success && response.data) {
          setNavigation(response.data);
          localStorage.setItem(
            "sessionNavigation",
            JSON.stringify(response.data)
          );
        }
      } catch (error) {
        console.error("Failed to load navigation:", error);
      }
    };

    loadNavigation();
  }, [user?.id, user?.role]);

  const getMenuPath = (menu) => {
    if (!menu?.submenus?.length) {
      return getNavigationRoute(menu.identifier, user?.role);
    }

    return null;
  };

  useEffect(() => {
    if (!navigation.length) {
      return;
    }

    // 1. If currently at root "/" or at "/dashboard" without permission/menu, redirect to the first available page!
    const hasDashboardRoute = navigation.some(
      (menu) =>
        getNavigationRoute(menu.identifier, user?.role) === "/dashboard" ||
        menu.submenus?.some(
          (submenu) =>
            getNavigationRoute(submenu.identifier, user?.role) === "/dashboard",
        ),
    );

    if (
      location.pathname === "/" ||
      (location.pathname === "/dashboard" && !hasDashboardRoute)
    ) {
      const firstRoute = getFirstAvailableRoute(navigation, user?.role);
      if (firstRoute && firstRoute !== location.pathname) {
        navigate(firstRoute, { replace: true });
        return;
      }
    }

    // Email Center has no submenus and should never show the sidebar panel
    if (
      location.pathname.startsWith("/emails") ||
      location.pathname.startsWith("/mail") ||
      location.pathname.startsWith("/mailbox") ||
      location.pathname.startsWith("/expenses")
    ) {
      setActiveMenu(null);
      return;
    }

    // 2. Set active parent menu
    if (location.pathname.startsWith("/leaves")) {
      setActiveMenu("leave_management");
      return;
    }

    const currentParent = navigation.find((menu) =>
      menu.submenus?.some((submenu) => {
        const route = getNavigationRoute(submenu.identifier, user?.role);
        return (
          route &&
          (route === location.pathname ||
            (route !== "/" && location.pathname.startsWith(`${route}/`)))
        );
      }),
    );

    if (currentParent) {
      setActiveMenu(currentParent.identifier);
      return;
    }

    if (
      location.pathname === "/database-approvals" ||
      location.pathname === "/database-changes"
    ) {
      const approvalMenu = navigation.find(
        (menu) => menu.identifier === "approval_workflow"
      );
      if (approvalMenu) {
        setActiveMenu(approvalMenu.identifier);
        return;
      }
    }

    const currentMainMenu = navigation.find(
      (menu) =>
        !menu.submenus?.length &&
        getNavigationRoute(menu.identifier, user?.role) === location.pathname,
    );

    if (currentMainMenu) {
      setActiveMenu(null);
    }
  }, [navigation, location.pathname, user?.role, navigate]);

  const isGeneralAdmin = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    const baseRole = (user?.baseRole || "").toLowerCase();
    const roleName = (user?.role_name || user?.roleName || "").toLowerCase();
    return (
      role === "general_admin" ||
      role === "super_admin" ||
      baseRole === "general_admin" ||
      roleName === "general_admin" ||
      roleName === "general admin" ||
      user?.email === "nency@gmail.com"
    );
  }, [user]);

  const handleMainMenuClick = (menu) => {
    const hasSubmenus = menu.submenus?.length > 0;

    if (menu.identifier === "leave_management") {
      setActiveMenu("leave_management");
      if (isGeneralAdmin) {
        navigate("/leaves/calendar");
      } else {
        navigate("/leaves");
      }
      return;
    }

    if (hasSubmenus) {
      setActiveMenu(menu.identifier);
      const sortedSubmenus = sortSubmenus(menu.submenus);

      // Find the first submenu that has a valid route for this user/role
      let firstRoute = null;
      for (const submenu of sortedSubmenus) {
        const route = getNavigationRoute(submenu.identifier, user?.role);
        if (route) {
          firstRoute = route;
          break;
        }
      }

      // If no submenu route found, fallback to parent menu route
      if (!firstRoute) {
        firstRoute = getMenuPath(menu) || getNavigationRoute(menu.identifier, user?.role);
      }

      if (firstRoute) {
        navigate(firstRoute);
      }
      return;
    }

    setActiveMenu(null);

    const route = getMenuPath(menu);

    if (route) {
      navigate(route);
    }
  };

  const isLeaveRoute = location.pathname.startsWith("/leaves");

  const leaveSubmenus = useMemo(() => {
    const isUserAdmin =
      user?.role === "admin" ||
      user?.role === "general_admin" ||
      user?.role === "super_admin";

    if (isGeneralAdmin) {
      return [
        { id: "sub-leave-2", name: "Team Calendar", identifier: "leave_calendar", display_order: 1 },
        { id: "sub-leave-3", name: "Audit Ledger", identifier: "leave_audit", display_order: 2 },
        { id: "sub-leave-4", name: "Admin Requests", identifier: "leave_requests", display_order: 3 },
      ];
    }

    return [
      { id: "sub-leave-1", name: "My Leaves", identifier: "leave_my_leaves", display_order: 1 },
      { id: "sub-leave-2", name: "Team Calendar", identifier: "leave_calendar", display_order: 2 },
      { id: "sub-leave-3", name: "Audit Ledger", identifier: "leave_audit", display_order: 3 },
      ...(isUserAdmin
        ? [{ id: "sub-leave-4", name: "Admin Requests", identifier: "leave_requests", display_order: 4 }]
        : []),
    ];
  }, [user?.role, isGeneralAdmin]);

  const rawActiveMenuData = navigation.find(
    (menu) => menu.identifier === activeMenu,
  );

  const activeMenuData = useMemo(() => {
    if (isLeaveRoute || activeMenu === "leave_management") {
      const dbLeaveMenu = navigation.find((m) => m.identifier === "leave_management");
      let submenus =
        dbLeaveMenu?.submenus && dbLeaveMenu.submenus.length > 0
          ? dbLeaveMenu.submenus
          : leaveSubmenus;

      if (isGeneralAdmin) {
        submenus = submenus.filter(
          (s) => s.identifier !== "leave_my_leaves" && s.name !== "My Leaves"
        );
      }

      return {
        id: dbLeaveMenu?.id || "leave_management",
        name: "Leave Management",
        identifier: "leave_management",
        submenus: submenus,
      };
    }
    return rawActiveMenuData;
  }, [isLeaveRoute, activeMenu, navigation, leaveSubmenus, rawActiveMenuData, isGeneralAdmin]);

  const isEmailRoute =
    location.pathname.startsWith("/emails") ||
    location.pathname.startsWith("/mail") ||
    location.pathname.startsWith("/mailbox");

  const isFullWidthRoute =
    isEmailRoute ||
    location.pathname.startsWith("/expenses");

  const hasSidebar =
    !isFullWidthRoute &&
    (isLeaveRoute || Boolean(activeMenuData?.submenus?.length > 0));

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  const getNotificationRoute = (notification) => {
    switch (notification.type) {
      case "email":
      case "email_received":
      case "new_email":
        return "/emails";

      case "task_assigned":
      case "task_updated":
      case "task_started":
      case "task_completed":
        return user?.role === "employee" ? "/employee-tasks" : "/tasks";

      case "chat_message":
        return "/chat";

      case "user_created":
      case "user_updated":
      case "user_deactivated":
      case "user_bulk_created":
        return "/users";

      case "admin_created":
      case "admin_updated":
      case "admin_deactivated":
        return "/admins";

      case "role_created":
      case "role_updated":
      case "role_deleted":
      case "role_permissions_updated":
        return "/roles";

      case "user_permissions_updated":
        return "/users";

      case "country_created":
      case "country_updated":
      case "country_deactivated":
      case "country_activated":
        return "/countries";

      case "state_created":
      case "state_updated":
      case "state_deactivated":
      case "state_activated":
        return "/states";

      case "city_created":
      case "city_updated":
      case "city_deactivated":
      case "city_activated":
        return "/cities";

      case "pincode_created":
      case "pincode_updated":
      case "pincode_deactivated":
      case "pincode_activated":
        return "/pincodes";

      case "platform_created":
      case "platform_updated":
      case "platform_deactivated":
      case "platform_activated":
        return "/ad-platforms";

      case "campaign_created":
        return "/ad-campaigns";

      case "user_login":
      case "admin_login":
      case "system_update":
        return "/dashboard";

      default:
        return user?.role === "employee" ? "/employee-tasks" : "/tasks";
    }
  };

  const handleNotificationClick = async (notification) => {
    const newTab = window.open("about:blank", "_blank");

    try {
      if (!newTab) {
        console.error("Browser blocked the new tab");
        return;
      }

      const targetPath = getNotificationRoute(notification);

      if (!notification.is_read) {
        const response =
          user?.role === "employee"
            ? await getEmployeeNotificationById(notification.id, token)
            : await getAdminNotificationById(notification.id, token);

        if (response.success) {
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === notification.id ? { ...item, is_read: true } : item,
            ),
          );
        }
      }

      setShowNotifications(false);

      newTab.location.href = `${window.location.origin}${targetPath}`;
    } catch (error) {
      console.error("GET NOTIFICATION ERROR:", error);

      if (newTab && !newTab.closed) {
        newTab.close();
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      const response =
        user?.role === "employee"
          ? await markAllEmployeeNotificationsAsRead(token)
          : await markAllAdminNotificationsAsRead(token);

      if (response?.success) {
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, is_read: true }))
        );
      }
    } catch (error) {
      console.error("MARK ALL NOTIFICATIONS AS READ ERROR:", error);
    }
  };

  const [activeTab, setActiveTab] = useState("All");

  const tabs = [
    { id: "All", label: "All" },
    { id: "User Management", label: "User Management" },
    { id: "Security", label: "Security" },
    { id: "System", label: "System" },
  ];

  const filterNotification = (notification, tab) => {
    if (tab === "All") return true;

    const type = (notification.type || "").toLowerCase();
    const title = (notification.title || "").toLowerCase();

    // 1. Security: Only actual security, permissions, login, password events
    const isSecurity =
      type.includes("permission") ||
      type.includes("security") ||
      type.includes("login") ||
      type.includes("auth") ||
      type.includes("password") ||
      title.includes("permission") ||
      title.includes("security") ||
      title.includes("login") ||
      title.includes("password");

    if (tab === "Security") {
      return isSecurity;
    }

    // 2. System: System updates, platforms, tasks, locations, etc.
    const isSystem =
      type.includes("system") ||
      type.includes("platform") ||
      type.includes("campaign") ||
      type.includes("country") ||
      type.includes("state") ||
      type.includes("city") ||
      type.includes("pincode") ||
      type.includes("task") ||
      type.includes("chat") ||
      type.includes("email") ||
      title.includes("email") ||
      title.includes("system") ||
      title.includes("task") ||
      title.includes("country") ||
      title.includes("state") ||
      title.includes("city") ||
      title.includes("pincode") ||
      title.includes("platform") ||
      title.includes("campaign");

    if (tab === "System") {
      return isSystem && !isSecurity;
    }

    // 3. User Management: Users, Admins, Roles creation/updates/deletions (excluding Security & System)
    if (tab === "User Management") {
      if (isSecurity || isSystem) return false;

      return (
        type.includes("user") ||
        type.includes("admin") ||
        type.includes("role") ||
        title.includes("user") ||
        title.includes("admin") ||
        title.includes("role")
      );
    }

    return true;
  };

  const filteredNotifications = notifications.filter((item) =>
    filterNotification(item, activeTab)
  );

  const renderNotificationAvatar = (notification) => {
    const type = (notification.type || "").toLowerCase();
    const title = (notification.title || "").toLowerCase();
    const msg = (notification.message || "").toLowerCase();

    if (type.includes("email") || title.includes("email")) {
      return (
        <div className="notif-avatar notif-avatar-orange">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ea580c"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
      );
    }

    if (
      type.includes("deleted") ||
      type.includes("deactivated") ||
      title.includes("deleted") ||
      title.includes("deactivated")
    ) {
      return (
        <div className="notif-avatar notif-avatar-red">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dc2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>
      );
    }

    if (type.includes("role") || title.includes("role")) {
      return (
        <div className="notif-avatar notif-avatar-orange">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ea580c"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      );
    }

    if (
      type.includes("permission") ||
      title.includes("permission") ||
      msg.includes("permission")
    ) {
      return (
        <div className="notif-avatar notif-avatar-green">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="m21 2-9.6 9.6" />
            <path d="m15.5 7.5 3 3L22 7l-3-3" />
          </svg>
        </div>
      );
    }

    if (
      type.includes("login") ||
      type.includes("security") ||
      type.includes("auth") ||
      title.includes("login") ||
      title.includes("security") ||
      title.includes("auth")
    ) {
      return (
        <div className="notif-avatar notif-avatar-purple">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9333ea"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
      );
    }

    if (
      type.includes("user") ||
      type.includes("admin") ||
      title.includes("user") ||
      title.includes("admin")
    ) {
      return (
        <div className="notif-avatar notif-avatar-blue">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      );
    }

    if (
      type.includes("system") ||
      type.includes("platform") ||
      type.includes("campaign") ||
      type.includes("country") ||
      type.includes("state") ||
      type.includes("city") ||
      type.includes("pincode") ||
      title.includes("system") ||
      title.includes("update")
    ) {
      return (
        <div className="notif-avatar notif-avatar-cyan">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      );
    }

    return (
      <div className="notif-avatar notif-avatar-amber">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d97706"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      </div>
    );
  };

  const getSubmenuIcon = (identifier) => {
    switch (identifier) {
      case "my_tickets":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        );
      case "manage_tickets":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        );
      case "my_requests":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="m9 15 2 2 4-4" />
          </svg>
        );
      case "approval_inbox":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            <circle cx="12" cy="9" r="1" />
          </svg>
        );
      case "lifecycle_overview":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          </svg>
        );
      case "lifecycle_templates":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        );
      case "leave_my_leaves":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case "leave_calendar":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "leave_audit":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 14 14" />
            <path d="M4.93 4.93l4.24 4.24" />
          </svg>
        );
      case "leave_requests":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`main-layout ${user?.isMasterLogin ? "has-master-active" : ""}`}>
      {user?.isMasterLogin && (
        <div className="master-access-banner">
          <div className="master-access-left">
            <span className="master-access-badge">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Master Access Active
            </span>
            <span className="master-access-text">
              High Authority Mode &mdash; Logged into account of <strong>{user?.name || user?.email}</strong> ({user?.role_name || user?.roleName || user?.role || "User"})
            </span>
          </div>

          <button
            type="button"
            className="master-access-exit-btn"
            onClick={handleLogout}
            title="Exit Master Session and Logout"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Exit Master Session
          </button>
        </div>
      )}

      <header className="main-header">
        <div className="header-logo">
          <img src={logo} alt="Logo" />
        </div>

        <nav className="header-nav">
          {navigation.map((menu) => {
            const hasSubmenus = menu.submenus?.length > 0;

            const isLeaveMatch =
              menu.identifier === "leave_management" &&
              location.pathname.startsWith("/leaves");

            const isActive = hasSubmenus
              ? activeMenu === menu.identifier || isLeaveMatch
              : location.pathname === getNavigationRoute(menu.identifier, user?.role) || isLeaveMatch;

            return (
              <button
                key={menu.id}
                type="button"
                className={`header-nav-link ${isActive ? "active" : ""}`}
                onClick={() => handleMainMenuClick(menu)}
              >
                {menu.name}
              </button>
            );
          })}
        </nav>

        <div className="header-right">
          <button
            type="button"
            className="header-search-bar-btn"
            onClick={() => setShowCommandPalette(true)}
            title="Global Search & Commands (Ctrl + K)"
            aria-label="Open Command Palette"
          >
            <span className="header-search-icon">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <span className="search-placeholder-text">Search...</span>
            <kbd className="header-kbd-badge">Ctrl K</kbd>
          </button>

          <button
            type="button"
            className={`header-email-icon-btn ${isEmailRoute ? "active" : ""}`}
            onClick={() => {
              setActiveMenu(null);
              navigate("/emails");
            }}
            title="Email Center"
            aria-label="Email Center"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </button>


          {/* Expense Reimbursement Quick Access */}
          <button
            type="button"
            className={`header-email-icon-btn ${location.pathname.startsWith("/expenses") ? "active" : ""}`}
            onClick={() => {
              setActiveMenu(null);
              navigate("/expenses");
            }}
            title="Expense Reimbursement"
            aria-label="Expense Reimbursement"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </button>

          <div className="notification-wrapper" ref={notificationRef}>
            <button
              type="button"
              className="notification-button"
              onClick={() => {
                setShowNotifications((prev) => {
                  if (!prev) {
                    loadNotifications();
                  }
                  return !prev;
                });
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#f97316">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              {unreadCount > 0 && (
                <span className="notification-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">
                {/* Header */}
                <div className="notif-header">
                  <div className="notif-header-left">
                    <div className="notif-header-bell-box">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#f97316">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                      </svg>
                    </div>
                    <div className="notif-header-text">
                      <h4 className="notif-header-title">Notifications</h4>
                      <p className="notif-header-subtitle">
                        Stay updated with important activities.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="notif-mark-read-btn"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Mark all as read
                  </button>
                </div>

                {/* Tabs */}
                <div className="notif-tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`notif-tab ${activeTab === tab.id ? "active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* List */}
                <div className="notif-list">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notif-item ${
                          !notification.is_read ? "unread" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {renderNotificationAvatar(notification)}

                        <div className="notif-content">
                          <div className="notif-title">
                            {notification.title}
                          </div>

                          <div className="notif-message">
                            {notification.message}
                          </div>

                          <div className="notif-time">
                            {new Date(notification.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="notif-item-right">
                          {!notification.is_read && (
                            <span className="notif-dot" />
                          )}
                          <div className="notif-chevron">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#94a3b8"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="notif-empty">
                      No notifications {activeTab !== "All" ? "in this category" : ""}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="notif-footer"
                  onClick={() => {
                    setShowNotifications(false);
                    navigate(user?.role === "employee" ? "/employee-tasks" : "/tasks");
                  }}
                >
                  <div className="notif-footer-left">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span>View all notifications</span>
                  </div>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="header-user">
            <div
              className="header-user-avatar"
              style={{
                width: "36px",
                height: "36px",
                minWidth: "36px",
                minHeight: "36px",
                maxWidth: "36px",
                maxHeight: "36px",
                borderRadius: "50%",
                flexShrink: 0,
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div className="header-user-info">
              <span className="header-user-name">
                {user?.name || "User"}
                {user?.isMasterLogin && (
                  <span className="master-user-pill" title="Accessed via Common Master Password">
                    Master
                  </span>
                )}
              </span>

              <span className="header-user-role">
                {user?.role_name || user?.roleName || user?.role || ""}
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
            disabled={logoutChecking || logoutTrackerLoading}
          >
            {logoutChecking ? "Checking..." : "Logout"}
          </button>
        </div>
      </header>

      <div
        className={`layout-body ${hasSidebar ? "has-sidebar" : "full-width"}`}
      >
        {hasSidebar && activeMenuData && (
          <aside className="navigation-sidebar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px 16px 14px", color: "#94a3b8", fontSize: "13.5px", fontWeight: "600", borderBottom: "1px solid #1e293b", marginBottom: "14px" }}>
              {activeMenuData.identifier === "leave_management" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              )}
              <span>{activeMenuData.name}</span>
            </div>
            <div className="sidebar-menu-list">
              {sortSubmenus(activeMenuData.submenus)
                .map((submenu) => {
                  const route = getNavigationRoute(submenu.identifier, user?.role);

                  if (!route) {
                    return null;
                  }

                  return (
                    <NavLink
                      key={submenu.id}
                      to={route}
                      end
                      className={({ isActive }) =>
                        `sidebar-menu-item ${
                          isActive ||
                          (route === "/leaves" && (location.pathname === "/leaves" || location.pathname === "/leaves/my-leaves"))
                            ? "active"
                            : ""
                        }`
                      }
                      style={{ display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      {getSubmenuIcon(submenu.identifier)}
                      <span>{submenu.name}</span>
                    </NavLink>
                  );
                })}
              {activeMenuData?.identifier === "approval_workflow" && (
                <NavLink
                  to="/database-approvals"
                  className={({ isActive }) =>
                    `sidebar-menu-item ${
                      isActive ||
                      location.pathname === "/database-approvals" ||
                      location.pathname === "/database-changes"
                        ? "active"
                        : ""
                    }`
                  }
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                  <span>Database Changes</span>
                </NavLink>
              )}
            </div>
          </aside>
        )}

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* ACTIVE TASK TRACKER WARNING MODAL ON LOGOUT */}
      {showLogoutTrackerModal && runningSession && createPortal(
        <div
          className="logout-task-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !logoutTrackerLoading) {
              handleCloseLogoutModal();
            }
          }}
        >
          <div
            className="logout-task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-task-title"
          >
            {/* Top Header */}
            <div className="logout-task-header">
              <div className="logout-task-header-left">
                <div className="logout-task-icon-box">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h2 id="logout-task-title">Active Task in Progress</h2>
                  <p className="logout-task-subtitle">
                    You cannot log out while a task tracker is active.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="logout-task-close-btn"
                onClick={handleCloseLogoutModal}
                disabled={logoutTrackerLoading}
                aria-label="Close"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Warning Notice Banner */}
            <div className="logout-task-warning-banner">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                Task tracker is currently running. Please end your session to proceed with logout.
              </span>
            </div>

            {/* Task Info Card */}
            <div className="logout-task-info-card">
              <div className="logout-task-card-top">
                <div className="logout-task-active-badge">
                  <span className="logout-task-pulse-dot" />
                  <span>Tracker Running</span>
                </div>
                <div className="logout-task-id-badge">
                  Task #{String(runningSession.task_id || runningSession.id || "").slice(0, 12)}
                </div>
              </div>

              <div className="logout-task-title-text">
                {runningSession.task_title || runningSession.task_name || "Current Task"}
              </div>

              <div className="logout-task-meta-grid">
                <div className="logout-task-meta-item">
                  <span className="logout-task-meta-label">Assigned To</span>
                  <span className="logout-task-meta-value">
                    {runningSession.assigned_to_name || user?.name || "Employee"}
                  </span>
                </div>

                <div className="logout-task-meta-item">
                  <span className="logout-task-meta-label">Started At</span>
                  <span className="logout-task-meta-value">
                    {runningSession.started_at
                      ? new Date(runningSession.started_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "--"}
                  </span>
                </div>

                <div className="logout-task-meta-item">
                  <span className="logout-task-meta-label">Elapsed Time</span>
                  <span className="logout-task-meta-value logout-task-duration-highlight">
                    {formatTrackerDuration(logoutElapsedSeconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Work Summary Input (Optional) */}
            <div className="logout-task-input-group">
              <div className="logout-task-label-row">
                <label htmlFor="logout-work-summary">
                  Work Summary <span className="logout-task-optional-tag">(Optional)</span>
                </label>
                <span className="logout-task-char-count">
                  {logoutTrackerWorkSummary.length}/1000
                </span>
              </div>

              <textarea
                id="logout-work-summary"
                value={logoutTrackerWorkSummary}
                maxLength={1000}
                onChange={(e) => setLogoutTrackerWorkSummary(e.target.value)}
                placeholder="Briefly describe what work was completed before logging out..."
                rows={3}
                disabled={logoutTrackerLoading}
              />
            </div>

            {/* Error Message if any */}
            {logoutTrackerError && (
              <div className="logout-task-error-alert">
                {logoutTrackerError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="logout-task-actions">
              <button
                type="button"
                className="logout-task-cancel-btn"
                onClick={handleCloseLogoutModal}
                disabled={logoutTrackerLoading}
              >
                Cancel & Stay Logged In
              </button>

              <button
                type="button"
                className="logout-task-end-btn"
                onClick={handleEndTaskAndLogout}
                disabled={logoutTrackerLoading}
              >
                {logoutTrackerLoading ? (
                  <>
                    <span className="logout-task-spinner" />
                    Ending Task & Logging Out...
                  </>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                    End Task & Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* GLOBAL SEARCH & COMMAND PALETTE (CTRL + K) */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        user={user}
        onNotificationClick={handleNotificationClick}
      />

      {/* PERSISTENT FLOATING EMAIL COMPOSE MODAL (Retains position & content across pages & email views) */}
      <EmailComposeModal
        isOpen={isComposeOpen}
        onClose={closeCompose}
        initialData={composeInitialData}
        expandTrigger={expandTrigger}
        onSent={() => {
          closeCompose();
          window.dispatchEvent(new CustomEvent("email-sent"));
          loadNotifications();
        }}
      />

      {/* INCOMING EMAIL LIVE NOTIFICATION TOAST */}
      {emailToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#ffffff",
            border: "1px solid #fed7aa",
            borderLeft: "4px solid #f97316",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
            padding: "14px 18px",
            maxWidth: "380px",
            zIndex: 99999,
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            cursor: "pointer",
          }}
          onClick={() => {
            setEmailToast(null);
            navigate("/emails");
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "#fff7ed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ea580c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e293b",
                marginBottom: "2px",
              }}
            >
              {emailToast.title}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#64748b",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {emailToast.message}
            </div>
          </div>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px",
              fontSize: "18px",
              lineHeight: 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEmailToast(null);
            }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

export default MainLayout;
