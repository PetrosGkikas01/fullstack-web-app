const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// επιτρέπουμε δημοσίευση σε καθηγητή ή γραμματεία
function ensurePublisher(req, res, next) {
  const role = req.user?.role;
  if (role !== "professor" && role !== "secretary") {
    return res.status(403).json({ error: "Απαιτείται ρόλος καθηγητή ή γραμματείας." });
  }
  next();
}

// Λίστα
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, title, created_at FROM announcement ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Backend error fetching announcements:", err);
    res.status(500).json({ error: "Σφάλμα στη βάση δεδομένων" });
  }
});

// Λεπτομέρεια
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM announcement WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Δεν βρέθηκε" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Backend error reading announcement:", err);
    res.status(500).json({ error: "Σφάλμα στη βάση δεδομένων" });
  }
});

// Δημοσίευση (δέχεται { title, text ή content })
router.post("/publish", verifyToken, ensurePublisher, async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim() || "Ανακοίνωση";
    const bodyText = String(req.body?.text || req.body?.content || "").trim();
    if (!bodyText) return res.status(400).json({ error: "Κενό κείμενο ανακοίνωσης." });

    // Θα δοκιμάσουμε διαδοχικά διαφορετικές ονομασίες στήλης σώματος,
    // ώστε να ταιριάξει στο schema σου (content|body|text|description).
    const candidates = [
      "INSERT INTO announcement (title, content) VALUES (?,?)",
      "INSERT INTO announcement (title, body) VALUES (?,?)",
      "INSERT INTO announcement (title, text) VALUES (?,?)",
      "INSERT INTO announcement (title, description) VALUES (?,?)",
    ];

    let insertedId = null;
    let lastErr = null;

    for (const sql of candidates) {
      try {
        const [r] = await db.query(sql, [title, bodyText]);
        insertedId = r.insertId || null;
        if (insertedId) break;
      } catch (e) {
        lastErr = e;
        // αν είναι άγνωστη στήλη, συνεχίζουμε στο επόμενο candidate
        if (e && e.code === "ER_BAD_FIELD_ERROR") continue;
        // για οποιοδήποτε άλλο σφάλμα, το βγάζουμε
        throw e;
      }
    }

    if (!insertedId) {
      console.error("Announcement publish failed (no matching column). Last error:", lastErr);
      return res.status(500).json({ error: "Αποτυχία δημοσίευσης (στήλες πίνακα)." });
    }

    return res.status(201).json({ id: insertedId, message: "Η ανακοίνωση δημοσιεύτηκε." });
  } catch (err) {
    console.error("Announcement publish error:", err);
    return res.status(500).json({ error: "Αποτυχία δημοσίευσης." });
  }
});

module.exports = router;
