import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, listHandler, reorderHandler } from "./obraEtapas.controller";

export const obraEtapasRouter = Router();

obraEtapasRouter.use(requireAuth);

// Cualquier rol autenticado puede listar (el residente las necesita al crear un pedido).
obraEtapasRouter.get("/", listHandler);

obraEtapasRouter.post("/", requireRole("ADMIN", "CONTABILIDAD"), createHandler);
obraEtapasRouter.put("/reorder", requireRole("ADMIN", "CONTABILIDAD"), reorderHandler);
obraEtapasRouter.delete("/:id", requireRole("ADMIN", "CONTABILIDAD"), deleteHandler);
