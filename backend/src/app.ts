import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { productsRouter } from "./modules/products/products.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { usersRouter } from "./modules/users/users.routes";
import { obrasRouter } from "./modules/obras/obras.routes";
import { proveedoresRouter } from "./modules/proveedores/proveedores.routes";
import { contratistasRouter } from "./modules/contratistas/contratistas.routes";
import { asignacionesRouter } from "./modules/asignaciones/asignaciones.routes";
import { proyectosRouter } from "./modules/proyectos/proyectos.routes";
import { abonosRouter } from "./modules/abonos/abonos.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { historialRouter } from "./modules/historial/historial.routes";
import { categoriasRouter } from "./modules/categorias/categorias.routes";
import { materialUsosRouter } from "./modules/materialUsos/materialUsos.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Sin origin (curl, health checks, server-to-server) siempre se permite.
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      // Cualquier alias/preview *.vercel.app que empiece por "frontend" o "luxury"
      // (los nombres que usa este proyecto) tambien se acepta, para no romper el
      // login cada vez que se agregue o cambie un dominio en Vercel. No se abre a
      // cualquier subdominio de vercel.app por seguridad.
      if (/^https:\/\/(frontend|luxury)[a-z0-9-]*\.vercel\.app$/.test(origin)) return callback(null, true);
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", env: env.nodeEnv });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/obras", obrasRouter);
app.use("/api/proveedores", proveedoresRouter);
app.use("/api/contratistas", contratistasRouter);
app.use("/api/asignaciones", asignacionesRouter);
app.use("/api/proyectos", proyectosRouter);
app.use("/api/abonos", abonosRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/historial", historialRouter);
app.use("/api/categorias", categoriasRouter);
app.use("/api/material-usos", materialUsosRouter);

app.use(notFoundHandler);
app.use(errorHandler);
