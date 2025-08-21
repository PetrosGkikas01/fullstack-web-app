import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./ManageThesis.css";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

const renderBadge = (s) => {
  const map = {
    pending: "εκκρεμεί",
    accepted: "έγινε δεκτό",
    rejected: "απορρίφθηκε",
    cancelled: "ακυρώθηκε",
  };
  return <span className={`badge badge-${s}`}>{map[s] || s}</span>;
};

const ManageThesis = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");           // status διπλωματικής
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [professors, setProfessors] = useState([]);   // διαθέσιμοι διδάσκοντες για πρόσκληση
  const [invitations, setInvitations] = useState([]); // λίστα προσκλήσεων
  const [selectedProfessor, setSelectedProfessor] = useState("");

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${auth?.token}` }),
    [auth]
  );

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [profRes, invRes] = await Promise.all([
        axios.get(`${API_BASE}/api/student/committee/professors`, { headers }),
        axios.get(`${API_BASE}/api/student/committee`, { headers }),
      ]);

      setProfessors(profRes.data || []);
      setStatus(invRes.data?.status || "");
      setAcceptedCount(invRes.data?.acceptedCount || 0);
      setInvitations(invRes.data?.invitations || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Σφάλμα φόρτωσης δεδομένων");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onInvite = async () => {
    setError("");
    if (!selectedProfessor) return;
    try {
      await axios.post(
        `${API_BASE}/api/student/committee/invite`,
        { professor_id: Number(selectedProfessor) },
        { headers }
      );
      setSelectedProfessor("");
      await fetchAll();
    } catch (err) {
      setError(
        err?.response?.data?.error || "Αποτυχία αποστολής πρόσκλησης"
      );
    }
  };

  const onCancel = async (id) => {
    setError("");
    try {
      await axios.delete(`${API_BASE}/api/student/committee/${id}`, { headers });
      await fetchAll();
    } catch (err) {
      setError(err?.response?.data?.error || "Αποτυχία ακύρωσης");
    }
  };

  if (loading) {
    return (
      <div className="thesis-page">
        <div className="card">
          <p>Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="thesis-page">
      <div className="card">
        <h2>Διαχείριση διπλωματικής εργασίας</h2>

        {error && <div className="error-box">{error}</div>}

        <div className="status-row">
          <strong>Κατάσταση:</strong>{" "}
          <span className={`status-${status}`}>{status || "-"}</span>
          <span className="accepted-pill">Αποδεκτοί: {acceptedCount}/2</span>
        </div>

        {status === "under_assignment" ? (
          <>
            <div className="invite-row">
              <label htmlFor="prof">Επιλογή διδάσκοντα για πρόσκληση:</label>
              <select
                id="prof"
                value={selectedProfessor}
                onChange={(e) => setSelectedProfessor(e.target.value)}
              >
                <option value="">— επίλεξε —</option>
                {professors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.email})
                  </option>
                ))}
              </select>
              <button
                onClick={onInvite}
                disabled={!selectedProfessor || acceptedCount >= 2}
              >
                Προσθήκη στην τριμελή
              </button>
            </div>

            <h3>Προσκλήσεις</h3>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Καθηγητής</th>
                  <th>Email</th>
                  <th>Κατάσταση</th>
                  <th>Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {invitations.length === 0 && (
                  <tr>
                    <td colSpan="4" className="muted">
                      Καμία πρόσκληση ακόμη.
                    </td>
                  </tr>
                )}
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.professor_name}</td>
                    <td>{inv.professor_email}</td>
                    <td>{renderBadge(inv.status)}</td>
                    <td>
                      {inv.status === "pending" ? (
                        <button className="link" onClick={() => onCancel(inv.id)}>
                          Ακύρωση
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="muted">
            Η διπλωματική δεν είναι σε "Υπό ανάθεση". Δεν μπορούν να σταλούν νέες
            προσκλήσεις.
          </div>
        )}

        {/* Back button */}
        <div className="page-footer">
          <button
            type="button"
            className="back-button"
            onClick={() => navigate(-1)}
          >
            Πίσω
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default ManageThesis;
