
import axios from "axios";
import API_URL from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getConversations = async () => {
  return axios.get(
    `${API_URL}/chat/conversations`,
    getAuthHeaders(),
  );
};

export const createConversation = async (employeeId) => {
  return axios.post(
    `${API_URL}/chat/conversations`,
    { employeeId },
    getAuthHeaders(),
  );
};

export const getMessages = async (conversationId) => {
  return axios.get(
    `${API_URL}/chat/conversations/${conversationId}/messages`,
    getAuthHeaders(),
  );
};

export const sendMessage = async (conversationId, message) => {
  return axios.post(
    `${API_URL}/chat/conversations/${conversationId}/messages`,
    { message },
    getAuthHeaders(),
  );
};

export const markMessagesAsRead = async (conversationId) => {
  return axios.put(
    `${API_URL}/chat/conversations/${conversationId}/read`,
    {},
    getAuthHeaders(),
  );
};

export const getChatEmployees = async () => {
  return axios.get(
    `${API_URL}/chat/employees`,
    getAuthHeaders(),
  );
};

export const getPresence = async () => {
  return axios.get(
    `${API_URL}/chat/presence`,
    getAuthHeaders(),
  );
};

export const editMessage = async (messageId, message) => {
  return axios.put(
    `${API_URL}/chat/messages/${messageId}`,
    { message },
    getAuthHeaders(),
  );
};

export const deleteMessage = async (messageId) => {
  return axios.delete(
    `${API_URL}/chat/messages/${messageId}`,
    getAuthHeaders(),
  );
};

export const createGroup = async (groupData) => {
  return axios.post(
    `${API_URL}/chat/groups`,
    groupData,
    getAuthHeaders(),
  );
};

export const uploadChatFile = async (formData) => {
  const auth = getAuthHeaders();
  return axios.post(
    `${API_URL}/chat/upload`,
    formData,
    {
      headers: {
        ...auth.headers,
        "Content-Type": "multipart/form-data",
      },
    },
  );
};

export const getGroupDetails = async (groupId) => {
  return axios.get(
    `${API_URL}/chat/groups/${groupId}`,
    getAuthHeaders(),
  );
};

export const updateGroup = async (groupId, data) => {
  return axios.put(
    `${API_URL}/chat/groups/${groupId}`,
    data,
    getAuthHeaders(),
  );
};

export const addGroupMembers = async (groupId, memberIds) => {
  return axios.post(
    `${API_URL}/chat/groups/${groupId}/members`,
    { memberIds },
    getAuthHeaders(),
  );
};

export const removeGroupMember = async (groupId, memberId) => {
  return axios.delete(
    `${API_URL}/chat/groups/${groupId}/members/${memberId}`,
    getAuthHeaders(),
  );
};

export const deleteGroup = async (groupId) => {
  return axios.delete(
    `${API_URL}/chat/groups/${groupId}`,
    getAuthHeaders(),
  );
};

export const toggleMessageReaction = async (messageId, emoji, userName) => {
  return axios.post(
    `${API_URL}/chat/messages/${messageId}/react`,
    { emoji, userName },
    getAuthHeaders(),
  );
};
