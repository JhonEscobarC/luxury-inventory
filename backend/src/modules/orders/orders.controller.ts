import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import * as ordersService from "./orders.service";
import * as obrasService from "../obras/obras.service";
import { HttpError } from "../../middleware/errorHandler";

const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Describe el material"),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
  unit: z.string().trim().min(1, "La unidad es requerida"),
});

const createOrderSchema = z.object({
  obraId: z.string().uuid("Obra invalida"),
  notes: z.string().trim().min(1).optional().nullable(),
  items: z.array(orderItemSchema).min(1, "El pedido debe tener al menos un material"),
});

const updateOrderSchema = z.object({
  notes: z.string().trim().min(1).optional().nullable(),
  items: z.array(orderItemSchema).min(1).optional(),
});

const assignOrderSchema = z.object({
  proveedorId: z.string().uuid("Proveedor invalido"),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        unitPrice: z.number().min(0),
        productId: z.string().uuid().optional().nullable(),
      }),
    )
    .min(1),
});

const statusSchema = z.object({ status: z.nativeEnum(OrderStatus) });

const filtersSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  obraId: z.string().uuid().optional(),
  proveedorId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

async function getObraIdsForCurrentUser(req: Request): Promise<string[]> {
  const obras = await obrasService.listObrasForUser(req.user!.sub);
  return obras.map((o) => o.id);
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = filtersSchema.parse(req.query);
    const isObraRole = req.user!.role === "OBRA";
    const restrictToObraIds = isObraRole ? await getObraIdsForCurrentUser(req) : undefined;
    const items = await ordersService.listOrders({ ...filters, restrictToObraIds });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.getOrderById(req.params.id);
    if (req.user!.role === "OBRA") {
      const allowedObraIds = await getObraIdsForCurrentUser(req);
      if (!allowedObraIds.includes(order.obraId)) {
        throw new HttpError(403, "No tienes acceso a este pedido");
      }
    }
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body);
    const allowedObraIds = await getObraIdsForCurrentUser(req);
    if (!allowedObraIds.includes(input.obraId)) {
      throw new HttpError(403, "No tienes acceso a esa obra");
    }
    const order = await ordersService.createOrder(input, req.user!.sub);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateOrderSchema.parse(req.body);
    const existing = await ordersService.getOrderById(req.params.id);
    if (req.user!.role === "OBRA" && existing.createdById !== req.user!.sub) {
      throw new HttpError(403, "Solo puedes editar pedidos que tu creaste");
    }
    const order = await ordersService.updateOrder(req.params.id, input);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function assignHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = assignOrderSchema.parse(req.body);
    const order = await ordersService.assignOrder(req.params.id, input, req.user!.sub);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function updateStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = statusSchema.parse(req.body);
    if (req.user!.role === "OBRA") {
      const existing = await ordersService.getOrderById(req.params.id);
      if (existing.createdById !== req.user!.sub || status !== OrderStatus.CANCELADO) {
        throw new HttpError(403, "Solo puedes cancelar tus propios pedidos pendientes");
      }
    }
    const order = await ordersService.updateOrderStatus(req.params.id, status);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}
