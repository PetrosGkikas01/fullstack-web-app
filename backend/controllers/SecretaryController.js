const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs/promises");

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO Secretary (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed]
    );
    res.status(201).json({ message: "Secretary registered successfully!" });
  } catch (err) {
    console.error("Secretary register error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM Secretary WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, rows[0].password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: rows[0].id, role: "secretary" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ token });
  } catch (err) {
    console.error("Secretary login error:", err);
    res.status(500).json({ error: err.message });
  }
};

async function upsertStudent(conn, s) {
  const hashed = await bcrypt.hash(s.password, 10);
  const sql = `
    INSERT INTO Student (name, email, password, student_number, department, etos)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name=VALUES(name),
      password=VALUES(password),
      student_number=VALUES(student_number),
      department=VALUES(department),
      etos=VALUES(etos)
  `;
  await conn.query(sql, [
    s.name, s.email, hashed, s.student_number, s.department, s.etos ?? null
  ]);
}

async function upsertProfessor(conn, p) {
  const hashed = await bcrypt.hash(p.password, 10);
  const sql = `
    INSERT INTO Professor (name, email, password, specialty, is_admin)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name=VALUES(name),
      password=VALUES(password),
      specialty=VALUES(specialty),
      is_admin=VALUES(is_admin)
  `;
  await conn.query(sql, [
    p.name, p.email, hashed, p.specialty ?? "", p.is_admin ? 1 : 0
  ]);
}

exports.importJSON = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Δεν εστάλη αρχείο" });
    const raw = await fs.readFile(req.file.path, "utf8");
    let data;
    try { data = JSON.parse(raw); }
    catch { return res.status(400).json({ error: "Μη έγκυρο JSON" }); }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const result = { students: { upserted: 0 }, professors: { upserted: 0 } };

      if (Array.isArray(data.students)) {
        for (const s of data.students) {
          if (!s.email || !s.name || !s.password || !s.student_number)
            throw new Error("Λείπουν υποχρεωτικά πεδία σε student");
          await upsertStudent(conn, s);
          result.students.upserted++;
        }
      }

      if (Array.isArray(data.professors)) {
        for (const p of data.professors) {
          if (!p.email || !p.name || !p.password)
            throw new Error("Λείπουν υποχρεωτικά πεδία σε professor");
          await upsertProfessor(conn, p);
          result.professors.upserted++;
        }
      }

      await conn.commit();
      res.json({ message: "Εισαγωγή ολοκληρώθηκε", result });
    } catch (err) {
      await conn.rollback();
      console.error("Import JSON error:", err);
      res.status(400).json({ error: err.message });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Import handler error:", err);
    res.status(500).json({ error: "Σφάλμα διακομιστή" });
  }
};

