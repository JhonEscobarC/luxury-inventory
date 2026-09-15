import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { createHandler, deleteHandler, listHandler, saldoHandler } from "./abonosCliente.controller";

export const abonosClienteRouter = Router();

abonosClienteRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

abonosClienteRouter.get("/", listHandler);
abonosClienteRouter.get("/saldo/:obraId", saldoHandler);
abonosClienteRouter.post("/", createHandler);
abonosClienteRouter.delete("/:id", requireRole("ADMIN"), deleteHandler);
