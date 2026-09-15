const pool = require("../config/db");

// OBTENER PRESUPUESTOS DE UN MES
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        message: "El mes es obligatorio",
      });
    }

    const [budgets] = await pool.query(
      `SELECT
        b.id,
        b.amount,
        b.month,
        c.id AS categoryId,
        c.name AS category
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = ? AND b.month = ?
       ORDER BY c.name ASC`,
      [userId, month]
    );

    res.json(budgets);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al obtener presupuestos",
    });
  }
};

// CREAR O ACTUALIZAR PRESUPUESTO
exports.saveBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, amount, month } = req.body;

    if (!categoryId || !amount || !month) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios",
      });
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "El presupuesto debe ser mayor a 0",
      });
    }

    // Verificamos que la categoría pertenezca al usuario
    const [categories] = await pool.query(
      `SELECT id, name
       FROM categories
       WHERE id = ? AND user_id = ?`,
      [categoryId, userId]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        message: "Categoría no encontrada",
      });
    }

    await pool.query(
      `INSERT INTO budgets
        (user_id, category_id, amount, month)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        amount = VALUES(amount)`,
      [userId, categoryId, numericAmount, month]
    );

    res.json({
      message: "Presupuesto guardado correctamente",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al guardar presupuesto",
    });
  }
};

// ELIMINAR PRESUPUESTO
exports.deleteBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;

    const [result] = await pool.query(
      `DELETE FROM budgets
       WHERE id = ? AND user_id = ?`,
      [budgetId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Presupuesto no encontrado",
      });
    }

    res.json({
      message: "Presupuesto eliminado correctamente",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al eliminar presupuesto",
    });
  }
};