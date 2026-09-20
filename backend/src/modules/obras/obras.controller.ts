import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as obrasService from "./obras.service";

const obraInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  address: z.string().trim().min(1).optional().nullable(),
  client: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  precioVenta: z.number().min(0, "El precio de venta no puede ser negativo").optional().nullable(),
  proyectoId: z.string().uuid().optional().nullable(),
});

const obraUpdateSchema = obraInputSchema.partial();

const setUsersSchema = z.object({ userIds: z.array(z.string().uuid()) });

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  proyectoId: z.string().optional(),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await obrasService.listObras({
      ...query,
      proyectoId: query.proyectoId === "none" ? null : query.proyectoId,
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function listMineHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await obrasService.listObrasForUser(req.user!.sub);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const obra = await obrasService.getObraById(req.params.id);
    res.json({ obra });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = obraInputSchema.parse(req.body);
    const obra = await obrasService.createObra(input);
    res.status(201).json({ obra });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = obraUpdateSchema.parse(req.body);
    const obra = await obrasService.updateObra(req.params.id, input);
    res.json({ obra });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await obrasService.deleteObra(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function setUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { userIds } = setUsersSchema.parse(req.body);
    const obra = await obrasService.setObraUsers(req.params.id, userIds);
    res.json({ obra });
  } catch (error) {
    next(error);
  }
}
