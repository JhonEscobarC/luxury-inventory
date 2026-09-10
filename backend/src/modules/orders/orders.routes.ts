import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  assignHandler,
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  updateStatusHandler,
} from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get("/", listHandler);
ordersRouter.get("/:id", getHandler);

ordersRouter.post("/", requireRole("OBRA"), createHandler);
ordersRouter.put("/:id", requireRole("OBRA"), updateHandler);
ordersRouter.patch("/:id/assign", requireRole("ADMIN", "CONTABILIDAD"), assignHandler);
ordersRouter.patch("/:id/status", updateStatusHandler);
