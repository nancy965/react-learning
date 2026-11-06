
import axios from "axios";
import { AD_PLATFORM_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Get all ad platforms
export const getAdPlatforms = () => {
  return axios.get(
    `${AD_PLATFORM_API_URL}/get-all`,
    getAuthHeaders(),
  );
};

// Get ad platform by ID
export const getAdPlatformById = (id) => {
  return axios.get(
    `${AD_PLATFORM_API_URL}/get/${id}`,
    getAuthHeaders(),
  );
};

// Create ad platform
export const createAdPlatform = (platformData) => {
  return axios.post(
    `${AD_PLATFORM_API_URL}/create`,
    platformData,
    getAuthHeaders(),
  );
};

// Update ad platform
export const updateAdPlatform = (id, platformData) => {
  return axios.put(
    `${AD_PLATFORM_API_URL}/update/${id}`,
    platformData,
    getAuthHeaders(),
  );
};

// Delete ad platform
export const deleteAdPlatform = (id) => {
  return axios.delete(
    `${AD_PLATFORM_API_URL}/delete/${id}`,
    getAuthHeaders(),
  );
};

