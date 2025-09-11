import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProfessorThesesList.css";
import {
  fetchManagedTheses,
  fetchManagedThesesBoth,
  fetchThesisInvitations,
  fetchThesisGrades,
  fetchLatestDraft,
  getPresentationAnnouncement,
  fetchThesisHistory,
  submitThesisGrade,
} from "../api/Professor";

const ALL_STATUSES = [
  { key: "under_assignment", label: "Υπό ανάθεση" },
  { key: "active",           label: "Ενεργή" },
  { key: "under_review",     label: "Υπό εξέταση" },
  { key: "completed",        label: "Περατωμένη" },
];

// === Μεταφράσεις στα Ελληνικά ===
const STATUS_LABELS = {
  available: "Διαθέσιμη",
  under_assignment: "Υπό ανάθεση",
  active: "Ενεργή",
  under_review: "Υπό εξέταση",
  completed: "Περατωμένη",
  cancelled: "Ακυρωμένη",
};
const ROLE_LABELS = {
  supervisor: "επιβλέπων/ουσα",
  committee: "μέλος τριμελούς",
};
const INV_STATUS_LABELS = {
  pending: "σε εκκρεμότητα",
  accepted: "αποδεκτή",
  declined: "απορρίφθηκε",
};
const tStatus = (s) => STATUS_LABELS[s] ?? s;
const tRole   = (r) => ROLE_LABELS[r] ?? r;
const tInv    = (s) => INV_STATUS_LABELS[s] ?? s;

function toCSV(rows) {
  if (!rows?.length) return "";
  const header = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) lines.push(header.map(k => esc(r[k])).join(","));
  return lines.join("\n");
}

