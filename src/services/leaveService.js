import axios from "axios";
import { LEAVE_API_URL } from "../config/axios.util";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Clean query params helper - filters out undefined, null, "", "undefined", "All", "all"
 */
const buildQuery = (params = {}) => {
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (
      v !== undefined &&
      v !== null &&
      v !== "" &&
      v !== "undefined" &&
      v !== "All" &&
      v !== "all"
    ) {
      clean[k] = v;
    }
  }
  const q = new URLSearchParams(clean).toString();
  return q ? `?${q}` : "";
};

/**
 * 1. Fetch all active leave types
 */
export const getLeaveTypes = async () => {
  const response = await axios.get(
    `${LEAVE_API_URL}/types`,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 2. Fetch company holidays for a given year
 */
export const getCompanyHolidays = async (year) => {
  const response = await axios.get(
    `${LEAVE_API_URL}/holidays${year ? `?year=${year}` : ""}`,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 3. Calculate working days between dates
 */
export const calculateWorkingDays = async (startDate, endDate) => {
  const response = await axios.post(
    `${LEAVE_API_URL}/calculate-days`,
    { startDate, endDate },
    getAuthConfig()
  );
  return response.data;
};

/**
 * 4. Fetch personal leave balances for current employee
 */
export const getMyLeaveBalances = async (year) => {
  const response = await axios.get(
    `${LEAVE_API_URL}/balances${year ? `?year=${year}` : ""}`,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 5. Fetch specific employee's leave balance (Admin view)
 */
export const getEmployeeLeaveBalances = async (employeeId, year) => {
  const response = await axios.get(
    `${LEAVE_API_URL}/balances/${employeeId}${year ? `?year=${year}` : ""}`,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 6. Check for overlapping leaves
 */
export const checkLeaveOverlap = async (startDate, endDate, excludeRequestId) => {
  const response = await axios.post(
    `${LEAVE_API_URL}/check-overlap`,
    { startDate, endDate, excludeRequestId },
    getAuthConfig()
  );
  return response.data;
};

/**
 * 7. Apply for a leave
 */
export const applyLeave = async (payload) => {
  const response = await axios.post(
    `${LEAVE_API_URL}/apply`,
    payload,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 8. Fetch current employee's leave request history
 */
export const getMyLeaveRequests = async (params = {}) => {
  const url = `${LEAVE_API_URL}/my-requests${buildQuery(params)}`;
  const response = await axios.get(url, getAuthConfig());
  return response.data;
};

/**
 * 9. Cancel a pending leave request
 */
export const cancelLeaveRequest = async (requestId) => {
  const response = await axios.patch(
    `${LEAVE_API_URL}/requests/${requestId}/cancel`,
    {},
    getAuthConfig()
  );
  return response.data;
};

/**
 * 10. Fetch single leave request details
 */
export const getLeaveRequestById = async (requestId) => {
  const response = await axios.get(
    `${LEAVE_API_URL}/requests/${requestId}`,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 11. Fetch leave transaction audit ledger
 */
export const getLeaveTransactions = async (params = {}) => {
  const url = `${LEAVE_API_URL}/transactions${buildQuery(params)}`;
  const response = await axios.get(url, getAuthConfig());
  return response.data;
};

/**
 * 12. Fetch all employee leave requests (Admin)
 */
export const getAdminLeaveRequests = async (params = {}) => {
  const url = `${LEAVE_API_URL}/admin/requests${buildQuery(params)}`;
  const response = await axios.get(url, getAuthConfig());
  return response.data;
};

/**
 * 13. Fetch leave statistics for Admin dashboard
 */
export const getAdminLeaveStats = async (year) => {
  const response = await axios.get(
    `${LEAVE_API_URL}/admin/stats${year ? `?year=${year}` : ""}`,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 14. Approve or reject an employee leave request (Admin)
 */
export const decideLeaveRequest = async (requestId, payload) => {
  const response = await axios.patch(
    `${LEAVE_API_URL}/admin/requests/${requestId}/decide`,
    payload,
    getAuthConfig()
  );
  return response.data;
};

/**
 * 15. Fetch Team Leave Calendar & Availability Matrix (Step 6)
 */
export const getTeamLeaveCalendar = async (params = {}) => {
  const url = `${LEAVE_API_URL}/calendar${buildQuery(params)}`;
  const response = await axios.get(url, getAuthConfig());
  return response.data;
};

/**
 * 16. Admin Adjust Employee Leave Balance (Step 4 & 5)
 */
export const adjustEmployeeLeaveBalance = async (payload) => {
  const response = await axios.post(
    `${LEAVE_API_URL}/admin/adjust-balance`,
    payload,
    getAuthConfig()
  );
  return response.data;
};
