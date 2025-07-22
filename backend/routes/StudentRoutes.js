const express = require("express");
const router = express.Router();
const StudentController = require("../controllers/StudentController");

router.get("/", (req, res) => {
  res.json({ message: "Students API working ✅" });
});

router.post("/register", StudentController.register);
router.post("/login", StudentController.login);

module.exports = router;