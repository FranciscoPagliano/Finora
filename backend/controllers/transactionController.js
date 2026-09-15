const pool = require("../config/db");

// CREAR TRANSACCIÓN
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      description,
      category,
      type,
      amount,
      transactionDate,
    } = req.body;

    if (
      !description ||
      !category ||
      !type ||
      !amount ||
      !transactionDate
    ) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Tipo de movimiento inválido",
      });
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "El monto debe ser mayor a 0",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO transactions
      (user_id, description, category, type, amount, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        description,
        category,
        type,
        numericAmount,
        transactionDate,
      ]
    );

    res.status(201).json({
      message: "Movimiento creado correctamente",
      transaction: {
        id: result.insertId,
        description,
        category,
        type,
        amount: numericAmount,
        transactionDate,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al crear movimiento",
    });
  }
};

// OBTENER TRANSACCIONES
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const [transactions] = await pool.query(
      `SELECT
        id,
        description,
        category,
        type,
        amount,
        transaction_date AS transactionDate,
        created_at AS createdAt
      FROM transactions
      WHERE user_id = ?
      ORDER BY transaction_date DESC, id DESC`,
      [userId]
    );

    res.json(transactions);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al obtener movimientos",
    });
  }
};

// BORRAR TRANSACCIÓN
exports.deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const [result] = await pool.query(
      `DELETE FROM transactions
       WHERE id = ? AND user_id = ?`,
      [transactionId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.json({
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error deleting transaction",
    });
  }
};

// ACTUALIZAR TRANSACCIÓN
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const {
      description,
      category,
      type,
      amount,
      transactionDate,
    } = req.body;

    if (
      !description ||
      !category ||
      !type ||
      !amount ||
      !transactionDate
    ) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Tipo de movimiento inválido",
      });
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "El monto debe ser mayor a 0",
      });
    }

    const [result] = await pool.query(
      `UPDATE transactions
       SET
         description = ?,
         category = ?,
         type = ?,
         amount = ?,
         transaction_date = ?
       WHERE id = ? AND user_id = ?`,
      [
        description,
        category,
        type,
        numericAmount,
        transactionDate,
        transactionId,
        userId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Movimiento no encontrado",
      });
    }

    res.json({
      message: "Movimiento actualizado correctamente",
      transaction: {
        id: Number(transactionId),
        description,
        category,
        type,
        amount: numericAmount,
        transactionDate,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al actualizar movimiento",
    });
  }
};