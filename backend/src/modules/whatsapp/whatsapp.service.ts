import crypto from "node:crypto";
import { WhatsAppDirection, OrderSource, type Prisma, type WhatsAppMessageLog } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { HttpError } from "../../middleware/errorHandler";
import * as ordersService from "../orders/orders.service";
import type { OrderItemInput } from "../orders/orders.service";

export function getIntegrationStatus() {
  return {
    configured: Boolean(
      env.whatsapp.accessToken && env.whatsapp.phoneNumberId && env.whatsapp.verifyToken,
    ),
  };
}

// --- Verificacion (handshake GET y firma HMAC del POST) ---

export function verifyWebhookChallenge(mode: string | undefined, token: string | undefined): boolean {
  return Boolean(env.whatsapp.verifyToken) && mode === "subscribe" && token === env.whatsapp.verifyToken;
}

export function verifyWebhookSignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
  if (!env.whatsapp.appSecret) {
    // Integracion aun no conectada (sin app secret configurado): no hay nada que validar todavia.
    return true;
  }
  if (!rawBody || !signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const expected = crypto.createHmac("sha256", env.whatsapp.appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

// --- Ingesta de mensajes entrantes (payload de Meta Cloud API) ---

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}

export async function ingestWebhookPayload(payload: MetaWebhookPayload): Promise<string[]> {
  const loggedIds: string[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const toNumber = value?.metadata?.display_phone_number ?? value?.metadata?.phone_number_id ?? "desconocido";

      for (const message of value?.messages ?? []) {
        const existing = message.id
          ? await prisma.whatsAppMessageLog.findUnique({ where: { waMessageId: message.id } })
          : null;
        if (existing) continue;

        const body = message.text?.body ?? `[mensaje de tipo ${message.type}]`;

        const log = await prisma.whatsAppMessageLog.create({
          data: {
            waMessageId: message.id,
            fromNumber: message.from,
            toNumber,
            direction: WhatsAppDirection.INBOUND,
            body,
            rawPayload: message as unknown as Prisma.InputJsonValue,
          },
        });
        loggedIds.push(log.id);
      }
    }
  }

  return loggedIds;
}

// --- Lectura de conversaciones ---

function serializeLog(log: WhatsAppMessageLog) {
  return {
    id: log.id,
    waMessageId: log.waMessageId,
    fromNumber: log.fromNumber,
    toNumber: log.toNumber,
    direction: log.direction,
    body: log.body,
    orderId: log.orderId,
    createdAt: log.createdAt,
  };
}

export async function listConversations() {
  const logs = await prisma.whatsAppMessageLog.findMany({ orderBy: { createdAt: "desc" } });

  const byPhone = new Map<string, WhatsAppMessageLog[]>();
  for (const log of logs) {
    const phone = log.direction === WhatsAppDirection.INBOUND ? log.fromNumber : log.toNumber;
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone)!.push(log);
  }

  return Array.from(byPhone.entries()).map(([phone, phoneLogs]) => ({
    phone,
    lastMessage: serializeLog(phoneLogs[0]),
    unprocessedCount: phoneLogs.filter((log) => log.direction === WhatsAppDirection.INBOUND && !log.orderId).length,
    messageCount: phoneLogs.length,
  }));
}

export async function getConversation(phone: string) {
  const logs = await prisma.whatsAppMessageLog.findMany({
    where: { OR: [{ fromNumber: phone }, { toNumber: phone }] },
    orderBy: { createdAt: "asc" },
  });
  return logs.map(serializeLog);
}

// --- Envio de mensajes salientes (Cloud API) ---

export async function sendWhatsAppMessage(to: string, body: string) {
  if (!env.whatsapp.accessToken || !env.whatsapp.phoneNumberId) {
    throw new HttpError(503, "La integracion de WhatsApp no esta configurada todavia");
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${env.whatsapp.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const data = (await response.json().catch(() => null)) as { messages?: Array<{ id: string }> } | null;

  if (!response.ok) {
    throw new HttpError(502, `Error al enviar mensaje de WhatsApp: ${JSON.stringify(data)}`);
  }

  const waMessageId = data?.messages?.[0]?.id;

  const log = await prisma.whatsAppMessageLog.create({
    data: {
      waMessageId,
      fromNumber: env.whatsapp.phoneNumberId,
      toNumber: to,
      direction: WhatsAppDirection.OUTBOUND,
      body,
      rawPayload: (data ?? {}) as Prisma.InputJsonValue,
    },
  });

  return serializeLog(log);
}

// --- Procesar un mensaje entrante en un pedido ---

export interface CreateOrderFromLogInput {
  customerName?: string | null;
  notes?: string | null;
  items: OrderItemInput[];
}

export async function createOrderFromLog(logId: string, input: CreateOrderFromLogInput, createdById: string) {
  const log = await prisma.whatsAppMessageLog.findUnique({ where: { id: logId } });
  if (!log) {
    throw new HttpError(404, "Mensaje no encontrado");
  }
  if (log.orderId) {
    throw new HttpError(400, "Este mensaje ya tiene un pedido asociado");
  }

  const order = await ordersService.createOrder(
    {
      customerName: input.customerName ?? null,
      customerPhone: log.fromNumber,
      notes: input.notes ?? null,
      items: input.items,
      source: OrderSource.WHATSAPP,
    },
    createdById,
  );

  await prisma.whatsAppMessageLog.update({ where: { id: logId }, data: { orderId: order.id } });

  return order;
}
