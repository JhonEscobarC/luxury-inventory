import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { clientesHandler, gastosHandler, proveedoresDeudaHandler } from "./reports.controller";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

reportsRouter.get("/gastos", gastosHandler);
reportsRouter.get("/proveedores-deuda", proveedoresDeudaHandler);
reportsRouter.get("/clientes", clientesHandler);
