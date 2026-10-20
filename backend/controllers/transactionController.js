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


 // IMPORTAR TRANSACCIONES DESDE CSV
exports.importTransactions = async (req, res) => {
  const userId = req.user.id;
  const transactions = req.body.transactions;

  if (
    !Array.isArray(transactions) ||
    transactions.length === 0 ||
    transactions.length > 500
  ) {
    return res.status(400).json({
      message: "Debés enviar entre 1 y 500 movimientos.",
    });
  }

  const validDate = (value) => {
    if (typeof value !== "string") return false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };

  const validated = [];

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];

    if (
      !transaction ||
      typeof transaction !== "object" ||
      Array.isArray(transaction)
    ) {
      return res.status(400).json({
        message: `Fila ${i + 1}: movimiento inválido.`,
      });
    }

    const {
      description,
      category,
      type,
      amount,
      transactionDate,
    } = transaction;

    const numericAmount = Number(amount);

    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.length > 255 ||
      typeof category !== "string" ||
      !category.trim() ||
      category.length > 100 ||
      !["income", "expense"].includes(type) ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > 9999999999.99 ||
      !Number.isInteger(Math.round(numericAmount * 100)) ||
      !validDate(transactionDate)
    ) {
      return res.status(400).json({
        message: `Fila ${i + 1}: datos inválidos. Revisá fecha, descripción, categoría, tipo y monto.`,
      });
    }

    validated.push({
      description: description.trim(),
      category: category.trim(),
      type,
      amount: numericAmount,
      transactionDate,
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    // Confirmar que todas las categorías pertenezcan al usuario.
    const [categories] = await connection.query(
      "SELECT name FROM categories WHERE user_id = ?",
      [userId]
    );

    const allowedCategories = new Set(
      categories.map((category) => category.name)
    );

    const invalidCategory = validated.find(
      (transaction) =>
        !allowedCategories.has(transaction.category)
    );

    if (invalidCategory) {
      return res.status(400).json({
        message: `La categoría "${invalidCategory.category}" no existe en tu cuenta. Creala primero o corregí el CSV.`,
      });
    }

    // Todo se guarda o no se guarda nada.
    await connection.beginTransaction();

    
    // Detectar movimientos repetidos dentro del mismo CSV.
    const csvKeys = new Set();

    const getKey = (transaction) =>
      JSON.stringify([
        transaction.transactionDate,
        transaction.description.trim(),
        transaction.category.trim(),
        transaction.type,
        Number(transaction.amount).toFixed(2),
      ]);

    for (const transaction of validated) {
      const key = getKey(transaction);

      if (csvKeys.has(key)) {
        await connection.rollback();

        return res.status(409).json({
          message: "El CSV contiene movimientos repetidos. No se importó nada.",
        });
      }

      csvKeys.add(key);
    }

    // Consultar los movimientos existentes del usuario.
    const [existingTransactions] = await connection.query(
      `SELECT
         description,
         category,
         type,
         amount,
         DATE_FORMAT(transaction_date, '%Y-%m-%d') AS transactionDate
       FROM transactions
       WHERE user_id = ?`,
      [userId]
    );

    const existingKeys = new Set(
      existingTransactions.map(getKey)
    );

    const duplicates = validated.filter((transaction) =>
      existingKeys.has(getKey(transaction))
    );

    if (duplicates.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message: `Se encontraron ${duplicates.length} movimientos que ya existen. No se importó nada.`,
        duplicates: duplicates.length,
      });
    }


    for (const transaction of validated) {
      await connection.query(
        `INSERT INTO transactions
          (user_id, description, category, type, amount, transaction_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          transaction.description,
          transaction.category,
          transaction.type,
          transaction.amount,
          transaction.transactionDate,
        ]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: "Importación completada correctamente.",
      imported: validated.length,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Error importing transactions:", error);

    return res.status(500).json({
      message: "No se pudieron importar los movimientos.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};
