const express = require("express");
const router = express.Router(); 
const ProfessorController = require("../controllers/ProfessorController");
const { verifyToken } = require("../middleware/auth");
const auth = require("../middleware/auth");

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
router.get("/theses/:id/invitations", auth.verifyToken, ProfessorController.getThesisInvitations);
router.post("/theses/:id/cancel-assignment", auth.verifyToken, ProfessorController.cancelAssignment);
router.post("/theses/:id/notes", auth.verifyToken, ProfessorController.addNote);
router.get("/theses/:id/notes", auth.verifyToken, ProfessorController.listMyNotes);
router.post("/theses/:id/mark-under-review", auth.verifyToken, ProfessorController.markUnderReview);
router.post("/theses/:id/grading/open", auth.verifyToken, ProfessorController.openGrading);
router.post("/theses/:id/grades", auth.verifyToken, ProfessorController.submitGrade);
router.get("/theses/:id/grades", auth.verifyToken, ProfessorController.listGrades);
module.exports = router;
