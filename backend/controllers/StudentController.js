// controllers/StudentController.js
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* -------------------------------------------------------
 * Helper: Επιστρέφει τη ΔΕ αν ανήκει στον συγκεκριμένο φοιτητή
 *  -> { id, student_id, status } ή null
 * ----------------------------------------------------- */
async function ensureOwnThesis(studentId, thesisId, connOrDb = db) {
  if (!Number.isInteger(thesisId)) return null;
  const [[row]] = await connOrDb.query(
    `SELECT id, student_id, status
       FROM diplomatikhergasia
      WHERE id=? AND student_id=?
      LIMIT 1`,
    [thesisId, studentId]
  );
  return row || null;
}

/* =========================
 * Auth / Profile
 * ======================= */

exports.register = async (req, res) => {
  const { name, email, password, student_number, department, etos } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO student (name, email, password, student_number, department, etos) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, student_number, department, etos]
    );
    res.status(201).json({ message: "Student registered successfully!" });
  } catch (err) {
    console.error("Student register error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query("SELECT * FROM student WHERE email = ?", [email]);
    if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: results[0].id, role: "student" }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
  } catch (err) {
    console.error("Student login error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { id } = req.user;
  const { address, contact_email, mobile_phone, landline_phone } = req.body;

  const fields = [];
  const values = [];

  if (address !== undefined) { fields.push("address = ?"); values.push(address); }
  if (contact_email !== undefined) { fields.push("contact_email = ?"); values.push(contact_email); }
  if (mobile_phone !== undefined) { fields.push("mobile_phone = ?"); values.push(mobile_phone); }
  if (landline_phone !== undefined) { fields.push("landline_phone = ?"); values.push(landline_phone); }

  if (fields.length === 0)
    return res.status(400).json({ error: "Δεν δόθηκαν στοιχεία προς ενημέρωση" });

  values.push(id);

  const sql = `UPDATE student SET ${fields.join(", ")} WHERE id = ?`;
  try {
    await db.query(sql, values);
    res.json({ message: "Το προφίλ ενημερώθηκε επιτυχώς." });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  const { id } = req.user;
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, address, contact_email, mobile_phone, landline_phone FROM student WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Δεν βρέθηκε ο φοιτητής" });
    res.json(rows[0]);
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* =========================
 * Lookups
 * ======================= */

exports.listAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, student_number FROM student ORDER BY name ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("listAll error:", err);
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

/* =========================
 * Ανάθεση / Επιβλέπων
 * ======================= */

exports.getMyAssignment = async (req, res) => {
  const student_id = req.user?.id;
  if (!student_id) return res.status(401).json({ error: "Μη εξουσιοδοτημένο" });

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
      return res.status(404).json({ error: "Δεν έχεις ακόμη ανάθεση θέματος." });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("getMyAssignment error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/* =========================
 * Τριμελής – προσκλήσεις
 * ======================= */

exports.listProfessorsForCommittee = async (req, res) => {
  try {
    const studentId = req.user.id;
    const [rows] = await db.query(
      `SELECT id, professor_id, status
         FROM diplomatikhergasia
        WHERE student_id=?
        ORDER BY id DESC
        LIMIT 1`,
      [studentId]
    );
    if (!rows.length) return res.status(404).json({ error: "Δεν έχεις ανάθεση." });
    const thesis = rows[0];

    const [profs] = await db.query(
      `SELECT id, name, email, specialty
         FROM professor
        WHERE id <> ?
        ORDER BY name ASC`,
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
      `SELECT id, status
         FROM diplomatikhergasia
        WHERE student_id=?
        ORDER BY id DESC
        LIMIT 1`,
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
      `SELECT id, status
         FROM diplomatikhergasia
        WHERE student_id=?
        ORDER BY id DESC
        LIMIT 1`,
      [studentId]
    );
    if (!thesisRows.length) return res.status(404).json({ error: "Δεν έχεις ανάθεση." });
    const thesis = thesisRows[0];
    if (thesis.status !== 'under_assignment') {
      return res.status(400).json({ error: "Η διπλωματική δεν είναι σε 'Υπό ανάθεση'" });
    }

    const [acc] = await db.query(
      `SELECT COUNT(*) AS c
         FROM committee_invitation
        WHERE diplomatikhergasia_id=? AND status='accepted'`,
      [thesis.id]
    );
    if (acc[0].c >= 2) return res.status(400).json({ error: "Έχουν ήδη αποδεχθεί δύο μέλη." });

    const [exists] = await db.query(
      `SELECT id
         FROM committee_invitation
        WHERE diplomatikhergasia_id=? AND professor_id=? AND status='pending'`,
      [thesis.id, professor_id]
    );
    if (exists.length) return res.status(409).json({ error: "Υπάρχει ήδη εκκρεμής πρόσκληση." });

    await db.query(
      `INSERT INTO committee_invitation
         (diplomatikhergasia_id, professor_id, invited_by_student_id, status)
       VALUES (?,?,?,'pending')`,
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
    const { id } = req.params;

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

/* =========================
 * Υλικό / Drafts
 * ======================= */

exports.uploadDraft = async (req, res) => {
  try {
    const studentId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const own = await ensureOwnThesis(studentId, thesisId);
    if (!own) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή τη ΔΕ." });
    if (own.status !== "under_review") return res.status(400).json({ error: "Επιτρέπεται μόνο σε 'Υπό Εξέταση'." });
    if (!req.file) return res.status(400).json({ error: "Δεν βρέθηκε αρχείο." });

    const fileName = req.file.originalname;
    const filePath = req.file.filename; // αποθηκεύεται στο /uploads

    await db.query(
      `INSERT INTO fileupload (file_name, file_path, uploaded_by, DiplomatikhErgasia_id)
       VALUES (?, ?, ?, ?)`,
      [fileName, filePath, studentId, thesisId]
    );
    return res.status(201).json({ message: "Το πρόχειρο ανέβηκε." });
  } catch (err) {
    console.error("uploadDraft error:", err);
    return res.status(500).json({ error: err?.sqlMessage || "Σφάλμα βάσης δεδομένων" });
  }
};

exports.addMaterialLink = async (req, res) => {
  try {
    const studentId = req.user.id;
    const thesisId = Number(req.params.id);
    const url = String(req.body?.url || "").trim();
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });
    if (!url) return res.status(400).json({ error: "Άδειος σύνδεσμος." });

    const own = await ensureOwnThesis(studentId, thesisId);
    if (!own) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή τη ΔΕ." });
    if (own.status !== "under_review") return res.status(400).json({ error: "Επιτρέπεται μόνο σε 'Υπό Εξέταση'." });

    await db.query(
      `INSERT INTO fileupload (file_name, file_path, uploaded_by, DiplomatikhErgasia_id)
       VALUES ('link', ?, ?, ?)`,
      [url, studentId, thesisId]
    );
    return res.status(201).json({ message: "Ο σύνδεσμος προστέθηκε." });
  } catch (err) {
    console.error("addMaterialLink error:", err);
    return res.status(500).json({ error: err?.sqlMessage || "Σφάλμα βάσης δεδομένων" });
  }
};

exports.listMaterials = async (req, res) => {
  try {
    const studentId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const own = await ensureOwnThesis(studentId, thesisId);
    if (!own) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή τη ΔΕ." });

    const [rows] = await db.query(
      `SELECT id, file_name, file_path, uploaded_by, uploaded_at
         FROM fileupload
        WHERE DiplomatikhErgasia_id=?
        ORDER BY uploaded_at DESC, id DESC`,
      [thesisId]
    );

    const base = `${req.protocol}://${req.get("host")}/uploads/`;
    const data = rows.map(r => ({
      ...r,
      url: r.file_name === "link" ? r.file_path : base + r.file_path,
    }));

    return res.json(data);
  } catch (err) {
    console.error("listMaterials error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/* =========================
 * Παρουσίαση / Νημερτής / Πρακτικό
 * ======================= */

exports.setPresentation = async (req, res) => {
  try {
    const studentId = req.user.id;
    const thesisId = Number(req.params.id);
    let { mode, room, join_link, exam_datetime } = req.body || {};
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });
    if (!mode || !exam_datetime) return res.status(400).json({ error: "Απαιτούνται mode & exam_datetime." });
    if (!["in_person", "online"].includes(String(mode))) {
      return res.status(400).json({ error: "mode: 'in_person' ή 'online'." });
    }

    // Δέξου ISO "YYYY-MM-DDTHH:MM" και κάνε το MySQL friendly
    if (typeof exam_datetime === "string") {
      exam_datetime = exam_datetime.replace("T", " ");
    }

    const own = await ensureOwnThesis(studentId, thesisId);
    if (!own) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή τη ΔΕ." });
    if (own.status !== "under_review") {
      return res.status(400).json({ error: "Επιτρέπεται μόνο σε 'Υπό Εξέταση'." });
    }

    await db.query(
      `INSERT INTO thesis_presentation
         (diplomatikhergasia_id, mode, room, join_link, exam_datetime)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         mode=VALUES(mode),
         room=VALUES(room),
         join_link=VALUES(join_link),
         exam_datetime=VALUES(exam_datetime)`,
      [thesisId, mode, room || null, join_link || null, exam_datetime]
    );

    return res.json({ message: "Οι λεπτομέρειες παρουσίασης αποθηκεύτηκαν." });
  } catch (err) {
    console.error("setPresentation error:", err);
    return res.status(500).json({
      error: err?.sqlMessage ||
        "Σφάλμα βάσης δεδομένων. Βεβαιώσου ότι υπάρχει ο πίνακας thesis_presentation και ότι υπάρχει UNIQUE(diplomatikhergasia_id)."
    });
  }
};

exports.getPresentation = async (req, res) => {
  try {
    const studentId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const own = await ensureOwnThesis(studentId, thesisId);
    if (!own) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή τη ΔΕ." });

    const [[row]] = await db.query(
      `SELECT tp.*, d.title
         FROM thesis_presentation tp
         JOIN diplomatikhergasia d ON d.id = tp.diplomatikhergasia_id
        WHERE tp.diplomatikhergasia_id=?`,
      [thesisId]
    );
    if (!row) return res.status(404).json({ error: "Δεν έχουν καταχωρηθεί λεπτομέρειες παρουσίασης." });
    return res.json(row);
  } catch (err) {
    console.error("getPresentation error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.setNimerisUrl = async (req, res) => {
  try {
    const studentId = req.user.id;
    const thesisId = Number(req.params.id);
    const nimeris_url = String(req.body?.nimeris_url || "").trim();
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });
    if (!nimeris_url) return res.status(400).json({ error: "Κενός σύνδεσμος Νημερτής." });

    const own = await ensureOwnThesis(studentId, thesisId);
    if (!own) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή τη ΔΕ." });

    await db.query(
      `UPDATE diplomatikhergasia SET nimeris_url=? WHERE id=? AND student_id=?`,
      [nimeris_url, thesisId, studentId]
    );
    return res.json({ message: "Ο σύνδεσμος Νημερτής αποθηκεύτηκε." });
  } catch (err) {
    console.error("setNimerisUrl error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων (βεβαιώσου ότι υπάρχει το πεδίο nimeris_url)." });
  }
};

exports.viewExamMinutes = async (req, res) => {
  try {
    const studentId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const own = await ensureOwnThesis(studentId, thesisId);
    if (!own) return res.status(403).json({ error: "Δεν έχετε πρόσβαση σε αυτή τη ΔΕ." });

    // 1) stored πρακτικό (αν υπάρχει)
    try {
      const [[m]] = await db.query(
        `SELECT html FROM thesis_minutes WHERE diplomatikhergasia_id=?`,
        [thesisId]
      );
      if (m && m.html) return res.json({ html: m.html, source: "stored" });
    } catch (_) {
      // πιθανόν να μην υπάρχει ο πίνακας
    }

    // 2) generate από βαθμούς
    const [grades] = await db.query(
      `SELECT p.name AS professor_name, tg.total, 
              tg.clarity, tg.originality, tg.methodology, tg.writing, tg.presentation
         FROM thesis_grade tg
         JOIN professor p ON p.id = tg.professor_id
        WHERE tg.diplomatikhergasia_id=?
        ORDER BY p.name`,
      [thesisId]
    );
    if (!grades.length) return res.status(404).json({ error: "Δεν υπάρχουν βαθμολογήσεις για πρακτικό." });

    const [[hdr]] = await db.query(
      `SELECT d.title, s.name AS student_name, s.email
         FROM diplomatikhergasia d
         JOIN student s ON s.id = d.student_id
        WHERE d.id=?`,
      [thesisId]
    );

    const html =
      `<!doctype html><html><head><meta charset="utf-8"><title>Πρακτικό εξέτασης</title></head><body>
        <h2>Πρακτικό εξέτασης διπλωματικής</h2>
        <p><strong>Τίτλος:</strong> ${hdr?.title || ""}</p>
        <p><strong>Φοιτητής/τρια:</strong> ${hdr?.student_name || ""} (${hdr?.email || ""})</p>
        <hr/>
        <h3>Βαθμολογήσεις</h3>
        <table border="1" cellpadding="6" cellspacing="0">
          <thead><tr>
            <th>Μέλος</th><th>Σύνολο</th>
            <th>Clarity</th><th>Originality</th><th>Methodology</th><th>Writing</th><th>Presentation</th>
          </tr></thead>
          <tbody>
            ${grades.map(g => `
              <tr>
                <td>${g.professor_name}</td>
                <td>${g.total}</td>
                <td>${g.clarity}</td>
                <td>${g.originality}</td>
                <td>${g.methodology}</td>
                <td>${g.writing}</td>
                <td>${g.presentation}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body></html>`;

    return res.json({ html, source: "generated" });
  } catch (err) {
    console.error("viewExamMinutes error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};
