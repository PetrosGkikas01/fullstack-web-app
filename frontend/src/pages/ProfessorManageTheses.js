import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import "./ProfessorManageTheses.css";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";
const API_URL_MANAGED = `${API_BASE}/api/professor/theses`;
const API_URL_TOPICS  = `${API_BASE}/api/professor/topics`; // fallback για supervisor

export default function ProfessorManageTheses() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [role, setRole] = useState("supervisor"); // "supervisor" | "committee"
  const [statusFilter, setStatusFilter] = useState("under_assignment,active");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!auth?.token) return;
      setLoading(true);
      setErr("");
      const headers = { Authorization: `Bearer ${auth.token}` };

      try {
        const params = new URLSearchParams();
        params.set("role", role);
        if (statusFilter !== undefined) params.set("status", statusFilter);

        const { data } = await axios.get(`${API_URL_MANAGED}?${params.toString()}`, { headers });
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        // Fallback: αν δεν υπάρχει ακόμη το νέο endpoint, για role=supervisor φόρτωσε από /topics
        if (role === "supervisor") {
          try {
            const { data } = await axios.get(API_URL_TOPICS, { headers });
            const all = Array.isArray(data) ? data : [];
            setItems(all.filter(t => t.status !== "available"));
            setErr("");
          } catch (ee) {
            setErr(ee?.response?.data?.error || "Σφάλμα φόρτωσης");
          }
        } else {
          setErr(e?.response?.data?.error || "Σφάλμα φόρτωσης");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [auth?.token, role, statusFilter]);

  return (
    <div className="page">
      <h2>Διαχείριση Διπλωματικών Εργασιών</h2>

      {/* Φίλτρα */}
      <div className="toolbar">
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="supervisor">Ως Επιβλέπων</option>
          <option value="committee">Ως Μέλος Τριμελούς</option>
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="under_assignment,active">Υπό Ανάθεση + Ενεργές</option>
          <option value="active">Μόνο Ενεργές</option>
          <option value="under_assignment">Μόνο Υπό Ανάθεση</option>
          <option value="">Όλες</option>
        </select>
      </div>

      {loading && <p>Φόρτωση…</p>}
      {!loading && err && <p className="error">{err}</p>}

      {!loading && !err && items.length === 0 && (
        <p>Δεν υπάρχουν εγγραφές για τα επιλεγμένα φίλτρα.</p>
      )}

      {!loading && !err && items.length > 0 && (
        <ul className="thesis-list">
          {items.map(t => (
            <li key={t.id} className="thesis-item">
              <div className="thesis-head">
                <span className="thesis-title">{t.title}</span>
                <span className={`status-pill status-${String(t.status || "").replaceAll(" ", "_").replaceAll("-", "_")}`}>
                  {t.status}
                </span>
              </div>
              <div className="thesis-body">
                {t.assigned_at && (
                  <div className="thesis-meta muted small">
                    Ανάθεση: {new Date(t.assigned_at).toLocaleString()}
                  </div>
                )}
                {t.student_name && (
                  <div className="thesis-meta">
                    Φοιτητής: {t.student_name}{t.student_email ? ` (${t.student_email})` : ""}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="page-footer">
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
          Πίσω
        </button>
      </div>
    </div>
  );
}
