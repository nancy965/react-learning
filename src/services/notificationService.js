import axios from "axios";
import { NOTIFICATION_API_URL } from "../config/axios.util";

// ─── Helper: reads token from localStorage (consistent with other services) ──
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ─── Employee & Admin bell notifications ──────────────────────────────────────

export const getAdminNotifications = async () => {
  const response = await axios.get(`${NOTIFICATION_API_URL}/admin`, getAuthHeaders());
  return response.data;
};

export const getEmployeeNotifications = async () => {
  const response = await axios.get(`${NOTIFICATION_API_URL}/employee`, getAuthHeaders());
  return response.data;
};

export const getAdminNotificationById = async (id) => {
  const response = await axios.get(`${NOTIFICATION_API_URL}/admin/${id}`, getAuthHeaders());
  return response.data;
};

export const getEmployeeNotificationById = async (id) => {
  const response = await axios.get(`${NOTIFICATION_API_URL}/employee/${id}`, getAuthHeaders());
  return response.data;
};

export const markAllAdminNotificationsAsRead = async () => {
  const response = await axios.patch(
    `${NOTIFICATION_API_URL}/admin/mark-all-read`,
    {},
    getAuthHeaders(),
  );
  return response.data;
};

export const markAllEmployeeNotificationsAsRead = async () => {
  const response = await axios.patch(
    `${NOTIFICATION_API_URL}/employee/mark-all-read`,
    {},
    getAuthHeaders(),
  );
  return response.data;
};

// ─── Notification Management (admin menu submenu) ─────────────────────────────

export const getManagementNotifications = async (params = {}) => {
  const auth = getAuthHeaders();
  const response = await axios.get(
    `${NOTIFICATION_API_URL}/management`,
    {
      headers: auth.headers,
      params,
    },
  );
  return response.data;
};

export const getManagementRecipients = async () => {
  const response = await axios.get(
    `${NOTIFICATION_API_URL}/management/recipients`,
    getAuthHeaders(),
  );
  return response.data;
};

export const getManagementNotificationById = async (id) => {
  const response = await axios.get(
    `${NOTIFICATION_API_URL}/management/${id}`,
    getAuthHeaders(),
  );
  return response.data;
};

export const createManagementNotification = async (data) => {
  const response = await axios.post(
    `${NOTIFICATION_API_URL}/management`,
    data,
    getAuthHeaders(),
  );
  return response.data;
};

export const updateManagementNotification = async (id, data) => {
  const response = await axios.put(
    `${NOTIFICATION_API_URL}/management/${id}`,
    data,
    getAuthHeaders(),
  );
  return response.data;
};

export const deleteManagementNotification = async (id) => {
  const response = await axios.delete(
    `${NOTIFICATION_API_URL}/management/${id}`,
    getAuthHeaders(),
  );
  return response.data;
};

export const sendManagementNotification = async (id) => {
  const response = await axios.post(
    `${NOTIFICATION_API_URL}/management/${id}/send`,
    {},
    getAuthHeaders(),
  );
  return response.data;
};
