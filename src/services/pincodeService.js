import axios from "axios";
import { PINCODE_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getPincodes = async (
  page = 1,
  limit = 50,
  search = "",
  status = "all"
) => {
  const response = await axios.get(
    `${PINCODE_API_URL}/get-all`,
    {
      ...getAuthHeaders(),
      params: {
        page,
        limit,
        search,
        status,
      },
    }
  );

  return response.data;
};

export const getPincodeById = async (id) => {
  const response = await axios.get(
    `${PINCODE_API_URL}/get/${id}`,
    getAuthHeaders()
  );

  return response.data;
};

export const createPincode = async (pincodeData) => {
  const response = await axios.post(
    `${PINCODE_API_URL}/create`,
    pincodeData,
    getAuthHeaders()
  );

  return response.data;
};

export const updatePincode = async (id, pincodeData) => {
  const response = await axios.put(
    `${PINCODE_API_URL}/update/${id}`,
    pincodeData,
    getAuthHeaders()
  );

  return response.data;
};

export const deletePincode = async (id) => {
  const response = await axios.delete(
    `${PINCODE_API_URL}/delete/${id}`,
    getAuthHeaders()
  );

  return response.data;
};

export const activatePincode = async (id) => {
  const response = await axios.patch(
    `${PINCODE_API_URL}/activate/${id}`,
    {},
    getAuthHeaders()
  );

  return response.data;
};