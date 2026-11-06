import axios from "axios";
import { ANALYTICS_API_URL } from "../config/axios.util";

export const getTaskAnalyticsOverview = async (
  token,
  dateRange,
  employeeId,
  taskType,
  status,
  customFrom,
  customTo,
) => {
  const response = await axios.get(
    `${ANALYTICS_API_URL}/overview`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        dateRange,
        employeeId,
        taskType,
        status,
        customFrom,
        customTo,
      },
    },
  );

  return response.data;
};

export const getOverdueTasksAnalytics = async (
  token,
  page,
  limit,
  search,
  filter,
  dateRange,
  employeeId,
  taskType,
  status,
  customFrom,
  customTo,
) => {
  const params = new URLSearchParams();

  params.append("page", page);
  params.append("limit", limit);

  if (search) params.append("search", search);
  if (filter) params.append("filter", filter);
  if (dateRange) params.append("dateRange", dateRange);
  if (employeeId) params.append("employeeId", employeeId);
  if (taskType) params.append("taskType", taskType);
  if (status) params.append("status", status);
  if (customFrom) params.append("customFrom", customFrom);
  if (customTo) params.append("customTo", customTo);

  const response = await fetch(
    `${ANALYTICS_API_URL}/overdue-tasks?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.json();
};

export const getTaskExplorer = async (
  token,
  page,
  limit,
  search,
  employeeId,
  taskType,
  status,
  dateRange,
  customFrom,
  customTo,
) => {
  const params = new URLSearchParams();

  params.append("page", page);
  params.append("limit", limit);

  if (search) params.append("search", search);
  if (employeeId) params.append("employeeId", employeeId);
  if (taskType) params.append("taskType", taskType);
  if (status) params.append("status", status);
  if (dateRange) params.append("dateRange", dateRange);
  if (customFrom) params.append("customFrom", customFrom);
  if (customTo) params.append("customTo", customTo);

  const response = await fetch(
    `${ANALYTICS_API_URL}/task-explorer?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.json();
};

export const exportTaskAnalytics = async (
  token,
  dateRange,
  employeeId,
  taskType,
  status,
  customFrom,
  customTo,
) => {
  const response = await axios.get(
    `${ANALYTICS_API_URL}/export`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        dateRange,
        employeeId,
        taskType,
        status,
        customFrom,
        customTo,
      },
      responseType: "blob",
    },
  );

  return response;
};