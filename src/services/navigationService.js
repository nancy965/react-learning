import axios from "axios";
import API_URL from "../config/axios.util";

const getAuthConfig = (tokenOverride) => {
  const token = tokenOverride || localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getNavigation = async (tokenOverride) => {
  const response = await axios.get(
    `${API_URL}/navigation/get-all`,
    getAuthConfig(tokenOverride)
  );

  return response.data;
};

export const getNavigationRoute = (identifier, role) => {
  let userRole = role;
  let roleName = "";
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      if (!userRole) {
        userRole = parsed?.role;
      }
      roleName = (parsed?.role_name || parsed?.roleName || "").toLowerCase();
    }
  } catch (e) {
    console.error(e);
  }

  const isAdminRole =
    userRole === "admin" ||
    userRole === "general_admin" ||
    roleName === "admin" ||
    roleName === "general admin";

  const isGeneralAdmin =
    userRole === "general_admin" ||
    userRole === "super_admin" ||
    roleName === "general admin";

  const navigationRoutes = {
    dashboard: "/dashboard",
    user_dashboard: "/dashboard",
    users: "/users",
    admins: "/admins",
    roles: "/roles",
    tasks: "/tasks",
    task_analytics:
      isAdminRole
        ? "/task-analytics"
        : "/employee-task-analytics",
    all_tasks: "/tasks",
    my_tasks: "/employee-tasks",
    employee_tasks: "/employee-tasks",
    employee_task_analytics: "/employee-task-analytics",
    countries: "/countries",
    states: "/states",
    cities: "/cities",
    pincodes: "/pincodes",
    activity_logs: "/activity-logs",
    notifications: "/notifications",
    chat: "/chat",
    ads_management: "/ad-platforms",
    ads: "/ad-platforms",
    ad_platforms: "/ad-platforms",
    ad_campaigns: "/ad-campaigns",
    profile: "/profile",
    menu: "/dashboard",
    common_master: "/common-master",
    support_tickets: isAdminRole ? "/tickets/manage" : "/tickets/my",
    my_tickets: "/tickets/my",
    manage_tickets: "/tickets/manage",
    approval_workflow: isAdminRole ? "/approvals/inbox" : "/approvals/my",
    my_requests: isGeneralAdmin ? null : "/approvals/my",
    approval_inbox: "/approvals/inbox",
    employee_lifecycle: "/lifecycle",
    lifecycle_overview: "/lifecycle",
    lifecycle_templates: "/lifecycle/templates",
    email_center: "/emails",
    emails: "/emails",
    mailbox: "/emails",
    mail: "/emails",
    expenses: "/expenses",
    expense_claims: "/expenses",
    expense_reimbursement: "/expenses",
    leaves: "/leaves",
    leave_management: "/leaves",
    leave_my_leaves: "/leaves",
    leave_calendar: "/leaves/calendar",
    leave_audit: "/leaves/audit",
    leave_requests: "/leaves/requests",
  };

  return navigationRoutes[identifier] || null;
};

export const sortSubmenus = (submenus) => {
  if (!Array.isArray(submenus)) return [];
  return [...submenus].sort((a, b) => {
    if (
      a.display_order !== undefined &&
      b.display_order !== undefined &&
      a.display_order !== b.display_order
    ) {
      return a.display_order - b.display_order;
    }

    if (a.identifier === "user_dashboard") return -1;
    if (b.identifier === "user_dashboard") return 1;

    if (a.identifier === "task_analytics") return -1;
    if (b.identifier === "task_analytics") return 1;

    return 0;
  });
};

export const getFirstAvailableRoute = (navigationList, role) => {
  if (!Array.isArray(navigationList) || navigationList.length === 0) {
    return "/dashboard";
  }

  for (const menu of navigationList) {
    if (menu.submenus && menu.submenus.length > 0) {
      const sortedSubmenus = sortSubmenus(menu.submenus);
      for (const submenu of sortedSubmenus) {
        const route = getNavigationRoute(submenu.identifier, role);
        if (route) {
          return route;
        }
      }
    } else {
      const route = getNavigationRoute(menu.identifier, role);
      if (route) {
        return route;
      }
    }
  }

  return "/dashboard";
};