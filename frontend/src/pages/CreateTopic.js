import { useState } from "react";
import axios from "axios";
import "./CreateTopic.css";
import { useNavigate } from "react-router-dom";

const CreateTopic = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    pdf_file: null,
  });
  const [loading, setLoading] = useState(false);

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
    const token = localStorage.getItem("token");

    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    if (form.pdf_file) {
      data.append("pdf_file", form.pdf_file);
    }

    try {
      setLoading(true);
    await axios.post("http://localhost:5000/api/professor/topics", data, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "multipart/form-data",
  },
  withCredentials: true,
  timeout: 10000 // 10 seconds
});
      alert("Το θέμα καταχωρήθηκε!");
      setForm({ title: "", description: "", pdf_file: null });
      navigate("/professor/topics");
    } catch (err) {
      alert("Σφάλμα: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-topic-container" onSubmit={handleSubmit}>
      <h2>Δημιουργία Θέματος</h2>
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
      <input type="file" name="pdf_file" accept="application/pdf" onChange={handleChange} />
      <div className="button-row">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate(-1)}
        >
          ← Πίσω
      </button>
      <button type="submit" disabled={loading}>
        {loading ? "Αποστολή..." : "Καταχώρηση Θέματος"}
      </button>
      </div>
    </form>
  );
};

export default CreateTopic;
