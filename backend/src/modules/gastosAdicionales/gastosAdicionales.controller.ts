import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { MetodoPago } from "@prisma/client";
import * as gastosAdicionalesService from "./gastosAdicionales.service";

const gastoAdicionalInputSchema = z.object({
  concepto: z.string().trim().min(1, "Describe el gasto"),
  amount: z.number().positive(),
  metodoPago: z.nativeEnum(MetodoPago, { required_error: "Selecciona el metodo de pago" }),
  notes: z.string().trim().min(1).optional().nullable(),
  obraId: z.string().uuid().optional().nullable(),
});

const listQuerySchema = z.object({
  obraId: z.string().optional(),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await gastosAdicionalesService.listGastosAdicionales(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const gasto = await gastosAdicionalesService.getGastoAdicional(req.params.id);
    res.json({ gasto });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = gastoAdicionalInputSchema.parse(req.body);
    const gasto = await gastosAdicionalesService.createGastoAdicional(input, req.user!.sub);
    res.status(201).json({ gasto });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await gastosAdicionalesService.deleteGastoAdicional(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
