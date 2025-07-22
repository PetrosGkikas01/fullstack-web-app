const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, title, created_at FROM announcement ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("Backend error fetching announcements:", err);
    res.status(500).json({ error: "Σφάλμα στη βάση δεδομένων" });
  }
})

// GET μια συγκεκριμένη ανακοίνωση
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM announcement WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Δεν βρέθηκε" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Σφάλμα στη βάση δεδομένων" });
  }
});

module.exports = router;