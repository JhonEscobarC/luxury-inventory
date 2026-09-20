import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, listHandler, resetPasswordHandler, updateHandler } from "./users.controller";

export const usersRouter = Router();

usersRouter.use(requireAuth);

// CONTABILIDAD tambien puede listar usuarios para asignarlos a obras; el resto de
// operaciones (crear, editar, activar/desactivar, resetear contrasena) es solo de ADMIN.
usersRouter.get("/", requireRole("ADMIN", "CONTABILIDAD"), listHandler);
usersRouter.post("/", requireRole("ADMIN"), createHandler);
usersRouter.put("/:id", requireRole("ADMIN"), updateHandler);
usersRouter.patch("/:id/password", requireRole("ADMIN"), resetPasswordHandler);
usersRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
