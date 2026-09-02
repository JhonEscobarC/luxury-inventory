import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  createOrderFromLogHandler,
  getConversationHandler,
  listConversationsHandler,
  sendMessageHandler,
  statusHandler,
  webhookReceiveHandler,
  webhookVerifyHandler,
} from "./whatsapp.controller";

export const whatsappRouter = Router();

// Publico: Meta llama directamente a estas dos rutas (verificacion + eventos entrantes).
whatsappRouter.get("/webhook", webhookVerifyHandler);
whatsappRouter.post("/webhook", webhookReceiveHandler);

whatsappRouter.get("/status", requireAuth, statusHandler);
whatsappRouter.get("/conversations", requireAuth, listConversationsHandler);
whatsappRouter.get("/conversations/:phone", requireAuth, getConversationHandler);
whatsappRouter.post("/messages", requireAuth, requireRole("ADMIN", "VENTAS"), sendMessageHandler);
whatsappRouter.post(
  "/logs/:id/create-order",
  requireAuth,
  requireRole("ADMIN", "VENTAS"),
  createOrderFromLogHandler,
);
