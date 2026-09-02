import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as whatsappService from "./whatsapp.service";

const orderItemSchema = z.object({
  productId: z.string().uuid("Producto invalido"),
  quantity: z.number().positive("La cantidad debe ser mayor a cero"),
});

const createOrderFromLogSchema = z.object({
  customerName: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().min(1).optional().nullable(),
  items: z.array(orderItemSchema).min(1, "El pedido debe tener al menos un producto"),
});

const sendMessageSchema = z.object({
  to: z.string().trim().min(5, "Numero de telefono invalido"),
  body: z.string().trim().min(1, "El mensaje no puede estar vacio"),
});

export function statusHandler(req: Request, res: Response) {
  res.json(whatsappService.getIntegrationStatus());
}

export function webhookVerifyHandler(req: Request, res: Response) {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (whatsappService.verifyWebhookChallenge(mode, token)) {
    res.status(200).send(challenge ?? "");
  } else {
    res.sendStatus(403);
  }
}

export async function webhookReceiveHandler(req: Request, res: Response) {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody = req.rawBody;

  if (!whatsappService.verifyWebhookSignature(rawBody, signature)) {
    res.sendStatus(401);
    return;
  }

  try {
    await whatsappService.ingestWebhookPayload(req.body);
  } catch (error) {
    console.error("Error procesando webhook de WhatsApp:", error);
  }

  // Meta espera un 200 rapido; si no lo recibe, reintenta el envio del evento.
  res.sendStatus(200);
}

export async function listConversationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await whatsappService.listConversations();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function getConversationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await whatsappService.getConversation(req.params.phone);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function sendMessageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = sendMessageSchema.parse(req.body);
    const log = await whatsappService.sendWhatsAppMessage(input.to, input.body);
    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
}

export async function createOrderFromLogHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createOrderFromLogSchema.parse(req.body);
    const order = await whatsappService.createOrderFromLog(req.params.id, input, req.user!.sub);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}
