import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import "./ManageThesis.css";
import { useNavigate } from "react-router-dom";

import {
  uploadDraft, addMaterialLink, listMaterials,
  setPresentation, getPresentation, setNimerisUrl, getMinutes
} from "../api/Student";

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

  const [status, setStatus] = useState("");           
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [professors, setProfessors] = useState([]);   
  const [invitations, setInvitations] = useState([]); 
  const [selectedProfessor, setSelectedProfessor] = useState("");

  const [thesisId, setThesisId] = useState(null);
  const [tab, setTab] = useState("materials"); 

  const [materials, setMaterials] = useState([]);
  const [draftUploading, setDraftUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [opBusy, setOpBusy] = useState(false);

  const [presentation, setPresentationState] = useState({
    mode: "in_person", room: "", join_link: "", exam_datetime: ""
  });

  const [nimerisUrl, setNimerisUrlText] = useState("");

  const [minutesHtml, setMinutesHtml] = useState("");
  const [minutesSource, setMinutesSource] = useState("");

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
      setThesisId(invRes.data?.thesisId || null);

      if ((invRes.data?.status || "") === "under_review" && invRes.data?.thesisId) {
        const id = invRes.data.thesisId;
        try {
          const pres = await getPresentation(auth.token, id);
          setPresentationState({
            mode: pres.mode || "in_person",
            room: pres.room || "",
            join_link: pres.join_link || "",
            exam_datetime: pres.exam_datetime ? pres.exam_datetime.slice(0,16) : "" 
          });
        } catch (_) {  }

        
        try {
          const mats = await listMaterials(auth.token, id);
          setMaterials(mats || []);
        } catch (_) {}

      
        try {
          const m = await getMinutes(auth.token, id);
          setMinutesHtml(m.html || "");
          setMinutesSource(m.source || "");
        } catch (_) {  }
      }

    } catch (err) {
      setError(err?.response?.data?.error || "Σφάλμα φόρτωσης δεδομένων");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    
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

  const doUploadDraft = async (file) => {
    if (!file || !thesisId) return;
    setDraftUploading(true);
    setError("");
    try {
      await uploadDraft(auth.token, thesisId, file);
      const mats = await listMaterials(auth.token, thesisId);
      setMaterials(mats || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Αποτυχία ανεβάσματος αρχείου");
    } finally {
      setDraftUploading(false);
    }
  };

  const doAddLink = async () => {
    if (!linkUrl || !thesisId) return;
    setOpBusy(true);
    setError("");
    try {
      await addMaterialLink(auth.token, thesisId, linkUrl);
      setLinkUrl("");
      const mats = await listMaterials(auth.token, thesisId);
      setMaterials(mats || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Αποτυχία προσθήκης συνδέσμου");
    } finally {
      setOpBusy(false);
    }
  };

  const savePresentation = async () => {
    if (!thesisId) return;
    setOpBusy(true);
    setError("");
    try {
      const payload = { ...presentation };
      await setPresentation(auth.token, thesisId, payload);
    } catch (err) {
      setError(err?.response?.data?.error || "Αποτυχία αποθήκευσης παρουσίασης");
    } finally {
      setOpBusy(false);
    }
  };

  const saveNimeris = async () => {
    if (!thesisId || !nimerisUrl) return;
    setOpBusy(true);
    setError("");
    try {
      await setNimerisUrl(auth.token, thesisId, nimerisUrl);
      setNimerisUrlText("");
    } catch (err) {
      setError(err?.response?.data?.error || "Αποτυχία καταχώρησης Νημερτής");
    } finally {
      setOpBusy(false);
    }
  };

  const loadMinutes = async () => {
    if (!thesisId) return;
    setOpBusy(true);
    setError("");
    try {
      const m = await getMinutes(auth.token, thesisId);
      setMinutesHtml(m.html || "");
      setMinutesSource(m.source || "");
    } catch (err) {
      setError(err?.response?.data?.error || "Δεν βρέθηκε πρακτικό");
    } finally {
      setOpBusy(false);
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
          {status === "under_assignment" && (
            <span className="accepted-pill">Αποδεκτοί: {acceptedCount}/2</span>
          )}
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
        ) : status === "under_review" ? (
          <>
            <div className="tabs">
              <button className={tab==="materials" ? "active" : ""} onClick={() => setTab("materials")}>Υλικό</button>
              <button className={tab==="presentation" ? "active" : ""} onClick={() => setTab("presentation")}>Παρουσίαση</button>
              <button className={tab==="nimeris" ? "active" : ""} onClick={() => setTab("nimeris")}>Νημερτής</button>
              <button className={tab==="minutes" ? "active" : ""} onClick={() => setTab("minutes")}>Πρακτικό</button>
            </div>

            {tab === "materials" && (
              <div className="pane">
                <h3>Ανάρτηση πρόχειρου & σύνδεσμοι</h3>
                <div className="row">
                  <label className="file-upload">
                    <input
                      type="file"
                      onChange={(e) => doUploadDraft(e.target.files?.[0])}
                      disabled={draftUploading}
                    />
                    <span>{draftUploading ? "Ανέβασμα..." : "Επιλογή αρχείου"}</span>
                  </label>
                </div>
                <div className="row">
                  <input
                    type="url"
                    placeholder="Προσθήκη συνδέσμου (Drive/YouTube κ.λπ.)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                  <button onClick={doAddLink} disabled={opBusy || !linkUrl}>Προσθήκη</button>
                </div>

                <h4>Υλικό</h4>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Όνομα</th>
                      <th>Δεδομένα</th>
                      <th>Ημ/νία</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.length === 0 ? (
                      <tr><td colSpan="3" className="muted">Δεν υπάρχει υλικό ακόμη.</td></tr>
                    ) : materials.map(m => (
                      <tr key={m.id}>
                        <td>{m.file_name}</td>
                        <td>
                          {m.file_name === "link"
                            ? <a href={m.file_path} target="_blank" rel="noreferrer">{m.file_path}</a>
                            : <span className="muted">{m.file_path}</span> 
                          }
                        </td>
                        <td>{new Date(m.uploaded_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "presentation" && (
              <div className="pane">
                <h3>Λεπτομέρειες παρουσίασης</h3>
                <div className="row">
                  <label>Τρόπος</label>
                  <select
                    value={presentation.mode}
                    onChange={(e)=> setPresentationState(p => ({...p, mode: e.target.value}))}
                  >
                    <option value="in_person">Δια ζώσης</option>
                    <option value="online">Διαδικτυακά</option>
                  </select>
                </div>
                {presentation.mode === "in_person" ? (
                  <div className="row">
                    <label>Αίθουσα</label>
                    <input
                      value={presentation.room}
                      onChange={(e)=> setPresentationState(p => ({...p, room: e.target.value}))}
                      placeholder="π.χ. Αμφ. 1"
                    />
                  </div>
                ) : (
                  <div className="row">
                    <label>Σύνδεσμος</label>
                    <input
                      value={presentation.join_link}
                      onChange={(e)=> setPresentationState(p => ({...p, join_link: e.target.value}))}
                      placeholder="https://…"
                    />
                  </div>
                )}
                <div className="row">
                  <label>Ημερομηνία & ώρα</label>
                  <input
                    type="datetime-local"
                    value={presentation.exam_datetime}
                    onChange={(e)=> setPresentationState(p => ({...p, exam_datetime: e.target.value}))}
                  />
                </div>
                <div className="row">
                  <button onClick={savePresentation} disabled={opBusy}>Αποθήκευση</button>
                </div>
              </div>
            )}

            {tab === "nimeris" && (
              <div className="pane">
                <h3>Σύνδεσμος Νημερτής</h3>
                <div className="row">
                  <input
                    type="url"
                    placeholder="https://nimertis…"
                    value={nimerisUrl}
                    onChange={(e)=> setNimerisUrlText(e.target.value)}
                  />
                  <button onClick={saveNimeris} disabled={opBusy || !nimerisUrl}>Καταχώριση</button>
                </div>
                <p className="muted">Ο σύνδεσμος αποθηκεύεται στη διπλωματική και χρησιμοποιείται από τη Γραμματεία για να ολοκληρώσει τη διαδικασία.</p>
              </div>
            )}

            {tab === "minutes" && (
              <div className="pane">
                <h3>Πρακτικό εξέτασης</h3>
                <div className="row">
                  <button onClick={loadMinutes} disabled={opBusy}>Ανανέωση πρακτικού</button>
                  {minutesSource && <span className="muted"> (πηγή: {minutesSource})</span>}
                </div>
                {minutesHtml ? (
                  <iframe
                    title="minutes"
                    className="minutes-frame"
                    srcDoc={minutesHtml}
                  />
                ) : (
                  <div className="info-box">Δεν υπάρχει διαθέσιμο πρακτικό ακόμη.</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="muted">
            Η διπλωματική δεν είναι σε "Υπό ανάθεση" ή "Υπό εξέταση".
          </div>
        )}

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
