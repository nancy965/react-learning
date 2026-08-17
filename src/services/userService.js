import axios from "axios";
const API_URL = "http://localhost:5000/users";

// Get all users
export const getUsers = async () => {
    const token = localStorage.getItem("token");
    console.log("Token being sent:", token);
    const response = await axios.get(API_URL, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
 
    return response;
};

// Get user by ID
export const getUserById = async (id) => {
    const token = localStorage.getItem("token");

    const response = await axios.get(
        `${API_URL}/${id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};

// Add user  
export const createUser = async (user) => {
    const token = localStorage.getItem("token");

    const response = await axios.post(
        API_URL,
        user,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};

// Update user
export const updateUser = async (id, user) => {
    const token = localStorage.getItem("token");

    const response = await axios.put(
        `${API_URL}/${id}`,
        user,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};

// Delete user
export const deleteUser = async (id) => {
    const token = localStorage.getItem("token");

    const response = await axios.delete(
        `${API_URL}/${id}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};

// Get current logged-in user
export const getCurrentUser = async () => {
    const token = localStorage.getItem("token");

    const response = await axios.get(
        "http://localhost:5000/auth/me",
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};