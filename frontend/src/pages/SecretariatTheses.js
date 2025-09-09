import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import "./SecretariatTheses.css";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "";

const statusLabel = (s) =>
  ({ active: "Ενεργή", under_review: "Υπό Εξέταση", under_assignment: "Υπό Ανάθεση", available: "Διαθέσιμη", completed: "Ολοκληρωμένη" }[s] || s);

const badgeClass = (s) =>
  ({ active: "badge bg-success", under_review: "badge bg-warning text-dark", under_assignment: "badge bg-secondary", available: "badge bg-info text-dark", completed: "badge bg-dark" }[s] || "badge bg-light text-dark");

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" });
};

export default function SecretariatTheses() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }),
    [auth?.token]
  );

  useEffect(() => {
    if (auth?.role !== "secretary") {
      setError("Απαγορεύεται: απαιτείται ρόλος Γραμματείας.");
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/api/secretary/theses`, { headers, signal: ctrl.signal });
        if (!res.ok) throw new Error((await res.json())?.error || "Σφάλμα φόρτωσης");
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name !== "AbortError") setError(e?.message || "Σφάλμα φόρτωσης");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [auth?.role, headers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        String(r.thesis_id || "").includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.supervisor_name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openDetails = async (id) => {
    setSelectedId(id);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/secretary/theses/${id}`, { headers });
      if (!res.ok) throw new Error((await res.json())?.error || "Σφάλμα ανάκτησης λεπτομερειών");
      const data = await res.json();
      setSummary(data?.summary || null);
      setMembers(data?.members || []);
    } catch (e) {
      setSummary(null);
      setMembers([]);
      setError(e?.message || "Σφάλμα ανάκτησης λεπτομερειών");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedId(null);
    setSummary(null);
    setMembers([]);
  };

  return (
    <div className="sec-page">
      <div className="sec-header">
        <button type="button" className="btn btn-light btn-sm" onClick={goBack}>
          ← Πίσω
        </button>
        <h2 className="me-auto">Προβολή Διπλωματικών (Γραμματεία)</h2>
        <input
          className="search-input"
          placeholder="Αναζήτηση τίτλου/περιγραφής/ID/επιβλέποντα..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="center py-5">
          <div className="spinner" />
          <div className="mt-2">Φόρτωση...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="info-box">Δεν βρέθηκαν ΔΕ σε «Ενεργή» ή «Υπό Εξέταση».</div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 90 }}>ID</th>
                <th>Τίτλος</th>
                <th style={{ width: 150 }}>Κατάσταση</th>
                <th style={{ width: 220 }}>Επιβλέπων</th>
                <th>Τριμελής</th>
                <th style={{ width: 200 }}>Ανάθεση</th>
                <th style={{ width: 160 }}>Χρόνος</th>
                <th style={{ width: 110 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.thesis_id}>
                  <td>{r.thesis_id}</td>
                  <td>
                    <div className="title">{r.title}</div>
                    {!!r.description && (
                      <div className="muted truncate" title={r.description}>
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={badgeClass(r.status)}>{statusLabel(r.status)}</span>
                  </td>
                  <td>
                    {r.supervisor_name ? (
                      <>
                        <div className="title">{r.supervisor_name}</div>
                        <div className="muted">
                          {r.supervisor_email ? <a href={`mailto:${r.supervisor_email}`}>{r.supervisor_email}</a> : null}
                          {r.supervisor_specialty ? <> • {r.supervisor_specialty}</> : null}
                        </div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {r.committee_members ? (
                      <>
                        <span>{r.committee_members}</span>
                        <span className="count-badge">{r.committee_count || 0}</span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{fmtDate(r.assigned_at)}</td>
                  <td>{r.elapsed_since_assignment || "—"}</td>
                  <td className="text-end">
                    <button className="btn btn-primary btn-sm" onClick={() => openDetails(r.thesis_id)}>
                      Λεπτομέρειες
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailsOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target.classList.contains("modal-backdrop") && closeDetails()}
        >
          <div className="modal">
            <div className="modal-header">
              <h5>Λεπτομέρειες ΔΕ #{selectedId}</h5>
              <button className="btn-close" onClick={closeDetails} aria-label="Κλείσιμο">
                ×
              </button>
            </div>
            <div className="modal-body">
              {detailsLoading ? (
                <div className="center py-4">
                  <div className="spinner" />
                  <div>Φόρτωση...</div>
                </div>
              ) : summary ? (
                <>
                  <div className="summary">
                    <div className="chips">
                      <span className={badgeClass(summary.status)}>{statusLabel(summary.status)}</span>
                      <span className="muted">Από: {fmtDate(summary.assigned_at)}</span>
                      <span>•</span>
                      <span className="muted">Χρόνος: {summary.elapsed_since_assignment || "—"}</span>
                    </div>
                    <h4 className="mb-1">{summary.title}</h4>
                    {!!summary.description && <p className="mb-0">{summary.description}</p>}
                  </div>

                  <div className="card" style={{ marginBottom: ".75rem" }}>
                    <div className="card-header">Επιβλέπων</div>
                    <div className="card-body">
                      {summary.supervisor_name ? (
                        <>
                          <div className="title">{summary.supervisor_name}</div>
                          <div className="muted">
                            {summary.supervisor_email ? (
                              <a href={`mailto:${summary.supervisor_email}`}>{summary.supervisor_email}</a>
                            ) : null}
                            {summary.supervisor_specialty ? <> • {summary.supervisor_specialty}</> : null}
                          </div>
                        </>
                      ) : (
                        <div className="muted">—</div>
                      )}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">Μέλη τριμελούς (accepted)</div>
                    <div className="card-body">
                      {members.length === 0 ? (
                        <div className="muted">Δεν έχουν οριστεί μέλη (accepted).</div>
                      ) : (
                        <table className="tbl tbl-compact">
                          <thead>
                            <tr>
                              <th>Ονοματεπώνυμο</th>
                              <th>Email</th>
                              <th>Ειδίκευση</th>
                            </tr>
                          </thead>
                          <tbody>
                            {members.map((m) => (
                              <tr key={m.professor_id}>
                                <td>{m.professor_name}</td>
                                <td>
                                  <a href={`mailto:${m.professor_email}`}>{m.professor_email}</a>
                                </td>
                                <td>{m.professor_specialty || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="info-box">Δεν βρέθηκαν στοιχεία.</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeDetails}>
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
