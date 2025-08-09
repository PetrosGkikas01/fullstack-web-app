import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { assignTopicToStudent } from "../api/Professor"; // το ήδη υπάρχον action
import "./NewAssignment.css";

const NewAssignment = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [topics, setTopics] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState("");
  const [okText, setOkText] = useState("");

  // ---- Φόρτωση θεμάτων καθηγητή (μόνο διαθέσιμα) & λίστας φοιτητών
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setErrText("");

        // Φόρτωση θεμάτων καθηγητή
        const topicsRes = await fetch("http://localhost:5000/api/professor/topics", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const topicsJson = await topicsRes.json();

        const allTopics = Array.isArray(topicsJson) ? topicsJson : [];
        // Κρατάμε μόνο διαθέσιμα (status === 'available') και χωρίς student_id
        const available = allTopics.filter(
          t =>
            (t.status?.toLowerCase?.() === "available" || t.status === null) &&
            (t.student_id === null || typeof t.student_id === "undefined")
        );
        setTopics(available);

        // Φόρτωση φοιτητών
        const studentsRes = await fetch("http://localhost:5000/api/student/all", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });

        let studentsJson;
        try {
          studentsJson = await studentsRes.json();
        } catch {
          studentsJson = [];
        }

        const asArray = Array.isArray(studentsJson) ? studentsJson : [];
        // Προσπαθούμε να καλύψουμε διαφορετικά ονόματα πεδίων (name/fullName/student_number)
        const normalized = asArray.map(s => ({
          id: s.id,
          name: s.name || s.fullName || `${s.firstName || ""} ${s.lastName || ""}`.trim(),
          student_number: s.student_number || s.am || s.studentNumber || "",
          email: s.email || "",
        }));
        setStudents(normalized);
      } catch (e) {
        setErrText("Αποτυχία φόρτωσης δεδομένων. Έλεγξε τα endpoints.");
      } finally {
        setLoading(false);
      }
    };

    if (auth?.token) fetchData();
  }, [auth?.token]);

  // ---- Ανάθεση
  const handleAssign = async (e) => {
    e.preventDefault();
    setOkText("");
    setErrText("");

    if (!selectedTopic || !selectedStudent) {
      setErrText("Συμπλήρωσε και τα δύο πεδία.");
      return;
    }

    try {
      // Η assignTopicToStudent(topicId, studentId) την έχεις ήδη.
      const res = await assignTopicToStudent(selectedTopic, selectedStudent);
      setOkText(res?.message || "Η ανάθεση ολοκληρώθηκε.");
      // reset προαιρετικά
      setSelectedTopic("");
      setSelectedStudent("");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Σφάλμα κατά την ανάθεση.";
      setErrText(msg);
    }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h2 className="form-title">Ανάθεση Θέματος σε Φοιτητή</h2>

        {loading ? (
          <p className="muted">Φόρτωση δεδομένων…</p>
        ) : (
          <form onSubmit={handleAssign}>
            {/* Επιλογή Θέματος */}
            <div className="form-group">
              <label htmlFor="topic">Θέμα</label>
              <select
                id="topic"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                <option value="">— επίλεξε θέμα —</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              {topics.length === 0 && (
                <p className="muted small">Δεν υπάρχουν διαθέσιμα θέματα.</p>
              )}
            </div>

            {/* Επιλογή Φοιτητή */}
            <div className="form-group">
              <label htmlFor="student">Φοιτητής</label>
              <select
                id="student"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">— επίλεξε φοιτητή —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || "Χωρίς ονοματεπώνυμο"}
                    {s.student_number ? ` — ${s.student_number}` : ""}
                    {s.email ? ` — ${s.email}` : ""}
                  </option>
                ))}
              </select>
              {students.length === 0 && (
                <p className="muted small">
                  Δεν βρέθηκαν φοιτητές (έλεγξε το endpoint /api/student/list).
                </p>
              )}
            </div>

            {/* Μηνύματα */}
            {okText && <p className="success">{okText}</p>}
            {errText && <p className="error">{errText}</p>}

            {/* Κουμπιά */}
            <div className="actions">
              <button type="submit" className="btn-primary">
                Ανάθεση
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(-1)}
              >
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
