const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


async function profHasAccessToThesis(thesisId, professorId) {
  const [[row]] = await db.query(
    `SELECT d.id
       FROM diplomatikhergasia d
       LEFT JOIN committee_invitation ci
         ON ci.diplomatikhergasia_id = d.id
        AND ci.professor_id = ?
        AND ci.status = 'accepted'
      WHERE d.id = ?
        AND (d.professor_id = ? OR ci.id IS NOT NULL)
      LIMIT 1`,
    [professorId, thesisId, professorId]
  );
  return !!row;
}

async function logStatusChange(runner, thesisId, fromStatus, toStatus, actorProfessorId = null, actorRole = "professor", note = null) {
  const exec = runner && runner.query ? runner : db;
  const sql = `INSERT INTO thesis_status_history
              (diplomatikhergasia_id, from_status, to_status, actor_role, actor_professor_id, note)
              VALUES (?,?,?,?,?,?)`;
  await exec.query(sql, [thesisId, fromStatus, toStatus, actorRole, actorProfessorId, note]);
}


exports.register = async (req, res) => {
  const { name, email, password, specialty, is_admin } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO Professor (name, email, password, specialty, is_admin) VALUES (?,?,?,?,?)",
      [name, email, hashed, specialty || "", is_admin ? 1 : 0]
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
    const [rows] = await db.query("SELECT * FROM Professor WHERE email = ?", [email]);
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: rows[0].id, role: "professor" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.json({ token });
  } catch (err) {
    console.error("Professor login error:", err);
    res.status(500).json({ error: err.message });
  }
};



