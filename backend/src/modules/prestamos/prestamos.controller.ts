import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { MetodoPago } from "@prisma/client";
import * as prestamosService from "./prestamos.service";

const prestamoInputSchema = z.object({
  amount: z.number().positive(),
  lender: z.string().trim().min(1, "Indica de quien se recibio el prestamo"),
  notes: z.string().trim().min(1).optional().nullable(),
  metodoPago: z.nativeEnum(MetodoPago, { required_error: "Selecciona el metodo de pago" }),
});

const pagoInputSchema = z.object({
  prestamoId: z.string().uuid(),
  amount: z.number().positive(),
  metodoPago: z.nativeEnum(MetodoPago, { required_error: "Selecciona el metodo de pago" }),
  notes: z.string().trim().min(1).optional().nullable(),
});

export async function listHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prestamosService.listPrestamos();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = prestamoInputSchema.parse(req.body);
    const prestamo = await prestamosService.createPrestamo(input, req.user!.sub);
    res.status(201).json({ prestamo });
  } catch (error) {
    next(error);
  }
}

export async function createPagoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = pagoInputSchema.parse(req.body);
    const pago = await prestamosService.createPrestamoPago(input, req.user!.sub);
    res.status(201).json({ pago });
  } catch (error) {
    next(error);
  }
}
