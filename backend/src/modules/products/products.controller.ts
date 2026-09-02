import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as productsService from "./products.service";

const productInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  category: z.string().trim().min(1, "La categoria es requerida"),
  quantity: z.number().min(0, "La cantidad no puede ser negativa"),
  unit: z.string().trim().min(1, "La unidad es requerida"),
  price: z.number().min(0, "El precio no puede ser negativo"),
  supplier: z.string().trim().min(1).optional().nullable(),
  minStock: z.number().min(0, "El stock minimo no puede ser negativo").default(0),
});

const productUpdateSchema = productInputSchema.partial();

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  lowStock: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await productsService.listProducts(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const items = await productsService.listAllProducts(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function categoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await productsService.getCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function lowStockCountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await productsService.getLowStockCount();
    res.json({ count });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.json({ product });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productInputSchema.parse(req.body);
    const product = await productsService.createProduct(input);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productUpdateSchema.parse(req.body);
    const product = await productsService.updateProduct(req.params.id, input);
    res.json({ product });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await productsService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
