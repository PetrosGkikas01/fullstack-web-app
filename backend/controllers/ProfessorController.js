const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
    console.error(err);
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
    res.status(500).json({ error: err.message });
  }
};

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
    console.error("❌ DB error:", err);
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
    console.error("❌ DB error:", err);
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
    console.error("❌ Σφάλμα διαγραφής:", err);
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
    console.error("❌ Σφάλμα ανάκτησης θέματος:", err);
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
    console.error("❌ Σφάλμα ενημέρωσης:", err);
    res.status(500).json({ error: "Σφάλμα κατά την ενημέρωση." });
  }
};

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
    console.error("Σφάλμα ανάθεσης:", err);

    
    if (err?.code === "ER_NO_REFERENCED_ROW_2" || err?.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({ error: "Αποτυχία ελέγχου ακεραιότητας (FK). Έλεγξε το student_id." });
    }
    if (err?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD") {
      return res.status(400).json({ error: "Λάθος τύπος δεδομένου (π.χ. μη αριθμός σε INT)." });
    }

    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
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
    const { status } = req.query; // optional: 'pending' | 'accepted' | 'rejected' | 'cancelled'

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

