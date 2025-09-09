import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./NewAssignment.css";

const API_BASE = "http://localhost:5000";
const API_URL_TOPICS  = `${API_BASE}/api/professor/topics`;
const API_URL_ASSIGN  = `${API_BASE}/api/professor/assign`;
const API_URL_BY_AM   = `${API_BASE}/api/student/by-number`; 

const NewAssignment = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${auth?.token}` };

  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  
  const refreshTopics = async () => {
    const res = await axios.get(API_URL_TOPICS, { headers });
    const list = Array.isArray(res.data) ? res.data : [];
    setTopics(list.filter((t) => t.status === "available"));
  };

  const [studentCode, setStudentCode] = useState("");
  const [matchedStudent, setMatchedStudent] = useState(null);
  const [checking, setChecking] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info"); 

  useEffect(() => {
    
    const load = async () => {
      try { setLoading(true); setMessage(""); await refreshTopics(); }
      catch (e) { setMessageType("error"); setMessage("Αποτυχία φόρτωσης θεμάτων."); }
      finally { setLoading(false); }
    };
    if (auth?.token) load();
  }, [auth?.token]);

  useEffect(() => {
    const code = studentCode.trim();
    setMatchedStudent(null);
    if (!code) return;

    const t = setTimeout(async () => {
      try {
        setChecking(true);
        const headers = { Authorization: `Bearer ${auth?.token}` };
        const res = await axios.get(`${API_URL_BY_AM}/${encodeURIComponent(code)}`, { headers });
        setMatchedStudent(res.data);
      } catch {
        setMatchedStudent(null); 
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [studentCode, auth?.token]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setMessage(""); setMessageType("info");

    if (!selectedTopic) {
      setMessageType("error"); setMessage("Επίλεξε ένα θέμα πρώτα."); return;
    }
    if (!studentCode.trim()) {
      setMessageType("error"); setMessage("Πληκτρολόγησε τον κωδικό φοιτητή (ΑΜ)."); return;
    }
    if (!matchedStudent?.id) {
      setMessageType("error"); setMessage("Δεν βρέθηκε φοιτητής με αυτό το ΑΜ."); return;
    }

    try {
      setSubmitting(true);

      const headersWithJson = { ...headers, "Content-Type": "application/json" };
      const payload = { topic_id: Number(selectedTopic), student_id: Number(matchedStudent.id) 
      };
     
      const res = await axios.post(API_URL_ASSIGN, payload, { headers: headersWithJson });
      setMessageType("success");
      setMessage(res.data?.message || "Η ανάθεση ολοκληρώθηκε επιτυχώς.");
      await refreshTopics(); 
      setSelectedTopic("");
      setStudentCode("");
      setMatchedStudent(null);
    } catch (err) {
      console.error(err);
      const apiErr = err.response?.data?.error || err.response?.data?.message || "Κάτι πήγε στραβά.";
      setMessageType("error");
      setMessage(`Σφάλμα: ${apiErr}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-assignment-page">
      <div className="card">
        <h2 className="title">Ανάθεση Θέματος σε Φοιτητή</h2>
        <p className="subtitle">Επίλεξε διαθέσιμο θέμα και πληκτρολόγησε τον <strong>κωδικό φοιτητή (ΑΜ)</strong>.</p>

        {loading ? (
          <p className="msg info">Φόρτωση…</p>
        ) : (
          <form className="form" onSubmit={handleAssign}>
           
            <label className="label" htmlFor="topic">Θέμα</label>
            <select
              id="topic"
              className="input"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              <option value="">— επίλεξε θέμα —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {topics.length === 0 && <p className="muted small">Δεν υπάρχουν διαθέσιμα θέματα.</p>}

            <label className="label" htmlFor="studentCode">Κωδικός Φοιτητή (ΑΜ)</label>
            <input
              id="studentCode"
              className="input"
              type="text"
              placeholder="π.χ. 2025001"
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value)}
              autoComplete="off"
            />

            {studentCode.trim() && (
              <p className={`hint ${matchedStudent ? "ok" : "bad"}`}>
                {checking
                  ? "Έλεγχος…"
                  : matchedStudent
                  ? `✓ ${matchedStudent.name}${matchedStudent.email ? " — " + matchedStudent.email : ""}`
                  : "✗ Δεν βρέθηκε φοιτητής με αυτό το ΑΜ"}
              </p>
            )}

            {message && <p className={`msg ${messageType}`}>{message}</p>}

            <div className="actions">
              <button className="btn primary" type="submit" disabled={submitting}>
                {submitting ? "Γίνεται ανάθεση…" : "Ανάθεση"}
              </button>
              <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
                Πίσω
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewAssignment;
