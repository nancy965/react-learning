import axios from "axios";
import { COMMON_MASTER_API_URL } from "../config/axios.util";

const getAuthHeaders = (tokenOverride) => {
  const token = tokenOverride || localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Fetch all master records
 */
export const getAllCommonMaster = async (tokenOverride) => {
  const response = await axios.get(
    `${COMMON_MASTER_API_URL}/get-all`,
    getAuthHeaders(tokenOverride)
  );
  return response.data;
};

/**
 * Fetch master records by type (e.g., 'task_type' or 'task_frequency')
 */
export const getCommonMasterByType = async (type, tokenOverride) => {
  const response = await axios.get(
    `${COMMON_MASTER_API_URL}/by-type/${type}`,
    getAuthHeaders(tokenOverride)
  );
  return response.data;
};

/**
 * Add a new master record
 */
export const createCommonMaster = async ({ type, name }, tokenOverride) => {
  const response = await axios.post(
    `${COMMON_MASTER_API_URL}/create`,
    { type, name },
    getAuthHeaders(tokenOverride)
  );
  return response.data;
};

/**
 * Update an existing master record (propagates rename across DB tables)
 */
export const updateCommonMaster = async (id, { name }, tokenOverride) => {
  const response = await axios.put(
    `${COMMON_MASTER_API_URL}/update/${id}`,
    { name },
    getAuthHeaders(tokenOverride)
  );
  return response.data;
};

/**
 * Delete a master record (validates that it is not currently in use)
 */
export const deleteCommonMaster = async (id, tokenOverride) => {
  const response = await axios.delete(
    `${COMMON_MASTER_API_URL}/delete/${id}`,
    getAuthHeaders(tokenOverride)
  );
  return response.data;
};

/**
 * Toggle active status of a master record
 */
export const toggleCommonMasterStatus = async (id, tokenOverride) => {
  const response = await axios.patch(
    `${COMMON_MASTER_API_URL}/toggle/${id}`,
    {},
    getAuthHeaders(tokenOverride)
  );
  return response.data;
};
