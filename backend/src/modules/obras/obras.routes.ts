import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createHandler,
  deleteHandler,
  getHandler,
  listHandler,
  listMineHandler,
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
obrasRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
obrasRouter.patch("/:id/users", requireRole("ADMIN", "CONTABILIDAD"), setUsersHandler);
