import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, listHandler, setActiveHandler, updateHandler } from "./categorias.controller";

export const categoriasRouter = Router();

categoriasRouter.use(requireAuth);

// Cualquier rol autenticado puede listar (se usa al categorizar materiales de un pedido).
categoriasRouter.get("/", listHandler);

categoriasRouter.post("/", requireRole("ADMIN", "CONTABILIDAD"), createHandler);
categoriasRouter.put("/:id", requireRole("ADMIN", "CONTABILIDAD"), updateHandler);
categoriasRouter.patch("/:id/active", requireRole("ADMIN"), setActiveHandler);
categoriasRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
