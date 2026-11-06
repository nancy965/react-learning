import axios from "axios";
import { SEARCH_API_URL } from "../config/axios.util";

const getAuthConfig = (tokenOverride) => {
  const token = tokenOverride || localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const searchGlobal = async (query, tokenOverride) => {
  const trimmed = String(query || "").trim();
  if (!trimmed) {
    return {
      success: true,
      data: {
        users: [],
        tasks: [],
        chats: [],
        notifications: [],
        totalCount: 0,
      },
    };
  }

  const response = await axios.get(`${SEARCH_API_URL}/global`, {
    ...getAuthConfig(tokenOverride),
    params: { q: trimmed },
  });

  return response.data;
};
