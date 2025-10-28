import db from "../../db/db";

const recharge = async ({ user, body, set }: any) => {
  const { amount } = body;

  try {
    if (!amount || amount <= 0) {
      set.status = 400;
      return { message: "Amount must be greater than 0" };
    }

    const pool = await db;

    // Obtener balance actual
    const [userResult]: any = await pool.execute(
      "SELECT balance FROM users WHERE id = ?",
      [user.id]
    );

    if (!userResult || userResult.length === 0) {
      set.status = 404;
      return { message: "User not found" };
    }

    const balanceBefore = userResult[0].balance;
    const balanceAfter = parseFloat(balanceBefore) + parseFloat(amount);

    // Obtener una conexión del pool para la transacción
    const connection = await pool.getConnection();

    try {
      // Iniciar transacción
      await connection.beginTransaction();

      // Actualizar balance
      await connection.execute(
        "UPDATE users SET balance = ? WHERE id = ?",
        [balanceAfter, user.id]
      );

      // Registrar transacción
      await connection.execute(
        "INSERT INTO transactions (user_id, transaction_type, amount, balance_before, balance_after) VALUES (?, 'recarga', ?, ?, ?)",
        [user.id, amount, balanceBefore, balanceAfter]
      );

      await connection.commit();
      connection.release();

      set.status = 200;
      return {
        message: "Recharge successful",
        balance: balanceAfter
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error in recharge:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default recharge;
