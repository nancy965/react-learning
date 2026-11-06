import axios from "axios";
import { TICKET_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Create a new support ticket
 */
export const createTicket = async (ticketData) => {
  const response = await axios.post(
    `${TICKET_API_URL}/create`,
    ticketData,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get tickets created by logged-in user
 */
export const getMyTickets = async (params = {}) => {
  const response = await axios.get(
    `${TICKET_API_URL}/my-tickets`,
    {
      ...getAuthHeaders(),
      params,
    }
  );
  return response.data;
};

/**
 * Get all tickets (for admins)
 */
export const getAllTickets = async (params = {}) => {
  const response = await axios.get(
    `${TICKET_API_URL}/get-all`,
    {
      ...getAuthHeaders(),
      params,
    }
  );
  return response.data;
};

/**
 * Get single ticket details
 */
export const getTicketById = async (id) => {
  const response = await axios.get(
    `${TICKET_API_URL}/get/${id}`,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Update ticket status and optional resolution note / attachments
 */
export const updateTicketStatus = async (id, payload) => {
  const body = payload instanceof FormData ? payload : {
    status: payload?.status,
    resolution_note: payload?.resolution_note,
  };
  const response = await axios.patch(
    `${TICKET_API_URL}/update-status/${id}`,
    body,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Assign ticket to agent
 */
export const assignTicket = async (id, { assigned_to, priority, terminate_session, termination_reason }) => {
  const response = await axios.patch(
    `${TICKET_API_URL}/assign/${id}`,
    { assigned_to, priority, terminate_session, termination_reason },
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get available agents for assignment
 */
export const getAvailableAgents = async () => {
  const response = await axios.get(
    `${TICKET_API_URL}/agents`,
    getAuthHeaders()
  );
  return response.data;
};

/**
 * Get summary stats
 */
export const getTicketStats = async (params = {}) => {
  const response = await axios.get(
    `${TICKET_API_URL}/stats`,
    {
      ...getAuthHeaders(),
      params,
    }
  );
  return response.data;
};
