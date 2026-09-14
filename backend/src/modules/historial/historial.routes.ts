import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { listHandler } from "./historial.controller";

export const historialRouter = Router();

historialRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

historialRouter.get("/", listHandler);
