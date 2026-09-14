import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as contratistasService from "./contratistas.service";

const contratistaInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  oficio: z.string().trim().min(1).optional().nullable(),
  phone: z.string().trim().min(1).optional().nullable(),
  email: z.string().trim().email("Correo invalido").optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

const contratistaUpdateSchema = contratistaInputSchema.partial();

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
    const items = await contratistasService.listContratistas(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contratista = await contratistasService.getContratistaById(req.params.id);
    res.json({ contratista });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = contratistaInputSchema.parse(req.body);
    const contratista = await contratistasService.createContratista(input);
    res.status(201).json({ contratista });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = contratistaUpdateSchema.parse(req.body);
    const contratista = await contratistasService.updateContratista(req.params.id, input);
    res.json({ contratista });
  } catch (error) {
    next(error);
  }
}

export async function setActiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = setActiveSchema.parse(req.body);
    const contratista = await contratistasService.setContratistaActive(req.params.id, isActive);
    res.json({ contratista });
  } catch (error) {
    next(error);
  }
}
