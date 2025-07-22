import axios from "axios";

export const fetchAnnouncement = async (token) => {
  try {
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};
    const response = await axios.get("http://localhost:5000/api/announcement", config);
    console.log("API response:", response.data);
    return response.data;
  } catch (err) {
    console.error("Σφάλμα στο fetchAnnouncements:", err);
    throw err; // ξαναρίχνει το error για να το πιάσει το React Query
  }
};