import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import "./UpdateProfile.css";
const UpdateProfile = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    address: "",
    contact_email: "",
    mobile_phone: "",
    landline_phone: ""
  });

  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  useEffect(() => {
    axios
      .get("/api/student/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => setForm(res.data))
      .catch((err) => console.error("Σφάλμα:", err));
  }, []);
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put("/api/student/update-profile", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Τα στοιχεία αποθηκεύτηκαν επιτυχώς!");
    } catch (err) {
      alert("Σφάλμα: " + err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="update-profile-container" onSubmit={handleSubmit}>
      <h2>Επεξεργασία Στοιχείων Επικοινωνίας</h2>
      <input
        type="text"
        name="address"
        placeholder="Πλήρης Διεύθυνση"
        value={form.address}
        onChange={handleChange}
      />
      <input
        type="email"
        name="contact_email"
        placeholder="Email Επικοινωνίας"
        value={form.contact_email}
        onChange={handleChange}
      />
      <input
        type="text"
        name="mobile_phone"
        placeholder="Κινητό Τηλέφωνο"
        value={form.mobile_phone}
        onChange={handleChange}
      />
      <input
        type="text"
        name="landline_phone"
        placeholder="Σταθερό Τηλέφωνο"
        value={form.landline_phone}
        onChange={handleChange}
      />

      <div className="button-row">
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
         Πίσω
        </button>
        <button type="submit" disabled={loading}>
          {loading ? "Αποθήκευση..." : "Αποθήκευση"}
        </button>
</div>
    </form>
   
  );
};

export default UpdateProfile;
