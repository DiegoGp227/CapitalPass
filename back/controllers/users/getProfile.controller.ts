import db from "../../db/db";

const getProfile = async ({ user, set }: any) => {
  try {
    const connection = await db;
    const query = "SELECT id, card_number, full_name, email, user_type, balance, is_active, created_at FROM users WHERE id = ?";
    const [result]: any = await connection.execute(query, [user.id]);

    if (!result || result.length === 0) {
      set.status = 404;
      return { message: "User not found" };
    }

    set.status = 200;
    return {
      user: result[0]
    };
  } catch (error) {
    console.error("Error getting profile:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default getProfile;
