const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* =========================
 * Auth
 * ======================= */

exports.register = async (req, res) => {
  const { name, email, password, specialty, is_admin } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO Professor (name, email, password, specialty, is_admin) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, specialty || "", is_admin || false]
    );
    res.status(201).json({ message: "Professor registered successfully!" });
  } catch (err) {
    console.error("Professor register error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query("SELECT * FROM Professor WHERE email = ?", [email]);

    if (results.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, results[0].password);
    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: results[0].id, role: "professor" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Professor login error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* =========================
 * Topics (δημιουργία/λήψη/ενημέρωση/διαγραφή)
 * ======================= */

exports.createTopic = async (req, res) => {
  const { title, description } = req.body;
  const professor_id = req.user?.id;
  const pdf_file = req.file ? req.file.filename : null;

  console.log("📥 Received topic:", { title, description, professor_id, pdf_file });

  const sql = `
    INSERT INTO diplomatikhergasia 
    (title, description, professor_id, status, pdf_file)
    VALUES (?, ?, ?, 'available', ?)`;

  try {
    const [result] = await db.query(sql, [title, description, professor_id, pdf_file]);
    console.log("✅ DB insert complete:", result);
    res.status(201).json({ message: "Το θέμα δημιουργήθηκε επιτυχώς." });
  } catch (err) {
    console.error("❌ DB error (createTopic):", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.getMyTopics = async (req, res) => {
  console.log("Decoded user from token:", req.user);
  const professor_id = req.user.id;

  const sql =
    "SELECT id, title, description, status, pdf_file FROM diplomatikhergasia WHERE professor_id = ? ORDER BY id DESC";

  try {
    const [rows] = await db.query(sql, [professor_id]);
    console.log("📄 Topics found:", rows);
    res.json(rows);
  } catch (err) {
    console.error("❌ DB error (getMyTopics):", err);
    res.status(500).json({ error: "Σφάλμα κατά την ανάκτηση των θεμάτων." });
  }
};

exports.deleteTopic = async (req, res) => {
  const topicId = req.params.id;
  const professorId = req.user?.id;

  try {
    const [result] = await db.query(
      "DELETE FROM diplomatikhergasia WHERE id = ? AND professor_id = ?",
      [topicId, professorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Το θέμα δεν βρέθηκε ή δεν ανήκει σε εσάς." });
    }

    res.json({ message: "Το θέμα διαγράφηκε επιτυχώς." });
  } catch (err) {
    console.error("❌ Σφάλμα διαγραφής (deleteTopic):", err);
    res.status(500).json({ error: "Σφάλμα κατά τη διαγραφή." });
  }
};

exports.getTopicById = async (req, res) => {
  const id = req.params.id;
  const professor_id = req.user?.id;

  try {
    const [rows] = await db.query(
      "SELECT * FROM diplomatikhergasia WHERE id = ? AND professor_id = ?",
      [id, professor_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Το θέμα δεν βρέθηκε" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Σφάλμα ανάκτησης θέματος (getTopicById):", err);
    res.status(500).json({ error: "Σφάλμα κατά την ανάκτηση" });
  }
};

exports.updateTopic = async (req, res) => {
  const id = req.params.id;
  const professor_id = req.user?.id;
  const { title, description } = req.body;
  const pdf_file = req.file ? req.file.filename : null;

  try {
    const sql = pdf_file
      ? "UPDATE diplomatikhergasia SET title = ?, description = ?, pdf_file = ? WHERE id = ? AND professor_id = ?"
      : "UPDATE diplomatikhergasia SET title = ?, description = ? WHERE id = ? AND professor_id = ?";

    const params = pdf_file
      ? [title, description, pdf_file, id, professor_id]
      : [title, description, id, professor_id];

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Το θέμα δεν βρέθηκε ή δεν σας ανήκει." });
    }

    res.json({ message: "Το θέμα ενημερώθηκε επιτυχώς." });
  } catch (err) {
    console.error("❌ Σφάλμα ενημέρωσης (updateTopic):", err);
    res.status(500).json({ error: "Σφάλμα κατά την ενημέρωση." });
  }
};

/* =========================
 * Ανάθεση θέματος σε φοιτητή
 * ======================= */

exports.assignTopicToStudent = async (req, res) => {
  const professor_id = req.user.id;
  let { topic_id, student_id } = req.body;

  topic_id = Number(topic_id);
  student_id = Number(student_id);
  if (!Number.isInteger(topic_id) || !Number.isInteger(student_id)) {
    return res.status(400).json({ error: "Μη έγκυρες παράμετροι (ids πρέπει να είναι ακέραιοι)." });
  }

  try {
    const [stu] = await db.query(
      "SELECT id FROM student WHERE id = ? LIMIT 1",
      [student_id]
    );
    if (!stu.length) {
      return res.status(400).json({ error: "Ο φοιτητής δεν βρέθηκε." });
    }

    const [topics] = await db.query(
      "SELECT id FROM diplomatikhergasia WHERE id = ? AND professor_id = ? AND status = 'available' LIMIT 1",
      [topic_id, professor_id]
    );
    if (!topics.length) {
      return res.status(404).json({ error: "Το θέμα δεν βρέθηκε ή δεν είναι διαθέσιμο." });
    }

    await db.query(
      "UPDATE diplomatikhergasia SET student_id = ?, status = 'under_assignment', assigned_at = NOW() WHERE id = ?",
      [student_id, topic_id]
    );

    return res.json({ message: "✅ Το θέμα ανατέθηκε επιτυχώς!" });
  } catch (err) {
    console.error("Σφάλμα ανάθεσης (assignTopicToStudent):", err);

    if (err?.code === "ER_NO_REFERENCED_ROW_2" || err?.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({ error: "Αποτυχία ελέγχου ακεραιότητας (FK). Έλεγξε το student_id." });
    }
    if (err?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
      return res.status(400).json({ error: "Λάθος τύπος δεδομένου (π.χ. μη αριθμός σε INT)." });
    }

    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/* =========================
 * Προσκλήσεις τριμελούς (ως μέλος)
 * ======================= */

exports.respondToCommitteeInvitation = async (req, res) => {
  const professorId = req.user.id;
  const { invitation_id, action } = req.body;

  if (!invitation_id || !["accept", "reject"].includes(action)) {
    return res.status(400).json({ error: "Λάθος παράμετροι" });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, status, diplomatikhergasia_id
         FROM committee_invitation
        WHERE id = ? AND professor_id = ?
        FOR UPDATE`,
      [invitation_id, professorId]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Δεν βρέθηκε πρόσκληση." });
    }
    const inv = rows[0];

    if (inv.status !== "pending") {
      await conn.rollback();
      return res.status(409).json({ error: "Η πρόσκληση δεν είναι πλέον εκκρεμής." });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    await conn.query(
      `UPDATE committee_invitation
          SET status = ?, responded_at = NOW()
        WHERE id = ?`,
      [newStatus, invitation_id]
    );

    if (newStatus === "accepted") {
      const thesisId = inv.diplomatikhergasia_id;

      await conn.query(
        `SELECT id FROM diplomatikhergasia WHERE id = ? FOR UPDATE`,
        [thesisId]
      );

      const [acc] = await conn.query(
        `SELECT COUNT(*) AS c
           FROM committee_invitation
          WHERE diplomatikhergasia_id = ? AND status = 'accepted'`,
        [thesisId]
      );
      const acceptedCount = acc[0]?.c || 0;

      if (acceptedCount >= 2) {
        await conn.query(
          `UPDATE diplomatikhergasia
              SET status = 'active'
            WHERE id = ?`,
          [thesisId]
        );
        try {
          await conn.query(
            `UPDATE committee_invitation
                SET status = 'cancelled',
                    responded_at = COALESCE(responded_at, NOW())
              WHERE diplomatikhergasia_id = ? AND status = 'pending'`,
            [thesisId]
          );
        } catch (e) {
          if (e && e.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
            await conn.query(
              `UPDATE committee_invitation
                  SET status = 'canceled',
                      responded_at = COALESCE(responded_at, NOW())
                WHERE diplomatikhergasia_id = ? AND status = 'pending'`,
              [thesisId]
            );
          } else {
            throw e;
          }
        }
      }
    }

    await conn.commit();
    return res.json({ message: "Η απάντησή σας καταχωρήθηκε." });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    console.error("respondToCommitteeInvitation error", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  } finally {
    if (conn) conn.release();
  }
};

exports.listMyCommitteeInvitations = async (req, res) => {
  try {
    const professorId = req.user.id;
    const { status } = req.query;
    const params = [professorId];
    let where = "ci.professor_id = ?";
    if (status) {
      where += " AND ci.status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT 
         ci.id               AS id,
         ci.status           AS status,
         ci.invited_at       AS invited_at,
         ci.responded_at     AS responded_at,
         d.id                AS thesis_id,
         d.title             AS thesis_title,
         d.status            AS thesis_status,
         s.id                AS student_id,
         s.name              AS student_name,
         s.email             AS student_email
       FROM committee_invitation ci
       JOIN diplomatikhergasia d ON d.id = ci.diplomatikhergasia_id
       JOIN student s ON s.id = d.student_id
       WHERE ${where}
       ORDER BY ci.invited_at DESC`,
      params
    );

    return res.json(rows);
  } catch (err) {
    console.error("listMyCommitteeInvitations error", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/* =========================
 * Διαχείριση ΔΕ (λίστες/προσκλήσεις/ακύρωση)
 * ======================= */

exports.listManagedTheses = async (req, res) => {
  const professorId = req.user.id;
  const role = String(req.query.role || "supervisor").toLowerCase();
  const statusCsv = String(req.query.status || "").trim();
  const statuses = statusCsv ? statusCsv.split(",").map(s => s.trim()).filter(Boolean) : [];

  try {
    let sql, params;
    let whereStatus = "";
    if (statuses.length) {
      whereStatus = ` AND d.status IN (${statuses.map(() => "?").join(",")})`;
    }

    if (role === "committee") {
      sql = `
        SELECT 
          d.id, d.title, d.status, d.assigned_at, d.pdf_file, d.grading_open,
          s.id AS student_id, s.name AS student_name, s.email AS student_email
        FROM diplomatikhergasia d
        JOIN student s ON s.id = d.student_id
        JOIN committee_invitation ci
             ON ci.diplomatikhergasia_id = d.id
            AND ci.professor_id = ?
            AND ci.status = 'accepted'
        WHERE 1=1 ${whereStatus}
        ORDER BY d.assigned_at DESC, d.id DESC
      `;
      params = [professorId, ...statuses];
    } else {
      sql = `
        SELECT 
          d.id, d.title, d.status, d.assigned_at, d.pdf_file, d.grading_open,
          s.id AS student_id, s.name AS student_name, s.email AS student_email
        FROM diplomatikhergasia d
        JOIN student s ON s.id = d.student_id
        WHERE d.professor_id = ? ${whereStatus}
        ORDER BY d.assigned_at DESC, d.id DESC
      `;
      params = [professorId, ...statuses];
    }

    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("listManagedTheses error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.getThesisInvitations = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const [[own]] = await db.query(
      `SELECT id FROM diplomatikhergasia WHERE id=? AND professor_id=?`,
      [thesisId, professorId]
    );
    if (!own) return res.status(403).json({ error: "Επιτρέπεται μόνο στον επιβλέποντα." });

    const [rows] = await db.query(
      `SELECT
         ci.id,
         ci.status,
         ci.invited_at,
         ci.responded_at,
         p.id   AS professor_id,
         p.name AS professor_name,
         p.email AS professor_email
       FROM committee_invitation ci
       JOIN professor p ON p.id = ci.professor_id
       WHERE ci.diplomatikhergasia_id = ?
       ORDER BY ci.invited_at ASC`,
      [thesisId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("getThesisInvitations error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.cancelAssignment = async (req, res) => {
  const professorId = req.user.id;
  const thesisId = Number(req.params.id);
  if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [[th]] = await conn.query(
      `SELECT id, professor_id, student_id, status, assigned_at
         FROM diplomatikhergasia
        WHERE id=? FOR UPDATE`,
      [thesisId]
    );
    if (!th) { await conn.rollback(); return res.status(404).json({ error: "Η ΔΕ δεν βρέθηκε." }); }
    if (th.professor_id !== professorId) { await conn.rollback(); return res.status(403).json({ error: "Μόνο ο επιβλέπων μπορεί να ακυρώσει." }); }
    if (!th.student_id) { await conn.rollback(); return res.status(400).json({ error: "Δεν υπάρχει ανατεθειμένος φοιτητής." }); }

    if (th.status === "under_assignment") {
      await conn.query(`DELETE FROM committee_invitation WHERE diplomatikhergasia_id=?`, [thesisId]);
      await conn.query(
        `UPDATE diplomatikhergasia
            SET student_id=NULL, status='available', assigned_at=NULL, grading_open=0
          WHERE id=?`,
        [thesisId]
      );
      await conn.commit();
      return res.json({ message: "Η ανάθεση ακυρώθηκε (Υπό Ανάθεση)." });
    }

    if (th.status === "active") {
      const { gs_number, gs_year } = req.body || {};
      if (!gs_number || !gs_year) {
        await conn.rollback();
        return res.status(400).json({ error: "Απαιτούνται αριθμός & έτος Γ.Σ. για ακύρωση ενεργής ΔΕ." });
      }

      const [[ok]] = await conn.query(
        `SELECT TIMESTAMPDIFF(YEAR, assigned_at, NOW()) >= 2 AS can_cancel
           FROM diplomatikhergasia WHERE id=?`,
        [thesisId]
      );
      if (!ok || !ok.can_cancel) {
        await conn.rollback();
        return res.status(400).json({ error: "Δεν έχουν παρέλθει 2 έτη από την ανάθεση." });
      }

      await conn.query(`DELETE FROM committee_invitation WHERE diplomatikhergasia_id=?`, [thesisId]);
      await conn.query(
        `UPDATE diplomatikhergasia
            SET student_id=NULL, status='available', assigned_at=NULL, grading_open=0
          WHERE id=?`,
        [thesisId]
      );
      await conn.query(
        `INSERT INTO thesis_cancellation
           (diplomatikhergasia_id, by_professor_id, reason, gs_number, gs_year)
         VALUES (?, ?, 'from_professor', ?, ?)`,
        [thesisId, professorId, gs_number, gs_year]
      );

      await conn.commit();
      return res.json({ message: "Η ανάθεση ακυρώθηκε (Ενεργή) και καταχωρήθηκε στη Γ.Σ." });
    }

    await conn.rollback();
    return res.status(400).json({ error: "Η ακύρωση επιτρέπεται μόνο σε 'under_assignment' ή 'active'." });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    console.error("cancelAssignment error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  } finally {
    if (conn) conn.release();
  }
};

/* =========================
 * Σημειώσεις (ιδιωτικές)
 * ======================= */

exports.addNote = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;
    const note = String(req.body?.note_text || "").trim();
    if (!note) return res.status(400).json({ error: "Κενό κείμενο." });
    if (note.length > 300) return res.status(400).json({ error: "Μέγιστο 300 χαρακτήρες." });

    const [[authz]] = await db.query(
      `SELECT 1 AS ok
         FROM diplomatikhergasia d
         LEFT JOIN committee_invitation ci
           ON ci.diplomatikhergasia_id=d.id
          AND ci.professor_id=? AND ci.status='accepted'
        WHERE d.id=? AND (d.professor_id=? OR ci.id IS NOT NULL)`,
      [professorId, thesisId, professorId]
    );
    if (!authz) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    await db.query(
      `INSERT INTO thesis_note (diplomatikhergasia_id, professor_id, note_text)
       VALUES (?,?,?)`,
      [thesisId, professorId, note]
    );
    return res.status(201).json({ message: "Η σημείωση αποθηκεύτηκε." });
  } catch (err) {
    console.error("addNote error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.listMyNotes = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;
    const [rows] = await db.query(
      `SELECT id, note_text, created_at
         FROM thesis_note
        WHERE diplomatikhergasia_id=? AND professor_id=?
        ORDER BY created_at DESC`,
      [thesisId, professorId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listMyNotes error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/* =========================
 * Καταστάσεις / Βαθμολόγηση
 * ======================= */

exports.markUnderReview = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;

    const [upd] = await db.query(
      `UPDATE diplomatikhergasia
          SET status='under_review'
        WHERE id=? AND professor_id=? AND status='active'`,
      [thesisId, professorId]
    );
    if (upd.affectedRows === 0) {
      return res.status(400).json({ error: "Δεν επιτρέπεται (πρέπει να είστε επιβλέπων και status='active')." });
    }
    return res.json({ message: "Η κατάσταση άλλαξε σε «Υπό Εξέταση»." });
  } catch (err) {
    console.error("markUnderReview error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.openGrading = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;

    const [upd] = await db.query(
      `UPDATE diplomatikhergasia
          SET grading_open=1
        WHERE id=? AND professor_id=? AND status='under_review'`,
      [thesisId, professorId]
    );
    if (upd.affectedRows === 0) {
      return res.status(400).json({ error: "Δεν επιτρέπεται (status='under_review' & επιβλέπων)." });
    }
    return res.json({ message: "Η βαθμολόγηση ενεργοποιήθηκε." });
  } catch (err) {
    console.error("openGrading error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.submitGrade = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;

    const b = req.body || {};
    const keys = ["clarity","originality","methodology","writing","presentation"];
    const vals = keys.map(k => Number(b[k]));
    if (vals.some(v => !Number.isInteger(v) || v < 0 || v > 10)) {
      return res.status(400).json({ error: "Τα κριτήρια πρέπει να είναι ακέραιοι 0–10." });
    }
    const total = vals.reduce((a,c)=>a+c, 0);

    const [[authz]] = await db.query(
      `SELECT d.grading_open,
              (d.professor_id=? OR EXISTS (
                 SELECT 1 FROM committee_invitation
                  WHERE diplomatikhergasia_id=d.id AND professor_id=? AND status='accepted'
               )) AS can_grade
         FROM diplomatikhergasia d
        WHERE d.id=? AND d.status='under_review'`,
      [professorId, professorId, thesisId]
    );
    if (!authz || !authz.grading_open || !authz.can_grade) {
      return res.status(403).json({ error: "Δεν επιτρέπεται (grading_open=1 & μέλος τριμελούς/επιβλέπων)." });
    }

    await db.query(
      `INSERT INTO thesis_grade
         (diplomatikhergasia_id, professor_id, clarity, originality, methodology, writing, presentation, total)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         clarity=VALUES(clarity),
         originality=VALUES(originality),
         methodology=VALUES(methodology),
         writing=VALUES(writing),
         presentation=VALUES(presentation),
         total=VALUES(total),
         updated_at=NOW()`,
      [thesisId, professorId, ...vals, total]
    );

    return res.status(201).json({ message: "Η βαθμολογία καταχωρήθηκε." });
  } catch (err) {
    console.error("submitGrade error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.listGrades = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const [rows] = await db.query(
      `SELECT
         tg.professor_id,
         p.name AS professor_name,
         tg.clarity, tg.originality, tg.methodology, tg.writing, tg.presentation, tg.total,
         tg.created_at, tg.updated_at
       FROM thesis_grade tg
       JOIN professor p ON p.id = tg.professor_id
       WHERE tg.diplomatikhergasia_id=?
       ORDER BY p.name`,
      [thesisId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("listGrades error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/* =========================
 * ΝΕΑ: Draft & Ανακοίνωση παρουσίασης
 * ======================= */

/**
 * GET /api/professor/theses/:id/draft
 * Επιστρέφει το τελευταίο draft που ανέβασε ο φοιτητής για τη συγκεκριμένη ΔΕ.
 * Απαιτεί: να είναι ο επιβλέπων ή αποδεκτό μέλος τριμελούς.
 */
exports.getThesisLatestDraft = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) {
      return res.status(400).json({ error: "Μη έγκυρο id" });
    }

    // Έλεγχος πρόσβασης
    const [[authz]] = await db.query(
      `SELECT d.id
         FROM diplomatikhergasia d
         LEFT JOIN committee_invitation ci
           ON ci.diplomatikhergasia_id = d.id
          AND ci.professor_id = ?
          AND ci.status = 'accepted'
        WHERE d.id = ? AND (d.professor_id = ? OR ci.id IS NOT NULL)
        LIMIT 1`,
      [professorId, thesisId, professorId]
    );
    if (!authz) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    // Τελευταίο αρχείο από τον φοιτητή (uploaded_by = student.id)
    const [[row]] = await db.query(
      `SELECT f.id, f.file_name, f.file_path, f.uploaded_at,
              s.name AS student_name, s.email AS student_email
         FROM fileupload f
         JOIN diplomatikhergasia d ON d.id = f.DiplomatikhErgasia_id
         JOIN student s ON s.id = d.student_id
        WHERE f.DiplomatikhErgasia_id = ?
          AND f.uploaded_by = s.id
        ORDER BY f.uploaded_at DESC, f.id DESC
        LIMIT 1`,
      [thesisId]
    );

    if (!row) return res.status(404).json({ error: "Δεν βρέθηκε draft." });
    return res.json(row);
  } catch (err) {
    console.error("getThesisLatestDraft error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/**
 * GET /api/professor/theses/:id/announcement
 * Παράγει κείμενο ανακοίνωσης παρουσίασης με βάση τα στοιχεία στη thesis_presentation.
 */
exports.getPresentationAnnouncement = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) {
      return res.status(400).json({ error: "Μη έγκυρο id" });
    }

    // Έλεγχος πρόσβασης
    const [[authz]] = await db.query(
      `SELECT d.id
         FROM diplomatikhergasia d
         LEFT JOIN committee_invitation ci
           ON ci.diplomatikhergasia_id = d.id
          AND ci.professor_id = ?
          AND ci.status = 'accepted'
        WHERE d.id = ? AND (d.professor_id = ? OR ci.id IS NOT NULL)
        LIMIT 1`,
      [professorId, thesisId, professorId]
    );
    if (!authz) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    // Παίρνουμε στοιχεία παρουσίασης + τίτλο + φοιτητή
    const [[row]] = await db.query(
      `SELECT tp.mode, tp.room, tp.join_link, tp.exam_datetime,
              d.title,
              s.name AS student_name
         FROM thesis_presentation tp
         JOIN diplomatikhergasia d ON d.id = tp.diplomatikhergasia_id
         JOIN student s ON s.id = d.student_id
        WHERE tp.diplomatikhergasia_id = ?`,
      [thesisId]
    );
    if (!row) return res.status(404).json({ error: "Δεν έχει οριστεί παρουσίαση." });

    const when = new Date(row.exam_datetime).toLocaleString("el-GR");
    const place = row.mode === "online"
      ? (row.join_link ? `Σύνδεσμος: ${row.join_link}` : "Η παρουσίαση θα γίνει διαδικτυακά.")
      : (row.room ? `Αίθουσα: ${row.room}` : "Η παρουσίαση θα γίνει δια ζώσης.");

    const text =
`Ανακοίνωση Παρουσίασης Διπλωματικής

Τίτλος: ${row.title}
Φοιτητής/τρια: ${row.student_name}
Ημερομηνία & Ώρα: ${when}
${place}

Σας περιμένουμε!`;

    return res.json({ text });
  } catch (err) {
    console.error("getPresentationAnnouncement error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};
// --- Δημοσίευση ανακοίνωσης παρουσίασης από τον επιβλέποντα ---
exports.publishAnnouncement = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    const body = req.body || {};
    const text = String(body.text || "").trim();
    const customTitle = String(body.title || "").trim();

    if (!Number.isInteger(thesisId)) {
      return res.status(400).json({ error: "Μη έγκυρο id" });
    }
    if (!text) {
      return res.status(400).json({ error: "Κενό κείμενο ανακοίνωσης." });
    }

    // Επιτρεπόμενος μόνο ο επιβλέπων της συγκεκριμένης ΔΕ
    const [[own]] = await db.query(
      `SELECT id, title FROM diplomatikhergasia
        WHERE id=? AND professor_id=? LIMIT 1`,
      [thesisId, professorId]
    );
    if (!own) {
      return res.status(403).json({ error: "Μόνο ο επιβλέπων μπορεί να δημοσιεύσει ανακοίνωση." });
    }

    const title = customTitle || `Παρουσίαση: ${own.title}`;

    // Προσπάθησε με 'text' πεδίο. Αν δεν υπάρχει, κάνε fallback σε 'content'.
    try {
      await db.query(
        `INSERT INTO announcement (title, text, thesis_id, published_by_professor_id)
         VALUES (?,?,?,?)`,
        [title, text, thesisId, professorId]
      );
    } catch (e) {
      if (e && e.code === "ER_BAD_FIELD_ERROR") {
        // Fallback: ο πίνακας έχει 'content' αντί για 'text' ή δεν έχει τα extra cols
        try {
          await db.query(
            `INSERT INTO announcement (title, content, thesis_id, published_by_professor_id)
             VALUES (?,?,?,?)`,
            [title, text, thesisId, professorId]
          );
        } catch (e2) {
          // Τελικό fallback: μόνο title+content
          await db.query(
            `INSERT INTO announcement (title, content)
             VALUES (?,?)`,
            [title, text]
          );
        }
      } else {
        throw e;
      }
    }

    return res.status(201).json({ message: "Η ανακοίνωση δημοσιεύτηκε." });
  } catch (err) {
    console.error("publishAnnouncement error:", err);
    return res.status(500).json({ error: "Σφάλμα δημοσίευσης ανακοίνωσης" });
  }
};
