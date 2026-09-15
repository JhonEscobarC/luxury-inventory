import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as categoriasService from "./categorias.service";

const categoriaInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
});

const categoriaUpdateSchema = categoriaInputSchema.partial();

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
    const items = await categoriasService.listCategorias(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = categoriaInputSchema.parse(req.body);
    const categoria = await categoriasService.createCategoria(input);
    res.status(201).json({ categoria });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = categoriaUpdateSchema.parse(req.body);
    const categoria = await categoriasService.updateCategoria(req.params.id, input);
    res.json({ categoria });
  } catch (error) {
    next(error);
  }
}

export async function setActiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = setActiveSchema.parse(req.body);
    const categoria = await categoriasService.setCategoriaActive(req.params.id, isActive);
    res.json({ categoria });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await categoriasService.deleteCategoria(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
