import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/student",
});

export const registerStudent = async (data) => {
  const res = await API.post("/register", data);
  return res.data;
};

export const loginStudent = async (data) => {
  const res = await API.post("/login", data);
  return res.data;
};