const transactionRoutes = require("./routes/transactionRoutes");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const budgetRoutes = require("./routes/budgetRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/budgets", budgetRoutes);

app.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT NOW() AS currentTime"
    );

    res.json({
      message: "Expense Tracker API funcionando",
      database: "MySQL conectado",
      currentTime: rows[0].currentTime,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error conectando con MySQL",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Servidor corriendo en http://localhost:${PORT}`
  );
});