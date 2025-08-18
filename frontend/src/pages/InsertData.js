import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { importJSON } from "../api/Secretary";
import "./InsertData.css";

export default function InsertData() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(null); // true|false για alert

  const onBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const onUpload = async () => {
    if (!file) {
      setOk(false);
      setMsg("Επίλεξε ένα αρχείο .json");
      return;
    }
    try {
      setBusy(true);
      const res = await importJSON(file); // POST /api/secretary/import-json
      setOk(true);
      setMsg(JSON.stringify(res, null, 2));
    } catch (e) {
      setOk(false);
      setMsg(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  const onClear = () => {
    setFile(null);
    setMsg("");
    setOk(null);
  };

  const downloadTemplate = () => {
    const tpl = {
      students: [
        {
          name: "Γιάννης Παπαδόπουλος",
          email: "giannis@example.com",
          password: "1234",
          student_number: "2023001",
          department: "Πληροφορική",
          etos: 3
        }
      ],
      professors: [
        {
          name: "Δρ. Νίκος Καραγιάννης",
          email: "nikos@example.com",
          password: "secret",
          specialty: "ΤΝ",
          is_admin: 0
        }
      ]
    };
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-import.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="insertdata-container">
      <h2>Εισαγωγή δεδομένων (Γραμματεία)</h2>
      <p className="insertdata-sub">
        Ανέβασε ένα αρχείο <code>.json</code> με πεδία <code>students</code> και/ή <code>professors</code>.
      </p>

      <div className="file-input">
        <input
          type="file"
          accept="application/json"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-secondary" onClick={downloadTemplate}>Λήψη template</button>
        <button className="btn-primary" onClick={onUpload} disabled={busy}>
          {busy ? "Ανέβασμα..." : "Ανέβασμα JSON"}
        </button>
        <button className="btn-primary btn-grey" onClick={onClear} disabled={busy}>
          Καθαρισμός
        </button>
      </div>

    
      <div className="back-wrap">
        <button className="btn-back" onClick={onBack}>← Πίσω</button>
      </div>

      {file && (
        <div className="alert" style={{ marginTop: 12 }}>
          Επιλεγμένο αρχείο: <strong>{file.name}</strong>
        </div>
      )}

      {msg && (
        <div className={`alert ${ok ? "alert--success" : "alert--error"}`}>
          {ok ? "Η εισαγωγή ολοκληρώθηκε" : "Σφάλμα"} — δείτε παρακάτω λεπτομέρειες.
        </div>
      )}

      {msg && <pre className="result-box">{msg}</pre>}
    </div>
  );
}
