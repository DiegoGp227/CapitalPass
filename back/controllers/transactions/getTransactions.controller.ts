import db from "../../db/db";

const getTransactions = async ({ user, set }: any) => {
  try {
    const connection = await db;
    const query = `
      SELECT id, transaction_type, amount, balance_before, balance_after, service_details, created_at
      FROM transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const [transactions]: any = await connection.execute(query, [user.id]);

    set.status = 200;
    return {
      transactions
    };
  } catch (error) {
    console.error("Error getting transactions:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default getTransactions;
