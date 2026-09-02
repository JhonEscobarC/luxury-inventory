import { api } from "./api";
import type { WhatsAppConversationSummary, WhatsAppMessage } from "../types/whatsapp";
import type { Order, OrderItemInput } from "../types/order";

export async function listConversations(): Promise<WhatsAppConversationSummary[]> {
  const { data } = await api.get<{ items: WhatsAppConversationSummary[] }>("/whatsapp/conversations");
  return data.items;
}

export async function getConversation(phone: string): Promise<WhatsAppMessage[]> {
  const { data } = await api.get<{ items: WhatsAppMessage[] }>(
    `/whatsapp/conversations/${encodeURIComponent(phone)}`,
  );
  return data.items;
}

export async function sendMessage(to: string, body: string): Promise<WhatsAppMessage> {
  const { data } = await api.post<{ log: WhatsAppMessage }>("/whatsapp/messages", { to, body });
  return data.log;
}

export interface CreateOrderFromLogInput {
  customerName?: string | null;
  notes?: string | null;
  items: OrderItemInput[];
}

export async function createOrderFromLog(logId: string, input: CreateOrderFromLogInput): Promise<Order> {
  const { data } = await api.post<{ order: Order }>(`/whatsapp/logs/${logId}/create-order`, input);
  return data.order;
}
