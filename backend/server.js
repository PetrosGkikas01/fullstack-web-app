const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("uploads")); 

// Routes
const StudentRoutes = require("./routes/StudentRoutes");
const ProfessorRoutes = require("./routes/ProfessorRoutes");
const DiplomatikhErgasiaRoutes = require("./routes/DiplomatikhErgasiaRoutes");
const AnnouncementRoutes = require("./routes/AnnouncementRoutes");
app.use("/api/student", (req, res, next) => {
  console.log(`Incoming request to /api/student: ${req.method} ${req.path}`);
  next();
});
app.use("/api/student", StudentRoutes);

app.use("/api/professors", ProfessorRoutes);
app.use("/api/diplomatikh-ergasia", DiplomatikhErgasiaRoutes);
app.use("/api/announcement", AnnouncementRoutes);

app.get("/", (req, res) => {
  res.send("Diplomatiki Backend Running ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));