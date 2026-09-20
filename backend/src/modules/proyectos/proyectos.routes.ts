import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, getHandler, listHandler, updateHandler } from "./proyectos.controller";

export const proyectosRouter = Router();

proyectosRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

proyectosRouter.get("/", listHandler);
proyectosRouter.get("/:id", getHandler);
proyectosRouter.post("/", createHandler);
proyectosRouter.put("/:id", updateHandler);
// Activar/desactivar y borrar (este ultimo en cascada completa): reservado a ADMIN.
proyectosRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
