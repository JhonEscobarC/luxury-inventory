import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, exportHandler, getHandler, listHandler, updateHandler } from "./products.controller";

export const productsRouter = Router();

productsRouter.use(requireAuth);

// Lectura: ADMIN/CONTABILIDAD ven todo el inventario; OBRA solo el de sus obras
// asignadas (el scoping se aplica en el controlador).
productsRouter.get("/", requireRole("ADMIN", "CONTABILIDAD", "OBRA"), listHandler);
productsRouter.get("/export", requireRole("ADMIN", "CONTABILIDAD", "OBRA"), exportHandler);
productsRouter.get("/:id", requireRole("ADMIN", "CONTABILIDAD", "OBRA"), getHandler);

// Escritura directa de inventario: exclusiva de ADMIN y CONTABILIDAD. Los usuarios
// OBRA registran consumo mediante el modulo de materialUsos, no editan productos.
productsRouter.post("/", requireRole("ADMIN", "CONTABILIDAD"), createHandler);
productsRouter.put("/:id", requireRole("ADMIN", "CONTABILIDAD"), updateHandler);
productsRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
