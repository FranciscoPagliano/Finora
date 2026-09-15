const express = require("express");


const {
  getBudgets,
  saveBudget,
  deleteBudget,
} = require("../controllers/budgetController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getBudgets);
router.post("/", saveBudget);
router.delete("/:id", deleteBudget);

module.exports = router;