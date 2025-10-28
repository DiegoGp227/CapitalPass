import db from "../../db/db";

const pay = async ({ user, body, set }: any) => {
  const { service_type, service_details } = body;

  try {
    // Validar tipo de servicio
    const validServices = ['pago_transmilenio', 'pago_bicicleta', 'pago_parqueadero'];
    if (!service_type || !validServices.includes(service_type)) {
      set.status = 400;
      return { message: "Invalid service type" };
    }

    const connection = await db;

    // Obtener usuario con su tipo
    const [userResult]: any = await connection.execute(
      "SELECT balance, user_type FROM users WHERE id = ?",
      [user.id]
    );

    if (!userResult || userResult.length === 0) {
      set.status = 404;
      return { message: "User not found" };
    }

    const { balance, user_type } = userResult[0];

    // Obtener tarifa del servicio
    const serviceMap: any = {
      'pago_transmilenio': 'transmilenio',
      'pago_bicicleta': 'bicicleta',
      'pago_parqueadero': 'parqueadero'
    };

    const [rateResult]: any = await connection.execute(
      "SELECT base_rate, subsidized_discount FROM rates WHERE service_name = ?",
      [serviceMap[service_type]]
    );

    if (!rateResult || rateResult.length === 0) {
      set.status = 404;
      return { message: "Service rate not found" };
    }

    const { base_rate, subsidized_discount } = rateResult[0];

    // Calcular monto con descuento si aplica
    let amount = parseFloat(base_rate);
    if (user_type === 'subsidiado') {
      amount = amount * (1 - parseFloat(subsidized_discount));
    }

    // Verificar saldo suficiente
    if (parseFloat(balance) < amount) {
      set.status = 400;
      return { message: "Insufficient balance" };
    }

    const balanceBefore = parseFloat(balance);
    const balanceAfter = balanceBefore - amount;

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
        "INSERT INTO transactions (user_id, transaction_type, amount, balance_before, balance_after, service_details) VALUES (?, ?, ?, ?, ?, ?)",
        [user.id, service_type, amount, balanceBefore, balanceAfter, service_details || null]
      );

      await connection.commit();

      set.status = 200;
      return {
        message: "Payment successful",
        amount_paid: amount,
        new_balance: balanceAfter,
        service: serviceMap[service_type]
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error in payment:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default pay;
