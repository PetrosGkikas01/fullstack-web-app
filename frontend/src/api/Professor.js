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

export const fetchManagedTheses = async ({ role = "supervisor", status = "under_assignment,active" } = {}) => {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ role, status });
  const res = await axios.get(`/api/professor/theses?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
