import { useEffect, useState } from "react";
import axios from "axios";
import "./ProfessorTopics.css";
import { useNavigate } from "react-router-dom";

const ProfessorTopics = () => {
  const [topics, setTopics] = useState([]);
  const navigate = useNavigate();
  const fetchTopics = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/professor/topics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTopics(res.data);
    } catch (err) {
      alert("Σφάλμα: " + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε το θέμα;")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/professor/topics/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert("Σφάλμα διαγραφής: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (id) => {
    navigate(`/professor/topics/${id}/edit`);
  };

  return (
  <>
    <div className="topics-list">
      <h2>Τα Θέματά Μου</h2>
      {topics.length === 0 ? (
        <p>Δεν υπάρχουν καταχωρημένα θέματα.</p>
      ) : (
        topics.map((topic) => (
          <div className="topic-card" key={topic.id}>
            <h3>{topic.title}</h3>
            <p>{topic.description}</p>
            <p><strong>Κατάσταση:</strong> {topic.status}</p>
            {topic.pdf_file && (
              <a href={`http://localhost:5000/uploads/${topic.pdf_file}`} target="_blank" rel="noopener noreferrer">
                Προβολή PDF
              </a>

            )}
            <div className="topic-actions">
              <button className="topic-button edit" onClick={() => handleEdit(topic.id)}>
                Επεξεργασία
              </button>
              <button className="topic-button delete" onClick={() => handleDelete(topic.id)}>
                Διαγραφή
              </button>
            </div>
          </div>
        ))
      )}
    </div>

    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <button
        type="button"
        className="back-button"
        onClick={() => navigate("/dashboard")}
        >
          Πίσω
      </button>
      <button
        className="create-topic-btn"
        onClick={() => (window.location.href = "/create-topic")}
      >
        ➕ Δημιουργία Νέου Θέματος
      </button>
    </div>
  </>
  );
}



export default ProfessorTopics;
