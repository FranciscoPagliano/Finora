const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios",
      });
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "El email ya está registrado",
      });
    }

    // HASHEAR CONTRASEÑA
    const hashedPassword = await bcrypt.hash(password, 10);

    // CREAR USUARIO
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword]
    );

    const userId = result.insertId;

    // CATEGORÍAS INICIALES
    const defaultCategories = [
      "Food",
      "Transport",
      "Housing",
      "Health",
      "Entertainment",
      "Salary",
      "Other",
    ];

    // CREAR CATEGORÍAS PARA EL NUEVO USUARIO
    for (const categoryName of defaultCategories) {
      await pool.query(
        `INSERT INTO categories (user_id, name)
         VALUES (?, ?)`,
        [userId, categoryName]
      );
    }

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user: {
        id: userId,
        name,
        email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al registrar usuario",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son obligatorios",
      });
    }

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al iniciar sesión",
    });
  }
};