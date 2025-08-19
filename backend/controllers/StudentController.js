const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { name, email, password, student_number, department, etos } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO Student (name, email, password, student_number, department, etos) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, student_number, department, etos]
    );
    res.status(201).json({ message: "Student registered successfully!" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query("SELECT * FROM Student WHERE email = ?", [email]);
    if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: results[0].id, role: "student" }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateProfile = async (req, res) => {
  const { id } = req.user; // από token middleware
  const { address, contact_email, mobile_phone, landline_phone } = req.body;

  const fields = [];
  const values = [];

  if (address !== undefined) {
    fields.push("address = ?");
    values.push(address);
  }
  if (contact_email !== undefined) {
    fields.push("contact_email = ?");
    values.push(contact_email);
  }
  if (mobile_phone !== undefined) {
    fields.push("mobile_phone = ?");
    values.push(mobile_phone);
  }
  if (landline_phone !== undefined) {
    fields.push("landline_phone = ?");
    values.push(landline_phone);
  }

  if (fields.length === 0)
    return res.status(400).json({ error: "Δεν δόθηκαν στοιχεία προς ενημέρωση" });

  values.push(id);

  const sql = `UPDATE Student SET ${fields.join(", ")} WHERE id = ?`;
  try {
    await db.query(sql, values);
    res.json({ message: "Το προφίλ ενημερώθηκε επιτυχώς." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getMe = async (req, res) => {
  const { id } = req.user;

  try {
    const [rows] = await db.query("SELECT id, name, email, address, contact_email, mobile_phone, landline_phone FROM Student WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Δεν βρέθηκε ο φοιτητής" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, student_number FROM student ORDER BY name ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

exports.getByNumber = async (req, res) => {
  try {
    const code = String(req.params.code || "").trim();
    if (!code) return res.status(400).json({ error: "Missing student code" });

    const [rows] = await db.query(
      "SELECT id, name, email, student_number FROM student WHERE student_number = ? LIMIT 1",
      [code]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("getByNumber error:", err);
    res.status(500).json({ error: "Lookup failed" });
  }
};
exports.getMyAssignment = async (req, res) => {
  // req.user.id πρέπει να είναι το id του student (JWT με role: "student")
  const student_id = req.user?.id;

  if (!student_id) {
    return res.status(401).json({ error: "Μη εξουσιοδοτημένο" });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT
        d.id            AS topic_id,
        d.title,
        d.description,
        d.status,
        d.pdf_file,
        d.assigned_at,
        p.id            AS professor_id,
        p.name          AS professor_name,
        p.email         AS professor_email,
        p.specialty     AS professor_specialty
      FROM diplomatikhergasia d
      JOIN professor p ON p.id = d.professor_id
      WHERE d.student_id = ?
      ORDER BY d.assigned_at DESC, d.id DESC
      LIMIT 1
      `,
      [student_id]
    );

    if (!rows.length) {
      // 404 = δεν έχει ακόμη ανάθεση
      return res.status(404).json({ error: "Δεν έχεις ακόμη ανάθεση θέματος." });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ Σφάλμα ανάκτησης ανάθεσης φοιτητή:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};
exports.listProfessorsForCommittee = async (req, res) => {
try {
const studentId = req.user.id;
// Βρες την ενεργή (υπό ανάθεση) ΔΕ του φοιτητή
const [rows] = await db.query(
`SELECT id, professor_id, status FROM diplomatikhergasia WHERE student_id=? ORDER BY id DESC LIMIT 1`,
[studentId]
);
if (!rows.length) return res.status(404).json({ error: "Δεν έχεις ανάθεση." });
const thesis = rows[0];


// Φέρε όλους τους διδάσκοντες εκτός από τον επιβλέποντα
const [profs] = await db.query(
`SELECT id, name, email, specialty FROM professor WHERE id <> ? ORDER BY name ASC`,
[thesis.professor_id || 0]
);
return res.json(profs);
} catch (err) {
console.error("listProfessorsForCommittee error", err);
return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
}
};


exports.listCommitteeInvitations = async (req, res) => {
try {
const studentId = req.user.id;
const [thesisRows] = await db.query(
`SELECT id, status FROM diplomatikhergasia WHERE student_id=? ORDER BY id DESC LIMIT 1`,
[studentId]
);
if (!thesisRows.length) return res.status(404).json({ error: "Δεν έχεις ανάθεση." });
const thesisId = thesisRows[0].id;


const [rows] = await db.query(
`SELECT ci.id, ci.professor_id, p.name AS professor_name, p.email AS professor_email,
ci.status, ci.invited_at, ci.responded_at
FROM committee_invitation ci
JOIN professor p ON p.id = ci.professor_id
WHERE ci.diplomatikhergasia_id=?
ORDER BY ci.invited_at DESC`,
[thesisId]
);


const acceptedCount = rows.filter(r => r.status === 'accepted').length;
return res.json({ thesisId, status: thesisRows[0].status, acceptedCount, invitations: rows });
} catch (err) {
console.error("listCommitteeInvitations error", err);
return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
}
};


exports.inviteProfessorToCommittee = async (req, res) => {
try {
const studentId = req.user.id;
const { professor_id } = req.body;
if (!professor_id) return res.status(400).json({ error: "Απαιτείται professor_id" });


const [thesisRows] = await db.query(
`SELECT id, status FROM diplomatikhergasia WHERE student_id=? ORDER BY id DESC LIMIT 1`,
[studentId]
);
if (!thesisRows.length) return res.status(404).json({ error: "Δεν έχεις ανάθεση." });
const thesis = thesisRows[0];
if (thesis.status !== 'under_assignment') {
return res.status(400).json({ error: "Η διπλωματική δεν είναι σε 'Υπό ανάθεση'" });
}


// Αν έχουν ήδη γίνει 2 αποδοχές, μην αφήνεις άλλη πρόσκληση
const [acc] = await db.query(
`SELECT COUNT(*) AS c FROM committee_invitation WHERE diplomatikhergasia_id=? AND status='accepted'`,
[thesis.id]
);
if (acc[0].c >= 2) return res.status(400).json({ error: "Έχουν ήδη αποδεχθεί δύο μέλη." });


// Έλεγξε αν υπάρχει ήδη pending προς αυτόν τον καθηγητή
const [exists] = await db.query(
`SELECT id FROM committee_invitation WHERE diplomatikhergasia_id=? AND professor_id=? AND status='pending'`,
[thesis.id, professor_id]
);
if (exists.length) return res.status(409).json({ error: "Υπάρχει ήδη εκκρεμής πρόσκληση." });


await db.query(
`INSERT INTO committee_invitation (diplomatikhergasia_id, professor_id, invited_by_student_id, status) VALUES (?,?,?,'pending')`,
[thesis.id, professor_id, studentId]
);
return res.status(201).json({ message: "Πρόσκληση στάλθηκε." });
} catch (err) {
console.error("inviteProfessorToCommittee error", err);
return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
}
};


exports.cancelCommitteeInvitation = async (req, res) => {
try {
const studentId = req.user.id;
const { id } = req.params; // invitation id


// Επιβεβαίωση ότι η πρόσκληση ανήκει στη ΔΕ του φοιτητή και είναι pending
const [rows] = await db.query(
`SELECT ci.id, ci.status
FROM committee_invitation ci
JOIN diplomatikhergasia d ON d.id = ci.diplomatikhergasia_id
WHERE ci.id=? AND d.student_id=?`,
[id, studentId]
);
if (!rows.length) return res.status(404).json({ error: "Δεν βρέθηκε πρόσκληση." });
if (rows[0].status !== 'pending') return res.status(400).json({ error: "Μόνο εκκρεμείς προσκλήσεις ακυρώνονται." });


await db.query(`UPDATE committee_invitation SET status='cancelled' WHERE id=?`, [id]);
return res.json({ message: "Η πρόσκληση ακυρώθηκε." });
} catch (err) {
console.error("cancelCommitteeInvitation error", err);
return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
}
};