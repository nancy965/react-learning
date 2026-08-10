import axios from "axios";
const API_URL = "http://localhost:5000/users";

// Get all users
export const getUsers = async () => {
    const response = await axios.get(API_URL);
    return response;
};

// Add user
export const addUser = async (user) => {
    const response = await axios.post(API_URL, user);
    return response.data;
};

// Update user
export const updateUser = async (id, user) => {
    const response = await axios.put(`${API_URL}/${id}`, user);
    return response.data;
};

// Delete user
export const deleteUser = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};
