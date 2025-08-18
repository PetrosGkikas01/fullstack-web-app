import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./MyAssignment.css";

const API_BASE = "http://localhost:5000";
const API_URL_MY_ASSIGNMENT = `${API_BASE}/api/student/MyAssignment`;

const MyAssignment = () => {
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const headers = { Authorization: `Bearer ${auth?.token}` };
        const res = await axios.get(API_URL_MY_ASSIGNMENT, { headers });
        setAssignment(res.data);
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Κάτι πήγε στραβά.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    if (auth?.token) load();
  }, [auth?.token]);

  return (
    <div className="my-assignment-page">
      <div className="card">
        <h2 className="title">Η Ανάθεσή μου</h2>

        {loading && <p className="msg info">Φόρτωση…</p>}

        {!loading && error && <p className="msg error">{error}</p>}

        {!loading && !error && !assignment && (
          <p className="msg info">Δεν έχεις ακόμη ανάθεση θέματος.</p>
        )}

        {!loading && !error && assignment && (
          <div className="assignment">
            {assignment.assigned_at && (
              <p className="muted small">
                Ημερομηνία ανάθεσης:{" "}
                {new Date(assignment.assigned_at).toLocaleString()}
              </p>
            )}

            <p><strong>Τίτλος:</strong> {assignment.title}</p>
            <p><strong>Κατάσταση:</strong> {assignment.status}</p>

            {assignment.professor_name && (
              <p>
                <strong>Επιβλέπων:</strong> {assignment.professor_name}
                {assignment.professor_specialty
                  ? ` — ${assignment.professor_specialty}`
                  : ""}
              </p>
            )}

            {assignment.professor_email && (
              <p><strong>Email επιβλέποντα:</strong> {assignment.professor_email}</p>
            )}

            {assignment.description && (
              <>
                <p><strong>Περιγραφή:</strong></p>
                <p className="description">{assignment.description}</p>
              </>
            )}

            {assignment.pdf_file && (
              <p>
                <a
                  className="link"
                  href={`${API_BASE}/uploads/${encodeURIComponent(assignment.pdf_file)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Προβολή συνημμένου PDF
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAssignment;
