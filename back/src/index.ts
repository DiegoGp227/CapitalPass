import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { router } from "../routes/index.routes";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = new Elysia()
  .use(
    cors({
      origin: true, // Permite todos los orígenes en desarrollo
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .use(router)
  .get("/ping", () => "pong")
  .all("*", () => ({
    message: "Escribe bien mono estupido",
  }))
  .listen(PORT);

console.log(`🔥 Hello world, I am listening on port ${PORT}`);
