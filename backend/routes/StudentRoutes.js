const express = require("express");
const router = express.Router();
const StudentController = require("../controllers/StudentController");
const auth = require("../middleware/auth");

router.get("/", (req, res) => {
  res.json({ message: "Students API working ✅" });
});

router.post("/register", StudentController.register);
router.post("/login", StudentController.login);
router.put("/update-profile", auth.verifyToken, StudentController.updateProfile);
router.get("/me", auth.verifyToken, StudentController.getMe);
router.get("/all", auth.verifyToken, async (req, res) => {
  try {
    const [rows] = await require("../config/db").query(
      "SELECT id, name, email FROM student"
    );
    res.json(rows);
  } catch (err) {
    console.error("Σφάλμα λήψης φοιτητών:", err);
    res.status(500).json({ error: "Σφάλμα βάσης δεδομένων" });
  }
});
module.exports = router;