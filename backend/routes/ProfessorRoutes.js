const express = require("express");
const router = express.Router(); 
const professorController = require("../controllers/ProfessorController");

router.get("/", (req, res) => {
  res.json({ message: "Professor API working ✅" });
});

router.post("/register", professorController.register);
router.post("/login", professorController.login);
router.post("/create-topic", professorController.createTopic);

module.exports = router;