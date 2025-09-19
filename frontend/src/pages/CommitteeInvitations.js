import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./CommitteeInvitations.css";

const API_BASE = "http://localhost:5000";

const Badge = ({ status }) => {
  const map = {
    pending: "εκκρεμεί",
    accepted: "έγινε δεκτό",
    rejected: "απορρίφθηκε",
    cancelled: "ακυρώθηκε",
  };
  return <span className={`badge badge-${status}`}>{map[status] || status}</span>;
};

const CommitteeInvitations = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate()
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${auth?.token}` }),
    [auth]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending"); 
  const [rows, setRows] = useState([]);
  const [actingId, setActingId] = useState(null);  

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const url = filter
        ? `${API_BASE}/api/professor/committee/invitations?status=${encodeURIComponent(filter)}`
        : `${API_BASE}/api/professor/committee/invitations`;
      const { data } = await axios.get(url, { headers });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error || "Σφάλμα φόρτωσης δεδομένων");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
  }, [filter]);

  const respond = async (invitation_id, action) => {
    setError("");
    setActingId(invitation_id);
    try {
      await axios.post(
        `${API_BASE}/api/professor/committee/respond`,
        { invitation_id, action }, 
        { headers }
      );
      await fetchData();
    } catch (err) {
      setError(err?.response?.data?.error || "Αποτυχία ενημέρωσης πρόσκλησης");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="ci-page">
        <div className="card">
          <p>Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ci-page">
      <div className="card">
        <h2>Προσκλήσεις σε τριμελείς επιτροπές</h2>

        {error && <div className="error-box">{error}</div>}

        <div className="toolbar">
          <label htmlFor="filter">Φίλτρο:</label>
          <select
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Όλες</option>
            <option value="pending">Εκκρεμείς</option>
            <option value="accepted">Αποδεκτές</option>
            <option value="rejected">Απορριφθείσες</option>
            <option value="cancelled">Ακυρωμένες</option>
          </select>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Θέμα</th>
              <th>Φοιτητής</th>
              <th>Πρόσκληση</th>
              <th>Κατάσταση</th>
              <th>Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="5" className="muted">
                  Δεν υπάρχουν προσκλήσεις.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="thesis-title">{r.thesis_title}</div>
                  <div className="muted small">
                    Κατάσταση διπλωματικής: {r.thesis_status}
                  </div>
                </td>
                <td>
                  <div>{r.student_name}</div>
                  <div className="muted small">{r.student_email}</div>
                </td>
                <td>
                  <div>{new Date(r.invited_at).toLocaleString()}</div>
                  {r.responded_at && (
                    <div className="muted small">
                      Απάντηση: {new Date(r.responded_at).toLocaleString()}
                    </div>
                  )}
                </td>
                <td>
                  <Badge status={r.status} />
                </td>
                <td>
                  {r.status === "pending" ? (
                    <div className="actions">
                      <button
                        onClick={() => respond(r.id, "accept")}
                        disabled={actingId === r.id}
                      >
                        Αποδοχή
                      </button>
                      <button
                        className="danger"
                        onClick={() => respond(r.id, "reject")}
                        disabled={actingId === r.id}
                      >
                        Απόρριψη
                      </button>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {}
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

export default CommitteeInvitations;
