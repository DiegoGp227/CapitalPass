import db from "../../db/db";

const getBalance = async ({ user, set }: any) => {
  try {
    const connection = await db;
    const query = "SELECT balance FROM users WHERE id = ?";
    const [result]: any = await connection.execute(query, [user.id]);

    if (!result || result.length === 0) {
      set.status = 404;
      return { message: "User not found" };
    }

    set.status = 200;
    return {
      balance: result[0].balance
    };
  } catch (error) {
    console.error("Error getting balance:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default getBalance;
