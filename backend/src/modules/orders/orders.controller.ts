import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { OrderStatus, FormaPago } from "@prisma/client";
import * as ordersService from "./orders.service";
import * as obrasService from "../obras/obras.service";
import { HttpError } from "../../middleware/errorHandler";

const orderItemSchema = z.object({
  description: z.string().trim().min(1, "Describe el material"),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
  unit: z.string().trim().min(1, "La unidad es requerida"),
  categoriaId: z.string().uuid().optional().nullable(),
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
  // null/undefined = proveedor distinto por material (cada item trae el suyo).
  proveedorId: z.string().uuid("Proveedor invalido").optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  formaPago: z.nativeEnum(FormaPago, { required_error: "Selecciona la forma de pago" }),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Describe el material"),
        quantity: z.number().positive("La cantidad debe ser mayor a cero"),
        unit: z.string().trim().min(1, "La unidad es requerida"),
        unitPrice: z.number().min(0),
        categoriaId: z.string().uuid().optional().nullable(),
        proveedorId: z.string().uuid().optional().nullable(),
      }),
    )
    .min(1, "El pedido debe tener al menos un material"),
});

const directPurchaseSchema = assignOrderSchema.extend({ obraId: z.string().uuid("Obra invalida") });

// La foto llega como data URL (data:image/...;base64,...) ya comprimida por el cliente.
const receiveSchema = z.object({ foto: z.string().optional().nullable() });
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_FOTO_BYTES = 4 * 1024 * 1024;

const statusSchema = z.object({ status: z.nativeEnum(OrderStatus) });

const filtersSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  obraId: z.string().uuid().optional(),
  proveedorId: z.string().uuid().optional(),
  categoriaId: z.string().uuid().optional(),
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

export async function directPurchaseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = directPurchaseSchema.parse(req.body);
    const order = await ordersService.createDirectPurchase(input, req.user!.sub);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

export async function receiveHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { foto } = receiveSchema.parse(req.body);
    const isObra = req.user!.role === "OBRA";
    const existing = await ordersService.getOrderById(req.params.id);
    if (isObra) {
      const allowedObraIds = await getObraIdsForCurrentUser(req);
      if (!allowedObraIds.includes(existing.obraId)) {
        throw new HttpError(403, "No tienes acceso a este pedido");
      }
    }

    let fotoInput: ordersService.RecepcionFotoInput | undefined;
    if (foto) {
      const match = DATA_URL.exec(foto);
      if (!match) throw new HttpError(400, "La foto debe ser una imagen JPG, PNG o WEBP");
      const data = Buffer.from(match[2], "base64");
      if (data.length > MAX_FOTO_BYTES) throw new HttpError(400, "La foto es demasiado pesada (maximo 4 MB)");
      fotoInput = { data, mime: match[1] };
    }
    if (isObra && !fotoInput) {
      throw new HttpError(400, "Sube una foto como prueba de que el pedido llego");
    }

    const order = await ordersService.updateOrderStatus(req.params.id, OrderStatus.DESPACHADO, req.user!.sub, fotoInput);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}

export async function recepcionFotoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role === "OBRA") {
      const existing = await ordersService.getOrderById(req.params.id);
      const allowedObraIds = await getObraIdsForCurrentUser(req);
      if (!allowedObraIds.includes(existing.obraId)) {
        throw new HttpError(403, "No tienes acceso a este pedido");
      }
    }
    const { data, mime } = await ordersService.getRecepcionFoto(req.params.id);
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(data);
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
    const order = await ordersService.updateOrderStatus(req.params.id, status, req.user!.sub);
    res.json({ order });
  } catch (error) {
    next(error);
  }
}