exports.listTheses = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        d.id   AS thesis_id,
        d.title,
        d.description,
        d.status,
        d.assigned_at,
        d.gs_protocol,
        d.nimeris_url,
        CASE
          WHEN d.assigned_at IS NULL THEN NULL
          ELSE CONCAT(
            FLOOR(TIMESTAMPDIFF(HOUR, d.assigned_at, NOW()) / 24), 'd ',
            MOD(TIMESTAMPDIFF(HOUR, d.assigned_at, NOW()), 24), 'h'
          )
        END AS elapsed_since_assignment,

        -- Επιβλέπων
        sp.id        AS supervisor_id,
        sp.name      AS supervisor_name,
        sp.email     AS supervisor_email,
        sp.specialty AS supervisor_specialty,

        -- Τριμελής (accepted)
        GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS committee_members,
        COUNT(DISTINCT p.id) AS committee_count
      FROM diplomatikhergasia d
      LEFT JOIN Professor sp
              ON sp.id = d.professor_id
      LEFT JOIN committee_invitation ci
              ON ci.diplomatikhergasia_id = d.id
            AND ci.status = 'accepted'
      LEFT JOIN Professor p
              ON p.id = ci.professor_id
      WHERE d.status IN ('active','under_review')
      GROUP BY d.id, d.title, d.description, d.status, d.assigned_at,
               d.gs_protocol, d.nimeris_url,
               sp.id, sp.name, sp.email, sp.specialty
      ORDER BY d.id DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Secretariat listTheses error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.getThesisDetails = async (req, res) => {
  const thesisId = Number(req.params.id);
  if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

  try {
    const [[summary]] = await db.query(
      `SELECT
        d.id   AS thesis_id,
        d.title,
        d.description,
        d.status,
        d.assigned_at,
        d.gs_protocol,
        d.nimeris_url,
        CASE
          WHEN d.assigned_at IS NULL THEN NULL
          ELSE CONCAT(
            FLOOR(TIMESTAMPDIFF(HOUR, d.assigned_at, NOW()) / 24), 'd ',
            MOD(TIMESTAMPDIFF(HOUR, d.assigned_at, NOW()), 24), 'h'
          )
        END AS elapsed_since_assignment,

        -- Επιβλέπων
        sp.id        AS supervisor_id,
        sp.name      AS supervisor_name,
        sp.email     AS supervisor_email,
        sp.specialty AS supervisor_specialty,

        -- Σύνοψη τριμελούς
        GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS committee_members,
        COUNT(DISTINCT p.id) AS committee_count
      FROM diplomatikhergasia d
      LEFT JOIN Professor sp
              ON sp.id = d.professor_id
      LEFT JOIN committee_invitation ci
              ON ci.diplomatikhergasia_id = d.id
            AND ci.status = 'accepted'
      LEFT JOIN Professor p
              ON p.id = ci.professor_id
      WHERE d.id = ?
      GROUP BY d.id, d.title, d.description, d.status, d.assigned_at,
               d.gs_protocol, d.nimeris_url,
               sp.id, sp.name, sp.email, sp.specialty`,
      [thesisId]
    );

    if (!summary) {
      return res.status(404).json({ error: "Η ΔΕ δεν βρέθηκε (ή δεν είναι σε ενεργή/υπό εξέταση κατάσταση)." });
    }

    const [members] = await db.query(
      `SELECT
         p.id        AS professor_id,
         p.name      AS professor_name,
         p.email     AS professor_email,
         p.specialty AS professor_specialty
       FROM committee_invitation ci
       JOIN professor p ON p.id = ci.professor_id
       WHERE ci.diplomatikhergasia_id = ?
         AND ci.status = 'accepted'
       ORDER BY p.name`,
      [thesisId]
    );

    res.json({ summary, members });
  } catch (err) {
    console.error("Secretariat getThesisDetails error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.setGSProtocol = async (req, res) => {
  try {
    const thesisId = Number(req.params.id);
    const { gs_protocol } = req.body || {};
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });
    if (!gs_protocol || String(gs_protocol).trim() === "") {
      return res.status(400).json({ error: "Απαιτείται gs_protocol" });
    }

    const [upd] = await db.query(
      `UPDATE diplomatikhergasia SET gs_protocol=? WHERE id=?`,
      [String(gs_protocol).trim(), thesisId]
    );
    if (!upd.affectedRows) return res.status(404).json({ error: "Η ΔΕ δεν βρέθηκε." });
    return res.json({ message: "Καταχωρήθηκε ο ΑΠ ΓΣ." });
  } catch (err) {
    console.error("setGSProtocol error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

exports.cancelThesis = async (req, res) => {
  let conn;
  try {
    const thesisId = Number(req.params.id);
    const { reasonText, gs_number, gs_year } = req.body || {};
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });
    if (!gs_number || !gs_year) {
      return res.status(400).json({ error: "Απαιτούνται αριθμός & έτος ΓΣ" });
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [[d]] = await conn.query(
      `SELECT id, status FROM diplomatikhergasia WHERE id=? FOR UPDATE`,
      [thesisId]
    );
    if (!d) { await conn.rollback(); return res.status(404).json({ error: "Η ΔΕ δεν βρέθηκε." }); }

    await conn.query(`DELETE FROM committee_invitation WHERE diplomatikhergasia_id=?`, [thesisId]);

    await conn.query(
      `INSERT INTO thesis_cancellation
         (diplomatikhergasia_id, by_professor_id, reason, gs_number, gs_year)
       VALUES (?, 0, ?, ?, ?)`,
      [thesisId, String(reasonText || "by_secretary"), String(gs_number), Number(gs_year)]
    );

    await conn.query(
      `UPDATE diplomatikhergasia
          SET status='available',
              student_id=NULL,
              assigned_at=NULL,
              grading_open=0
        WHERE id=?`,
      [thesisId]
    );

    await conn.commit();
    return res.json({ message: "Η ανάθεση ακυρώθηκε από τη Γραμματεία." });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    console.error("cancelThesis error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  } finally {
    if (conn) conn.release();
  }
};

exports.completeIfEligible = async (req, res) => {
  let conn;
  try {
    const thesisId = Number(req.params.id);
    if (!Number.isInteger(thesisId)) return res.status(400).json({ error: "Μη έγκυρο id" });

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [[d]] = await conn.query(
      `SELECT id, status, nimeris_url
         FROM diplomatikhergasia
        WHERE id=? FOR UPDATE`,
      [thesisId]
    );
    if (!d) { await conn.rollback(); return res.status(404).json({ error: "Η ΔΕ δεν βρέθηκε." }); }
    if (d.status !== "under_review") {
      await conn.rollback();
      return res.status(400).json({ error: "Η ΔΕ δεν είναι σε 'Υπό εξέταση'." });
    }
    if (!d.nimeris_url || String(d.nimeris_url).trim() === "") {
      await conn.rollback();
      return res.status(400).json({ error: "Δεν έχει καταχωρηθεί σύνδεσμος Νημερτής." });
    }

    const [[g]] = await conn.query(
      `SELECT COUNT(*) AS cnt, AVG(total) AS avg_total
         FROM thesis_grade
        WHERE diplomatikhergasia_id=?`,
      [thesisId]
    );
    const gradesCount = Number(g?.cnt || 0);
    const avgTotal = g?.avg_total ?? null;
    if (gradesCount < 3) {
      await conn.rollback();
      return res.status(400).json({ error: "Απαιτούνται τουλάχιστον 3 βαθμολογήσεις." });
    }

    await conn.query(
      `UPDATE diplomatikhergasia
          SET status='completed', grading_open=0
        WHERE id=?`,
      [thesisId]
    );

    await conn.commit();
    return res.json({
      message: "Η ΔΕ περατώθηκε επιτυχώς.",
      stats: { gradesCount, avgTotal }
    });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    console.error("completeIfEligible error:", err);
    return res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  } finally {
    if (conn) conn.release();
  }
};
