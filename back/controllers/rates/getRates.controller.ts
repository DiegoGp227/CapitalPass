import db from "../../db/db";

const getRates = async ({ set }: any) => {
  try {
    const connection = await db;
    const query = "SELECT id, service_name, base_rate, subsidized_discount FROM rates";
    const [rates]: any = await connection.execute(query);

    set.status = 200;
    return {
      rates
    };
  } catch (error) {
    console.error("Error getting rates:", error);
    set.status = 500;
    return { message: "Internal server error" };
  }
};

export default getRates;
