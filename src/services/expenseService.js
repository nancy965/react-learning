import axios from "axios";
import API_URL from "../config/axios.util";

const getAuthConfig = (isMultipart = false) => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isMultipart ? { "Content-Type": "multipart/form-data" } : {}),
    },
  };
};

export const getExpenseCategories = async () => {
  const res = await axios.get(`${API_URL}/expenses/categories`, getAuthConfig());
  return res.data;
};

export const updateCategoryLimits = async (id, payload) => {
  const res = await axios.put(`${API_URL}/expenses/categories/${id}`, payload, getAuthConfig());
  return res.data;
};

export const getExpenseStats = async (scope = "all") => {
  const res = await axios.get(`${API_URL}/expenses/stats?scope=${scope}`, getAuthConfig());
  return res.data;
};

export const getExpenseClaims = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.category_id) query.append("category_id", params.category_id);
  if (params.search) query.append("search", params.search);
  if (params.scope) query.append("scope", params.scope);
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);
  if (params.tab) query.append("tab", params.tab);

  const res = await axios.get(`${API_URL}/expenses/claims?${query.toString()}`, getAuthConfig());
  return res.data;
};

export const getExpenseClaimById = async (id) => {
  const res = await axios.get(`${API_URL}/expenses/claims/${id}`, getAuthConfig());
  return res.data;
};

export const createExpenseClaim = async (formData) => {
  const res = await axios.post(`${API_URL}/expenses/claims`, formData, getAuthConfig(true));
  return res.data;
};

export const approveExpenseClaim = async (id, payload) => {
  const res = await axios.patch(`${API_URL}/expenses/claims/${id}/approve`, payload, getAuthConfig());
  return res.data;
};

export const rejectExpenseClaim = async (id, payload) => {
  const res = await axios.patch(`${API_URL}/expenses/claims/${id}/reject`, payload, getAuthConfig());
  return res.data;
};

export const settleExpenseClaim = async (id, payload) => {
  const res = await axios.patch(`${API_URL}/expenses/claims/${id}/settle`, payload, getAuthConfig());
  return res.data;
};

export const initiateInstantPayout = async (id, payload = {}) => {
  const res = await axios.post(`${API_URL}/expenses/claims/${id}/instant-payout`, payload, getAuthConfig());
  return res.data;
};

export const getMyBankDetails = async () => {
  const res = await axios.get(`${API_URL}/expenses/bank-details`, getAuthConfig());
  return res.data;
};

export const saveMyBankDetails = async (payload) => {
  const res = await axios.post(`${API_URL}/expenses/bank-details`, payload, getAuthConfig());
  return res.data;
};

export const getEmployeeBankDetailsById = async (employeeId) => {
  const res = await axios.get(`${API_URL}/expenses/bank-details/${employeeId}`, getAuthConfig());
  return res.data;
};

export const deleteExpenseClaim = async (id) => {
  const res = await axios.delete(`${API_URL}/expenses/claims/${id}`, getAuthConfig());
  return res.data;
};

