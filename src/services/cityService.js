import axios from "axios";
import { CITY_API_URL } from "../config/axios.util";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getCities = async (
  page = 1,
  limit = 50,
  search = "",
  status = "all"
) => {
  const response = await axios.get(
    `${CITY_API_URL}/get-all`,
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

export const getCityById = async (id) => {
  const response = await axios.get(
    `${CITY_API_URL}/get/${id}`,
    getAuthHeaders()
  );

  return response.data;
};

export const createCity = async (cityData) => {
  const response = await axios.post(
    `${CITY_API_URL}/create`,
    cityData,
    getAuthHeaders()
  );

  return response.data;
};

export const updateCity = async (id, cityData) => {
  const response = await axios.put(
    `${CITY_API_URL}/update/${id}`,
    cityData,
    getAuthHeaders()
  );

  return response.data;
};

export const deleteCity = async (id) => {
  const response = await axios.delete(
    `${CITY_API_URL}/delete/${id}`,
    getAuthHeaders()
  );

  return response.data;
};

export const activateCity = async (id) => {
  const response = await axios.patch(
    `${CITY_API_URL}/activate/${id}`,
    {},
    getAuthHeaders()
  );

  return response.data;
};