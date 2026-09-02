import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { productsRouter } from "./modules/products/products.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { whatsappRouter } from "./modules/whatsapp/whatsapp.routes";
import { usersRouter } from "./modules/users/users.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

declare global {
  namespace Express {
    interface Request {
      // Bytes crudos del body, capturados para validar la firma HMAC del webhook de WhatsApp.
      rawBody?: Buffer;
    }
  }
}

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf;
    },
  }),
);
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: env.nodeEnv });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/users", usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
