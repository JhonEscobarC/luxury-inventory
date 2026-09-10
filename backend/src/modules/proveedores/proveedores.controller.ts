import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as proveedoresService from "./proveedores.service";

const proveedorInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido"),
  contactName: z.string().trim().min(1).optional().nullable(),
  phone: z.string().trim().min(1).optional().nullable(),
  email: z.string().trim().email("Correo invalido").optional().nullable(),
  address: z.string().trim().min(1).optional().nullable(),
  category: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
});

const proveedorUpdateSchema = proveedorInputSchema.partial();

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
    const items = await proveedoresService.listProveedores(query);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const proveedor = await proveedoresService.getProveedorById(req.params.id);
    res.json({ proveedor });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = proveedorInputSchema.parse(req.body);
    const proveedor = await proveedoresService.createProveedor(input);
    res.status(201).json({ proveedor });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = proveedorUpdateSchema.parse(req.body);
    const proveedor = await proveedoresService.updateProveedor(req.params.id, input);
    res.json({ proveedor });
  } catch (error) {
    next(error);
  }
}

export async function setActiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = setActiveSchema.parse(req.body);
    const proveedor = await proveedoresService.setProveedorActive(req.params.id, isActive);
    res.json({ proveedor });
  } catch (error) {
    next(error);
  }
}
