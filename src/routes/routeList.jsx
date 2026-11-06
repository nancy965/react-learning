import Home from "../components/Home";
import Register from "../components/Register";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Users from "../pages/users";
import UserDetails from "../pages/UserDetails";
import Admins from "../pages/Admins";
import AdminDetails from "../pages/AdminDetails";
import Tasks from "../pages/Tasks";
import EmployeeTasks from "../pages/EmployeeTasks";
import TaskAnalytics from "../pages/TaskAnalytics";
import EmployeeAnalytics from "../pages/EmployeeAnalytics";
import Chat from "../pages/Chat";
import Countries from "../pages/Countries";
import States from "../pages/States";
import Cities from "../pages/Cities";
import Pincodes from "../pages/pincodes";
import ActivityLogs from "../pages/ActivityLogs";
import AdPlatforms from "../pages/AdPlatforms";
import AdCampaigns from "../pages/AdCampaigns";
import RolePermissions from "../pages/RolePermissions";
import NotFound from "../pages/NotFound";
import AdminEdit from "../pages/AdminEdit";
import AdminUserEdit from "../pages/AdminUserEdit";
import TaskCreate from "../pages/TaskCreate";
import TaskEdit from "../pages/TaskEdit";
import TaskDetails from "../pages/TaskDetails";
import UserImport from "../pages/UserImport";
import CountryCreate from "../pages/CountryCreate";
import CountryEdit from "../pages/CountryEdit";
import StateCreate from "../pages/StateCreate";
import StateEdit from "../pages/StateEdit";
import CityCreate from "../pages/CityCreate";
import CityEdit from "../pages/CityEdit";
import PincodeCreate from "../pages/PincodeCreate";
import PincodeEdit from "../pages/PincodeEdit";
import AdPlatformCreate from "../pages/AdPlatformCreate";
import AdPlatformEdit from "../pages/AdPlatformEdit";
import AdCampaignCreate from "../pages/AdCampaignCreate";
import CreateRole from "../pages/CreateRole";
import Profile from "../pages/Profile";
import MyTickets from "../pages/MyTickets";
import ManageTickets from "../pages/ManageTickets";
import MyRequests from "../pages/MyRequests";
import ApprovalInbox from "../pages/ApprovalInbox";
import EmployeeLifecycle from "../pages/EmployeeLifecycle";
import ExpenseManagement from "../pages/ExpenseManagement";
import LeaveManagement from "../pages/LeaveManagement";


import CreateUser from "../components/CreateUser";

import {
  MENU_IDENTIFIERS,
  SUBMENU_IDENTIFIERS,
} from "../constants/identifiers";
import PATHS from "../config/path.config";

