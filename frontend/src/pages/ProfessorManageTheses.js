import React, { useEffect, useState, useContext, useMemo, useCallback } from "react";
import axios from "axios";
import "./ProfessorManageTheses.css";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation} from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";
const API_URL_MANAGED = `${API_BASE}/api/professor/theses`;
const API_URL_TOPICS  = `${API_BASE}/api/professor/topics`;

const statusLabel = (s) =>
  ({
    under_assignment: "Υπό Ανάθεση",
    active: "Ενεργή",
    under_review: "Υπό Εξέταση",
    available: "Διαθέσιμη",
    completed: "Ολοκληρωμένη",
  }[s] || s);

export default function ProfessorManageTheses() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [role, setRole] = useState("supervisor");
  const [statusFilter, setStatusFilter] = useState("under_assignment,active,under_review");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const { search } = useLocation();
  const qs = new URLSearchParams(search);
  const openParam = qs.get("open");    
  const roleParam = qs.get("role");     

  const [openId, setOpenId] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  const [invLoading, setInvLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);

  const [notesLoading, setNotesLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const [reviewLoading, setReviewLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [announcementText, setAnnouncementText] = useState("");
  const [annLoading, setAnnLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [gradingOpen, setGradingOpen] = useState(false);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    clarity: "",
    originality: "",
    methodology: "",
    writing: "",
    presentation: "",
  });

  const headers = useMemo(
    () =>
      auth?.token
        ? { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" },
    [auth?.token]
  );

  useEffect(() => {
    const load = async () => {
      if (!auth?.token) return;
      setLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams();
        params.set("role", role);
        if (statusFilter !== undefined) params.set("status", statusFilter);
        const { data } = await axios.get(`${API_URL_MANAGED}?${params.toString()}`, { headers });
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (role === "supervisor") {
          try {
            const { data } = await axios.get(API_URL_TOPICS, { headers });
            const all = Array.isArray(data) ? data : [];
            setItems(all.filter((t) => t.status !== "available"));
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
  }, [auth?.token, role, statusFilter, headers]);

  const openManage = (item) => {
    setOpenId(item.id);
    setOpenItem(item);
    setActiveTab("summary");
    setInvitations([]);
    setNotes([]);
    setNoteText("");
    setDraft(null);
    setAnnouncementText("");
    setGrades([]);
    setGradingOpen(Boolean(item.grading_open));
  };

  useEffect(() => {
  const sp = new URLSearchParams(window.location.search);
  const wantRole = sp.get("role");
  const open = sp.get("open");

  if (wantRole && (wantRole === "committee" || wantRole === "supervisor") && role !== wantRole) {
    setRole(wantRole);
    return; 
  }

  if (open && items.length) {
    const item = items.find(t => String(t.id) === String(open));
    if (item) {
      openManage(item);
    }
  }
}, [items, role]);

  const closeManage = () => {
    setOpenId(null);
    setOpenItem(null);
  };

  const loadInvitations = useCallback(async () => {
    if (!openId) return;
    setInvLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/professor/theses/${openId}/invitations`, { headers });
      setInvitations(Array.isArray(data) ? data : []);
    } catch {
      setInvitations([]);
    } finally {
      setInvLoading(false);
    }
  }, [openId, headers]);

  const loadNotes = useCallback(async () => {
    if (!openId) return;
    setNotesLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/professor/theses/${openId}/notes`, { headers });
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [openId, headers]);

  const loadDraft = useCallback(async () => {
    if (!openId) return;
    setReviewLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/professor/theses/${openId}/draft`, { headers });
      setDraft(data || null);
    } catch {
      setDraft(null);
    } finally {
      setReviewLoading(false);
    }
  }, [openId, headers]);

  const loadGrades = useCallback(async () => {
    if (!openId) return;
    setGradesLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/professor/theses/${openId}/grades`, { headers });
      setGrades(Array.isArray(data) ? data : []);
    } catch {
      setGrades([]);
    } finally {
      setGradesLoading(false);
    }
  }, [openId, headers]);

  const cancelUnderAssignment = async () => {
    if (!openId) return;
    if (!window.confirm("Σίγουρα θέλεις να ακυρώσεις την ανάθεση; Θα διαγραφούν και οι προσκλήσεις.")) return;
    try {
      await axios.post(`${API_BASE}/api/professor/theses/${openId}/cancel-assignment`, {}, { headers });
      alert("Η ανάθεση ακυρώθηκε.");
      setItems((prev) => prev.map((x) => (x.id === openId ? { ...x, status: "available", student_id: null } : x)));
      closeManage();
    } catch (e) {
      alert(e?.response?.data?.error || "Αποτυχία ακύρωσης.");
    }
  };

  const addNote = async () => {
    const txt = noteText.trim();
    if (!txt) return;
    if (txt.length > 300) return alert("Μέγιστο 300 χαρακτήρες.");
    setNoteSaving(true);
    try {
      await axios.post(`${API_BASE}/api/professor/theses/${openId}/notes`, { note_text: txt }, { headers });
      setNoteText("");
      await loadNotes();
    } catch (e) {
      alert(e?.response?.data?.error || "Αποτυχία αποθήκευσης.");
    } finally {
      setNoteSaving(false);
    }
  };

  const markUnderReview = async () => {
    if (!window.confirm("Μεταφορά σε «Υπό Εξέταση»;")) return;
    try {
      await axios.post(`${API_BASE}/api/professor/theses/${openId}/mark-under-review`, {}, { headers });
      alert("Η κατάσταση άλλαξε σε «Υπό Εξέταση».");
      setItems((prev) => prev.map((x) => (x.id === openId ? { ...x, status: "under_review" } : x)));
      setOpenItem((prev) => (prev ? { ...prev, status: "under_review" } : prev));
      setActiveTab("review");
    } catch (e) {
      alert(e?.response?.data?.error || "Αποτυχία αλλαγής κατάστασης.");
    }
  };

  const cancelActive = async (gs_number, gs_year) => {
    if (!gs_number || !gs_year) return alert("Συμπλήρωσε αριθμό και έτος Γ.Σ.");
    if (!window.confirm("Σίγουρα; Θα επιστρέψει σε «Διαθέσιμη» και θα χαθούν οι συσχετίσεις.")) return;
    try {
      await axios.post(`${API_BASE}/api/professor/theses/${openId}/cancel-assignment`, { gs_number, gs_year }, { headers });
      alert("Ακυρώθηκε η ενεργή ανάθεση.");
      setItems((prev) => prev.map((x) => (x.id === openId ? { ...x, status: "available", student_id: null } : x)));
      closeManage();
    } catch (e) {
      alert(e?.response?.data?.error || "Αποτυχία ακύρωσης.");
    }
  };

  const loadAnnouncement = async () => {
    setAnnLoading(true);
    setAnnouncementText("");
    try {
      const { data } = await axios.get(`${API_BASE}/api/professor/theses/${openId}/announcement`, { headers });
      setAnnouncementText(data?.text || "");
    } catch (e) {
      setAnnouncementText("");
      alert(e?.response?.data?.error || "Δεν είναι διαθέσιμη η ανακοίνωση.");
    } finally {
      setAnnLoading(false);
    }
  };

const publishAnnouncement = async () => {
  const txt = announcementText.trim();
  if (!txt) return alert("Δεν υπάρχει κείμενο ανακοίνωσης.");
  if (!openId) return alert("Δεν βρέθηκε ΔΕ.");
  setPublishing(true);
  try {
    const { data } = await axios.post(
      `${API_BASE}/api/professor/theses/${openId}/announcement`,
      { text: txt },
      { headers } 
    );
    alert(data?.message || "Η ανακοίνωση δημοσιεύτηκε.");
  } catch (e) {
    alert(e?.response?.data?.error || "Αποτυχία δημοσίευσης.");
  } finally {
    setPublishing(false);
  }
};



  const openGradingAction = async () => {
    try {
      await axios.post(`${API_BASE}/api/professor/theses/${openId}/grading/open`, {}, { headers });
      setGradingOpen(true);
      alert("Η βαθμολόγηση ενεργοποιήθηκε.");
    } catch (e) {
      alert(e?.response?.data?.error || "Αποτυχία ενεργοποίησης.");
    }
  };

  const submitGrade = async () => {
    const payload = {};
    for (const k of ["clarity", "originality", "methodology", "writing", "presentation"]) {
      const v = Number(gradeForm[k]);
      if (!Number.isInteger(v) || v < 0 || v > 10) {
        return alert("Κάθε κριτήριο πρέπει να είναι ακέραιος 0–10.");
      }
      payload[k] = v;
    }
    setGradeSaving(true);
    try {
      await axios.post(`${API_BASE}/api/professor/theses/${openId}/grades`, payload, { headers });
      await loadGrades();
      alert("Η βαθμολογία καταχωρήθηκε.");
    } catch (e) {
      alert(e?.response?.data?.error || "Αποτυχία καταχώρησης.");
    } finally {
      setGradeSaving(false);
    }
  };

  useEffect(() => {
    if (!openItem) return;
    if (activeTab === "invitations" && openItem.status === "under_assignment") loadInvitations();
    if (activeTab === "notes") loadNotes();
    if (activeTab === "review" && openItem.status === "under_review") loadDraft();
    if (activeTab === "grading" && openItem.status === "under_review") loadGrades();
  }, [activeTab, openItem, loadInvitations, loadNotes, loadDraft, loadGrades]);

  return (
    <div className="page">
      <h2>Διαχείριση Διπλωματικών Εργασιών</h2>

      <div className="toolbar">
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="supervisor">Ως Επιβλέπων</option>
          <option value="committee">Ως Μέλος Τριμελούς</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="under_assignment,active,under_review">Υπό Ανάθεση + Ενεργές + Υπό Εξέταση</option>
          <option value="under_assignment,active">Υπό Ανάθεση + Ενεργές</option>
          <option value="active">Μόνο Ενεργές</option>
          <option value="under_assignment">Μόνο Υπό Ανάθεση</option>
          <option value="under_review">Μόνο Υπό Εξέταση</option>
          <option value="">Όλες</option>
        </select>
      </div>

      {loading && <p>Φόρτωση…</p>}
      {!loading && err && <p className="error">{err}</p>}
      {!loading && !err && items.length === 0 && <p>Δεν υπάρχουν εγγραφές για τα επιλεγμένα φίλτρα.</p>}

      {!loading && !err && items.length > 0 && (
        <ul className="thesis-list">
          {items.map((t) => (
            <li key={t.id} className="thesis-item">
              <div className="thesis-head">
                <span className="thesis-title">{t.title}</span>
                <span className={`status-pill status-${String(t.status || "").replaceAll(" ", "_").replaceAll("-", "_")}`}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className="thesis-body">
                {t.assigned_at && (
                  <div className="thesis-meta muted small">Ανάθεση: {new Date(t.assigned_at).toLocaleString("el-GR")}</div>
                )}
                {t.student_name && (
                  <div className="thesis-meta">
                    Φοιτητής: {t.student_name}
                    {t.student_email ? ` (${t.student_email})` : ""}
                  </div>
                )}
              </div>
              <div className="thesis-actions">
                <button className="btn" onClick={() => openManage(t)}>
                  Διαχείριση
                </button>
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

      {openItem && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target.classList.contains("modal-backdrop") && closeManage()}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="muted small">ΔΕ #{openItem.id} • {statusLabel(openItem.status)}</div>
                <h4 className="mb-0">{openItem.title}</h4>
              </div>
              <button className="btn-close" onClick={closeManage} aria-label="Κλείσιμο">×</button>
            </div>

            <div className="tabs">
              <button
                className={activeTab === "summary" ? "tab active" : "tab"}
                onClick={() => setActiveTab("summary")}
              >
                Σύνοψη
              </button>

              {openItem.status === "under_assignment" && (
                <button
                  className={activeTab === "invitations" ? "tab active" : "tab"}
                  onClick={() => setActiveTab("invitations")}
                >
                  Προσκλήσεις
                </button>
              )}

              {(openItem.status === "active" || openItem.status === "under_review") && (
                <button
                  className={activeTab === "notes" ? "tab active" : "tab"}
                  onClick={() => setActiveTab("notes")}
                >
                  Σημειώσεις
                </button>
              )}

              {openItem.status === "active" && role === "supervisor" && (
                <button
                  className={activeTab === "actions" ? "tab active" : "tab"}
                  onClick={() => setActiveTab("actions")}
                >
                  Ενέργειες
                </button>
              )}

              {openItem.status === "under_review" && (
                <>
                  <button
                    className={activeTab === "review" ? "tab active" : "tab"}
                    onClick={() => setActiveTab("review")}
                  >
                    Υπό Εξέταση
                  </button>
                  <button
                    className={activeTab === "grading" ? "tab active" : "tab"}
                    onClick={() => setActiveTab("grading")}
                  >
                    Βαθμολόγηση
                  </button>
                </>
              )}
            </div>

            <div className="modal-body">
              {activeTab === "summary" && (
                <div className="card">
                  <div className="card-body">
                    <div className="muted small">
                      Φοιτητής: {openItem.student_name || "—"} {openItem.student_email ? `(${openItem.student_email})` : ""}
                    </div>
                    <div className="muted small">
                      Ανάθεση: {openItem.assigned_at ? new Date(openItem.assigned_at).toLocaleString("el-GR") : "—"}
                    </div>

                    {openItem.status === "active" && role === "supervisor" && (
                      <div className="mt-1">
                        <button className="btn btn-secondary" onClick={markUnderReview}>
                          Μετάβαση σε «Υπό Εξέταση»
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "invitations" && (
                <div className="card">
                  <div className="card-header">Προσκλήσεις τριμελούς</div>
                  <div className="card-body">
                    <div className="mb-1">
                      <button className="btn btn-light" onClick={loadInvitations} disabled={invLoading}>
                        {invLoading ? "Φόρτωση..." : "Ανανέωση"}
                      </button>
                    </div>
                    {invitations.length === 0 ? (
                      <div className="muted">Δεν υπάρχουν προσκλήσεις.</div>
                    ) : (
                      <table className="tbl tbl-compact">
                        <thead>
                          <tr>
                            <th>Διδάσκων</th>
                            <th>Email</th>
                            <th>Κατάσταση</th>
                            <th>Πρόσκληση</th>
                            <th>Απάντηση</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invitations.map((inv) => (
                            <tr key={inv.id}>
                              <td>{inv.professor_name}</td>
                              <td>
                                <a href={`mailto:${inv.professor_email}`}>{inv.professor_email}</a>
                              </td>
                              <td>{inv.status}</td>
                              <td>{new Date(inv.invited_at).toLocaleString("el-GR")}</td>
                              <td>{inv.responded_at ? new Date(inv.responded_at).toLocaleString("el-GR") : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {role === "supervisor" && (
                      <div className="mt-1">
                        <button className="btn btn-danger" onClick={cancelUnderAssignment}>
                          Ακύρωση ανάθεσης
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "notes" && (
                <div className="card">
                  <div className="card-header">Οι σημειώσεις μου (ιδιωτικές)</div>
                  <div className="card-body">
                    <div className="mb-1">
                      <button className="btn btn-light" onClick={loadNotes} disabled={notesLoading}>
                        {notesLoading ? "Φόρτωση..." : "Ανανέωση"}
                      </button>
                    </div>
                    <div className="notes-box">
                      {notes.length === 0 ? (
                        <div className="muted">Δεν υπάρχουν σημειώσεις.</div>
                      ) : (
                        <ul className="notes-list">
                          {notes.map((n) => (
                            <li key={n.id}>
                              <div className="note-text">{n.note_text}</div>
                              <div className="note-meta">{new Date(n.created_at).toLocaleString("el-GR")}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="note-compose">
                      <textarea
                        maxLength={300}
                        placeholder="Γράψε σημείωση (μέχρι 300 χαρακτήρες)"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                      />
                      <div className="note-actions">
                        <span className="muted small">{noteText.length}/300</span>
                        <button className="btn" onClick={addNote} disabled={noteSaving || !noteText.trim()}>
                          {noteSaving ? "Αποθήκευση..." : "Αποθήκευση"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "actions" && openItem.status === "active" && role === "supervisor" && (
                <div className="card">
                  <div className="card-header">Ενέργειες για Ενεργή ΔΕ</div>
                  <div className="card-body">
                    <p className="muted small">
                      Για ακύρωση ενεργής ανάθεσης απαιτείται να έχουν παρέλθει 2 έτη από την ανάθεση, καθώς και
                      καταχώρηση στοιχείων Γ.Σ.
                    </p>
                    <ActiveCancelForm onSubmit={cancelActive} />
                  </div>
                </div>
              )}

              {activeTab === "review" && openItem.status === "under_review" && (
                <div className="card">
                  <div className="card-header">Υπό Εξέταση</div>
                  <div className="card-body">
                    <div className="mb-1">
                      <button className="btn btn-light" onClick={loadDraft} disabled={reviewLoading}>
                        {reviewLoading ? "Φόρτωση..." : "Προβολή draft"}
                      </button>
                    </div>
                    {draft ? (
                      <div className="muted small">
                        Draft από {draft.student_name} {draft.student_email ? `(${draft.student_email})` : ""} —
                        {draft.uploaded_at ? ` ανέβηκε ${new Date(draft.uploaded_at).toLocaleString("el-GR")}` : ""}
                        {draft.file_name ? (
                          <>
                            {" • "}
                            {draft.file_name === "link" ? (
                              <a href={draft.file_path} target="_blank" rel="noreferrer">
                                Άνοιγμα συνδέσμου
                              </a>
                            ) : (
                              <a href={`${API_BASE}/uploads/${draft.file_path}`} target="_blank" rel="noreferrer">
                                Λήψη αρχείου
                              </a>
                            )}
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="muted">Δεν βρέθηκε draft.</div>
                    )}

                    <hr />

                    {role === "supervisor" && (
                      <>
                        <div className="mb-1">
                          <button className="btn" onClick={loadAnnouncement} disabled={annLoading}>
                            {annLoading ? "Δημιουργία..." : "Παραγωγή ανακοίνωσης παρουσίασης"}
                          </button>
                          {" "}
                          <button
                            className="btn btn-secondary"
                            onClick={publishAnnouncement}
                            disabled={publishing || !announcementText.trim()}
                            title={!announcementText.trim() ? "Πρώτα παραγωγή ανακοίνωσης" : "Δημοσίευση"}
                          >
                            {publishing ? "Δημοσίευση..." : "Δημοσίευση ανακοίνωσης"}
                          </button>
                        </div>
                        <pre className="announcement-box">{announcementText || "—"}</pre>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "grading" && openItem.status === "under_review" && (
                <div className="card">
                  <div className="card-header">Βαθμολόγηση</div>
                  <div className="card-body">
                    {!gradingOpen && role === "supervisor" && (
                      <div className="mb-1">
                        <button className="btn" onClick={openGradingAction}>
                          Άνοιγμα βαθμολόγησης
                        </button>
                      </div>
                    )}

                    <div className="grade-form">
                      {["clarity", "originality", "methodology", "writing", "presentation"].map((k) => (
                        <div className="grade-field" key={k}>
                          <label>{labelOf(k)}</label>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={gradeForm[k]}
                            onChange={(e) => setGradeForm((f) => ({ ...f, [k]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <div className="grade-actions">
                        <button className="btn" onClick={submitGrade} disabled={gradeSaving}>
                          {gradeSaving ? "Καταχώρηση..." : "Καταχώρηση βαθμού"}
                        </button>
                        <button className="btn btn-light" onClick={loadGrades} disabled={gradesLoading}>
                          {gradesLoading ? "Φόρτωση..." : "Ανανέωση βαθμών"}
                        </button>
                      </div>
                    </div>

                    <div className="grades-list">
                      {grades.length === 0 ? (
                        <div className="muted">Δεν υπάρχουν καταχωρημένοι βαθμοί.</div>
                      ) : (
                        <table className="tbl tbl-compact">
                          <thead>
                            <tr>
                              <th>Μέλος</th>
                              <th>Σαφήνεια</th>
                              <th>Πρωτοτυπία</th>
                              <th>Μεθοδολογία</th>
                              <th>Συγγραφή</th>
                              <th>Παρουσίαση</th>
                              <th>Σύνολο</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grades.map((g) => (
                              <tr key={g.professor_id}>
                                <td>{g.professor_name}</td>
                                <td>{g.clarity}</td>
                                <td>{g.originality}</td>
                                <td>{g.methodology}</td>
                                <td>{g.writing}</td>
                                <td>{g.presentation}</td>
                                <td>{g.total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeManage}>
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function labelOf(k) {
  return {
    clarity: "Σαφήνεια",
    originality: "Πρωτοτυπία",
    methodology: "Μεθοδολογία",
    writing: "Συγγραφή",
    presentation: "Παρουσίαση",
  }[k];
}

function ActiveCancelForm({ onSubmit }) {
  const [gsNumber, setGsNumber] = useState("");
  const [gsYear, setGsYear] = useState("");

  return (
    <div className="active-cancel">
      <div className="field">
        <label>Αρ. Γ.Σ.</label>
        <input value={gsNumber} onChange={(e) => setGsNumber(e.target.value)} placeholder="π.χ. 123/2025" />
      </div>
      <div className="field">
        <label>Έτος Γ.Σ.</label>
        <input type="number" min="1900" max="2100" value={gsYear} onChange={(e) => setGsYear(e.target.value)} />
      </div>
      <div>
        <button className="btn btn-danger" onClick={() => onSubmit(gsNumber, Number(gsYear))}>
          Ακύρωση ενεργής ανάθεσης
        </button>
      </div>
    </div>
  );
}
