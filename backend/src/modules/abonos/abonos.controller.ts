import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as abonosService from "./abonos.service";

const abonoInputSchema = z.object({
  proveedorId: z.string().uuid(),
  amount: z.number().positive(),
  notes: z.string().trim().min(1).optional().nullable(),
});

const listQuerySchema = z.object({
  proveedorId: z.string().optional(),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await abonosService.listAbonos(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = abonoInputSchema.parse(req.body);
    const abono = await abonosService.createAbono(input, req.user!.sub);
    res.status(201).json({ abono });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await abonosService.deleteAbono(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
