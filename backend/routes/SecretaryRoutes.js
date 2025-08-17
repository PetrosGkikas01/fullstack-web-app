const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const SecretaryController = require("../controllers/SecretaryController");
const auth = require("../middleware/auth");


const upload = multer({ dest: path.join(__dirname, "..", "uploads") });

router.post("/register", SecretaryController.register);
router.post("/login", SecretaryController.login);
router.post(
  "/import-json",
  auth.verifyToken,
  (req, res, next) => {
    if (req.user?.role !== "secretary") {
      return res.status(403).json({ error: "Απαγορεύεται" });
    }
    next();
  },
  upload.single("file"),
  SecretaryController.importJSON
);


module.exports = router;
