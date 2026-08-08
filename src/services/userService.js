import axios from "axios";

const API_URL = "http://localhost:5000/users";

export const getUsers = () => {
    return axios.get(API_URL);
    
};

export const addUser = (user) => {
    return axios.post(API_URL,user);
};