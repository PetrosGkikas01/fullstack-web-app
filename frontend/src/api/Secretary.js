import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api/secretary" });

export const loginSecretary = async (data) => {
  const res = await API.post("/login", data);
  return res.data;
};

export const importJSON = async (file) => {
  const token = localStorage.getItem("token");
  const form = new FormData();
  form.append("file", file);

  const res = await API.post("/import-json", form, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data; 
};
