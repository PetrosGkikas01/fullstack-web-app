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

//upsert για student μέσω μοναδικου email
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

//upsert για professor μέσω μοναδικου email
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
          // Βασικό validation
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

// GET /api/secretary/theses
exports.listTheses = async (req, res) => {
  try {
   const [rows] = await db.query(
      `SELECT
        d.id   AS thesis_id,
        d.title,
        d.description,
        d.status,
        d.assigned_at,
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
                sp.id, sp.name, sp.email, sp.specialty
      ORDER BY d.id DESC`
    );


    res.json(rows);
  } catch (err) {
    console.error("Secretariat listTheses error:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
};

// GET /api/secretary/theses/:id
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
