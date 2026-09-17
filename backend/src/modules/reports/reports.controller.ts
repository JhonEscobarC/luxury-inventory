import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as reportsService from "./reports.service";

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
