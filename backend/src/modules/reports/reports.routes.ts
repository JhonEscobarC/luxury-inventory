import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { clientesHandler, financieroHandler, proveedoresDeudaHandler } from "./reports.controller";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

reportsRouter.get("/financiero", financieroHandler);
reportsRouter.get("/proveedores-deuda", proveedoresDeudaHandler);
reportsRouter.get("/clientes", clientesHandler);
