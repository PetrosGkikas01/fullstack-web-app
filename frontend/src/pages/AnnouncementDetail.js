import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import './AnnouncementDetail.css';  // Εισαγωγή CSS

const AnnouncementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/announcement/${id}`);
        setAnnouncement(res.data);
      } catch (err) {
        console.error("Σφάλμα στο fetch announcement:", err);
        setError("Αποτυχία φόρτωσης ανακοίνωσης.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id]);

  if (loading) return <p>Φόρτωση...</p>;
  if (error) return <p>{error}</p>;
  if (!announcement) return <p>Η ανακοίνωση δεν βρέθηκε.</p>;

  return (
    <div className="container">
      <h2 className="title">{announcement.title}</h2>
      <p className="content">{announcement.body}</p>
      <small className="date">
        Δημοσιεύτηκε: {new Date(announcement.created_at).toLocaleDateString()}
      </small>
      <br />
      <button className="backButton" onClick={() => navigate(-1)}>
        Πίσω
      </button>
    </div>
  );
};

export default AnnouncementDetail;

