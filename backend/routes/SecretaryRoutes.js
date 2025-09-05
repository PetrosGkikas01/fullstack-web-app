const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const SecretaryController = require("../controllers/SecretaryController");
const auth = require("../middleware/auth");

const upload = multer({ dest: path.join(__dirname, "..", "uploads") });

const onlySecretariat = (req, res, next) =>
  req.user?.role === "secretary" ? next() : res.status(403).json({ error: "Απαγορεύεται" });

router.get("/", (req, res) => res.json({ message: "Secretary API working ✅" }));

router.post("/register", SecretaryController.register);
router.post("/login", SecretaryController.login);

router.post(
  "/import-json",
  auth.verifyToken, onlySecretariat,
  upload.single("file"),
  SecretaryController.importJSON
);

router.get("/theses", auth.verifyToken, onlySecretariat, SecretaryController.listTheses);
router.get("/theses/:id", auth.verifyToken, onlySecretariat, SecretaryController.getThesisDetails);

router.patch(
  "/theses/:id/gs-protocol",
  auth.verifyToken, onlySecretariat,
  SecretaryController.setGSProtocol
);

router.post(
  "/theses/:id/cancel",
  auth.verifyToken, onlySecretariat,
  SecretaryController.cancelThesis
);

router.post(
  "/theses/:id/complete",
  auth.verifyToken, onlySecretariat,
  SecretaryController.completeIfEligible
);

module.exports = router;
