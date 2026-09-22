import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as obraEtapasService from "./obraEtapas.service";
import * as obrasService from "../obras/obras.service";
import { HttpError } from "../../middleware/errorHandler";

const listQuerySchema = z.object({
  obraId: z.string().uuid("Obra invalida"),
});

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { obraId } = listQuerySchema.parse(req.query);
    if (req.user!.role === "OBRA") {
      const obras = await obrasService.listObrasForUser(req.user!.sub);
      if (!obras.some((o) => o.id === obraId)) {
        throw new HttpError(403, "No tienes acceso a esta obra");
      }
    }
    const items = await obraEtapasService.listEtapasByObra(obraId);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

const createSchema = z.object({
  obraId: z.string().uuid("Obra invalida"),
  name: z.string().trim().min(1, "El nombre de la etapa es requerido"),
});

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSchema.parse(req.body);
    const etapa = await obraEtapasService.createCustomEtapa(input);
    res.status(201).json({ etapa });
  } catch (error) {
    next(error);
  }
}

const reorderSchema = z.object({
  obraId: z.string().uuid("Obra invalida"),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function reorderHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { obraId, orderedIds } = reorderSchema.parse(req.body);
    const items = await obraEtapasService.reorderEtapas(obraId, orderedIds);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await obraEtapasService.deleteCustomEtapa(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
