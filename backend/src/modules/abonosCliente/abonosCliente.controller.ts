import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { FormaPago, MetodoPago } from "@prisma/client";
import * as abonosClienteService from "./abonosCliente.service";
import { getObraSaldoCliente } from "../reports/reports.service";
import { HttpError } from "../../middleware/errorHandler";

const abonoClienteInputSchema = z.object({
  obraId: z.string().uuid(),
  amount: z.number().positive(),
  notes: z.string().trim().min(1).optional().nullable(),
  formaPago: z.nativeEnum(FormaPago, { required_error: "Selecciona si es contado o credito" }),
  metodoPago: z.nativeEnum(MetodoPago, { required_error: "Selecciona el metodo de pago" }),
});

const listQuerySchema = z.object({
  obraId: z.string().optional(),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await abonosClienteService.listAbonosCliente(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = abonoClienteInputSchema.parse(req.body);
    const abono = await abonosClienteService.createAbonoCliente(input, req.user!.sub);
    res.status(201).json({ abono });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const abono = await abonosClienteService.getAbonoCliente(req.params.id);
    res.json({ abono });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await abonosClienteService.deleteAbonoCliente(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function saldoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const saldo = await getObraSaldoCliente(req.params.obraId);
    if (!saldo) {
      throw new HttpError(404, "Obra no encontrada");
    }
    res.json(saldo);
  } catch (error) {
    next(error);
  }
}
