const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.login = (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM Student WHERE email = ?", [email], async (err, rows) => {
    if (err || rows.length === 0) return res.status(401).json({ error: "Λάθος στοιχεία" });

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(401).json({ error: "Λάθος στοιχεία" });

    const token = jwt.sign({ id: rows[0].id, role: "student" }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
  });
};
