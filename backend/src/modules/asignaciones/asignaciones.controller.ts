import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { EtapaStatus } from "@prisma/client";
import * as asignacionesService from "./asignaciones.service";

const etapaSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la etapa es requerido"),
  percentage: z.number().positive("El porcentaje debe ser mayor a cero").max(100),
  obraEtapaId: z.string().uuid().optional().nullable(),
});

const createSchema = z.object({
  obraId: z.string().uuid("Obra invalida"),
  contratistaId: z.string().uuid("Contratista invalido"),
  totalAmount: z.number().positive("El monto total debe ser mayor a cero"),
  notes: z.string().trim().min(1).optional().nullable(),
  etapas: z.array(etapaSchema).min(1, "Debes agregar al menos una etapa"),
});

const updateSchema = z.object({
  totalAmount: z.number().positive().optional(),
  notes: z.string().trim().min(1).optional().nullable(),
  etapas: z.array(etapaSchema).min(1).optional(),
});

const etapaStatusSchema = z.object({ status: z.nativeEnum(EtapaStatus) });

const listQuerySchema = z.object({
  obraId: z.string().uuid().optional(),
  contratistaId: z.string().uuid().optional(),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await asignacionesService.listAsignaciones(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const asignacion = await asignacionesService.getAsignacionById(req.params.id);
    res.json({ asignacion });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSchema.parse(req.body);
    const asignacion = await asignacionesService.createAsignacion(input, req.user!.sub);
    res.status(201).json({ asignacion });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateSchema.parse(req.body);
    const asignacion = await asignacionesService.updateAsignacion(req.params.id, input);
    res.json({ asignacion });
  } catch (error) {
    next(error);
  }
}

export async function updateEtapaStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = etapaStatusSchema.parse(req.body);
    const asignacion = await asignacionesService.updateEtapaStatus(
      req.params.id,
      req.params.etapaId,
      status,
      req.user!.sub,
    );
    res.json({ asignacion });
  } catch (error) {
    next(error);
  }
}
