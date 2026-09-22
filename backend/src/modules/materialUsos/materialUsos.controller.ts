import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as materialUsosService from "./materialUsos.service";
import { getObraIdsForUser } from "../products/products.service";

const createSchema = z.object({
  productId: z.string().uuid("Producto invalido"),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
  reason: z.string().trim().min(1, "Indica la razon del uso"),
  obraEtapaId: z.string().uuid("Selecciona la etapa de obra"),
});

const listQuerySchema = z.object({
  obraId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSchema.parse(req.body);
    const uso = await materialUsosService.createMaterialUso({ ...input, userId: req.user!.sub });
    res.status(201).json({ uso });
  } catch (error) {
    next(error);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const restrictToObraIds = req.user?.role === "OBRA" ? await getObraIdsForUser(req.user.sub) : undefined;
    const items = await materialUsosService.listMaterialUsos({ ...query, restrictToObraIds });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}
