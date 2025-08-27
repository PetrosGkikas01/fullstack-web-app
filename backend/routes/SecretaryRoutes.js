const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const SecretaryController = require("../controllers/SecretaryController");
const auth = require("../middleware/auth");
const upload = multer({ dest: path.join(__dirname, "..", "uploads") });
const onlySecretariat = (req, res, next) => req.user?.role === "secretary" ? next() : res.status(403).json({ error: "Απαγορεύεται" });

router.post("/register", SecretaryController.register);
router.post("/login", SecretaryController.login);
router.post( "/import-json", auth.verifyToken, onlySecretariat, upload.single("file"), SecretaryController.importJSON );
router.get("/theses", auth.verifyToken, onlySecretariat, SecretaryController.listTheses);
router.get("/theses/:id", auth.verifyToken, onlySecretariat, SecretaryController.getThesisDetails);


module.exports = router;
