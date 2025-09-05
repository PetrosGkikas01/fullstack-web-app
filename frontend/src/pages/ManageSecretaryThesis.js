// src/pages/ManageSecretaryThesis.js
import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  listTheses,
  getThesisDetails,
  setGSProtocol,
  cancelThesis,
  completeThesis,
} from "../api/Secretary";
import "./ManageSecretaryThesis.css";

const Badge = ({ status }) => {
  const map = {
    active: "Ενεργή",
    under_review: "Υπό εξέταση",
    completed: "Περατωμένη",
    available: "Διαθέσιμη",
    under_assignment: "Υπό ανάθεση",
  };
  return <span className={`badge status-${status}`}>{map[status] || status}</span>;
};

export default function ManageSecretaryThesis() {
  const { auth } = useContext(AuthContext);
  const hasToken = useMemo(() => !!auth?.token, [auth]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);

  // φορτωτές ενεργειών
  const [savingGS, setSavingGS] = useState(false);
  const [doingCancel, setDoingCancel] = useState(false);
  const [doingComplete, setDoingComplete] = useState(false);

  // ΑΠ ΓΣ
  const [gsProtocol, setGsProtocol] = useState("");
  // ακύρωση
  const [reasonText, setReasonText] = useState("");
  const [gsNumber, setGsNumber] = useState("");
  const [gsYear, setGsYear] = useState("");

  // helper για καθαρό μήνυμα σφάλματος
  const showError = useCallback((e, fallback) => {
    const msg =
      e?.response?.data?.error ||
      e?.message ||
      fallback ||
      "Κάτι πήγε στραβά.";
    setError(msg);
  }, []);

  const fetchList = useCallback(async () => {
    if (!hasToken) return;
    setLoading(true);
    setError("");
    try {
      const data = await listTheses(auth.token);
      setRows(data || []);
      // αν δεν έχει επιλεγεί κάτι, διάλεξε την 1η
      if (data?.length && !selectedId) {
        setSelectedId(data[0].thesis_id);
      }
    } catch (e) {
      showError(e, "Αποτυχία φόρτωσης λίστας");
    } finally {
      setLoading(false);
    }
  }, [auth?.token, hasToken, selectedId, showError]);

  const fetchDetails = useCallback(
    async (id) => {
      if (!id) return;
      setError("");
      try {
        const d = await getThesisDetails(auth.token, id);
        setDetails(d);
        setGsProtocol(d?.summary?.gs_protocol || "");
      } catch (e) {
        setDetails(null);
        showError(e, "Αποτυχία φόρτωσης στοιχείων");
      }
    },
    [auth?.token, showError]
  );

  useEffect(() => {
    fetchList();
  }, [fetchList, hasToken]);

  useEffect(() => {
    if (selectedId) fetchDetails(selectedId);
  }, [selectedId, fetchDetails]);

  const doSaveGS = async () => {
    setError("");
    if (!selectedId) return;
    if (!gsProtocol.trim()) return setError("Συμπλήρωσε ΑΠ ΓΣ.");
    try {
      setSavingGS(true);
      await setGSProtocol(auth.token, selectedId, gsProtocol.trim());
      await fetchDetails(selectedId);
    } catch (e) {
      showError(e, "Αποτυχία καταχώρισης ΑΠ ΓΣ");
    } finally {
      setSavingGS(false);
    }
  };

  const doCancel = async () => {
    setError("");
    if (!selectedId) return;
    if (!gsNumber || !gsYear) {
      return setError("Απαιτούνται Αριθμός & Έτος ΓΣ για ακύρωση.");
    }
    if (!window.confirm("Σίγουρα θέλεις να ακυρώσεις την ανάθεση;")) return;
    try {
      setDoingCancel(true);
      await cancelThesis(auth.token, selectedId, {
        reasonText: reasonText || "by_secretary",
        gs_number: gsNumber,
        gs_year: gsYear,
      });
      await fetchList();
      setDetails(null);
      setSelectedId(null);
      setReasonText("");
      setGsNumber("");
      setGsYear("");
    } catch (e) {
      showError(e, "Αποτυχία ακύρωσης");
    } finally {
      setDoingCancel(false);
    }
  };

  const doComplete = async () => {
    setError("");
    if (!selectedId) return;
    try {
      setDoingComplete(true);
      const res = await completeThesis(auth.token, selectedId);
      await fetchList();
      await fetchDetails(selectedId);
      alert("Η ΔΕ περατώθηκε επιτυχώς.");
      console.log("stats:", res?.stats);
    } catch (e) {
      showError(e, "Αποτυχία περαίωσης (έλεγξε προϋποθέσεις).");
    } finally {
      setDoingComplete(false);
    }
  };

  const status = details?.summary?.status;
  const isCompleted = status === "completed";

  return (
    <div className="sec-page">
      <div className="sec-grid">
        {/* ΛΙΣΤΑ */}
        <div className="panel">
          <div className="panel-header">
            <h2>ΔΕ σε εξέλιξη</h2>
            {loading && <span className="muted">Φόρτωση…</span>}
          </div>

          {error && <div className="error-box">{error}</div>}

          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Τίτλος</th>
                <th>Κατάσταση</th>
                <th>Επιβλέπων</th>
                <th>Τριμελής</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="muted">
                    Καμία ΔΕ σε ενεργή/υπό εξέταση κατάσταση.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.thesis_id}
                    className={selectedId === r.thesis_id ? "active" : ""}
                    onClick={() => setSelectedId(r.thesis_id)}
                  >
                    <td>{r.thesis_id}</td>
                    <td>{r.title}</td>
                    <td>
                      <Badge status={r.status} />
                    </td>
                    <td>{r.supervisor_name}</td>
                    <td>
                      {r.committee_count}
                      {r.committee_members ? ` (${r.committee_members})` : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ΛΕΠΤΟΜΕΡΕΙΕΣ */}
        <div className="panel">
          <div className="panel-header">
            <h2>Λεπτομέρειες</h2>
          </div>

          {!details ? (
            <p className="muted">Επέλεξε μια ΔΕ από τη λίστα.</p>
          ) : (
            <>
              <div className="summary">
                <div>
                  <strong>Τίτλος:</strong> {details.summary.title}
                </div>
                <div>
                  <strong>Κατάσταση:</strong>{" "}
                  <Badge status={details.summary.status} />
                </div>
                <div>
                  <strong>Επιβλέπων:</strong> {details.summary.supervisor_name}{" "}
                  ({details.summary.supervisor_email})
                </div>
                <div>
                  <strong>Τριμελής:</strong> {details.summary.committee_count} μέλη
                </div>
                {details.summary.nimeris_url && (
                  <div>
                    <strong>Νημερτής:</strong>{" "}
                    <a
                      href={details.summary.nimeris_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {details.summary.nimeris_url}
                    </a>
                  </div>
                )}
              </div>

              <hr />

              {/* ΑΠ ΓΣ */}
              <div className="block">
                <h3>ΑΠ ΓΣ</h3>
                <div className="row">
                  <input
                    value={gsProtocol}
                    onChange={(e) => setGsProtocol(e.target.value)}
                    placeholder="π.χ. ΑΠ 123/2025"
                    disabled={isCompleted}
                  />
                  <button onClick={doSaveGS} disabled={savingGS || isCompleted}>
                    {savingGS ? "Αποθήκευση…" : "Αποθήκευση"}
                  </button>
                </div>
              </div>

              {/* Ακύρωση ανάθεσης */}
              <div className="block warn">
                <h3>Ακύρωση Ανάθεσης</h3>
                <input
                  placeholder="Λόγος (π.χ. κατόπιν αίτησης φοιτητή)"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  disabled={isCompleted}
                />
                <div className="row">
                  <input
                    placeholder="Αρ. ΓΣ"
                    value={gsNumber}
                    onChange={(e) => setGsNumber(e.target.value)}
                    disabled={isCompleted}
                  />
                  <input
                    placeholder="Έτος"
                    value={gsYear}
                    onChange={(e) => setGsYear(e.target.value)}
                    disabled={isCompleted}
                  />
                  <button
                    className="danger"
                    onClick={doCancel}
                    disabled={doingCancel || isCompleted}
                  >
                    {doingCancel ? "Ακύρωση…" : "Ακύρωση"}
                  </button>
                </div>
                <p className="muted">
                  Με την ακύρωση, σβήνονται προσκλήσεις/αναθέσεις και το θέμα
                  επιστρέφει σε «Διαθέσιμη».
                </p>
              </div>

              {/* Περαίωση */}
              <div className="block success">
                <h3>Περαίωση ΔΕ</h3>
                <p className="muted">
                  Προϋποθέσεις: κατάσταση «Υπό εξέταση», τουλάχιστον 3
                  βαθμολογήσεις, καταχωρημένος σύνδεσμος Νημερτής.
                </p>
                <button
                  onClick={doComplete}
                  disabled={doingComplete || isCompleted}
                >
                  {doingComplete ? "Ολοκλήρωση…" : "Ολοκλήρωση"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
