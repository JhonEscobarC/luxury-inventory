import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as reportsService from "./reports.service";
import * as tablaService from "./reportsTabla.service";

const tablaFiltersSchema = z.object({
  tab: z.enum(["inventario", "proveedores", "contratistas", "clientes"]),
  proyectoId: z.string().optional(),
  obraId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export async function tablaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { tab, ...filters } = tablaFiltersSchema.parse(req.query);
    const items =
      tab === "inventario"
        ? await tablaService.getTablaInventario(filters)
        : tab === "proveedores"
          ? await tablaService.getTablaProveedores(filters)
          : tab === "contratistas"
            ? await tablaService.getTablaContratistas(filters)
            : await tablaService.getTablaClientes(filters);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

const gastosFiltersSchema = z.object({
  proyectoIds: z.string().optional(),
  obraIds: z.string().optional(),
  categoriaId: z.string().uuid().optional(),
  proveedorId: z.string().uuid().optional(),
  contratistaId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  material: z.string().trim().min(1).optional(),
});

export async function gastosHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = gastosFiltersSchema.parse(req.query);
    const report = await reportsService.getGastosReport({
      proyectoIds: query.proyectoIds ? query.proyectoIds.split(",").filter(Boolean) : undefined,
      obraIds: query.obraIds ? query.obraIds.split(",").filter(Boolean) : undefined,
      categoriaId: query.categoriaId,
      proveedorId: query.proveedorId,
      contratistaId: query.contratistaId,
      from: query.from,
      to: query.to,
      material: query.material,
    });
    res.json(report);
  } catch (error) {
    next(error);
  }
}

export async function proveedoresDeudaHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await reportsService.getProveedoresDeudaReport();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function clientesHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportsService.getClientesReport();
    res.json(report);
  } catch (error) {
    next(error);
  }
}
