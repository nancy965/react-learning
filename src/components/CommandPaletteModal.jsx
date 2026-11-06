import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { searchGlobal } from "../services/searchService";
import PATHS from "../config/path.config";
import "./CommandPaletteModal.css";

function CommandPaletteModal({ isOpen, onClose, user, onNotificationClick }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const cardsListRef = useRef(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState({
    users: [],
    tasks: [],
    chats: [],
    notifications: [],
    totalCount: 0,
  });

  // Base navigation items matching Picture 1
  const quickActions = useMemo(() => {
    const isEmp = user?.role === "employee";
    const isGA =
      user?.role === "general_admin" ||
      user?.role === "super_admin" ||
      user?.baseRole === "general_admin";
    const isAdmin = user?.role === "admin" || isGA;

    const list = [
      {
        id: "quick-dashboard",
        title: "Dashboard",
        subtitle: "View main metrics & analytics",
        category: "dashboard",
        iconColor: "blue",
        iconType: "dashboard",
        path: "/dashboard",
      },
      {
        id: "quick-tasks",
        title: "Task Management",
        subtitle: "Manage and assign team tasks",
        category: "management",
        iconColor: "green",
        iconType: "tasks",
        path: isEmp ? (PATHS.EMPLOYEE_TASKS || "/employee-tasks") : (PATHS.TASKS || "/tasks"),
      },
      {
        id: "quick-users",
        title: "Users Management",
        subtitle: "View, create & manage employees",
        category: "management",
        iconColor: "purple",
        iconType: "users",
        path: PATHS.USERS || "/users",
      },
      {
        id: "quick-chat",
        title: "Chat & Direct Messages",
        subtitle: "Collaborate with team & groups",
        category: "communication",
        iconColor: "amber",
        iconType: "chat",
        path: PATHS.CHAT || "/chat",
      },
      {
        id: "quick-email",
        title: "Email Center",
        subtitle: "Compose and send emails, manage attachments & drafts",
        category: "communication",
        iconColor: "blue",
        iconType: "email",
        path: "/emails",
      },
      {
        id: "quick-expenses",
        title: "Expense Reimbursement",
        subtitle: "Submit expense claims, upload receipts, and track payouts",
        category: "finance",
        iconColor: "orange",
        iconType: "wallet",
        path: "/expenses",
      },
      {
        id: "quick-leaves",
        title: "Leave Management",
        subtitle: "Apply for leave, track balances, and view holidays",
        category: "management",
        iconColor: "teal",
        iconType: "calendar",
        path: "/leaves",
      },
      {
        id: "quick-support",
        title: "Support",
        subtitle: "Helpdesk support & inquiries",
        category: "support",
        iconColor: "rose",
        iconType: "support",
        path: isEmp ? (PATHS.MY_TICKETS || "/tickets/my") : (PATHS.MANAGE_TICKETS || "/tickets/manage"),
      },
      {
        id: "quick-account",
        title: "Account",
        subtitle: "Account settings & security",
        category: "account",
        iconColor: "cyan",
        iconType: "account",
        path: PATHS.PROFILE || "/profile",
      },
      {
        id: "quick-approvals",
        title: "Approval Requests",
        subtitle: "Manage approval workflow",
        category: "management",
        iconColor: "violet",
        iconType: "approvals",
        path: isEmp ? (PATHS.MY_REQUESTS || "/approvals/my") : (PATHS.APPROVAL_INBOX || "/approvals/inbox"),
      },
      {
        id: "quick-reports",
        title: "Reports & Analytics",
        subtitle: "View reports & insights",
        category: "management",
        iconColor: "teal",
        iconType: "reports",
        path: isEmp ? (PATHS.EMPLOYEE_TASK_ANALYTICS || "/employee-task-analytics") : (PATHS.TASK_ANALYTICS || "/task-analytics"),
      },
    ];

    return list;
  }, [user?.role, user?.baseRole]);

  // Sidebar categories based on query state (Picture 1 replication)
  const sidebarCategories = useMemo(() => {
    const isSearching = Boolean(query.trim());

    if (!isSearching) {
      // Default Picture 1 Categories
      const counts = {
        all: quickActions.length,
        dashboard: quickActions.filter((a) => a.category === "dashboard").length,
        management: quickActions.filter((a) => a.category === "management").length,
        communication: quickActions.filter((a) => a.category === "communication").length,
        support: quickActions.filter((a) => a.category === "support").length,
        account: quickActions.filter((a) => a.category === "account").length,
      };

      return [
        { id: "all", label: "All", icon: "all", count: counts.all },
        { id: "dashboard", label: "Dashboard", icon: "dashboard", count: counts.dashboard },
        { id: "management", label: "Management", icon: "management", count: counts.management },
        { id: "communication", label: "Communication", icon: "communication", count: counts.communication },
        { id: "support", label: "Support", icon: "support", count: counts.support },
        { id: "account", label: "Account", icon: "account", count: counts.account },
      ];
    }

    // Dynamic categories when searching
    return [
      { id: "all", label: "All", icon: "all", count: results.totalCount },
      { id: "users", label: "Users & Admins", icon: "users", count: results.users?.length || 0 },
      { id: "tasks", label: "Tasks", icon: "tasks", count: results.tasks?.length || 0 },
      { id: "chats", label: "Chat & Messages", icon: "communication", count: results.chats?.length || 0 },
      { id: "notifications", label: "Notifications", icon: "notifications", count: results.notifications?.length || 0 },
    ];
  }, [query, quickActions, results]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveCategory("all");
      setActiveIndex(0);
      setResults({ users: [], tasks: [], chats: [], notifications: [], totalCount: 0 });
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Debounced live search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ users: [], tasks: [], chats: [], notifications: [], totalCount: 0 });
      setLoading(false);
      setActiveCategory("all");
      setActiveIndex(0);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const response = await searchGlobal(trimmed);
        if (response?.success && response.data) {
          setResults(response.data);
        } else {
          setResults({ users: [], tasks: [], chats: [], notifications: [], totalCount: 0 });
        }
      } catch (err) {
        console.error("Search error:", err);
        setResults({ users: [], tasks: [], chats: [], notifications: [], totalCount: 0 });
      } finally {
        setLoading(false);
        setActiveIndex(0);
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [query]);

  // Filter items based on activeCategory
  const visibleItems = useMemo(() => {
    const isSearching = Boolean(query.trim());

    if (!isSearching) {
      if (activeCategory === "all") return quickActions;
      return quickActions.filter((a) => a.category === activeCategory);
    }

    // When searching
    const items = [];
    if (activeCategory === "all" || activeCategory === "users") {
      (results.users || []).forEach((u) => {
        items.push({
          id: `user-${u.id}`,
          title: u.title,
          subtitle: u.subtitle,
          category: "users",
          iconColor: "purple",
          iconType: "users",
          navigationPath: u.navigationPath,
          rawItem: u,
        });
      });
    }

    if (activeCategory === "all" || activeCategory === "tasks") {
      (results.tasks || []).forEach((t) => {
        items.push({
          id: `task-${t.id}`,
          title: t.title,
          subtitle: t.subtitle,
          category: "tasks",
          iconColor: "green",
          iconType: "tasks",
          navigationPath: t.navigationPath,
          rawItem: t,
        });
      });
    }

    if (activeCategory === "all" || activeCategory === "chats") {
      (results.chats || []).forEach((c) => {
        items.push({
          id: `chat-${c.id}`,
          title: c.title,
          subtitle: c.subtitle,
          category: "chats",
          iconColor: "amber",
          iconType: "chat",
          navigationPath: "/chat",
          state: { conversationId: c.id },
          rawItem: c,
        });
      });
    }

    if (activeCategory === "all" || activeCategory === "notifications") {
      (results.notifications || []).forEach((n) => {
        items.push({
          id: `notif-${n.id}`,
          title: n.title,
          subtitle: n.subtitle,
          category: "notifications",
          iconColor: "rose",
          iconType: "notifications",
          rawNotification: n.rawNotification,
        });
      });
    }

    return items;
  }, [query, activeCategory, quickActions, results]);

  // Adjust activeIndex if out of bounds
  useEffect(() => {
    if (activeIndex >= visibleItems.length) {
      setActiveIndex(Math.max(0, visibleItems.length - 1));
    }
  }, [visibleItems.length, activeIndex]);

  // Handle item navigation
  const handleSelectItem = (item) => {
    if (!item) return;

    onClose();

    // 1. Quick Navigation Action
    if (item.path) {
      navigate(item.path);
      return;
    }

    // 2. Chat Conversation
    if (item.category === "chats") {
      navigate("/chat", { state: { conversationId: item.rawItem?.id || item.id } });
      return;
    }

    // 3. Notification
    if (item.category === "notifications") {
      if (typeof onNotificationClick === "function" && item.rawNotification) {
        onNotificationClick(item.rawNotification);
      } else {
        navigate(user?.role === "employee" ? "/employee-tasks" : "/tasks");
      }
      return;
    }

    // 4. User or Task
    if (item.navigationPath) {
      navigate(item.navigationPath);
    }
  };

  // Keyboard navigation & Alt+number shortcuts
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (visibleItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 < visibleItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : visibleItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = visibleItems[activeIndex];
      if (current) {
        handleSelectItem(current);
      }
    }
  };

  // Auto-scroll active item into view
  useEffect(() => {
    if (!cardsListRef.current) return;
    const activeEl = cardsListRef.current.querySelector(".cmd-card-item.active");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  // Title and subtitle for main content header
  const getHeaderMeta = () => {
    if (!query.trim()) {
      if (activeCategory === "all") {
        return {
          title: "Quick Navigation",
          subtitle: "Find anything and jump to it instantly",
        };
      }
      const cat = sidebarCategories.find((c) => c.id === activeCategory);
      return {
        title: cat?.label || "Navigation",
        subtitle: `Jump to ${cat?.label || "section"} pages`,
      };
    }

    if (activeCategory === "all") {
      return {
        title: "Search Results",
        subtitle: `Showing matches across all categories for "${query}"`,
      };
    }
    const cat = sidebarCategories.find((c) => c.id === activeCategory);
    return {
      title: cat?.label || "Search Results",
      subtitle: `Matching results in ${cat?.label || "category"}`,
    };
  };

  const headerMeta = getHeaderMeta();

  // Render SVG icons matching Picture 1
  const renderIcon = (type) => {
    switch (type) {
      case "dashboard":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case "tasks":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <polyline points="9 13 11 15 15 10" />
          </svg>
        );
      case "users":
      case "management":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case "communication":
      case "chat":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case "email":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        );
      case "support":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        );
      case "account":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );
      case "reports":
      case "analytics":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      case "approvals":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 9" />
          </svg>
        );
      case "calendar":
      case "leaves":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "database":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        );
      case "notifications":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
      case "all":
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        );
    }
  };

  return createPortal(
    <div
      className="cmd-palette-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="cmd-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        onKeyDown={handleKeyDown}
      >
        {/* Top Header: Glowing Search Input + Close Button */}
        <div className="cmd-header-row">
          <div className="cmd-search-box">
            <div className="cmd-search-icon">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              className="cmd-search-input"
              placeholder="Search for anything... (users, tasks, chats, settings, pages)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="cmd-search-actions">
              {loading && <div className="cmd-spinner" title="Searching..." />}
              {query && !loading && (
                <button
                  type="button"
                  className="cmd-clear-btn"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  title="Clear search"
                >
                  ×
                </button>
              )}
              <kbd className="cmd-esc-badge">ESC</kbd>
            </div>
          </div>

          <button
            type="button"
            className="cmd-dialog-close-btn"
            onClick={onClose}
            title="Close (ESC)"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body: Two-Column Layout (Sidebar + Results) */}
        <div className="cmd-body-container">
          {/* Left Column: Categories Sidebar */}
          <aside className="cmd-sidebar">
            <div className="cmd-sidebar-header">CATEGORIES</div>
            <div className="cmd-sidebar-list">
              {sidebarCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`cmd-sidebar-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setActiveIndex(0);
                    }}
                  >
                    <div className="cmd-sidebar-item-left">
                      <span className="cmd-sidebar-icon">{renderIcon(cat.icon)}</span>
                      <span>{cat.label}</span>
                    </div>
                    <span className="cmd-sidebar-count">{cat.count}</span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Quick Navigation Callout Banner matching Picture 1 */}
            <div className="cmd-sidebar-banner">
              <span className="cmd-sidebar-banner-plus top-plus">+</span>
              <span className="cmd-sidebar-banner-plus bottom-plus">+</span>
              <div className="cmd-sidebar-banner-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <div className="cmd-sidebar-banner-text">
                <h4>Quick Navigation</h4>
                <p>Use your keyboard to quickly access any page or feature.</p>
              </div>
            </div>
          </aside>

          {/* Right Column: Main Content List */}
          <main className="cmd-main-content">
            <div className="cmd-content-header">
              <div className="cmd-content-title-box">
                <h3>{headerMeta.title}</h3>
                <p>{headerMeta.subtitle}</p>
              </div>
              <span className="cmd-results-count-pill">{visibleItems.length} results</span>
            </div>

            <div className="cmd-cards-list" ref={cardsListRef}>
              {visibleItems.length === 0 ? (
                <div className="cmd-empty-box">
                  <div className="cmd-empty-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <div className="cmd-empty-main">No records found</div>
                  <div className="cmd-empty-sub">
                    {query.trim()
                      ? `No matching records found for "${query}" in this category.`
                      : "No actions available."}
                  </div>
                </div>
              ) : (
                visibleItems.map((item, index) => {
                  const isActive = activeIndex === index;
                  return (
                    <div
                      key={item.id}
                      className={`cmd-card-item ${isActive ? "active" : ""}`}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="cmd-card-left">
                        <div className={`cmd-icon-box ${item.iconColor || "blue"}`}>
                          {renderIcon(item.iconType || "dashboard")}
                        </div>
                        <div className="cmd-card-text">
                          <div className="cmd-card-title">{item.title}</div>
                          <div className="cmd-card-subtitle">{item.subtitle}</div>
                        </div>
                      </div>

                      <div className="cmd-card-right">
                        <span className="cmd-chevron-circle">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>

        {/* Bottom Footer Bar */}
        <div className="cmd-footer-bar">
          <div className="cmd-footer-left">
            <div className="cmd-footer-key-item">
              <span className="cmd-footer-kbd">↑</span>
              <span className="cmd-footer-kbd">↓</span>
              <span>to navigate</span>
            </div>
            <div className="cmd-footer-key-item">
              <span className="cmd-footer-kbd">↵</span>
              <span>to select</span>
            </div>
            <div className="cmd-footer-key-item">
              <span className="cmd-footer-esc-label">ESC</span>
              <span>to close</span>
            </div>
          </div>

          <button
            type="button"
            className="cmd-footer-help-btn"
            onClick={() => {
              inputRef.current?.focus();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Need help?</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommandPaletteModal;
