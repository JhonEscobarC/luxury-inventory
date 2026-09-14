import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, getHandler, listHandler, updateEtapaStatusHandler, updateHandler } from "./asignaciones.controller";

export const asignacionesRouter = Router();

asignacionesRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

asignacionesRouter.get("/", listHandler);
asignacionesRouter.get("/:id", getHandler);
asignacionesRouter.post("/", createHandler);
asignacionesRouter.put("/:id", updateHandler);
asignacionesRouter.patch("/:id/etapas/:etapaId/status", updateEtapaStatusHandler);
