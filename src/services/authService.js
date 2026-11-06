import axios from "axios";
import { AUTH_API_URL } from "../config/axios.util";

export const loginUser = async (user) => {
  const response = await axios.post(
    `${AUTH_API_URL}/login`,
    user
  );

  return response.data;
};