exports.createTopic = async (req, res) => {
  const { title, description } = req.body;
  const professor_id = req.user.id;
  const pdf_file = req.file ? req.file.filename : null;

  try {
    await db.query(
      `INSERT INTO diplomatikhergasia (title, description, professor_id, status, pdf_file)
       VALUES (?, ?, ?, 'available', ?)`,
      [title, description, professor_id, pdf_file]
    );
    res.status(201).json({ message: "Το θέμα δημιουργήθηκε επιτυχώς." });
  } catch (err) {
    console.error("createTopic error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.getMyTopics = async (req, res) => {
  const professor_id = req.user.id;
  try {
    const [rows] = await db.query(
      "SELECT id, title, description, status, pdf_file FROM diplomatikhergasia WHERE professor_id = ? ORDER BY id DESC",
      [professor_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("getMyTopics error:", err);
    res.status(500).json({ error: "Σφάλμα κατά την ανάκτηση των θεμάτων." });
  }
};

exports.getTopicById = async (req, res) => {
  const professor_id = req.user.id;
  const id = Number(req.params.id);
  try {
    const [[row]] = await db.query(
      "SELECT id, title, description, status, pdf_file FROM diplomatikhergasia WHERE id = ? AND professor_id = ?",
      [id, professor_id]
    );
    if (!row) return res.status(404).json({ error: "Το θέμα δεν βρέθηκε." });
    res.json(row);
  } catch (err) {
    console.error("getTopicById error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.updateTopic = async (req, res) => {
  const professor_id = req.user.id;
  const id = Number(req.params.id);
  const { title, description, status } = req.body;
  const pdf_file = req.file ? req.file.filename : null;

  try {
    const [result] = await db.query(
      `UPDATE diplomatikhergasia
          SET title = COALESCE(?, title),
              description = COALESCE(?, description),
              status = COALESCE(?, status),
              pdf_file = COALESCE(?, pdf_file)
        WHERE id = ? AND professor_id = ?`,
      [title ?? null, description ?? null, status ?? null, pdf_file ?? null, id, professor_id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Το θέμα δεν βρέθηκε." });
    res.json({ message: "Το θέμα ενημερώθηκε επιτυχώς." });
  } catch (err) {
    console.error("updateTopic error:", err);
    res.status(500).json({ error: "Σφάλμα κατά την ενημέρωση." });
  }
};

exports.deleteTopic = async (req, res) => {
  const professor_id = req.user.id;
  const id = Number(req.params.id);
  try {
    const [result] = await db.query(
      "DELETE FROM diplomatikhergasia WHERE id = ? AND professor_id = ?",
      [id, professor_id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Το θέμα δεν βρέθηκε ή δεν ανήκει σε εσάς." });
    res.json({ message: "Το θέμα διαγράφηκε επιτυχώς." });
  } catch (err) {
    console.error("deleteTopic error:", err);
    res.status(500).json({ error: "Σφάλμα κατά τη διαγραφή." });
  }
};


exports.assignTopicToStudent = async (req, res) => {
  const professor_id = req.user.id;
  let { topic_id, student_id } = req.body;
  topic_id = Number(topic_id);
  student_id = Number(student_id);
  if (!Number.isInteger(topic_id) || !Number.isInteger(student_id)) {
    return res.status(400).json({ error: "Μη έγκυρες παράμετροι." });
  }

  try {
    const [stu] = await db.query("SELECT id FROM student WHERE id = ? LIMIT 1", [student_id]);
    if (!stu.length) return res.status(400).json({ error: "Ο/Η φοιτητής/τρια δεν βρέθηκε." });

    const [topics] = await db.query(
      "SELECT id FROM diplomatikhergasia WHERE id = ? AND professor_id = ? AND status = 'available' LIMIT 1",
      [topic_id, professor_id]
    );
    if (!topics.length) return res.status(404).json({ error: "Το θέμα δεν βρέθηκε ή δεν είναι διαθέσιμο." });

    await db.query(
      "UPDATE diplomatikhergasia SET student_id = ?, status = 'under_assignment', assigned_at = NOW() WHERE id = ?",
      [student_id, topic_id]
    );
    
    await logStatusChange(db, topic_id, "available", "under_assignment", professor_id, "professor", `Assign to student ${student_id}`);

    res.json({ message: "✅ Το θέμα ανατέθηκε επιτυχώς!" });
  } catch (err) {
    console.error("assignTopicToStudent error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};


exports.listMyCommitteeInvitations = async (req, res) => {
  try {
    const professorId = req.user.id;
    const { status } = req.query;
    const params = [professorId];
    let where = "ci.professor_id = ?";
    if (status) { where += " AND ci.status = ?"; params.push(status); }

    const [rows] = await db.query(
      `SELECT 
         ci.id           AS id,
         ci.status       AS status,
         ci.invited_at   AS invited_at,
         ci.responded_at AS responded_at,
         d.id            AS thesis_id,
         d.title         AS thesis_title,
         d.status        AS thesis_status,
         s.id            AS student_id,
         s.name          AS student_name,
         s.email         AS student_email
       FROM committee_invitation ci
       JOIN diplomatikhergasia d ON d.id = ci.diplomatikhergasia_id
       JOIN student s ON s.id = d.student_id
       WHERE ${where}
       ORDER BY ci.invited_at DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("listMyCommitteeInvitations error", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

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
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: "Δεν βρέθηκε πρόσκληση." }); }

    const inv = rows[0];
    if (inv.status !== "pending") {
      await conn.rollback();
      return res.status(409).json({ error: "Η πρόσκληση δεν είναι πλέον εκκρεμής." });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    await conn.query(
      `UPDATE committee_invitation SET status=?, responded_at=NOW() WHERE id=?`,
      [newStatus, invitation_id]
    );

    if (newStatus === "accepted") {
      const thesisId = inv.diplomatikhergasia_id;
      await conn.query(`SELECT id FROM diplomatikhergasia WHERE id=? FOR UPDATE`, [thesisId]);

      const [acc] = await conn.query(
        `SELECT COUNT(*) AS c FROM committee_invitation WHERE diplomatikhergasia_id=? AND status='accepted'`,
        [thesisId]
      );
      if ((acc[0]?.c || 0) >= 2) {
        const [[prev]] = await conn.query(`SELECT status FROM diplomatikhergasia WHERE id=?`, [thesisId]);
        await conn.query(`UPDATE diplomatikhergasia SET status='active' WHERE id=?`, [thesisId]);
        await logStatusChange(conn, thesisId, (prev && prev.status) || "under_assignment", "active", null, "system", "Accepted committee (2/2)");

        
        try {
          await conn.query(
            `UPDATE committee_invitation
                SET status='cancelled',
                    responded_at = COALESCE(responded_at, NOW())
              WHERE diplomatikhergasia_id=? AND status='pending'`,
            [thesisId]
          );
        } catch (e) {
          
          await conn.query(
            `UPDATE committee_invitation
                SET status='canceled',
                    responded_at = COALESCE(responded_at, NOW())
              WHERE diplomatikhergasia_id=? AND status='pending'`,
            [thesisId]
          );
        }
      }
    }

    await conn.commit();
    res.json({ message: "Η απάντησή σας καταχωρήθηκε." });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(_){} }
    console.error("respondToCommitteeInvitation error", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  } finally {
    if (conn) conn.release();
  }
};


exports.listManagedTheses = async (req, res) => {
  const professorId = req.user.id;
  const role = String(req.query.role || "supervisor").toLowerCase(); 
  const statusCsv = String(req.query.status || "").trim();
  const statuses = statusCsv ? statusCsv.split(",").map(s => s.trim()).filter(Boolean) : [];

  try {
    let whereStatus = "";
    if (statuses.length) whereStatus = ` AND d.status IN (${statuses.map(() => "?").join(",")})`;

    if (role === "committee") {
      const [rows] = await db.query(
        `SELECT d.id, d.title, d.status, d.assigned_at, d.pdf_file, d.grading_open,
               s.id AS student_id, s.name AS student_name, s.email AS student_email
          FROM diplomatikhergasia d
          JOIN student s ON s.id = d.student_id
          JOIN committee_invitation ci
            ON ci.diplomatikhergasia_id = d.id
           AND ci.professor_id = ?
           AND ci.status = 'accepted'
         WHERE 1=1 ${whereStatus}
         ORDER BY d.assigned_at DESC, d.id DESC`,
        [professorId, ...statuses]
      );
      return res.json(rows);
    }

    if (role === "supervisor") {
      const [rows] = await db.query(
        `SELECT d.id, d.title, d.status, d.assigned_at, d.pdf_file, d.grading_open,
               s.id AS student_id, s.name AS student_name, s.email AS student_email
          FROM diplomatikhergasia d
          JOIN student s ON s.id = d.student_id
         WHERE d.professor_id = ? ${whereStatus}
         ORDER BY d.assigned_at DESC, d.id DESC`,
        [professorId, ...statuses]
      );
      return res.json(rows);
    }

  
    const [rowsS] = await db.query(
      `SELECT d.id, d.title, d.status, d.assigned_at, d.pdf_file, d.grading_open,
              s.id AS student_id, s.name AS student_name, s.email AS student_email, 'supervisor' AS role
         FROM diplomatikhergasia d
         JOIN student s ON s.id = d.student_id
        WHERE d.professor_id = ? ${whereStatus}
        ORDER BY d.assigned_at DESC, d.id DESC`,
      [professorId, ...statuses]
    );
    const [rowsC] = await db.query(
      `SELECT d.id, d.title, d.status, d.assigned_at, d.pdf_file, d.grading_open,
              s.id AS student_id, s.name AS student_name, s.email AS student_email, 'committee' AS role
         FROM diplomatikhergasia d
         JOIN student s ON s.id = d.student_id
         JOIN committee_invitation ci
           ON ci.diplomatikhergasia_id = d.id
          AND ci.professor_id = ?
          AND ci.status = 'accepted'
        WHERE 1=1 ${whereStatus}
        ORDER BY d.assigned_at DESC, d.id DESC`,
      [professorId, ...statuses]
    );
    return res.json([...rowsS, ...rowsC].sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at)));
  } catch (err) {
    console.error("listManagedTheses error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.getThesisInvitations = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const ok = await profHasAccessToThesis(thesisId, professorId);
    if (!ok) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    const [rows] = await db.query(
      `SELECT ci.id, ci.status, ci.invited_at, ci.responded_at,
              p.id AS professor_id, p.name AS professor_name, p.email AS professor_email
         FROM committee_invitation ci
         JOIN professor p ON p.id = ci.professor_id
        WHERE ci.diplomatikhergasia_id = ?
        ORDER BY ci.invited_at ASC, ci.id ASC`,
      [thesisId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getThesisInvitations error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
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
        WHERE id = ? FOR UPDATE`,
      [thesisId]
    );
    if (!th) { await conn.rollback(); return res.status(404).json({ error: "Η ΔΕ δεν βρέθηκε." }); }
    if (th.professor_id !== professorId) {
      await conn.rollback();
      return res.status(403).json({ error: "Επιτρέπεται μόνο στον επιβλέποντα." });
    }

    if (th.status === "under_assignment") {
      await conn.query(`DELETE FROM committee_invitation WHERE diplomatikhergasia_id=?`, [thesisId]);
      await conn.query(
        `UPDATE diplomatikhergasia
            SET student_id=NULL, status='available', assigned_at=NULL, grading_open=0
          WHERE id=?`,
        [thesisId]
      );
      await logStatusChange(conn, thesisId, "under_assignment", "available", professorId, "professor", "Cancel assignment");
      await conn.commit();
      return res.json({ message: "Η ανάθεση ακυρώθηκε (Υπό ανάθεση)." });
    }

    if (th.status === "active") {
      const { gs_number, gs_year } = req.body || {};
      if (!gs_number || !gs_year) {
        await conn.rollback();
        return res.status(400).json({ error: "Απαιτείται GS αριθμός & έτος για ακύρωση ενεργής ΔΕ." });
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
      await logStatusChange(conn, thesisId, "active", "available", professorId, "professor", "Cancel active after GS");
      await conn.commit();
      return res.json({ message: "Η ανάθεση ακυρώθηκε (Ενεργή) και καταχωρήθηκε στη Γ.Σ." });
    }

    await conn.rollback();
    res.status(400).json({ error: "Η ακύρωση επιτρέπεται μόνο σε 'under_assignment' ή 'active'." });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch(_){} }
    console.error("cancelAssignment error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  } finally {
    if (conn) conn.release();
  }
};

/* =========================
 * Σημειώσεις καθηγητή
 * ======================= */

exports.addNote = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;
    const note = String(req.body?.note_text || "").trim();
    if (!note) return res.status(400).json({ error: "Κενό κείμενο." });
    if (note.length > 300) return res.status(400).json({ error: "Μέγιστο 300 χαρακτήρες." });

    const ok = await profHasAccessToThesis(thesisId, professorId);
    if (!ok) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    await db.query(
      `INSERT INTO thesis_note (diplomatikhergasia_id, professor_id, note_text) VALUES (?,?,?)`,
      [thesisId, professorId, note]
    );
    res.status(201).json({ message: "Η σημείωση αποθηκεύτηκε." });
  } catch (err) {
    console.error("addNote error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
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
    res.json(rows);
  } catch (err) {
    console.error("listMyNotes error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

/* =========================
 * Καταστάσεις/βαθμολόγηση
 * ======================= */

exports.markUnderReview = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;

    const [[was]] = await db.query(`SELECT status FROM diplomatikhergasia WHERE id=?`, [thesisId]);
    const [upd] = await db.query(
      `UPDATE diplomatikhergasia
          SET status='under_review'
        WHERE id=? AND professor_id=? AND status='active'`,
      [thesisId, professorId]
    );
    if (!upd.affectedRows) {
      return res.status(400).json({ error: "Δεν επιτρέπεται (πρέπει να είστε επιβλέπων και status='active')." });
    }

    await logStatusChange(db, thesisId, (was && was.status) || "active", "under_review", professorId, "professor", "Mark under review");
    res.json({ message: "Η κατάσταση άλλαξε σε «Υπό Εξέταση»." });
  } catch (err) {
    console.error("markUnderReview error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
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
    if (!upd.affectedRows) {
      return res.status(400).json({ error: "Δεν επιτρέπεται (status='under_review' & επιβλέπων)." });
    }
    res.json({ message: "Η βαθμολόγηση ενεργοποιήθηκε." });
  } catch (err) {
    console.error("openGrading error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.submitGrade = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const professorId = req.user.id;

    const b = req.body || {};
    const keys = ["clarity", "originality", "methodology", "writing", "presentation"];
    const vals = keys.map(k => Number(b[k]));
    if (vals.some(v => !Number.isInteger(v) || v < 0 || v > 10)) {
      return res.status(400).json({ error: "Τα κριτήρια πρέπει να είναι ακέραιοι 0–10." });
    }
    const total = vals.reduce((a, c) => a + c, 0);

    const [[authz]] = await db.query(
      `SELECT d.grading_open,
              (d.professor_id=? OR EXISTS (
                 SELECT 1
                   FROM committee_invitation
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

    res.status(201).json({ message: "Η βαθμολογία καταχωρήθηκε." });
  } catch (err) {
    console.error("submitGrade error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.listGrades = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    
    const [rows] = await db.query(
      `SELECT tg.professor_id, p.name AS professor_name,
              tg.clarity, tg.originality, tg.methodology, tg.writing, tg.presentation, tg.total,
              tg.created_at, tg.updated_at
         FROM thesis_grade tg
         JOIN professor p ON p.id = tg.professor_id
        WHERE tg.diplomatikhergasia_id=?
        ORDER BY p.name`,
      [thesisId]
    );
    res.json(rows);
  } catch (err) {
    console.error("listGrades error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

 

exports.getThesisLatestDraft = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const ok = await profHasAccessToThesis(thesisId, professorId);
    if (!ok) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    const [[row]] = await db.query(
      `SELECT f.id, f.file_name, f.file_path, f.uploaded_at,
              s.name AS student_name, s.email AS student_email
         FROM fileupload f
         JOIN diplomatikhergasia d ON d.id = f.DiplomatikhErgasia_id
         JOIN student s           ON s.id = d.student_id
        WHERE f.DiplomatikhErgasia_id = ?
          AND f.uploaded_by = s.id
        ORDER BY f.uploaded_at DESC, f.id DESC
        LIMIT 1`,
      [thesisId]
    );
    if (!row) return res.status(404).json({ error: "Δεν βρέθηκε draft." });
    res.json(row);
  } catch (err) {
    console.error("getThesisLatestDraft error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};


exports.getPresentationAnnouncement = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) {
      return res.status(400).json({ error: "Μη έγκυρο id" });
    }

    const ok = await profHasAccessToThesis(thesisId, professorId);
    if (!ok) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    const [[tp]] = await db.query(
      `SELECT tp.mode, tp.room, tp.join_link, tp.exam_datetime,
              d.title, s.name AS student_name
         FROM thesis_presentation tp
         JOIN diplomatikhergasia d ON d.id = tp.diplomatikhergasia_id
         JOIN student s           ON s.id = d.student_id
        WHERE tp.diplomatikhergasia_id = ?
        LIMIT 1`,
      [thesisId]
    );
    if (tp) {
      const when = new Date(tp.exam_datetime).toLocaleString("el-GR");
      const place = tp.mode === "online"
        ? (tp.join_link ? `Σύνδεσμος: ${tp.join_link}` : "Η παρουσίαση θα γίνει διαδικτυακά.")
        : (tp.room ? `Αίθουσα: ${tp.room}` : "Η παρουσίαση θα γίνει δια ζώσης.");

      const text = `Ανακοίνωση Παρουσίασης Διπλωματικής

Τίτλος: ${tp.title}
Φοιτητής/τρια: ${tp.student_name}
Ημερομηνία & Ώρα: ${when}
${place}

Σας περιμένουμε!`;
      return res.json({ text });
    }

    
    const [[thesis]] = await db.query(`SELECT title FROM diplomatikhergasia WHERE id=? LIMIT 1`, [thesisId]);
    if (!thesis) return res.status(404).json({ error: "Η ΔΕ δεν βρέθηκε." });

    const [rows] = await db.query(
      `SELECT body AS text
         FROM announcement
        WHERE title LIKE CONCAT('Παρουσίαση: ', ?, '%')
        ORDER BY id DESC
        LIMIT 1`,
      [thesis.title]
    );
    if (!rows.length) return res.json({ text: null });
    return res.json({ text: rows[0].text });
  } catch (err) {
    console.error("getPresentationAnnouncement error:", err);
    return res.status(500).json({ error: "Σφάλμα ανάκτησης ανακοίνωσης" });
  }
};

exports.publishAnnouncement = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    const body = req.body || {};
    const text = String(body.text || "").trim();
    const customTitle = String(body.title || "").trim();

    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });
    if (!text) return res.status(400).json({ error: "Κενό κείμενο ανακοίνωσης." });

    
    const [[own]] = await db.query(
      `SELECT id, title FROM diplomatikhergasia WHERE id=? AND professor_id=? LIMIT 1`,
      [thesisId, professorId]
    );
    if (!own) return res.status(403).json({ error: "Μόνο ο επιβλέπων μπορεί να δημοσιεύσει ανακοίνωση." });

    const title = customTitle || `Παρουσίαση: ${own.title}`;

    
    try {
      await db.query(
        `INSERT INTO announcement (title, text, thesis_id, published_by_professor_id)
         VALUES (?,?,?,?)`,
        [title, text, thesisId, professorId]
      );
    } catch (e) {
      if (e?.code === "ER_BAD_FIELD_ERROR") {
        try {
          await db.query(
            `INSERT INTO announcement (title, content, thesis_id, published_by_professor_id)
             VALUES (?,?,?,?)`,
            [title, text, thesisId, professorId]
          );
        } catch (e2) {
          await db.query(
            `INSERT INTO announcement (title, body, created_by) VALUES (?,?,?)`,
            [title, text, professorId]
          );
        }
      } else { throw e; }
    }

    res.status(201).json({ message: "Η ανακοίνωση δημοσιεύτηκε." });
  } catch (err) {
    console.error("publishAnnouncement error:", err);
    res.status(500).json({ error: "Σφάλμα δημοσίευσης ανακοίνωσης" });
  }
};
 

exports.getThesisStatusHistory = async (req, res) => {
  try {
    const professorId = req.user.id;
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    const ok = await profHasAccessToThesis(thesisId, professorId);
    if (!ok) return res.status(403).json({ error: "Δεν έχετε πρόσβαση στη ΔΕ." });

    const [rows] = await db.query(
      `SELECT h.id, h.from_status, h.to_status, h.note, h.created_at,
              h.actor_role, h.actor_professor_id,
              p.name AS actor_name, p.email AS actor_email
         FROM thesis_status_history h
         LEFT JOIN professor p ON p.id = h.actor_professor_id
        WHERE h.diplomatikhergasia_id = ?
        ORDER BY h.created_at ASC, h.id ASC`,
      [thesisId]
    );
    res.json(rows);
  } catch (err) {
    console.error("getThesisStatusHistory error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};
