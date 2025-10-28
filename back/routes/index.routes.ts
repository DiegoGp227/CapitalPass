import Elysia from "elysia";
import login from "../controllers/auth/login.controller";
import signup from "../controllers/auth/signup.controller";

export const router = new Elysia({ prefix: "/api" })
  // auth
  .post("/login", login)
  .post("/signup", signup);
