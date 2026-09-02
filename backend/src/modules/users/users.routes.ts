import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, listHandler, resetPasswordHandler, setActiveHandler, updateHandler } from "./users.controller";

export const usersRouter = Router();

// Panel exclusivo de administradores.
usersRouter.use(requireAuth, requireRole("ADMIN"));

usersRouter.get("/", listHandler);
usersRouter.post("/", createHandler);
usersRouter.put("/:id", updateHandler);
usersRouter.patch("/:id/active", setActiveHandler);
usersRouter.patch("/:id/password", resetPasswordHandler);
