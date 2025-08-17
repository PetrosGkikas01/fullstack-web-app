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
