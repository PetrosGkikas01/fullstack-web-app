import axios from "axios";

export const loginProfessor = async (credentials) => {
  const res = await axios.post("/api/professor/login", credentials);
  return res.data;
};
