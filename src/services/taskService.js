import axios from "axios";
import { TASK_API_URL } from "../config/axios.util";

// Get active employees for Assign To dropdown
export const getTaskEmployees = async (token) => {
  const response = await axios.get(`${TASK_API_URL}/employees`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Create Task
export const createTask = async (taskData, token) => {
  const response = await axios.post(`${TASK_API_URL}/create`, taskData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Find all tasks with pagination and filters
export const getTasks = async (
  token,
  page = 1,
  limit = 5,
  status = "",
  employeeId = "",
  taskType = "",
  search = "",
  dateRange = "",
  customFrom = "",
  customTo = "",
) => {
  const response = await axios.get(`${TASK_API_URL}/get-all`, {
    params: {
      page,
      limit,
      status,
      employeeId,
      taskType,
      search,
      dateRange,
      customFrom,
      customTo,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get task by ID
export const getTaskById = async (taskId, token) => {
  const response = await axios.get(`${TASK_API_URL}/get/${taskId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get Employee Tasks
export const getMyTasks = async (
  token,
  page = 1,
  limit = 5,
  search = "",
  status = "",
) => {
  const response = await axios.get(`${TASK_API_URL}/my-tasks`, {
    params: {
      page,
      limit,
      search,
      status,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get Task Logs
export const getTaskLogs = async (taskId, token) => {
  const response = await axios.get(`${TASK_API_URL}/get/${taskId}/logs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Start Task
export const startTask = async (taskId, token) => {
  const response = await axios.patch(
    `${TASK_API_URL}/start/${taskId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// End Task
export const endTask = async (taskId, token) => {
  const response = await axios.patch(
    `${TASK_API_URL}/end/${taskId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// Update Task
export const updateTask = async (taskId, taskData, token) => {
  const response = await axios.put(
    `${TASK_API_URL}/update/${taskId}`,
    taskData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// Delete Task
export const deleteTask = async (taskId, token) => {
  const response = await axios.delete(`${TASK_API_URL}/delete/${taskId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

export const startTrackingSession = async (taskId, token) => {
  const authToken = token || localStorage.getItem("token");
  const response = await axios.post(
    `${TASK_API_URL}/${taskId}/tracking/start`,
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );

  return response.data;
};

export const endTrackingSession = async (
  taskId,
  sessionId,
  workSummary,
  token,
) => {
  const authToken = token || localStorage.getItem("token");
  const response = await axios.post(
    `${TASK_API_URL}/${taskId}/tracking/${sessionId}/end`,
    { workSummary },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );

  return response.data;
};

export const getActiveTrackingSession = async (token) => {
  const authToken = token || localStorage.getItem("token");
  const response = await axios.get(`${TASK_API_URL}/tracking/active`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return response.data;
};

export const getTrackingSessionHistory = async (taskId, token) => {
  const authToken = token || localStorage.getItem("token");
  const response = await axios.get(
    `${TASK_API_URL}/${taskId}/tracking/history`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );

  return response.data;
};

// Get task dependencies
export const getTaskDependencies = async (taskId, token) => {
  const authToken = token || localStorage.getItem("token");
  const response = await axios.get(`${TASK_API_URL}/${taskId}/dependencies`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return response.data;
};

// Set task dependencies
export const setTaskDependencies = async (taskId, dependsOnTaskIds, token) => {
  const authToken = token || localStorage.getItem("token");
  const response = await axios.post(
    `${TASK_API_URL}/${taskId}/dependencies`,
    { dependsOnTaskIds },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );

  return response.data;
};

// Get Critical Path data
export const getCriticalPath = async (token, params = {}) => {
  const authToken = token || localStorage.getItem("token");
  const response = await axios.get(`${TASK_API_URL}/critical-path`, {
    params,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return response.data;
};

