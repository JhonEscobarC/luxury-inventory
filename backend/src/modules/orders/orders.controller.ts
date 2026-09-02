import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import * as ordersService from "./orders.service";

const filtersSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const orderItemSchema = z.object({
  productId: z.string().uuid("Producto invalido"),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
});

const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).optional().nullable(),
  customerPhone: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  items: z.array(orderItemSchema).min(1, "El pedido debe tener al menos un producto"),
});

const updateOrderSchema = createOrderSchema.partial();

const statusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = filtersSchema.parse(req.query);
    const items = await ordersService.listOrdersForReport(filters);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await ordersService.getOrderById(req.params.id);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body);
    const order = await ordersService.createOrder(input, req.user!.sub);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateOrderSchema.parse(req.body);
    const order = await ordersService.updateOrder(req.params.id, input);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function updateStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = statusSchema.parse(req.body);
    const order = await ordersService.updateOrderStatus(req.params.id, status);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}
