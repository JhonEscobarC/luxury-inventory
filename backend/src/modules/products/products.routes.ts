import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, exportHandler, getHandler, listHandler, lowStockCountHandler, updateHandler } from "./products.controller";

export const productsRouter = Router();

// Inventario es exclusivo de ADMIN y CONTABILIDAD; los usuarios de OBRA no lo necesitan.
productsRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

productsRouter.get("/", listHandler);
productsRouter.get("/export", exportHandler);
productsRouter.get("/low-stock-count", lowStockCountHandler);
productsRouter.get("/:id", getHandler);

productsRouter.post("/", createHandler);
productsRouter.put("/:id", updateHandler);
productsRouter.delete("/:id", deleteHandler);
