import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, listHandler } from "./abonos.controller";

export const abonosRouter = Router();

abonosRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

abonosRouter.get("/", listHandler);
abonosRouter.post("/", createHandler);
abonosRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
