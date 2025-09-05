// backend/routes/StudentRoutes.js
const express = require("express");
const router = express.Router();

const StudentController = require("../controllers/StudentController");
const { verifyToken } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Health check
router.get("/", (req, res) => res.json({ message: "Students API working ✅" }));

// --- Προαιρετικό guard ρόλου: φοιτητής/τρια ---
function ensureStudent(req, res, next) {
  if (!req.user || req.user.role !== "student") {
    return res.status(403).json({ error: "Απαιτείται ρόλος φοιτητή/τριας." });
  }
  next();
}

// --- Multer για upload πρόχειρου (draft) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    // Επιτρέπουμε pdf/doc/docx/zip/rar (προσαρμόζεις κατά βούληση)
    const okExt = [".pdf", ".doc", ".docx", ".zip", ".rar"].includes(
      path.extname(file.originalname).toLowerCase()
    );
    if (!okExt) return cb(new Error("Επιτρέπονται αρχεία: pdf, doc, docx, zip, rar."));
    cb(null, true);
  },
});


router.post("/register", StudentController.register);
router.post("/login", StudentController.login);

router.put("/update-profile", verifyToken, ensureStudent, StudentController.updateProfile);
router.get("/me", verifyToken, ensureStudent, StudentController.getMe);

router.get("/all", verifyToken, StudentController.listAll); // (μπορεί να είναι και μόνο για γραμματεία/καθηγητές)
router.get("/by-number/:code", verifyToken, StudentController.getByNumber);

router.get("/MyAssignment", verifyToken, ensureStudent, StudentController.getMyAssignment);
router.get("/committee/professors", verifyToken, ensureStudent, StudentController.listProfessorsForCommittee);
router.get("/committee", verifyToken, ensureStudent, StudentController.listCommitteeInvitations);
router.post("/committee/invite", verifyToken, ensureStudent, StudentController.inviteProfessorToCommittee);
router.delete("/committee/:id", verifyToken, ensureStudent, StudentController.cancelCommitteeInvitation);


router.post(
  "/theses/:id/draft",
  verifyToken,
  ensureStudent,
  (req, res, next) =>
    upload.single("draft")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Σφάλμα ανέβασματος." });
      next();
    }),
  StudentController.uploadDraft
);

router.post(
  "/theses/:id/materials/link",
  verifyToken,
  ensureStudent,
  StudentController.addMaterialLink
);

router.get(
  "/theses/:id/materials",
  verifyToken,
  ensureStudent,
  StudentController.listMaterials
);

router.post(
  "/theses/:id/presentation",
  verifyToken,
  ensureStudent,
  StudentController.setPresentation
);

router.get(
  "/theses/:id/presentation",
  verifyToken,
  ensureStudent,
  StudentController.getPresentation
);

router.patch(
  "/theses/:id/nimeris-url",
  verifyToken,
  ensureStudent,
  StudentController.setNimerisUrl
);

router.get(
  "/theses/:id/minutes",
  verifyToken,
  ensureStudent,
  StudentController.viewExamMinutes
);

module.exports = router;
