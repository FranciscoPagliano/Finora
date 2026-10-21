
const db = require("../config/db");

// Obtener las recurrencias del usuario autenticado
exports.getRecurring = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM recurring_transactions
       WHERE user_id = ?
       ORDER BY next_execution_date ASC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error getting recurring transactions:", error);

    res.status(500).json({
      message: "Could not load recurring transactions.",
    });
  }
};

// Funciones pendientes de implementar
const notImplemented = (req, res) => {
  res.status(501).json({
    message: "This feature is not implemented yet.",
  });
};



exports.createRecurring = async (req, res) => {
  try {
    const {
      description,
      category,
      type,
      amount,
      frequency,
      next_execution_date,
    } = req.body;

    const validFrequencies = ["daily", "weekly", "monthly", "yearly"];
    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.length > 150 ||
      typeof category !== "string" ||
      !category.trim() ||
      category.length > 100 ||
      !["income", "expense"].includes(type) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 9999999999.99 ||
      Math.round(amount * 100) !== amount * 100 ||
      !validFrequencies.includes(frequency) ||
      typeof next_execution_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(next_execution_date) ||
      Number.isNaN(Date.parse(next_execution_date)) ||
      new Date(next_execution_date).toISOString().slice(0, 10) !== next_execution_date
    ) {
      return res.status(400).json({
        message: "Invalid recurring transaction data.",
      });
    }

    const [categories] = await db.query(
      "SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1",
      [req.user.id, category.trim()]
    );

    if (categories.length === 0) {
      return res.status(400).json({
        message: "Category not found.",
      });
    }


const anchorDay = Number(next_execution_date.split("-")[2]);

const [result] = await db.query(
  `UPDATE recurring_transactions
   SET description = ?, category = ?, type = ?, amount = ?,
       frequency = ?, next_execution_date = ?, anchor_day = ?
   WHERE id = ? AND user_id = ?`,
  [
    description.trim(),
    category.trim(),
    type,
    amount,
    frequency,
    next_execution_date,
    anchorDay,
    id,
    req.user.id,
  ]
);


    return res.status(201).json({
      message: "Recurring transaction created successfully.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating recurring transaction:", error);

    return res.status(500).json({
      message: "Could not create recurring transaction.",
    });
  }
};



exports.updateRecurring = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      description,
      category,
      type,
      amount,
      frequency,
      next_execution_date,
    } = req.body;

    // Validar ID
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return res.status(400).json({
        message: "Invalid recurring transaction ID.",
      });
    }

    // Validar datos
    const validFrequencies = ["daily", "weekly", "monthly", "yearly"];

    const validDate =
      typeof next_execution_date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(next_execution_date) &&
      !Number.isNaN(Date.parse(next_execution_date)) &&
      new Date(next_execution_date).toISOString().slice(0, 10) ===
        next_execution_date;

    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.length > 150 ||
      typeof category !== "string" ||
      !category.trim() ||
      category.length > 100 ||
      !["income", "expense"].includes(type) ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 9999999999.99 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001 ||
      !validFrequencies.includes(frequency) ||
      !validDate
    ) {
      return res.status(400).json({
        message: "Invalid recurring transaction data.",
      });
    }

    // Comprobar que la categoría pertenezca al usuario
    const [categories] = await db.query(
      `SELECT id FROM categories
       WHERE user_id = ? AND name = ?
       LIMIT 1`,
      [req.user.id, category.trim()]
    );

    if (categories.length === 0) {
      return res.status(400).json({
        message: "Category not found.",
      });
    }

    // Actualizar solamente una recurrencia del usuario
    const [result] = await db.query(
      `UPDATE recurring_transactions
       SET description = ?,
           category = ?,
           type = ?,
           amount = ?,
           frequency = ?,
           next_execution_date = ?
       WHERE id = ? AND user_id = ?`,
      [
        description.trim(),
        category.trim(),
        type,
        amount,
        frequency,
        next_execution_date,
        id,
        req.user.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Recurring transaction not found.",
      });
    }

    return res.json({
      message: "Recurring transaction updated successfully.",
      id: Number(id),
    });
  } catch (error) {
    console.error("Error updating recurring transaction:", error);

    return res.status(500).json({
      message: "Could not update recurring transaction.",
    });
  }
};

exports.updateRecurringStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        message: "Invalid recurring transaction ID.",
      });
    }

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({
        message: "Status must be active or paused.",
      });
    }

    const [result] = await db.query(
      `UPDATE recurring_transactions
       SET status = ?
       WHERE id = ? AND user_id = ?`,
      [status, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Recurring transaction not found.",
      });
    }

    return res.json({
      message:
        status === "paused"
          ? "Recurring transaction paused successfully."
          : "Recurring transaction resumed successfully.",
      id: Number(id),
      status,
    });
  } catch (error) {
    console.error("Error updating recurring status:", error);

    return res.status(500).json({
      message: "Could not update recurring transaction status.",
    });
  }
};



exports.deleteRecurring = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return res.status(400).json({
        message: "Invalid recurring transaction ID.",
      });
    }

    const [result] = await db.query(
      `DELETE FROM recurring_transactions
       WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Recurring transaction not found.",
      });
    }

    return res.json({
      message: "Recurring transaction deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting recurring transaction:", error);

    return res.status(500).json({
      message: "Could not delete recurring transaction.",
    });
  }
};

