import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as proyectosService from "./proyectos.service";

const proyectoInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  client: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

const proyectoUpdateSchema = proyectoInputSchema.partial();

const setActiveSchema = z.object({ isActive: z.boolean() });

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await proyectosService.listProyectos(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const proyecto = await proyectosService.getProyectoById(req.params.id);
    res.json({ proyecto });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = proyectoInputSchema.parse(req.body);
    const proyecto = await proyectosService.createProyecto(input);
    res.status(201).json({ proyecto });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = proyectoUpdateSchema.parse(req.body);
    const proyecto = await proyectosService.updateProyecto(req.params.id, input);
    res.json({ proyecto });
  } catch (error) {
    next(error);
  }
}

export async function setActiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = setActiveSchema.parse(req.body);
    const proyecto = await proyectosService.setProyectoActive(req.params.id, isActive);
    res.json({ proyecto });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await proyectosService.deleteProyecto(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
