import jwt from "jsonwebtoken";
import type { Secret } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as Secret;

export const authMiddleware = async ({ headers, set }: any) => {
  const authorization = headers.authorization;

  if (!authorization) {
    set.status = 401;
    return { message: "No token provided" };
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: decoded };
  } catch (error) {
    set.status = 401;
    return { message: "Invalid token" };
  }
};
