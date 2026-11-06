
import axios from "axios";
import { COUNTRY_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getCountries = (
  page,
  limit,
  search = "",
  status = "all"
) => {
  const params = {};

  if (page !== undefined && limit !== undefined) {
    params.page = page;
    params.limit = limit;
    params.search = search;
    params.status = status;
  }

  return axios.get(
    `${COUNTRY_API_URL}/get-all`,
    {
      ...getAuthHeaders(),
      params,
    }
  );
};

export const getCountryById = (id) => {
  return axios.get(
    `${COUNTRY_API_URL}/get/${id}`,
    getAuthHeaders()
  );
};

export const createCountry = (countryData) => {
  return axios.post(
    `${COUNTRY_API_URL}/create`,
    countryData,
    getAuthHeaders()
  );
};

export const updateCountry = (
  id,
  countryData
) => {
  return axios.put(
    `${COUNTRY_API_URL}/update/${id}`,
    countryData,
    getAuthHeaders()
  );
};

export const deleteCountry = (id) => {
  return axios.delete(
    `${COUNTRY_API_URL}/delete/${id}`,
    getAuthHeaders()
  );
};

export const activateCountry = (id) => {
  return axios.patch(
    `${COUNTRY_API_URL}/activate/${id}`,
    {},
    getAuthHeaders()
  );
};

