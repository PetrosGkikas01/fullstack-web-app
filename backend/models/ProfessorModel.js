const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { name, email, password, specialty } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO Professor (name, email, password, specialty) VALUES (?, ?, ?, ?)",
    [name, email, hashed, specialty],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Καθηγητής εγγράφηκε." });
    }
  );
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM Professor WHERE email = ?", [email], async (err, rows) => {
    if (err || rows.length === 0) return res.status(401).json({ error: "Λάθος στοιχεία" });

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(401).json({ error: "Λάθος στοιχεία" });

    const token = jwt.sign({ id: rows[0].id, role: "professor" }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
  });
};

exports.createTopic = (req, res) => {
  const { title, description, professor_id } = req.body;

  db.query(
    "INSERT INTO DiplomatikhErgasia (title, description, professor_id, status) VALUES (?, ?, ?, 'available')",
    [title, description, professor_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Το θέμα δημιουργήθηκε." });
    }
  );
};