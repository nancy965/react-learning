import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import { EmailComposeProvider } from "./context/EmailComposeContext";
import PermissionRoute from "./routes/PermissionRoute";

import Login from "./pages/Login";
import Register from "./components/Register";
import Home from "./components/Home";

import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";

import Admins from "./pages/Admins";
import AdminDetails from "./pages/AdminDetails";
import AdminEdit from "./pages/AdminEdit";

import Users from "./pages/users";
import UserDetails from "./pages/UserDetails";
import AdminUserEdit from "./pages/AdminUserEdit";
import UserImport from "./pages/UserImport";
import CreateUser from "./components/createUser";

import RolePermissions from "./pages/RolePermissions";
import CreateRole from "./pages/CreateRole";
import ViewRole from "./pages/ViewRole";
import EditRole from "./pages/EditRole";

import Tasks from "./pages/Tasks";
import TaskCreate from "./pages/TaskCreate";
import TaskEdit from "./pages/TaskEdit";
import TaskDetails from "./pages/TaskDetails";
import EmployeeTasks from "./pages/EmployeeTasks";

import TaskAnalytics from "./pages/TaskAnalytics";
import EmployeeAnalytics from "./pages/EmployeeAnalytics";

import Countries from "./pages/Countries";
import CountryCreate from "./pages/CountryCreate";
import CountryEdit from "./pages/CountryEdit";

import State from "./pages/States";
import StateCreate from "./pages/StateCreate";
import StateEdit from "./pages/StateEdit";

import Cities from "./pages/Cities";
import CityCreate from "./pages/CityCreate";
import CityEdit from "./pages/CityEdit";

import Pincodes from "./pages/pincodes";
import PincodeCreate from "./pages/PincodeCreate";
import PincodeEdit from "./pages/PincodeEdit";

import ActivityLogs from "./pages/ActivityLogs";

import AdPlatforms from "./pages/AdPlatforms";
import AdPlatformCreate from "./pages/AdPlatformCreate";
import AdPlatformEdit from "./pages/AdPlatformEdit";

import AdCampaigns from "./pages/AdCampaigns";
import AdCampaignCreate from "./pages/AdCampaignCreate";

import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import NotificationForm from "./pages/NotificationForm";
import CommonMaster from "./pages/CommonMaster";
import MyTickets from "./pages/MyTickets";
import ManageTickets from "./pages/ManageTickets";
import MyRequests from "./pages/MyRequests";
import ApprovalInbox from "./pages/ApprovalInbox";
import EmployeeLifecycle from "./pages/EmployeeLifecycle";
import EmailCenter from "./pages/EmailCenter";
import EmailView from "./pages/EmailView";
import ExpenseManagement from "./pages/ExpenseManagement";
import LeaveManagement from "./pages/LeaveManagement";



