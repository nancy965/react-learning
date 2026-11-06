
import axios from "axios";
import { STATE_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getStates = async (
  page,
  limit,
  search = "",
  status = "all",
  countryId = "all"
) => {
  const params = {};

  if (
    page !== undefined &&
    limit !== undefined
  ) {
    params.page = page;
    params.limit = limit;
    params.search = search;
    params.status = status;
    params.countryId = countryId;
  }

  const response = await axios.get(
    `${STATE_API_URL}/get-all`,
    {
      ...getAuthHeaders(),
      params,
    }
  );

  return response.data;
};

export const getStateById = async (id) => {
  const response = await axios.get(
    `${STATE_API_URL}/get/${id}`,
    getAuthHeaders()
  );

  return response.data;
};

export const createState = async (stateData) => {
  const response = await axios.post(
    `${STATE_API_URL}/create`,
    stateData,
    getAuthHeaders()
  );

  return response.data;
};

export const updateState = async (
  id,
  stateData
) => {
  const response = await axios.put(
    `${STATE_API_URL}/update/${id}`,
    stateData,
    getAuthHeaders()
  );

  return response.data;
};

export const deleteState = async (id) => {
  const response = await axios.delete(
    `${STATE_API_URL}/delete/${id}`,
    getAuthHeaders()
  );

  return response.data;
};

export const activateState = async (id) => {
  const response = await axios.patch(
    `${STATE_API_URL}/activate/${id}`,
    {},
    getAuthHeaders()
  );

  return response.data;
};
