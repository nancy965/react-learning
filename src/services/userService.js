import axios from "axios";
import API_URL from "../config/axios.util";

// Get all users
export const getUsers = async (
  page = 1,
  limit = 5,
  status = "",
  search = "",
) => {
  const token = localStorage.getItem("token");

  const params = { page, limit };

  if (status && status !== "all") {
    params.status = status;
  }

  if (search && search.trim()) {
    params.search = search.trim();
  }

  const response = await axios.get(`${API_URL}/users/get-all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });

  return response;
};

// Get user by ID
export const getUserById = async (id) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/users/get/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Add user
export const createUser = async (user) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(`${API_URL}/users/create`, user, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Bulk upload employees from Excel
export const bulkCreateUsers = async (file) => {
  const token = localStorage.getItem("token");

  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(
    `${API_URL}/users/bulk-create`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Update user / employee
export const updateUser = async (id, user) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(`${API_URL}/users/update/${id}`, user, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Delete user / employee
export const deleteUser = async (id) => {
  const token = localStorage.getItem("token");

  const response = await axios.delete(`${API_URL}/users/delete/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get current user
export const getCurrentUser = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get all admins
export const getAdmins = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/users/admins/get-all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Update admin
export const updateAdmin = async (id, admin) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_URL}/users/admins/update/${id}`,
    admin,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Delete admin
export const deleteAdmin = async (id) => {
  const token = localStorage.getItem("token");

  const response = await axios.delete(
    `${API_URL}/users/admins/delete/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Get countries
export const getCountries = async (
  page = 1,
  limit = 50,
  search = ""
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/countries/active`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return response.data;
};

// Get all states
export const getStates = async (
  page = 1,
  limit = 50,
  search = "",
  status = "all",
  countryId = "all"
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/states/get-all`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
        status,
        countryId,
      },
    }
  );

  return response.data;
};

// Get states by country
export const getStatesByCountry = async (
  countryId,
  page = 1,
  limit = 50,
  search = ""
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/states/by-country/${countryId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return response.data;
};

// Get state location
export const getStateLocation = async (state) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/states/lookup/${encodeURIComponent(state)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Get all cities
export const getCities = async (
  page = 1,
  limit = 50,
  search = "",
  status = "all"
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/cities/get-all`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

// Get cities by country
export const getCitiesByCountry = async (
  countryId,
  page = 1,
  limit = 50,
  search = ""
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/cities/by-country/${countryId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return response.data;
};

// Get cities by state
export const getCitiesByState = async (
  stateId,
  page = 1,
  limit = 50,
  search = ""
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/cities/by-state/${stateId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return response.data;
};

// Get city location
export const getCityLocation = async (city) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/cities/lookup/${encodeURIComponent(city)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Get all pincodes
export const getPincodes = async (
  page = 1,
  limit = 50,
  search = "",
  status = "all"
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/pincodes/get-all`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

// Get pincodes by city
export const getPincodesByCity = async (
  cityId,
  page = 1,
  limit = 50,
  search = ""
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/pincodes/by-city/${cityId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return response.data;
};

// Get pincode location
export const getPincodeLocation = async (pincode) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/pincodes/lookup/${pincode}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// Get pincodes by state
export const getPincodesByState = async (
  stateId,
  page = 1,
  limit = 50,
  search = ""
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/pincodes/by-state/${stateId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return response.data;
};

// Get pincodes by country
export const getPincodesByCountry = async (
  countryId,
  page = 1,
  limit = 50,
  search = ""
) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/pincodes/by-country/${countryId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        page,
        limit,
        search,
      },
    }
  );

  return response.data;
};

// Get user permissions
export const getUserPermissions = async (userId) => {
  const token = localStorage.getItem("token");

  return axios.get(
    `${API_URL}/user-permissions/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

// Save user permissions
export const saveUserPermissions = async (
  userId,
  permissions
) => {
  const token = localStorage.getItem("token");

  return axios.put(
    `${API_URL}/user-permissions/update/${userId}`,
    {
      permissions,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

// Get custom roles
export const getRoles = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/role-permissions/roles`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};