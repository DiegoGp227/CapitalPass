import Elysia from "elysia";
import login from "../controllers/auth/login.controller";

export const router = new Elysia({ prefix: "/api" })
  // auth
  .post("/login", login);
