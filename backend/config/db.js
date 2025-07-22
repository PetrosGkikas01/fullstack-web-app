const mysql = require("mysql2/promise"); //<-- theloume Promise gt de leitoyrgei alliws to await

const pool = mysql.createPool({  
  host: "localhost",
  user: "root",
  password: "",
  database: "mydb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;