import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  categoriesHandler,
  createHandler,
  deleteHandler,
  exportHandler,
  getHandler,
  listHandler,
  lowStockCountHandler,
  updateHandler,
} from "./products.controller";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get("/", listHandler);
productsRouter.get("/export", exportHandler);
productsRouter.get("/categories", categoriesHandler);
productsRouter.get("/low-stock-count", lowStockCountHandler);
productsRouter.get("/:id", getHandler);

productsRouter.post("/", requireRole("ADMIN", "BODEGA"), createHandler);
productsRouter.put("/:id", requireRole("ADMIN", "BODEGA"), updateHandler);
productsRouter.delete("/:id", requireRole("ADMIN", "BODEGA"), deleteHandler);
