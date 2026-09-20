import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, getHandler, listHandler, updateHandler } from "./proveedores.controller";

export const proveedoresRouter = Router();

proveedoresRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

proveedoresRouter.get("/", listHandler);
proveedoresRouter.get("/:id", getHandler);
proveedoresRouter.post("/", createHandler);
proveedoresRouter.put("/:id", updateHandler);
proveedoresRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