function download(name, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function ProfessorThesesList() {
  const [role, setRole] = useState("both"); // both | supervisor | committee
  const [statusSet, setStatusSet] = useState(() => new Set(ALL_STATUSES.map(s => s.key)));
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({
    invitations: null,
    grades: null,
    avgTotal: null,
    draft: null,
    announcement: null,
    history: null,
  });

  // --- Grade form state ---
  const [gradeForm, setGradeForm] = useState({
    clarity: "", originality: "", methodology: "", writing: "", presentation: ""
  });
  const setGrade = (k, val) => {
    if (val === "") return setGradeForm(f => ({ ...f, [k]: "" }));
    const n = Math.max(0, Math.min(10, parseInt(val, 10) || 0));
    setGradeForm(f => ({ ...f, [k]: n }));
  };
  const formTotal = useMemo(() => {
    const nums = ["clarity","originality","methodology","writing","presentation"].map(k => Number(gradeForm[k]));
    return nums.some(n => Number.isNaN(n)) ? null : nums.reduce((a,c)=>a+c,0);
  }, [gradeForm]);
  const formValid = useMemo(() => {
    return ["clarity","originality","methodology","writing","presentation"].every(k => {
      const v = Number(gradeForm[k]);
      return Number.isInteger(v) && v >= 0 && v <= 10;
    });
  }, [gradeForm]);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Πάντα φέρνουμε "όλες" και φιλτράρουμε client-side
  const { data: rawList, isLoading, error, refetch } = useQuery({
    queryKey: ["prof-theses-list", role],
    queryFn: () =>
      role === "both"
        ? fetchManagedThesesBoth()
        : fetchManagedTheses({ role }).then(rows => rows.map(r => ({ ...r, role }))),
  });

  const visible = useMemo(() => {
    const filterSet = statusSet.size === ALL_STATUSES.length ? null : statusSet;
    return (rawList || []).filter(r => !filterSet ? true : filterSet.has(r.status));
  }, [rawList, statusSet]);

  const toggleStatus = (k) => {
    setStatusSet(prev => {
      const copy = new Set(prev);
      copy.has(k) ? copy.delete(k) : copy.add(k);
      return copy;
    });
  };

  const exportRows = useMemo(() => {
    return (visible || []).map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      role: r.role,
      student_id: r.student_id,
      student_name: r.student_name,
      student_email: r.student_email,
      assigned_at: r.assigned_at || "",
      pdf_file: r.pdf_file || "",
    }));
  }, [visible]);

  // Φόρτωση λεπτομερειών
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selected) {
        setDetails({ invitations: null, grades: null, avgTotal: null, draft: null, announcement: null, history: null });
        return;
      }
      try {
        const [invitations, grades, draft, announcement, historyResp] = await Promise.allSettled([
          fetchThesisInvitations(selected.id),
          fetchThesisGrades(selected.id),
          fetchLatestDraft(selected.id),
          getPresentationAnnouncement(selected.id),
          fetchThesisHistory(selected.id),
        ]);
        const okInv   = invitations.status === "fulfilled" ? invitations.value : [];
        const okGrades= grades.status === "fulfilled" ? grades.value : [];
        // Μέσος τελικός /10 (άθροισμα κριτηρίων είναι 0–50)
        const avg     = okGrades.length ? (okGrades.reduce((a, c) => a + Number(c.total || 0), 0) / okGrades.length / 5).toFixed(2) : null;
        const okDraft = draft.status === "fulfilled" ? draft.value : null;
        const okAnn   = announcement.status === "fulfilled" ? announcement.value : null;
        const okHist  = historyResp.status === "fulfilled" ? historyResp.value : [];
        if (!cancelled) setDetails({ invitations: okInv, grades: okGrades, avgTotal: avg, draft: okDraft, announcement: okAnn, history: okHist });
      } catch (_) {}
    }
    load();
    return () => { cancelled = true; };
  }, [selected]);

  // === Actions ===
  const token = localStorage.getItem("token");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  async function markUnderReview(thesisId) {
    try {
      await axios.patch(`/api/professor/theses/${thesisId}/under-review`, {}, auth);
      queryClient.setQueryData(["prof-theses-list", role], (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((row) =>
          row.id === thesisId ? { ...row, status: "under_review" } : row
        );
      });
      setSelected((prev) => (prev && prev.id === thesisId ? { ...prev, status: "under_review" } : prev));
      queryClient.invalidateQueries({ queryKey: ["prof-theses-list"] });
      if (!statusSet.has("under_review")) {
        window.alert('Η κατάσταση έγινε "Υπό εξέταση". Με τα τρέχοντα φίλτρα ίσως να μην εμφανίζεται στη λίστα.');
      } else {
        window.alert("Έγινε Υπό Εξέταση");
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      window.alert("Αποτυχία: " + msg);
      console.error("markUnderReview failed:", e);
    }
  }

  async function openGrading(thesisId) {
    try {
      await axios.patch(`/api/professor/theses/${thesisId}/grading/open`, {}, auth);
      window.alert("Η βαθμολόγηση ενεργοποιήθηκε");
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      window.alert("Αποτυχία: " + msg);
      console.error("openGrading failed:", e);
    }
  }

  async function cancelAssignment(thesisId, status) {
    try {
      if (status === "under_assignment") {
        await axios.delete(`/api/professor/theses/${thesisId}/assignment`, auth);
      } else if (status === "active") {
        const gs_number = window.prompt("Αριθμός Γ.Σ. για ακύρωση ενεργής ΔΕ:");
        const gs_year = window.prompt("Έτος Γ.Σ.:");
        if (!gs_number || !gs_year) return;
        await axios.post(`/api/professor/theses/${thesisId}/cancel-assignment`, { gs_number, gs_year }, auth);
      } else {
        window.alert("Η ακύρωση επιτρέπεται μόνο σε υπό ανάθεση ή ενεργή.");
        return;
      }
      window.alert("Η ανάθεση ακυρώθηκε");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["prof-theses-list"] });
      refetch();
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      window.alert("Αποτυχία: " + msg);
      console.error("cancelAssignment failed:", e);
    }
  }

  async function publishAnnouncement(thesisId) {
    try {
      const text = window.prompt("Κείμενο ανακοίνωσης παρουσίασης:");
      if (!text) return;
      await axios.post(`/api/professor/theses/${thesisId}/announcement`, { text }, auth);
      window.alert("Η ανακοίνωση δημοσιεύτηκε");
      setDetails(prev => ({ ...(prev || {}), announcement: { text } }));
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      window.alert("Αποτυχία: " + msg);
      console.error("publishAnnouncement failed:", e);
    }
  }

  async function onSubmitGrade() {
    if (!selected) return;
    if (!formValid) { window.alert("Συμπλήρωσε ακέραιους 0–10 σε όλα τα πεδία."); return; }
    try {
      await submitThesisGrade(selected.id, {
        clarity: Number(gradeForm.clarity),
        originality: Number(gradeForm.originality),
        methodology: Number(gradeForm.methodology),
        writing: Number(gradeForm.writing),
        presentation: Number(gradeForm.presentation),
      });
      window.alert("Η βαθμολογία καταχωρήθηκε.");
      const fresh = await fetchThesisGrades(selected.id);
      const avg   = fresh.length ? (fresh.reduce((a,c)=>a+Number(c.total||0),0)/fresh.length/5).toFixed(2) : null;
      setDetails(d => ({ ...(d||{}), grades: fresh, avgTotal: avg }));
      setGradeForm({ clarity:"", originality:"", methodology:"", writing:"", presentation:"" });
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      window.alert("Αποτυχία: " + msg);
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Λίστα διπλωματικών</h2>

      {/* Toolbar */}
      <div className="toolbar">
        <div>
          <label><strong>Ρόλος:</strong>{" "}</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="both">Και οι δύο (επιβλέπων + τριμελής)</option>
            <option value="supervisor">Μόνο ως επιβλέπων/ουσα</option>
            <option value="committee">Μόνο ως μέλος τριμελούς</option>
          </select>
        </div>

        <div className="status-filters">
          <strong>Καταστάσεις:</strong>{" "}
          {ALL_STATUSES.map(s => (
            <label key={s.key} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={statusSet.has(s.key)}
                onChange={() => toggleStatus(s.key)}
              />{" "}
              {s.label}
            </label>
          ))}
        </div>

        <button className="btn" onClick={() => refetch()}>Ανανέωση</button>

        <div className="export-actions">
          <button
            className="btn btn-light"
            onClick={() => download("theses.json", JSON.stringify(exportRows, null, 2), "application/json")}
          >
            Εξαγωγή JSON
          </button>
          <button
            className="btn btn-light"
            onClick={() => download("theses.csv", toCSV(exportRows), "text/csv")}
          >
            Εξαγωγή CSV
          </button>
        </div>
      </div>

      {/* Grid list */}
      {isLoading && <p>Φόρτωση...</p>}
      {error && <p>Σφάλμα φόρτωσης.</p>}
      {!isLoading && !error && (
        <div className="ptl-grid">
          <div className="ptl-th">Θέμα</div>
          <div className="ptl-th">Φοιτητής/τρια</div>
          <div className="ptl-th">Κατάσταση</div>
          <div className="ptl-th col-role">Ρόλος</div>
          <div className="ptl-th">Ενέργειες</div>

          {visible.map(row => (
            <FragmentRow key={`${row.role || "r"}-${row.id}`} row={row} onView={() => setSelected(row)} />
          ))}
        </div>
      )}

      {/* Details card */}
      {selected && (
        <div className="card card--wide">
          <div className="card-header">
            <div>{selected.title}</div>
            <button className="btn btn-light" onClick={() => setSelected(null)}>Κλείσιμο</button>
          </div>
          <div className="card-body">
            <p className="mb-0">
              <strong>Φοιτητής/τρια:</strong> {selected.student_name} ({selected.student_email})<br/>
              <strong>Κατάσταση:</strong>{" "}
              <span className={"status-pill status-" + selected.status}>{tStatus(selected.status)}</span>
              &nbsp;|&nbsp; <strong>Ρόλος:</strong> {tRole(selected.role)}<br/>
              {selected.assigned_at && (<><strong>Ανάθεση:</strong> {new Date(selected.assigned_at).toLocaleString("el-GR")} <br/></>)}
              {selected.pdf_file && (
                <>
                  <strong>Περιγραφή θέματος (PDF):</strong>{" "}
                  <a href={`http://localhost:5000/uploads/${selected.pdf_file}`} target="_blank" rel="noreferrer">
                    Λήψη αρχείου
                  </a>
                  <br/>
                </>
              )}
            </p>

            {/* Action buttons — μόνο για επιβλέποντα (2×2 grid) */}
            {selected.role === "supervisor" && (
              <div className="thesis-actions">
                <button
                  className="btn"
                  onClick={() => markUnderReview(selected.id)}
                  disabled={selected.status !== "active"}
                  title="Διαθέσιμο μόνο όταν είναι 'active'"
                >
                  Μετάβαση σε «Υπό Εξέταση»
                </button>

                <button
                  className="btn"
                  onClick={() => openGrading(selected.id)}
                  disabled={selected.status !== "under_review"}
                  title="Διαθέσιμο μόνο όταν είναι 'under_review'"
                >
                  Ενεργοποίηση Βαθμολόγησης
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => cancelAssignment(selected.id, selected.status)}
                  disabled={!(selected.status === "under_assignment" || selected.status === "active")}
                >
                  Ακύρωση Ανάθεσης
                </button>

                <button className="btn" onClick={() => publishAnnouncement(selected.id)}>
                  Δημοσίευση Ανακοίνωσης
                </button>
              </div>
            )}

            {/* Committee / Invitations */}
            <section className="section">
              <h4>Τριμελής</h4>
              <div className="section-content">
                {!details.invitations && <p>—</p>}
                {Array.isArray(details.invitations) && details.invitations.length === 0 && <p>Δεν βρέθηκαν προσκλήσεις.</p>}
                {Array.isArray(details.invitations) && details.invitations.length > 0 && (
                  <ul>
                    {details.invitations.map(inv => (
                      <li key={inv.id}>
                        {inv.professor_name} &lt;{inv.professor_email}&gt; — {tInv(inv.status)}
                        {inv.invited_at && ` (πρόσκληση: ${new Date(inv.invited_at).toLocaleString("el-GR")})`}
                        {inv.responded_at && ` (απάντηση: ${new Date(inv.responded_at).toLocaleString("el-GR")})`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Grade form (όψη όπως στη Διαχείριση) */}
            <section className="section">
              <h4>Βαθμολόγηση</h4>
              <div className="section-content">
                {selected.status !== "under_review" ? (
                  <p>Η υποβολή βαθμού είναι διαθέσιμη μόνο όταν η διπλωματική είναι <em>Υπό εξέταση</em>.</p>
                ) : !selected.grading_open ? (
                  <p>Η βαθμολόγηση δεν έχει ενεργοποιηθεί ακόμη από τον/την επιβλέποντα/ουσα.</p>
                ) : (
                  <div className="grade-form">
                    <div className="grade-row">
                      <div className="grade-field">
                        <label>Σαφήνεια</label>
                        <input type="number" min="0" max="10" step="1"
                          value={gradeForm.clarity} onChange={e => setGrade("clarity", e.target.value)} />
                      </div>
                      <div className="grade-field">
                        <label>Πρωτοτυπία</label>
                        <input type="number" min="0" max="10" step="1"
                          value={gradeForm.originality} onChange={e => setGrade("originality", e.target.value)} />
                      </div>
                      <div className="grade-field">
                        <label>Μεθοδολογία</label>
                        <input type="number" min="0" max="10" step="1"
                          value={gradeForm.methodology} onChange={e => setGrade("methodology", e.target.value)} />
                      </div>
                      <div className="grade-field">
                        <label>Συγγραφή</label>
                        <input type="number" min="0" max="10" step="1"
                          value={gradeForm.writing} onChange={e => setGrade("writing", e.target.value)} />
                      </div>
                      <div className="grade-field">
                        <label>Παρουσίαση</label>
                        <input type="number" min="0" max="10" step="1"
                          value={gradeForm.presentation} onChange={e => setGrade("presentation", e.target.value)} />
                      </div>
                    </div>

                    <div className="grade-actions">
                      <button className="btn" onClick={onSubmitGrade} disabled={!formValid}>Καταχώρηση βαθμού</button>
                      <button
                        className="btn btn-light"
                        onClick={async () => {
                          const fresh = await fetchThesisGrades(selected.id);
                          const avg = fresh.length ? (fresh.reduce((a,c)=>a+Number(c.total||0),0)/fresh.length/5).toFixed(2) : null;
                          setDetails(d => ({ ...(d||{}), grades: fresh, avgTotal: avg }));
                        }}
                      >
                        Ανανέωση βαθμών
                      </button>
                      <div className="grade-total">Σύνολο: {formTotal ?? "—"}</div>
                    </div>

                    <div className="grade-hint">Συμπλήρωσε ακέραιους 0–10 σε κάθε πεδίο.</div>
                  </div>
                )}

                {/* Πίνακας/μήνυμα υφιστάμενων βαθμών */}
                {Array.isArray(details.grades) && details.grades.length > 0 ? (
                  <>
                    <p style={{ marginTop: 10 }}><strong>Μέσος τελικός:</strong> {details.avgTotal} / 10</p>
                    <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
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
                        {details.grades.map(g => (
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
                  </>
                ) : (
                  <p style={{ marginTop: 10 }}>Δεν υπάρχουν καταχωρημένοι βαθμοί.</p>
                )}
              </div>
            </section>

            {/* Latest draft */}
            <section className="section">
              <h4>Τελευταίο draft</h4>
              <div className="section-content">
                {details.draft ? (
                  <p>
                    {details.draft.file_name} — {new Date(details.draft.uploaded_at).toLocaleString("el-GR")}{" "}
                    {details.draft.file_path && (
                      <a href={`http://localhost:5000/uploads/${details.draft.file_path}`} target="_blank" rel="noreferrer">Προβολή/Λήψη</a>
                    )}
                  </p>
                ) : <p>—</p>}
              </div>
            </section>

            {/* Announcement text */}
            <section className="section">
              <h4>Κείμενο ανακοίνωσης παρουσίασης (αν υπάρχει)</h4>
              <div className="section-content">
                {details.announcement?.text ? (
                  <div className="announcement-box">{details.announcement.text}</div>
                ) : <p>—</p>}
              </div>
            </section>

            {/* Timeline */}
            <section className="section">
              <h4>Χρονολόγιο κατάστασης</h4>
              <div className="section-content">
                {Array.isArray(details.history) && details.history.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {details.history.map(h => (
                      <li key={h.id} style={{ marginBottom: 8 }}>
                        <div>
                          <strong>{h.from_status ? tStatus(h.from_status) : "—"}</strong> → <strong>{tStatus(h.to_status)}</strong>
                          <span style={{ color: "#6b7280" }}>
                            {" • "}{new Date(h.created_at).toLocaleString("el-GR")}
                            {h.actor_name && ` • ${h.actor_name}`}
                            {h.actor_role && ` (${h.actor_role})`}
                          </span>
                        </div>
                        {h.note && <div style={{ color: "#374151" }}>{h.note}</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>—</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Footer with Back button (κάτω-κάτω) */}
      <div className="page-footer">
        <button className="back-button" onClick={() => navigate(-1)}>← Πίσω</button>
      </div>
    </div>
  );
}

function FragmentRow({ row, onView }) {
  return (
    <>
      <div className="ptl-td" title={row.title}>{row.title}</div>
      <div className="ptl-td">{row.student_name} <small>({row.student_email})</small></div>
      <div className="ptl-td"><span className={"status-pill status-" + row.status}>{tStatus(row.status)}</span></div>
      <div className="ptl-td col-role">{tRole(row.role)}</div>
      <div className="ptl-td"><button className="btn btn-light" onClick={onView}>Λεπτομέρειες</button></div>
    </>
  );
}
