import bcryptjs from "bcryptjs";
import db from "../../db/db";
import jwt from "jsonwebtoken";
import type { SignOptions, Secret } from "jsonwebtoken";
import type ms from "ms";

const JWT_SECRET = process.env.JWT_SECRET as Secret;
const TOKEN_EXPIRATION = (process.env.TOKEN_EXPIRATION || "1h") as ms.StringValue;

// Validador de email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const signup = async ({ body, set }: { body: any; set: any }) => {
  const { full_name, email, password, user_type } = body;

  try {
    // Validaciones
    if (!full_name || !email || !password || !user_type) {
      set.status = 400;
      return { message: "All fields are required" };
    }

    if (!isValidEmail(email)) {
      set.status = 400;
      return { message: "Invalid email format" };
    }

    const validUserTypes = ["normal", "subsidiado", "operador", "bicicleta", "parqueadero"];
    if (!validUserTypes.includes(user_type)) {
      set.status = 400;
      return { message: "Invalid user type" };
    }

    if (password.length < 6) {
      set.status = 400;
      return { message: "Password must be at least 6 characters" };
    }

    const connection = await db;

    // Verificar si el email ya existe
    const [existingEmail]: any = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingEmail.length > 0) {
      set.status = 409;
      return { message: "Email already exists" };
    }

    // Hashear la contraseña
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insertar el nuevo usuario
    const insertQuery = `
      INSERT INTO users (full_name, email, password_hash, user_type, balance)
      VALUES (?, ?, ?, ?, 0.00)
    `;

    const [result]: any = await connection.execute(insertQuery, [
      full_name,
      email,
      hashedPassword,
      user_type,
    ]);

    const userId = result.insertId;
    
    // Generar card_number manualmente (más confiable que esperar a la columna computada)
    const card_number = `1000${userId.toString().padStart(6, '0')}`;

    // Generar token JWT
    const token = jwt.sign(
      { id: userId, email, user_type },  // Agregué user_type al payload
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRATION }
    );

    set.status = 201;
    return {
      message: "User created successfully",
      token,
      user: {  // Cambié "userInfo" a "user" (más estándar)
        id: userId,
        card_number,
        full_name,
        email,
        user_type,
        balance: "0.00",  // String para consistencia con DECIMAL
      },
    };
  } catch (error) {
    console.error("Error in signup:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default signup;