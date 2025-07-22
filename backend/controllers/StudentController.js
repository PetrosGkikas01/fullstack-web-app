const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { name, email, password, student_number, department, etos } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO Student (name, email, password, student_number, department, etos) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, student_number, department, etos]
    );
    res.status(201).json({ message: "Student registered successfully!" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await db.query("SELECT * FROM Student WHERE email = ?", [email]);
    if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: results[0].id, role: "student" }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateProfile = async (req, res) => {
  const { id } = req.user; // από token middleware
  const { address, contact_email, mobile_phone, landline_phone } = req.body;

  const fields = [];
  const values = [];

  if (address !== undefined) {
    fields.push("address = ?");
    values.push(address);
  }
  if (contact_email !== undefined) {
    fields.push("contact_email = ?");
    values.push(contact_email);
  }
  if (mobile_phone !== undefined) {
    fields.push("mobile_phone = ?");
    values.push(mobile_phone);
  }
  if (landline_phone !== undefined) {
    fields.push("landline_phone = ?");
    values.push(landline_phone);
  }

  if (fields.length === 0)
    return res.status(400).json({ error: "Δεν δόθηκαν στοιχεία προς ενημέρωση" });

  values.push(id);

  const sql = `UPDATE Student SET ${fields.join(", ")} WHERE id = ?`;
  try {
    await db.query(sql, values);
    res.json({ message: "Το προφίλ ενημερώθηκε επιτυχώς." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getMe = async (req, res) => {
  const { id } = req.user;

  try {
    const [rows] = await db.query("SELECT id, name, email, address, contact_email, mobile_phone, landline_phone FROM Student WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Δεν βρέθηκε ο φοιτητής" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};