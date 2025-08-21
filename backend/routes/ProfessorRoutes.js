const express = require("express");
const router = express.Router(); 
const ProfessorController = require("../controllers/ProfessorController");
const { verifyToken } = require("../middleware/auth");

router.get("/", (req, res) => {
  res.json({ message: "Professor API working ✅" });
});

router.post("/register", ProfessorController.register);
router.post("/login", ProfessorController.login);

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

router.post(
  "/topics",
  verifyToken,
  (req, res, next) => {
    upload.single("pdf_file")(req, res, function (err) {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: "Σφάλμα κατά το ανέβασμα του αρχείου." });
      }
      next();
    });
  },
  ProfessorController.createTopic
);

router.get("/topics", verifyToken, ProfessorController.getMyTopics);
router.get("/topics/:id", verifyToken, ProfessorController.getTopicById);
router.delete("/topics/:id", verifyToken, ProfessorController.deleteTopic);
router.get("/theses", verifyToken, ProfessorController.listManagedTheses);

router.put("/topics/:id", verifyToken, (req, res, next) => {
  upload.single("pdf_file")(req, res, function (err) {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: "Σφάλμα κατά το ανέβασμα του αρχείου." });
    }
    next();
  });
}, ProfessorController.updateTopic);

router.post("/assign", verifyToken, ProfessorController.assignTopicToStudent);
router.post("/committee/respond", verifyToken, ProfessorController.respondToCommitteeInvitation);
router.get("/committee/invitations", verifyToken, ProfessorController.listMyCommitteeInvitations);

module.exports = router;
