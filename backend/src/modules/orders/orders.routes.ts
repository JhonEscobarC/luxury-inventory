import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, getHandler, listHandler, updateHandler, updateStatusHandler } from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get("/", listHandler);
ordersRouter.get("/:id", getHandler);

ordersRouter.post("/", requireRole("ADMIN", "VENTAS"), createHandler);
ordersRouter.put("/:id", requireRole("ADMIN", "VENTAS"), updateHandler);
ordersRouter.patch("/:id/status", requireRole("ADMIN", "BODEGA", "VENTAS"), updateStatusHandler);
