const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

const ProfessorController = require("../controllers/ProfessorController");
const { verifyToken } = require("../middleware/auth");

// --- role guard: πρέπει να είναι καθηγητής ---
function ensureProfessor(req, res, next) {
  if (!req.user || req.user.role !== "professor") {
    return res.status(403).json({ error: "Απαιτείται ρόλος καθηγητή." });
  }
  next();
}

// --- multer (PDFs -> /uploads) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";
    if (!ok) return cb(new Error("Μόνο PDF επιτρέπεται."));
    cb(null, true);
  },
});

// Health
router.get("/", (req, res) => res.json({ message: "Professor API working ✅" }));

// =====================
// Auth
// =====================
router.post("/register", ProfessorController.register);
router.post("/login", ProfessorController.login);

// =====================
// Topics
// =====================
router.post(
  "/topics",
  verifyToken,
  ensureProfessor,
  (req, res, next) =>
    upload.single("pdf_file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: "Σφάλμα upload αρχείου (PDF μόνο, έως 20MB)." });
      next();
    }),
  ProfessorController.createTopic
);
router.get("/topics", verifyToken, ensureProfessor, ProfessorController.getMyTopics);
router.get("/topics/:id", verifyToken, ensureProfessor, ProfessorController.getTopicById);
router.put(
  "/topics/:id",
  verifyToken,
  ensureProfessor,
  (req, res, next) =>
    upload.single("pdf_file")(req, res, (err) => {
      if (err) return res.status(400).json({ error: "Σφάλμα upload αρχείου (PDF μόνο, έως 20MB)." });
      next();
    }),
  ProfessorController.updateTopic
);
router.delete("/topics/:id", verifyToken, ensureProfessor, ProfessorController.deleteTopic);

// =====================
// Ανάθεση θέματος
// =====================
router.post("/assign", verifyToken, ensureProfessor, ProfessorController.assignTopicToStudent);

// =====================
// Προσκλήσεις (ως μέλος)
// =====================
router.get("/committee/invitations", verifyToken, ensureProfessor, ProfessorController.listMyCommitteeInvitations);
router.post("/committee/respond", verifyToken, ensureProfessor, ProfessorController.respondToCommitteeInvitation);

// =====================
// Διαχείριση ΔΕ
// =====================
router.get("/theses", verifyToken, ensureProfessor, ProfessorController.listManagedTheses);
router.get("/theses/:id/invitations", verifyToken, ensureProfessor, ProfessorController.getThesisInvitations);

// Ακύρωση ανάθεσης (REST + alias για συμβατότητα)
router.delete("/theses/:id/assignment", verifyToken, ensureProfessor, ProfessorController.cancelAssignment);
router.post("/theses/:id/cancel-assignment", verifyToken, ensureProfessor, ProfessorController.cancelAssignment);

// =====================
// Καταστάσεις / Βαθμολόγηση
// =====================
router.patch("/theses/:id/under-review", verifyToken, ensureProfessor, ProfessorController.markUnderReview);
router.post("/theses/:id/mark-under-review", verifyToken, ensureProfessor, ProfessorController.markUnderReview);

router.patch("/theses/:id/grading/open", verifyToken, ensureProfessor, ProfessorController.openGrading);
router.post("/theses/:id/grading/open", verifyToken, ensureProfessor, ProfessorController.openGrading);

router.post("/theses/:id/grades", verifyToken, ensureProfessor, ProfessorController.submitGrade);
router.get("/theses/:id/grades", verifyToken, ensureProfessor, ProfessorController.listGrades);

// =====================
// Σημειώσεις
// =====================
router.post("/theses/:id/notes", verifyToken, ensureProfessor, ProfessorController.addNote);
router.get("/theses/:id/notes", verifyToken, ensureProfessor, ProfessorController.listMyNotes);
router.get("/theses/:id/notes/mine", verifyToken, ensureProfessor, ProfessorController.listMyNotes);

// =====================
// Draft & Ανακοίνωση
// =====================
router.get("/theses/:id/draft", verifyToken, ensureProfessor, ProfessorController.getThesisLatestDraft);
router.get("/theses/:id/announcement", verifyToken, ensureProfessor, ProfessorController.getPresentationAnnouncement);

// -- ΔΗΜΟΣΙΕΥΣΗ ΑΝΑΚΟΙΝΩΣΗΣ --
router.post("/theses/:id/announcement", verifyToken, ensureProfessor, ProfessorController.publishAnnouncement);

module.exports = router;
