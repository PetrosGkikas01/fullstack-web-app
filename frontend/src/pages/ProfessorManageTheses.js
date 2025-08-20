import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import "./ProfessorManageTheses.css";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";
const API_URL_TOPICS  = `${API_BASE}/api/professor/topics`;

export default function ProfessorManageTheses() {
  const { auth } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr("");
      try {
        const res = await axios.get(API_URL_TOPICS, {
          headers: { Authorization: `Bearer ${auth?.token}` }
        });
        const all = Array.isArray(res.data) ? res.data : [];
        setItems(all.filter(t => t.status !== "available"));
      } catch (e) {
        setErr(e?.response?.data?.error || "Σφάλμα φόρτωσης");
      } finally {
        setLoading(false);
      }
    };
    if (auth?.token) load();
  }, [auth?.token]);

  return (
    <div className="page">
      <h2>Διαχείριση Διπλωματικών Εργασιών</h2>

      {loading && <p>Φόρτωση…</p>}
      {!loading && err && <p className="error">{err}</p>}

      {!loading && !err && items.length === 0 && (
        <p>Δεν υπάρχουν διπλωματικές προς διαχείριση.</p>
      )}

      {!loading && !err && items.length > 0 && (
        <ul className="thesis-list">
          {items.map(t => (
            <li key={t.id} className="thesis-item">
              <strong>{t.title}</strong> — <em>{t.status}</em>
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