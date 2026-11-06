import axios from "axios";
import { ACTIVITY_LOG_API_URL } from "../config/axios.util";

export const getActivityLogs = async (token) => {
  const response = await axios.get(`${ACTIVITY_LOG_API_URL}/get-all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};