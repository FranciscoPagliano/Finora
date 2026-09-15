const pool = require("../config/db");

// OBTENER CATEGORÍAS
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    const [categories] = await pool.query(
      `SELECT
        id,
        name,
        created_at AS createdAt
       FROM categories
       WHERE user_id = ?
       ORDER BY name ASC`,
      [userId]
    );

    res.json(categories);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al obtener categorías",
    });
  }
};

// CREAR CATEGORÍA
exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "El nombre es obligatorio",
      });
    }

    const categoryName = name.trim();

    const [result] = await pool.query(
      `INSERT INTO categories (user_id, name)
       VALUES (?, ?)`,
      [userId, categoryName]
    );

    res.status(201).json({
      message: "Categoría creada correctamente",
      category: {
        id: result.insertId,
        name: categoryName,
      },
    });
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Ya existe una categoría con ese nombre",
      });
    }

    res.status(500).json({
      message: "Error al crear categoría",
    });
  }
};

// ACTUALIZAR CATEGORÍA
exports.updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "El nombre es obligatorio",
      });
    }

    const categoryName = name.trim();

    const [result] = await pool.query(
      `UPDATE categories
       SET name = ?
       WHERE id = ? AND user_id = ?`,
      [categoryName, categoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Categoría no encontrada",
      });
    }

    res.json({
      message: "Categoría actualizada correctamente",
      category: {
        id: Number(categoryId),
        name: categoryName,
      },
    });
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Ya existe una categoría con ese nombre",
      });
    }

    res.status(500).json({
      message: "Error al actualizar categoría",
    });
  }
};

// BORRAR CATEGORÍA
exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;

    const [result] = await pool.query(
      `DELETE FROM categories
       WHERE id = ? AND user_id = ?`,
      [categoryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Categoría no encontrada",
      });
    }

    res.json({
      message: "Categoría eliminada correctamente",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al eliminar categoría",
    });
  }
};