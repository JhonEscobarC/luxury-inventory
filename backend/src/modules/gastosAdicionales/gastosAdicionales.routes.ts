import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, getHandler, listHandler } from "./gastosAdicionales.controller";

export const gastosAdicionalesRouter = Router();

gastosAdicionalesRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

gastosAdicionalesRouter.get("/", listHandler);
gastosAdicionalesRouter.post("/", createHandler);
gastosAdicionalesRouter.get("/:id", getHandler);
gastosAdicionalesRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
