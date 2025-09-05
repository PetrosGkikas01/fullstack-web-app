// src/api/Student.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/student",
});

// helper για token header
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// --------- Auth ----------
export const registerStudent = async (data) => {
  const res = await API.post("/register", data);
  return res.data;
};

export const loginStudent = async (data) => {
  const res = await API.post("/login", data);
  return res.data;
};

// --------- Profile ----------
export const updateProfile = async (token, data) => {
  const res = await API.put("/update-profile", data, { headers: authHeader(token) });
  return res.data;
};

export const getMe = async (token) => {
  const res = await API.get("/me", { headers: authHeader(token) });
  return res.data;
};

// --------- Committee (Υπό ανάθεση) ----------
export const listProfessorsForCommittee = async (token) => {
  const res = await API.get("/committee/professors", { headers: authHeader(token) });
  return res.data;
};

export const listCommittee = async (token) => {
  const res = await API.get("/committee", { headers: authHeader(token) });
  return res.data;
};

export const inviteProfessor = async (token, professor_id) => {
  const res = await API.post("/committee/invite", { professor_id }, { headers: authHeader(token) });
  return res.data;
};

export const cancelInvitation = async (token, id) => {
  const res = await API.delete(`/committee/${id}`, { headers: authHeader(token) });
  return res.data;
};

// --------- Υπό εξέταση ----------
export const uploadDraft = async (token, thesisId, file) => {
  const form = new FormData();
  form.append("draft", file);
  const res = await API.post(`/theses/${thesisId}/draft`, form, { headers: authHeader(token) });
  return res.data;
};

export const addMaterialLink = async (token, thesisId, url) => {
  const res = await API.post(`/theses/${thesisId}/materials/link`, { url }, { headers: authHeader(token) });
  return res.data;
};

export const listMaterials = async (token, thesisId) => {
  const res = await API.get(`/theses/${thesisId}/materials`, { headers: authHeader(token) });
  return res.data;
};

export const setPresentation = async (token, thesisId, payload) => {
  const res = await API.post(`/theses/${thesisId}/presentation`, payload, { headers: authHeader(token) });
  return res.data;
};

export const getPresentation = async (token, thesisId) => {
  const res = await API.get(`/theses/${thesisId}/presentation`, { headers: authHeader(token) });
  return res.data;
};

export const setNimerisUrl = async (token, thesisId, nimeris_url) => {
  const res = await API.patch(`/theses/${thesisId}/nimeris-url`, { nimeris_url }, { headers: authHeader(token) });
  return res.data;
};

export const getMinutes = async (token, thesisId) => {
  const res = await API.get(`/theses/${thesisId}/minutes`, { headers: authHeader(token) });
  return res.data;
};
