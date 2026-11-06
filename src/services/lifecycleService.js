import axios from "axios";
import { LIFECYCLE_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Get dashboard KPI stats
 */
export const getLifecycleStats = async () => {
  const response = await axios.get(
    `${LIFECYCLE_API_URL}/stats`,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get eligible employees for selection
 */
export const getEligibleEmployees = async (type = "onboarding", search = "") => {
  const response = await axios.get(
    `${LIFECYCLE_API_URL}/eligible-employees`,
    {
      ...getAuthHeaders(),
      params: { type, search },
    }
  );
  return response.data;
};

/**
 * Get all templates
 */
export const getTemplates = async () => {
  const response = await axios.get(
    `${LIFECYCLE_API_URL}/templates`,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Create a new template
 */
export const createTemplate = async (templateData) => {
  const response = await axios.post(
    `${LIFECYCLE_API_URL}/templates`,
    templateData,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Launch onboarding or offboarding
 */
export const startLifecycle = async (data) => {
  const response = await axios.post(
    `${LIFECYCLE_API_URL}/records/start`,
    data,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get lifecycle records with filtering
 */
export const getLifecycleRecords = async (params = {}) => {
  const response = await axios.get(
    `${LIFECYCLE_API_URL}/records`,
    {
      ...getAuthHeaders(),
      params,
    }
  );
  return response.data;
};

/**
 * Get single record with checklist
 */
export const getLifecycleRecordById = async (id) => {
  const response = await axios.get(
    `${LIFECYCLE_API_URL}/records/${id}`,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Toggle checklist item completion
 */
export const toggleChecklistItem = async (itemId, isCompleted, notes = "") => {
  const response = await axios.patch(
    `${LIFECYCLE_API_URL}/items/${itemId}/toggle`,
    { isCompleted, notes },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Finalize & complete lifecycle process
 */
export const completeLifecycle = async (recordId) => {
  const response = await axios.post(
    `${LIFECYCLE_API_URL}/records/${recordId}/complete`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Cancel lifecycle workflow
 */
export const cancelLifecycle = async (recordId, reason) => {
  const response = await axios.post(
    `${LIFECYCLE_API_URL}/records/${recordId}/cancel`,
    { reason },
    getAuthHeaders()
  );
  return response.data;
};
