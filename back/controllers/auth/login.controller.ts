import bcryptjs from "bcryptjs";
import db from "../../db/db";
import jwt from "jsonwebtoken";
import type { SignOptions, Secret } from "jsonwebtoken";
import type ms from "ms";

const JWT_SECRET = process.env.JWT_SECRET as Secret;
const TOKEN_EXPIRATION = (process.env.TOKEN_EXPIRATION ||
  "1h") as ms.StringValue;

const login = async ({ body, set }: { body: any; set: any }) => {
  const { email, password } = body;

  try {
    // Validar campos requeridos
    if (!email || !password) {
      set.status = 400;
      return { message: "Email and password are required" };
    }

    const connection = await db;
    const query = "SELECT * FROM users WHERE email = ?";
    const [user]: any = await connection.execute(query, [email]);

    if (!user || user.length === 0) {
      set.status = 404;
      return { message: "User not found" };
    }

    // Verificar si el usuario está activo
    if (!user[0].is_active) {
      set.status = 403;
      return { message: "Account is inactive" };
    }

    // Intentar con password_hash primero, si no existe usar password
    const hashedPassword = user[0].password_hash || user[0].password;
    const isMatch = await bcryptjs.compare(password, hashedPassword);

    if (!isMatch) {
      set.status = 401;
      return { message: "Invalid password" };
    }

    const options: SignOptions = { expiresIn: TOKEN_EXPIRATION };
    const token = jwt.sign(
      { id: user[0].id, email: user[0].email },
      JWT_SECRET,
      options
    );

    set.status = 200;
    return {
      message: "Login successful",
      token,
      userInfo: {
        id: user[0].id,
        card_number: user[0].card_number,
        full_name: user[0].full_name,
        email: user[0].email,
        user_type: user[0].user_type,
        balance: user[0].balance,
      },
    };
  } catch (error) {
    console.error("Error in the server:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default login;
