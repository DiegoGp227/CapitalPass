import db from "../../db/db";

const rechargeByCard = async ({ body, set }: any) => {
  const { card_number, amount } = body;

  try {
    if (!card_number) {
      set.status = 400;
      return { message: "Card number is required" };
    }

    if (!amount || amount <= 0) {
      set.status = 400;
      return { message: "Amount must be greater than 0" };
    }

    const connection = await db;

    // Buscar usuario por número de tarjeta
    const [userResult]: any = await connection.execute(
      "SELECT id, balance, card_number FROM users WHERE card_number = ? AND is_active = true",
      [card_number]
    );

    if (!userResult || userResult.length === 0) {
      set.status = 404;
      return { message: "Card not found or inactive" };
    }

    const user = userResult[0];
    const balanceBefore = user.balance;
    const balanceAfter = parseFloat(balanceBefore) + parseFloat(amount);

    // Iniciar transacción
    await connection.beginTransaction();

    try {
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

      set.status = 200;
      return {
        message: "Recharge successful",
        card_number: card_number,
        balance: balanceAfter
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error in recharge by card:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default rechargeByCard;
