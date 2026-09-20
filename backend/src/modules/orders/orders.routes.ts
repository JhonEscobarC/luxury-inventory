import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  assignHandler,
  createHandler,
  directPurchaseHandler,
  getHandler,
  listHandler,
  receiveHandler,
  recepcionFotoHandler,
  updateHandler,
  updateStatusHandler,
} from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get("/", listHandler);
ordersRouter.get("/:id", getHandler);

ordersRouter.post("/", requireRole("OBRA"), createHandler);
// Compra directa: nace ya en estado Compra, sin pasar por solicitud.
ordersRouter.post("/direct", requireRole("ADMIN", "CONTABILIDAD"), directPurchaseHandler);
ordersRouter.put("/:id", requireRole("ADMIN", "CONTABILIDAD", "OBRA"), updateHandler);
ordersRouter.patch("/:id/assign", requireRole("ADMIN", "CONTABILIDAD"), assignHandler);
ordersRouter.patch("/:id/status", updateStatusHandler);
// Recibir un pedido: el residente (OBRA) debe adjuntar foto; admin/contabilidad pueden hacerlo con o sin ella.
ordersRouter.post("/:id/receive", requireRole("ADMIN", "CONTABILIDAD", "OBRA"), receiveHandler);
ordersRouter.get("/:id/recepcion-foto", requireRole("ADMIN", "CONTABILIDAD", "OBRA"), recepcionFotoHandler);
