import axios from "axios";
import API_URL from "../config/axios.util";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getProfile = async () => {
  const response = await axios.get(
    `${API_URL}/profile`,
    getAuthConfig()
  );

  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await axios.put(
    `${API_URL}/profile`,
    profileData,
    getAuthConfig()
  );

  return response.data;
};

export const changeProfilePassword = async (passwordData) => {
  const response = await axios.put(
    `${API_URL}/profile/change-password`,
    passwordData,
    getAuthConfig()
  );

  return response.data;
};