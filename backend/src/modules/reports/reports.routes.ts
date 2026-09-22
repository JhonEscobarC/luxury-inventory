import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  clientesHandler,
  cuentasHandler,
  gastosHandler,
  proveedoresDeudaHandler,
  tablaDetalleHandler,
  tablaHandler,
} from "./reports.controller";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole("ADMIN", "CONTABILIDAD"));

reportsRouter.get("/tabla", tablaHandler);
reportsRouter.get("/tabla-detalle", tablaDetalleHandler);
reportsRouter.get("/cuentas", cuentasHandler);
reportsRouter.get("/gastos", gastosHandler);
reportsRouter.get("/proveedores-deuda", proveedoresDeudaHandler);
reportsRouter.get("/clientes", clientesHandler);
