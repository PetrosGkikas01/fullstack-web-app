import axios from "axios";
const API = axios.create({ baseURL: "http://localhost:5000/api/secretary" });
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

export const loginSecretary = (data) => API.post("/login", data).then(r => r.data);
export const registerSecretary = (data) => API.post("/register", data).then(r => r.data);

export const importJSON = (token, file) => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/import-json", form, { headers: authHeader(token) }).then(r => r.data);
};

export const listTheses = (token) =>
  API.get("/theses", { headers: authHeader(token) }).then(r => r.data);

export const getThesisDetails = (token, id) =>
  API.get(`/theses/${id}`, { headers: authHeader(token) }).then(r => r.data);

export const setGSProtocol = (token, id, gs_protocol) =>
  API.patch(`/theses/${id}/gs-protocol`, { gs_protocol }, { headers: authHeader(token) }).then(r => r.data);

export const cancelThesis = (token, id, payload) =>
  API.post(`/theses/${id}/cancel`, payload, { headers: authHeader(token) }).then(r => r.data);

export const completeThesis = (token, id) =>
  API.post(`/theses/${id}/complete`, {}, { headers: authHeader(token) }).then(r => r.data);
