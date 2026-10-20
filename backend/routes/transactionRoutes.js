const express = require("express");

const {
  createTransaction,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  importTransactions,
} = require("../controllers/transactionController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getTransactions);
router.post("/", createTransaction);
router.delete("/:id", deleteTransaction);
router.put("/:id", updateTransaction);
router.post("/import", importTransactions);
module.exports = router;