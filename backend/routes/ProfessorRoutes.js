const express = require("express");
const router = express.Router(); 
const ProfessorController = require("../controllers/ProfessorController");

router.get("/", (req, res) => {
  res.json({ message: "Professor API working ✅" });
});

router.post("/register", ProfessorController.register);
router.post("/login", ProfessorController.login);

module.exports = router;