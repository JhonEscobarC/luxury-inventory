import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HistorialTipo } from "@prisma/client";
import * as historialService from "./historial.service";

const listQuerySchema = z.object({
  tipo: z.nativeEnum(HistorialTipo).optional(),
  tipos: z.string().optional(),
  obraId: z.string().uuid().optional(),
  proveedorId: z.string().uuid().optional(),
  contratistaId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await historialService.listHistorial({
      ...query,
      tipos: query.tipos ? (query.tipos.split(",") as HistorialTipo[]) : undefined,
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}
