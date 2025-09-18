import axios from "axios";

export const loginProfessor = async (credentials) => {
  const res = await axios.post("/api/professor/login", credentials);
  return res.data;
};

export const fetchProfessorTopics = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get("/api/professor/topics", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const deleteProfessorTopic = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.delete(`/api/professor/topics/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const fetchTopicById = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`/api/professor/topics/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const updateTopic = async (id, data) => {
  const token = localStorage.getItem("token");
  const res = await axios.put(`/api/professor/topics/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const assignTopicToStudent = async (topic_id, student_id) => {
  const token = localStorage.getItem("token");
  const res = await axios.post(
    "/api/professor/assign",
    { topic_id, student_id },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const fetchManagedTheses = async ({ role = "supervisor", status } = {}) => {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ role });
  if (status && status.trim()) params.append("status", status);
  const res = await axios.get(`/api/professor/theses?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// --- append to src/api/Professor.js ---

export const fetchThesisInvitations = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`/api/professor/theses/${id}/invitations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const fetchThesisGrades = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`/api/professor/theses/${id}/grades`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const fetchLatestDraft = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`/api/professor/theses/${id}/draft`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getPresentationAnnouncement = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`/api/professor/theses/${id}/announcement`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data; // { text }
};

/**
 * Φέρνει λίστες για role=supervisor και role=committee και τις ενώνει.
 * Το πεδίο `role` το προσθέτουμε client-side για απόδοση στη λίστα.
 */
export const fetchManagedThesesBoth = async ({ status } = {}) => {
  const [asSupervisor, asCommittee] = await Promise.all([
    fetchManagedTheses({ role: "supervisor", status }),
    fetchManagedTheses({ role: "committee", status }),
  ]);
  return [
    ...asSupervisor.map(x => ({ ...x, role: "supervisor" })),
    ...asCommittee.map(x => ({ ...x, role: "committee" })),
  ].sort((a, b) => (new Date(b.assigned_at || 0) - new Date(a.assigned_at || 0)) || (b.id - a.id));
};

export const fetchThesisHistory = async (id) => {
  const token = localStorage.getItem("token");
  const res = await axios.get(`/api/professor/theses/${id}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const submitThesisGrade = async (id, grade) => {
  const token = localStorage.getItem("token");
  const res = await axios.post(`/api/professor/theses/${id}/grades`, grade, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};


