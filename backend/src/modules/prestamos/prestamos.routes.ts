import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, createPagoHandler, listHandler } from "./prestamos.controller";

export const prestamosRouter = Router();

prestamosRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

prestamosRouter.get("/", listHandler);
prestamosRouter.post("/", createHandler);
prestamosRouter.post("/pagos", createPagoHandler);
