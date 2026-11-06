import axios from "axios";
import { API_URL } from "../config/axios.util";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getDashboardStats = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/dashboard/stats`, {
    ...getAuthConfig(),
    params: {
      status: filters.status || "all",
      search: filters.search || "",
      role: filters.role || "all",
      permissionRole: filters.permissionRole || "all",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      newThisMonth: filters.newThisMonth || false,
      adminId: filters.adminId || "",
      employeeId: filters.employeeId || "",
    },
  });

  return response.data;
};

export const getDashboardUsers = async (page = 1, limit = 8, filters = {}) => {
  const response = await axios.get(`${API_URL}/dashboard/users`, {
    ...getAuthConfig(),
    params: {
      page,
      limit,
      status: filters.status || "all",
      search: filters.search || "",
      role: filters.role || "all",
      permissionRole: filters.permissionRole || "all",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      newThisMonth: filters.newThisMonth || false,
      adminId: filters.adminId || "",
      employeeId: filters.employeeId || "",
    },
  });

  return response.data;
};

export const exportDashboardUsers = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/dashboard/users/export`, {
    ...getAuthConfig(),
    params: {
      status: filters.status || "all",
      search: filters.search || "",
      role: filters.role || "all",
      permissionRole: filters.permissionRole || "all",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      newThisMonth: filters.newThisMonth || false,
      adminId: filters.adminId || "",
      employeeId: filters.employeeId || "",
    },
    responseType: "blob",
  });

  return response;
};

export const getRecentActivity = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/dashboard/recent-activity`, {
    ...getAuthConfig(),
    params: {
      status: filters.status || "all",
      search: filters.search || "",
      role: filters.role || "all",
      permissionRole: filters.permissionRole || "all",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      newThisMonth: filters.newThisMonth || false,
      adminId: filters.adminId || "",
      employeeId: filters.employeeId || "",
    },
  });

  return response.data;
};

export const getNeedsAttention = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/dashboard/needs-attention`, {
    ...getAuthConfig(),
    params: {
      status: filters.status || "all",
      search: filters.search || "",
      role: filters.role || "all",
      permissionRole: filters.permissionRole || "all",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      newThisMonth: filters.newThisMonth || false,
      adminId: filters.adminId || "",
      employeeId: filters.employeeId || "",
    },
  });

  return response.data;
};

export const getSystemHealth = async () => {
  const response = await axios.get(
    `${API_URL}/dashboard/system-health`,
    getAuthConfig(),
  );

  return response.data;
};

export const getPermissionCoverage = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/dashboard/permission-coverage`, {
    ...getAuthConfig(),
    params: {
      status: filters.status || "all",
      search: filters.search || "",
      role: filters.role || "all",
      permissionRole: filters.permissionRole || "all",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      newThisMonth: filters.newThisMonth || false,
      adminId: filters.adminId || "",
      employeeId: filters.employeeId || "",
    },
  });

  return response.data;
};

export const getDashboardOverview = async (
  filters = {},
  page = 1,
  limit = 5,
) => {
  const response = await axios.get(`${API_URL}/dashboard/overview`, {
    ...getAuthConfig(),
    params: {
      page,
      limit,
      status: filters.status || "all",
      search: filters.search || "",
      role: filters.role || "all",
      permissionRole: filters.permissionRole || "all",
      fromDate: filters.fromDate || "",
      toDate: filters.toDate || "",
      newThisMonth: filters.newThisMonth || false,
      adminId: filters.adminId || "",
      employeeId: filters.employeeId || "",
    },
  });

  return response.data;
};

export const getSmartUserInsights = async (filters = {}) => {
  const response = await axios.get(`${API_URL}/dashboard/smart-insights`, {
    ...getAuthConfig(),
    params: {
      ...filters,
      limit: filters.limit || 5,
    },
  });

  return response.data;
};

export const getUserActivityHistory = async (userId) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/activity-logs/${userId}/history`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
