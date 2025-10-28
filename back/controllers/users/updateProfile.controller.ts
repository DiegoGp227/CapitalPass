import db from "../../db/db";

const updateProfile = async ({ user, body, set }: any) => {
  const { full_name, email } = body;

  try {
    if (!full_name && !email) {
      set.status = 400;
      return { message: "At least one field is required" };
    }

    const connection = await db;

    // Si se quiere actualizar el email, verificar que no exista
    if (email) {
      const [existingEmail]: any = await connection.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, user.id]
      );

      if (existingEmail.length > 0) {
        set.status = 409;
        return { message: "Email already exists" };
      }
    }

    // Construir query dinámicamente
    const updates = [];
    const values = [];

    if (full_name) {
      updates.push("full_name = ?");
      values.push(full_name);
    }

    if (email) {
      updates.push("email = ?");
      values.push(email);
    }

    values.push(user.id);

    const query = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    await connection.execute(query, values);

    // Obtener usuario actualizado
    const [result]: any = await connection.execute(
      "SELECT id, card_number, full_name, email, user_type, balance FROM users WHERE id = ?",
      [user.id]
    );

    set.status = 200;
    return {
      message: "Profile updated successfully",
      user: result[0]
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default updateProfile;