import PATHS from "./config/path.config";

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <EmailComposeProvider>
          <BrowserRouter>
            <Routes>
              {/* PUBLIC ROUTES */}

              <Route path={PATHS.HOME} element={<Home />} />

              <Route path={PATHS.LOGIN} element={<Login />} />

              <Route path={PATHS.REGISTER} element={<Register />} />

              {/* PROTECTED ROUTES */}

              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
              {/* DASHBOARD */}

              <Route path={PATHS.DASHBOARD} element={<Dashboard />} />

              {/* PROFILE */}

              <Route path={PATHS.PROFILE} element={<Profile />} />

              {/* CHAT */}

              <Route
                path={PATHS.CHAT}
                element={
                  <PermissionRoute permission="chat.view">
                    <Chat />
                  </PermissionRoute>
                }
              />

              {/* ADMINS */}

              <Route
                path={PATHS.ADMINS}
                element={
                  <PermissionRoute permission="admins.view">
                    <Admins />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.ADMIN_DETAILS}
                element={
                  <PermissionRoute permission="admins.view">
                    <AdminDetails />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.ADMIN_DETAILS_ALT}
                element={
                  <PermissionRoute permission="admins.view">
                    <AdminDetails />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.ADMIN_EDIT}
                element={
                  <PermissionRoute permission="admins.edit">
                    <AdminEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.ADMIN_EDIT_ALT}
                element={
                  <PermissionRoute permission="admins.edit">
                    <AdminEdit />
                  </PermissionRoute>
                }
              />

              {/* USERS */}

              <Route
                path={PATHS.USERS}
                element={
                  <PermissionRoute permission="users.view">
                    <Users />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.USER_CREATE}
                element={
                  <PermissionRoute permission="users.create">
                    <CreateUser />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.USER_IMPORT}
                element={
                  <PermissionRoute permission="users.import">
                    <UserImport />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.USER_EDIT}
                element={
                  <PermissionRoute permission="users.edit">
                    <AdminUserEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.USER_EDIT_ALT}
                element={
                  <PermissionRoute permission="users.edit">
                    <AdminUserEdit />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.USER_DETAILS}
                element={
                  <PermissionRoute permission="users.view">
                    <UserDetails />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.USER_DETAILS_ALT}
                element={
                  <PermissionRoute permission="users.view">
                    <UserDetails />
                  </PermissionRoute>
                }
              />

              {/* ROLES */}

              <Route
                path={PATHS.ROLES}
                element={
                  <PermissionRoute permission="roles.view">
                    <RolePermissions />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.ROLE_CREATE}
                element={
                  <PermissionRoute permission="roles.create">
                    <CreateRole />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.ROLE_DETAILS}
                element={
                  <PermissionRoute permission="roles.view">
                    <ViewRole />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.ROLE_DETAILS_ALT}
                element={
                  <PermissionRoute permission="roles.view">
                    <ViewRole />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.ROLE_EDIT}
                element={
                  <PermissionRoute permission="roles.edit">
                    <EditRole />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.ROLE_EDIT_ALT}
                element={
                  <PermissionRoute permission="roles.edit">
                    <EditRole />
                  </PermissionRoute>
                }
              />

              {/* COUNTRIES */}

              <Route
                path={PATHS.COUNTRY_CREATE}
                element={
                  <PermissionRoute permission="countries.create">
                    <CountryCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.COUNTRY_EDIT}
                element={
                  <PermissionRoute permission="countries.edit">
                    <CountryEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.COUNTRY_EDIT_ALT}
                element={
                  <PermissionRoute permission="countries.edit">
                    <CountryEdit />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.COUNTRIES}
                element={
                  <PermissionRoute permission="countries.view">
                    <Countries />
                  </PermissionRoute>
                }
              />

              {/* STATES */}

              <Route
                path={PATHS.STATE_CREATE}
                element={
                  <PermissionRoute permission="states.create">
                    <StateCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.STATE_EDIT}
                element={
                  <PermissionRoute permission="states.edit">
                    <StateEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.STATE_EDIT_ALT}
                element={
                  <PermissionRoute permission="states.edit">
                    <StateEdit />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.STATES}
                element={
                  <PermissionRoute permission="states.view">
                    <State />
                  </PermissionRoute>
                }
              />

              {/* CITIES */}

              <Route
                path={PATHS.CITY_CREATE}
                element={
                  <PermissionRoute permission="cities.create">
                    <CityCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.CITY_EDIT}
                element={
                  <PermissionRoute permission="cities.edit">
                    <CityEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.CITY_EDIT_ALT}
                element={
                  <PermissionRoute permission="cities.edit">
                    <CityEdit />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.CITIES}
                element={
                  <PermissionRoute permission="cities.view">
                    <Cities />
                  </PermissionRoute>
                }
              />

              {/* PINCODES */}

              <Route
                path={PATHS.PINCODE_CREATE}
                element={
                  <PermissionRoute permission="pincodes.create">
                    <PincodeCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.PINCODE_EDIT}
                element={
                  <PermissionRoute permission="pincodes.edit">
                    <PincodeEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.PINCODE_EDIT_ALT}
                element={
                  <PermissionRoute permission="pincodes.edit">
                    <PincodeEdit />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.PINCODES}
                element={
                  <PermissionRoute permission="pincodes.view">
                    <Pincodes />
                  </PermissionRoute>
                }
              />

              {/* ACTIVITY LOGS */}

              <Route
                path={PATHS.ACTIVITY_LOGS}
                element={
                  <PermissionRoute permission="activity_logs.view">
                    <ActivityLogs />
                  </PermissionRoute>
                }
              />

              {/* TASKS */}

              <Route
                path={PATHS.TASK_CREATE}
                element={
                  <PermissionRoute permission="tasks.create">
                    <TaskCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.TASK_EDIT}
                element={
                  <PermissionRoute permission="tasks.edit">
                    <TaskEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.TASK_EDIT_ALT}
                element={
                  <PermissionRoute permission="tasks.edit">
                    <TaskEdit />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.TASK_DETAILS}
                element={
                  <PermissionRoute permission="tasks.view">
                    <TaskDetails />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.TASK_DETAILS_ALT}
                element={
                  <PermissionRoute permission="tasks.view">
                    <TaskDetails />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.TASKS}
                element={
                  <PermissionRoute permission="tasks.view">
                    <Tasks />
                  </PermissionRoute>
                }
              />
              <Route
                path="/all-tasks"
                element={
                  <PermissionRoute permission="tasks.view">
                    <Tasks />
                  </PermissionRoute>
                }
              />

              {/* EMPLOYEE TASKS */}

              <Route
                path={PATHS.EMPLOYEE_TASKS}
                element={
                  <PermissionRoute permission="tasks.view">
                    <EmployeeTasks />
                  </PermissionRoute>
                }
              />
              <Route
                path="/my-tasks"
                element={
                  <PermissionRoute permission="tasks.view">
                    <EmployeeTasks />
                  </PermissionRoute>
                }
              />

              {/* TASK ANALYTICS */}

              <Route
                path={PATHS.TASK_ANALYTICS}
                element={
                  <PermissionRoute permission="task_analytics.view">
                    <TaskAnalytics />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.EMPLOYEE_TASK_ANALYTICS}
                element={
                  <PermissionRoute permission="task_analytics.view">
                    <EmployeeAnalytics />
                  </PermissionRoute>
                }
              />

              {/* AD PLATFORMS */}

              <Route
                path={PATHS.AD_PLATFORM_CREATE}
                element={
                  <PermissionRoute permission="ad_platforms.create">
                    <AdPlatformCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.AD_PLATFORM_EDIT}
                element={
                  <PermissionRoute permission="ad_platforms.edit">
                    <AdPlatformEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.AD_PLATFORM_EDIT_ALT}
                element={
                  <PermissionRoute permission="ad_platforms.edit">
                    <AdPlatformEdit />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.AD_PLATFORMS}
                element={
                  <PermissionRoute permission="ad_platforms.view">
                    <AdPlatforms />
                  </PermissionRoute>
                }
              />
              <Route
                path="/ads"
                element={
                  <PermissionRoute permission="ad_platforms.view">
                    <AdPlatforms />
                  </PermissionRoute>
                }
              />

              {/* AD CAMPAIGNS */}

              <Route
                path={PATHS.AD_CAMPAIGN_CREATE}
                element={
                  <PermissionRoute permission="ad_campaigns.create">
                    <AdCampaignCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.AD_CAMPAIGN_EDIT}
                element={
                  <PermissionRoute permission="ad_campaigns.edit">
                    <AdCampaignCreate />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.AD_CAMPAIGN_EDIT_ALT}
                element={
                  <PermissionRoute permission="ad_campaigns.edit">
                    <AdCampaignCreate />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.AD_CAMPAIGNS}
                element={
                  <PermissionRoute permission="ad_campaigns.view">
                    <AdCampaigns />
                  </PermissionRoute>
                }
              />
              {/* NOTIFICATIONS MANAGEMENT */}

              <Route
                path={PATHS.NOTIFICATIONS_MANAGEMENT}
                element={
                  <PermissionRoute permission="notifications.view">
                    <Notifications />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.NOTIFICATION_CREATE}
                element={
                  <PermissionRoute permission="notifications.create">
                    <NotificationForm />
                  </PermissionRoute>
                }
              />

              <Route
                path={PATHS.NOTIFICATION_EDIT}
                element={
                  <PermissionRoute permission="notifications.edit">
                    <NotificationForm />
                  </PermissionRoute>
                }
              />
              <Route
                path={PATHS.NOTIFICATION_EDIT_ALT}
                element={
                  <PermissionRoute permission="notifications.edit">
                    <NotificationForm />
                  </PermissionRoute>
                }
              />

              {/* COMMON MASTER */}
              <Route
                path={PATHS.COMMON_MASTER}
                element={<CommonMaster />}
              />

              {/* SUPPORT TICKETS */}
              <Route
                path={PATHS.MY_TICKETS}
                element={<MyTickets />}
              />
              <Route
                path={PATHS.MANAGE_TICKETS}
                element={<ManageTickets />}
              />

              {/* CONFIGURABLE APPROVAL WORKFLOW */}
              <Route
                path={PATHS.MY_REQUESTS}
                element={<MyRequests />}
              />
              <Route
                path={PATHS.APPROVAL_INBOX}
                element={<ApprovalInbox />}
              />
              <Route
                path={PATHS.DATABASE_APPROVALS}
                element={<ApprovalInbox />}
              />
              <Route
                path={PATHS.DATABASE_CHANGES}
                element={<ApprovalInbox />}
              />

              {/* EMPLOYEE LIFECYCLE MANAGEMENT */}
              <Route
                path={PATHS.LIFECYCLE}
                element={<EmployeeLifecycle />}
              />
              <Route
                path={PATHS.LIFECYCLE_TEMPLATES}
                element={<EmployeeLifecycle />}
              />

              {/* EMAIL CENTER / GMAIL SUITE */}
              <Route
                path={PATHS.EMAILS}
                element={<EmailCenter />}
              />
              <Route
                path={PATHS.EMAIL_VIEW}
                element={<EmailView />}
              />
              <Route
                path="/mail"
                element={<EmailCenter />}
              />
              <Route
                path="/mail/:id"
                element={<EmailView />}
              />
              <Route
                path="/mailbox"
                element={<EmailCenter />}
              />
              <Route
                path="/mailbox/:id"
                element={<EmailView />}
              />

              {/* EXPENSE REIMBURSEMENT MANAGEMENT */}
              <Route
                path={PATHS.EXPENSES}
                element={<ExpenseManagement />}
              />
              <Route
                path="/expenses"
                element={<ExpenseManagement />}
              />

              {/* LEAVE MANAGEMENT */}
              <Route
                path={PATHS.LEAVES}
                element={<LeaveManagement />}
              />
              <Route
                path={PATHS.LEAVES_MY_LEAVES}
                element={<LeaveManagement />}
              />
              <Route
                path={PATHS.LEAVES_CALENDAR}
                element={<LeaveManagement />}
              />
              <Route
                path={PATHS.LEAVES_AUDIT}
                element={<LeaveManagement />}
              />
              <Route
                path={PATHS.LEAVES_REQUESTS}
                element={<LeaveManagement />}
              />
              <Route
                path="/leaves/*"
                element={<LeaveManagement />}
              />
            </Route>

            {/* NOT FOUND */}

            <Route path={PATHS.NOT_FOUND} element={<NotFound />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </EmailComposeProvider>
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;
