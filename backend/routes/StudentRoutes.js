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
module.exports = router;