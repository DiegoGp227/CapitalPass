import Elysia from "elysia";
import { authMiddleware } from "../middlewares/auth.middleware";

// Auth controllers
import login from "../controllers/auth/login.controller";
import signup from "../controllers/auth/signup.controller";

// User controllers
import getProfile from "../controllers/users/getProfile.controller";
import updateProfile from "../controllers/users/updateProfile.controller";

// Balance controllers
import getBalance from "../controllers/balance/getBalance.controller";
import recharge from "../controllers/balance/recharge.controller";

// Transaction controllers
import pay from "../controllers/transactions/pay.controller";
import getTransactions from "../controllers/transactions/getTransactions.controller";

// Rates controllers
import getRates from "../controllers/rates/getRates.controller";

export const router = new Elysia({ prefix: "/api" })
  // Auth (sin protección)
  .post("/auth/login", login)
  .post("/auth/register", signup)

  // Users (protegidas)
  .get("/users/profile", async (context) => {
    const authResult = await authMiddleware(context);
    if (authResult.message) return authResult;
    return getProfile({ ...context, user: authResult.user });
  })
  .put("/users/profile", async (context) => {
    const authResult = await authMiddleware(context);
    if (authResult.message) return authResult;
    return updateProfile({ ...context, user: authResult.user });
  })

  // Balance (protegidas)
  .get("/balance", async (context) => {
    const authResult = await authMiddleware(context);
    if (authResult.message) return authResult;
    return getBalance({ ...context, user: authResult.user });
  })
  .post("/balance/recharge", async (context) => {
    const authResult = await authMiddleware(context);
    if (authResult.message) return authResult;
    return recharge({ ...context, user: authResult.user });
  })

  // Transactions (protegidas)
  .post("/transactions/pay", async (context) => {
    const authResult = await authMiddleware(context);
    if (authResult.message) return authResult;
    return pay({ ...context, user: authResult.user });
  })
  .get("/transactions", async (context) => {
    const authResult = await authMiddleware(context);
    if (authResult.message) return authResult;
    return getTransactions({ ...context, user: authResult.user });
  })

  // Rates (sin protección, público)
  .get("/rates", getRates);
