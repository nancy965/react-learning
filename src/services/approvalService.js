import axios from "axios";
import { APPROVAL_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Submit a new approval request (FormData or JSON)
 */
export const createApprovalRequest = async (requestData) => {
  const response = await axios.post(
    `${APPROVAL_API_URL}/create`,
    requestData,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get requests submitted by the logged-in user
 */
export const getMyApprovalRequests = async (params = {}) => {
  const response = await axios.get(
    `${APPROVAL_API_URL}/my-requests`,
    {
      ...getAuthHeaders(),
      params,
    }
  );
  return response.data;
};

/**
 * Get requests for approver inbox (action required, all, history)
 */
export const getApprovalInbox = async (params = {}) => {
  const response = await axios.get(
    `${APPROVAL_API_URL}/inbox`,
    {
      ...getAuthHeaders(),
      params,
    }
  );
  return response.data;
};

/**
 * Get full details of a single request
 */
export const getApprovalRequestById = async (id) => {
  const response = await axios.get(
    `${APPROVAL_API_URL}/get/${id}`,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Process approval decision (Approve / Reject)
 */
export const processApprovalDecision = async (id, decisionData) => {
  const response = await axios.post(
    `${APPROVAL_API_URL}/decide/${id}`,
    decisionData,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Cancel a pending request
 */
export const cancelApprovalRequest = async (id) => {
  const response = await axios.post(
    `${APPROVAL_API_URL}/cancel/${id}`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get approval statistics for KPI cards
 */
export const getApprovalStats = async () => {
  const response = await axios.get(
    `${APPROVAL_API_URL}/stats`,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get approval rules (for request types and steps definition)
 */
export const getApprovalRules = async () => {
  const response = await axios.get(
    `${APPROVAL_API_URL}/rules`,
    getAuthHeaders()
  );
  return response.data;
};
