export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND";

export interface WhatsAppMessage {
  id: string;
  waMessageId: string | null;
  fromNumber: string;
  toNumber: string;
  direction: WhatsAppMessageDirection;
  body: string;
  orderId: string | null;
  createdAt: string;
}

export interface WhatsAppConversationSummary {
  phone: string;
  lastMessage: WhatsAppMessage;
  unprocessedCount: number;
  messageCount: number;
}