const routeList = [
  // Public routes

  {
    title: "Home",
    path: PATHS.HOME,
    element: Home,
    roles: [],
    identifier: null,
  },

  {
    title: "Login",
    path: PATHS.LOGIN,
    element: Login,
    roles: [],
    identifier: null,
  },

  {
    title: "Register",
    path: PATHS.REGISTER,
    element: Register,
    roles: [],
    identifier: null,
  },

  // Dashboard

  {
    title: "Dashboard",
    path: PATHS.DASHBOARD,
    element: Dashboard,
    roles: ["general_admin", "admin", "employee"],
    identifier: MENU_IDENTIFIERS.DASHBOARD,
  },

  {
    title: "User Dashboard",
    path: PATHS.DASHBOARD,
    element: Dashboard,
    roles: ["general_admin", "admin", "employee"],
    identifier: SUBMENU_IDENTIFIERS.USER_DASHBOARD,
  },

  // Admins

  {
    title: "Admins",
    path: PATHS.ADMINS,
    element: Admins,
    roles: ["general_admin"],
    identifier: MENU_IDENTIFIERS.ADMINS,
  },

  {
    title: "Admin Details",
    path: PATHS.ADMIN_DETAILS,
    element: AdminDetails,
    roles: ["general_admin"],
    identifier: MENU_IDENTIFIERS.ADMINS,
  },

  {
    title: "Edit Admin",
    path: PATHS.ADMIN_EDIT,
    element: AdminEdit,
    roles: ["general_admin"],
    identifier: MENU_IDENTIFIERS.ADMINS,
    permission: "admins.edit",
  },

  // Users

  {
    title: "Users",
    path: PATHS.USERS,
    element: Users,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.USERS,
  },

  {
    title: "Create User",
    path: PATHS.USER_CREATE,
    element: CreateUser,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.USERS,
    permission: "users.create",
  },

  {
    title: "Bulk User Upload",
    path: PATHS.USER_IMPORT,
    element: UserImport,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.USERS,
    permission: "users.bulk_create",
  },

  {
    title: "Edit User",
    path: PATHS.USER_EDIT,
    element: AdminUserEdit,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.USERS,
    permission: "users.edit",
  },

  {
    title: "User Details",
    path: PATHS.USER_DETAILS,
    element: UserDetails,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.USERS,
    permission: "users.view",
  },

  // Roles

  {
    title: "Roles & Permissions",
    path: PATHS.ROLES,
    element: RolePermissions,
    roles: ["general_admin"],
    identifier: SUBMENU_IDENTIFIERS.ROLES,
  },
  {
    title: "Create Role",
    path: PATHS.ROLE_CREATE,
    element: CreateRole,
    roles: ["general_admin"],
    identifier: SUBMENU_IDENTIFIERS.ROLES,
},

  // Countries

  {
    title: "Countries",
    path: PATHS.COUNTRIES,
    element: Countries,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.COUNTRIES,
  },

  {
    title: "Create Country",
    path: PATHS.COUNTRY_CREATE,
    element: CountryCreate,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.COUNTRIES,
    permission: "countries.create",
  },

  {
    title: "Edit Country",
    path: PATHS.COUNTRY_EDIT,
    element: CountryEdit,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.COUNTRIES,
    permission: "countries.edit",
  },

  // States

  {
    title: "States",
    path: PATHS.STATES,
    element: States,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.STATES,
  },

  {
    title: "Create State",
    path: PATHS.STATE_CREATE,
    element: StateCreate,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.STATES,
    permission: "states.create",
  },

  {
    title: "Edit State",
    path: PATHS.STATE_EDIT,
    element: StateEdit,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.STATES,
    permission: "states.edit",
  },

  // Cities

  {
    title: "Cities",
    path: PATHS.CITIES,
    element: Cities,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.CITIES,
  },

  {
    title: "Create City",
    path: PATHS.CITY_CREATE,
    element: CityCreate,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.CITIES,
    permission: "cities.create",
  },

  {
    title: "Edit City",
    path: PATHS.CITY_EDIT,
    element: CityEdit,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.CITIES,
    permission: "cities.edit",
  },

  // Pincodes

  {
    title: "Pincodes",
    path: PATHS.PINCODES,
    element: Pincodes,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.PINCODES,
  },

  {
    title: "Create Pincode",
    path: PATHS.PINCODE_CREATE,
    element: PincodeCreate,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.PINCODES,
    permission: "pincodes.create",
  },

  {
    title: "Edit Pincode",
    path: PATHS.PINCODE_EDIT,
    element: PincodeEdit,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.PINCODES,
    permission: "pincodes.edit",
  },

  // Activity Logs

  {
    title: "Activity Logs",
    path: PATHS.ACTIVITY_LOGS,
    element: ActivityLogs,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.ACTIVITY_LOGS,
  },

  // Tasks

  {
    title: "Tasks",
    path: PATHS.TASKS,
    element: Tasks,
    roles: ["general_admin", "admin"],
    identifier: MENU_IDENTIFIERS.TASKS,
    permission: "tasks.view",
  },

  {
    title: "Create Task",
    path: PATHS.TASK_CREATE,
    element: TaskCreate,
    roles: ["general_admin", "admin"],
    identifier: MENU_IDENTIFIERS.TASKS,
    permission: "tasks.create",
  },

  {
    title: "Edit Task",
    path: PATHS.TASK_EDIT,
    element: TaskEdit,
    roles: ["general_admin", "admin"],
    identifier: MENU_IDENTIFIERS.TASKS,
    permission: "tasks.edit",
  },

  {
    title: "Task Details",
    path: PATHS.TASK_DETAILS,
    element: TaskDetails,
    roles: ["general_admin", "admin", "employee"],
    identifier: MENU_IDENTIFIERS.TASKS,
    permission: "tasks.view",
  },

  // Employee Tasks

  {
    title: "Employee Tasks",
    path: PATHS.EMPLOYEE_TASKS,
    element: EmployeeTasks,
    roles: ["employee"],
    identifier: MENU_IDENTIFIERS.TASKS,
    permission: "tasks.view",
  },

  // Task Analytics

  {
    title: "Task Analytics",
    path: PATHS.TASK_ANALYTICS,
    element: TaskAnalytics,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.TASK_ANALYTICS,
    permission: "task_analytics.view",
  },

  {
    title: "Employee Task Analytics",
    path: PATHS.EMPLOYEE_TASK_ANALYTICS,
    element: EmployeeAnalytics,
    roles: ["employee"],
    identifier: SUBMENU_IDENTIFIERS.TASK_ANALYTICS,
    permission: "task_analytics.view",
  },

  // Chat

  {
    title: "Chat",
    path: PATHS.CHAT,
    element: Chat,
    roles: ["general_admin", "admin", "employee"],
    identifier: MENU_IDENTIFIERS.CHAT,
  },

  // Ads Management

  {
    title: "Ad Platforms",
    path: PATHS.AD_PLATFORMS,
    element: AdPlatforms,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.AD_PLATFORMS,
  },

  {
    title: "Create Ad Platform",
    path: PATHS.AD_PLATFORM_CREATE,
    element: AdPlatformCreate,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.AD_PLATFORMS,
    permission: "ad_platforms.create",
  },

  {
    title: "Edit Ad Platform",
    path: PATHS.AD_PLATFORM_EDIT,
    element: AdPlatformEdit,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.AD_PLATFORMS,
    permission: "ad_platforms.edit",
  },

  // Ad Campaigns

  {
    title: "Ad Campaigns",
    path: PATHS.AD_CAMPAIGNS,
    element: AdCampaigns,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.AD_CAMPAIGNS,
  },

  {
    title: "Create Ad Campaign",
    path: PATHS.AD_CAMPAIGN_CREATE,
    element: AdCampaignCreate,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.AD_CAMPAIGNS,
    permission: "ad_campaigns.create",
  },

  // Not Found

  {
    title: "Not Found",
    path: PATHS.NOT_FOUND,
    element: NotFound,
    roles: [],
    identifier: null,
  },

  // Profile

{
  title: "Profile",
  path: PATHS.PROFILE,
  element: Profile,
  roles: ["general_admin", "admin", "employee"],
  identifier: MENU_IDENTIFIERS.PROFILE,
},

  // Support Tickets
  {
    title: "My Tickets",
    path: PATHS.MY_TICKETS,
    element: MyTickets,
    roles: ["general_admin", "admin", "employee"],
    identifier: SUBMENU_IDENTIFIERS.MY_TICKETS,
  },
  {
    title: "My Tickets",
    path: "/my-tickets",
    element: MyTickets,
    roles: ["general_admin", "admin", "employee"],
    identifier: null,
  },
  {
    title: "Manage Tickets",
    path: PATHS.MANAGE_TICKETS,
    element: ManageTickets,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.MANAGE_TICKETS,
  },
  {
    title: "Manage Tickets",
    path: "/manage-tickets",
    element: ManageTickets,
    roles: ["general_admin", "admin"],
    identifier: null,
  },

  // Configurable Approval Workflow
  {
    title: "My Requests",
    path: PATHS.MY_REQUESTS,
    element: MyRequests,
    roles: ["admin", "employee"],
    identifier: SUBMENU_IDENTIFIERS.MY_REQUESTS,
  },
  {
    title: "Approval Inbox",
    path: PATHS.APPROVAL_INBOX,
    element: ApprovalInbox,
    roles: ["general_admin", "admin"],
    identifier: SUBMENU_IDENTIFIERS.APPROVAL_INBOX,
  },
  {
    title: "Approvals",
    path: "/approvals",
    element: ApprovalInbox,
    roles: ["general_admin", "admin"],
    identifier: null,
  },
  {
    title: "Database Changes (Bytebase)",
    path: PATHS.DATABASE_APPROVALS,
    element: ApprovalInbox,
    roles: ["general_admin", "admin"],
    identifier: null,
  },
  {
    title: "Database Changes (Bytebase)",
    path: PATHS.DATABASE_CHANGES,
    element: ApprovalInbox,
    roles: ["general_admin", "admin"],
    identifier: null,
  },
  {
    title: "Employee Lifecycle",
    path: PATHS.LIFECYCLE,
    element: EmployeeLifecycle,
    roles: ["general_admin", "admin", "employee"],
    identifier: SUBMENU_IDENTIFIERS.LIFECYCLE_OVERVIEW,
  },
  {
    title: "Templates & Plans",
    path: PATHS.LIFECYCLE_TEMPLATES,
    element: EmployeeLifecycle,
    roles: ["general_admin", "admin", "employee"],
    identifier: SUBMENU_IDENTIFIERS.LIFECYCLE_TEMPLATES,
  },
  {
    title: "Expense Reimbursement",
    path: PATHS.EXPENSES,
    element: ExpenseManagement,
    roles: ["general_admin", "admin", "employee"],
    identifier: MENU_IDENTIFIERS.EXPENSES,
  },
  {
    title: "Leave Management",
    path: PATHS.LEAVES,
    element: LeaveManagement,
    roles: ["general_admin", "admin", "employee"],
    identifier: MENU_IDENTIFIERS.LEAVE_MANAGEMENT,
  },
];

export default routeList;
