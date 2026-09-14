import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, getHandler, listHandler, setActiveHandler, updateHandler } from "./proyectos.controller";

export const proyectosRouter = Router();

proyectosRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

proyectosRouter.get("/", listHandler);
proyectosRouter.get("/:id", getHandler);
proyectosRouter.post("/", createHandler);
proyectosRouter.put("/:id", updateHandler);
proyectosRouter.patch("/:id/active", setActiveHandler);
