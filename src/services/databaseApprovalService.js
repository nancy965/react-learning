import axios from "axios";
import { DATABASE_APPROVAL_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Fetch list of database change requests with filters, search, and pagination
 */
export const getDatabaseChangeRequests = async (params = {}) => {
  const response = await axios.get(`${DATABASE_APPROVAL_API_URL}/all`, {
    ...getAuthHeaders(),
    params,
  });
  return response.data;
};

/**
 * Fetch summary stats for Database Changes
 */
export const getDatabaseChangeStats = async () => {
  const response = await axios.get(`${DATABASE_APPROVAL_API_URL}/stats`, getAuthHeaders());
  return response.data;
};

/**
 * Fetch details of a single database change request by ID or Code
 */
export const getDatabaseChangeById = async (id) => {
  const response = await axios.get(`${DATABASE_APPROVAL_API_URL}/get/${id}`, getAuthHeaders());
  return response.data;
};

/**
 * Submit a new database change approval request
 */
export const createDatabaseChangeRequest = async (changeData) => {
  const response = await axios.post(
    `${DATABASE_APPROVAL_API_URL}/create`,
    changeData,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Approve a database change request (executes live DB transaction)
 */
export const approveDatabaseChange = async (id, comment = "") => {
  const response = await axios.post(
    `${DATABASE_APPROVAL_API_URL}/approve/${id}`,
    { comment },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Reject a database change request
 */
export const rejectDatabaseChange = async (id, reason = "") => {
  const response = await axios.post(
    `${DATABASE_APPROVAL_API_URL}/reject/${id}`,
    { reason },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Rollback / Revert an approved database change back to old values
 */
export const rollbackDatabaseChange = async (id, rollbackReason = "") => {
  const response = await axios.post(
    `${DATABASE_APPROVAL_API_URL}/rollback/${id}`,
    { rollbackReason },
    getAuthHeaders()
  );
  return response.data;
};
