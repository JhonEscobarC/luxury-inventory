import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, listHandler } from "./materialUsos.controller";

export const materialUsosRouter = Router();

materialUsosRouter.use(requireAuth);

// OBRA registra el uso; ADMIN/CONTABILIDAD tambien pueden consultar el historial completo.
materialUsosRouter.get("/", requireRole("ADMIN", "CONTABILIDAD", "OBRA"), listHandler);
materialUsosRouter.post("/", requireRole("OBRA"), createHandler);
