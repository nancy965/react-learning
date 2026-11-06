import axios from "axios";
import { AD_CAMPAIGN_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getAdCampaigns = () => {
  return axios.get(
    `${AD_CAMPAIGN_API_URL}/get-all`,
    getAuthHeaders(),
  );
};

export const getAdCampaignById = (id) => {
  return axios.get(
    `${AD_CAMPAIGN_API_URL}/get/${id}`,
    getAuthHeaders(),
  );
};

export const createAdCampaign = (campaignData) => {
  return axios.post(
    `${AD_CAMPAIGN_API_URL}/create`,
    campaignData,
    getAuthHeaders(),
  );
};