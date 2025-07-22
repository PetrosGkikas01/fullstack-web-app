const express = require("express");
const router = express.Router(); 
const professorController = require("../controllers/DiplomatikhErgasiaController");

router.get("/", (req, res) => {
  res.json({ message: "DiplomatikhErgasia API working ✅" });
});

module.exports = router;