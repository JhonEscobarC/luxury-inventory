import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createHandler,
  getHandler,
  listHandler,
  listMineHandler,
  setActiveHandler,
  setUsersHandler,
  updateHandler,
} from "./obras.controller";

export const obrasRouter = Router();

obrasRouter.use(requireAuth);

// Un usuario OBRA consulta sus propias obras asignadas para elegir al crear un pedido.
obrasRouter.get("/mine", listMineHandler);

obrasRouter.get("/", requireRole("ADMIN", "CONTABILIDAD"), listHandler);
obrasRouter.get("/:id", requireRole("ADMIN", "CONTABILIDAD"), getHandler);
obrasRouter.post("/", requireRole("ADMIN", "CONTABILIDAD"), createHandler);
obrasRouter.put("/:id", requireRole("ADMIN", "CONTABILIDAD"), updateHandler);
obrasRouter.patch("/:id/active", requireRole("ADMIN", "CONTABILIDAD"), setActiveHandler);
obrasRouter.patch("/:id/users", requireRole("ADMIN", "CONTABILIDAD"), setUsersHandler);
