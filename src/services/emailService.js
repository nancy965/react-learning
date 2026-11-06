import axios from "axios";
import { EMAIL_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getEmails = async ({
  folder = "inbox",
  search = "",
  page = 1,
  limit = 20,
  filter = "all",
  searchFrom = "",
  searchTo = "",
  searchTime = "any",
  hasAttachment = false,
}) => {
  const params = { folder, search, page, limit, filter };
  if (searchFrom) params.searchFrom = searchFrom;
  if (searchTo) params.searchTo = searchTo;
  if (searchTime && searchTime !== "any") params.searchTime = searchTime;
  if (hasAttachment) params.hasAttachment = hasAttachment;

  const response = await axios.get(EMAIL_API_URL, {
    ...getAuthHeaders(),
    params,
  });
  return response.data;
};

export const getMailboxStats = async () => {
  const response = await axios.get(`${EMAIL_API_URL}/stats`, getAuthHeaders());
  return response.data;
};

export const getFilterContacts = async () => {
  const response = await axios.get(`${EMAIL_API_URL}/filter-contacts`, getAuthHeaders());
  return response.data;
};

export const getEmailById = async (id) => {
  const response = await axios.get(`${EMAIL_API_URL}/${id}`, getAuthHeaders());
  return response.data;
};

export const sendEmail = async (formData) => {
  const token = localStorage.getItem("token");
  const response = await axios.post(`${EMAIL_API_URL}/send`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const saveDraft = async (formData) => {
  const token = localStorage.getItem("token");
  const response = await axios.post(`${EMAIL_API_URL}/draft`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const toggleStar = async (id) => {
  const response = await axios.patch(`${EMAIL_API_URL}/${id}/star`, {}, getAuthHeaders());
  return response.data;
};

export const toggleRead = async (id, isRead) => {
  const response = await axios.patch(
    `${EMAIL_API_URL}/${id}/read`,
    { isRead },
    getAuthHeaders()
  );
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await axios.patch(`${EMAIL_API_URL}/mark-all-read`, {}, getAuthHeaders());
  return response.data;
};

export const archiveEmail = async (id, isArchived = true) => {
  const response = await axios.patch(
    `${EMAIL_API_URL}/${id}/archive`,
    { isArchived },
    getAuthHeaders()
  );
  return response.data;
};

export const bulkArchiveEmails = async (messageIds, isArchived = true) => {
  const response = await axios.patch(
    `${EMAIL_API_URL}/archive-bulk`,
    { messageIds, isArchived },
    getAuthHeaders()
  );
  return response.data;
};

export const moveToTrash = async (id) => {
  const response = await axios.patch(`${EMAIL_API_URL}/${id}/trash`, {}, getAuthHeaders());
  return response.data;
};

export const restoreFromTrash = async (id) => {
  const response = await axios.patch(`${EMAIL_API_URL}/${id}/restore`, {}, getAuthHeaders());
  return response.data;
};

export const deletePermanently = async (id) => {
  const response = await axios.delete(`${EMAIL_API_URL}/${id}`, getAuthHeaders());
  return response.data;
};

export const searchRecipients = async (query = "") => {
  const response = await axios.get(`${EMAIL_API_URL}/recipients/search`, {
    ...getAuthHeaders(),
    params: { q: query },
  });
  return response.data;
};

export const getTemplates = async () => {
  const response = await axios.get(`${EMAIL_API_URL}/templates`, getAuthHeaders());
  return response.data;
};

export const cancelScheduledEmail = async (id) => {
  const response = await axios.post(
    `${EMAIL_API_URL}/${id}/cancel-schedule`,
    {},
    getAuthHeaders()
  );
  return response.data;
};

export const snoozeEmail = async (id, snoozedUntil) => {
  const response = await axios.patch(
    `${EMAIL_API_URL}/${id}/snooze`,
    { snoozedUntil },
    getAuthHeaders()
  );
  return response.data;
};

export const unsnoozeEmail = async (id) => {
  const response = await axios.patch(
    `${EMAIL_API_URL}/${id}/unsnooze`,
    {},
    getAuthHeaders()
  );
  return response.data;
};
