import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./EditTopic.css";

const EditTopic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    pdf_file: null,
  });
  const [existingPdf, setExistingPdf] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const res = await axios.get(`/api/professor/topics/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setForm({
          title: res.data.title,
          description: res.data.description,
          pdf_file: null,
        });
        setExistingPdf(res.data.pdf_file);
      } catch (err) {
        alert("Σφάλμα: " + (err.response?.data?.error || err.message));
      }
    };
    fetchTopic();
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "pdf_file") {
      setForm({ ...form, pdf_file: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    if (form.pdf_file) data.append("pdf_file", form.pdf_file);

    try {
      setLoading(true);
      await axios.put(`/api/professor/topics/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Το θέμα ενημερώθηκε επιτυχώς!");
      navigate("/professor/topics");
    } catch (err) {
      alert("Σφάλμα: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="edit-topic-container" onSubmit={handleSubmit}>
      <h2>Επεξεργασία Θέματος</h2>
      <input
        type="text"
        name="title"
        placeholder="Τίτλος"
        value={form.title}
        onChange={handleChange}
        required
      />
      <textarea
        name="description"
        placeholder="Σύνοψη"
        value={form.description}
        onChange={handleChange}
        required
      ></textarea>

      {existingPdf && (
        <p>
          Τρέχον PDF: <a href={`/${existingPdf}`} target="_blank" rel="noreferrer">Προβολή</a>
        </p>
      )}

      <input type="file" name="pdf_file" accept="application/pdf" onChange={handleChange} />

      <button type="submit" disabled={loading}>
        {loading ? "Αποθήκευση..." : "Αποθήκευση Αλλαγών"}
      </button>
    </form>
  );
};

export default EditTopic;
