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
    INSERT INTO DiplomatikhErgasia 
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
    "SELECT id, title, description, status, pdf_file FROM DiplomatikhErgasia WHERE professor_id = ? ORDER BY id DESC";

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
      "DELETE FROM DiplomatikhErgasia WHERE id = ? AND professor_id = ?",
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
      "SELECT * FROM DiplomatikhErgasia WHERE id = ? AND professor_id = ?",
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
      ? "UPDATE DiplomatikhErgasia SET title = ?, description = ?, pdf_file = ? WHERE id = ? AND professor_id = ?"
      : "UPDATE DiplomatikhErgasia SET title = ?, description = ? WHERE id = ? AND professor_id = ?";

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
