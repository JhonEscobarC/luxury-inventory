import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, getHandler, listHandler, setActiveHandler, updateHandler } from "./proyectos.controller";

export const proyectosRouter = Router();

proyectosRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

proyectosRouter.get("/", listHandler);
proyectosRouter.get("/:id", getHandler);
proyectosRouter.post("/", createHandler);
proyectosRouter.put("/:id", updateHandler);
proyectosRouter.patch("/:id/active", setActiveHandler);
// Borrado literal (cascada completa): reservado a ADMIN por lo destructivo que es.
proyectosRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
