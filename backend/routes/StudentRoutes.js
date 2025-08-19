// backend/routes/StudentRoutes.js
const express = require("express");
const router = express.Router();

const StudentController = require("../controllers/StudentController");
const { verifyToken } = require("../middleware/auth");

// Health check
router.get("/", (req, res) => res.json({ message: "Students API working ✅" }));

// Auth
router.post("/register", StudentController.register);
router.post("/login", StudentController.login);

// Profile (protected)
router.put("/update-profile", verifyToken, StudentController.updateProfile);
router.get("/me", verifyToken, StudentController.getMe);

// List all students (must include student_number for AM matching)
router.get("/all", verifyToken, StudentController.listAll);

// Find ONE by student_number (AM)
router.get("/by-number/:code", verifyToken, StudentController.getByNumber);
router.get("/MyAssignment", verifyToken, StudentController.getMyAssignment);
router.get("/committee/professors", verifyToken, StudentController.listProfessorsForCommittee);
router.get("/committee", verifyToken, StudentController.listCommitteeInvitations);
router.post("/committee/invite", verifyToken, StudentController.inviteProfessorToCommittee);
router.delete("/committee/:id", verifyToken, StudentController.cancelCommitteeInvitation);
module.exports = router;
