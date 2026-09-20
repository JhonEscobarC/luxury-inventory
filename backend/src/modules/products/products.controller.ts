import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as productsService from "./products.service";
import { listProductoHistorial } from "./productHistorial.service";
import { HttpError } from "../../middleware/errorHandler";

const productInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  categoriaId: z.string().uuid("Categoria invalida").optional().nullable(),
  obraId: z.string().uuid("Obra invalida").optional().nullable(),
  quantity: z.number().min(0, "La cantidad no puede ser negativa"),
  unit: z.string().trim().min(1, "La unidad es requerida"),
  price: z.number().min(0, "El precio no puede ser negativo"),
  proveedorId: z.string().uuid("Proveedor invalido").optional().nullable(),
});

const productUpdateSchema = productInputSchema.partial();

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoriaId: z.string().uuid().optional(),
  obraId: z.string().optional(),
  proyectoId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

// obraId="" (o el literal "none") en la query representa "stock general (sin obra)".
function parseObraIdFilter(raw: string | undefined): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === "" || raw === "none") return null;
  return raw;
}

// proyectoId="" en la query significa "sin filtro"; "none" es el literal para "obras sin proyecto".
function parseProyectoIdFilter(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === "") return undefined;
  return raw;
}

// Los usuarios OBRA solo ven el inventario de las obras que tienen asignadas.
async function getScopeForRequest(req: Request) {
  if (req.user?.role === "OBRA") {
    const restrictToObraIds = await productsService.getObraIdsForUser(req.user.sub);
    return { restrictToObraIds };
  }
  return {};
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const scope = await getScopeForRequest(req);
    const result = await productsService.listProducts({
      ...query,
      obraId: parseObraIdFilter(query.obraId),
      proyectoId: parseProyectoIdFilter(query.proyectoId),
      ...scope,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const scope = await getScopeForRequest(req);
    const items = await productsService.listAllProducts({
      ...query,
      obraId: parseObraIdFilter(query.obraId),
      proyectoId: parseProyectoIdFilter(query.proyectoId),
      ...scope,
    });
    res.json({ items });
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

export async function historialHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.getProductById(req.params.id);
    if (req.user?.role === "OBRA") {
      const obraIds = await productsService.getObraIdsForUser(req.user.sub);
      if (!product.obraId || !obraIds.includes(product.obraId)) {
        throw new HttpError(403, "No tienes acceso al inventario de esta obra");
      }
    }
    const items = await listProductoHistorial(req.params.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productInputSchema.parse(req.body);
    const product = await productsService.createProduct(input, req.user!.sub);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = productUpdateSchema.parse(req.body);
    const product = await productsService.updateProduct(req.params.id, input, req.user!.sub);
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
