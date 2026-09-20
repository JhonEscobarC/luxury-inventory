import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, getHandler, listHandler, updateHandler } from "./contratistas.controller";

export const contratistasRouter = Router();

contratistasRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

contratistasRouter.get("/", listHandler);
contratistasRouter.get("/:id", getHandler);
contratistasRouter.post("/", createHandler);
contratistasRouter.put("/:id", updateHandler);
contratistasRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
