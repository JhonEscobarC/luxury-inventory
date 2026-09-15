import type { NextFunction, Request, Response } from "express";
import * as reportsService from "./reports.service";

export async function financieroHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportsService.getFinancieroReport();
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
