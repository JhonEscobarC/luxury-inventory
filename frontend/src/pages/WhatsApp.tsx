import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createOrderFromLog, getConversation, listConversations, sendMessage } from "../lib/whatsapp";
import { listAllProductsForReport } from "../lib/products";
import type { WhatsAppConversationSummary, WhatsAppMessage } from "../types/whatsapp";
import type { Product } from "../types/product";
import type { OrderInput } from "../types/order";
import { OrderFormModal } from "../components/orders/OrderFormModal";

export function WhatsApp() {
  const { user } = useAuth();
  const canReply = user?.role === "ADMIN" || user?.role === "VENTAS";

  const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [orderingLog, setOrderingLog] = useState<WhatsAppMessage | null>(null);

  async function refreshConversations() {
    setIsLoadingList(true);
    try {
      const [conversationsResult, productsResult] = await Promise.all([
        listConversations(),
        products.length ? Promise.resolve(products) : listAllProductsForReport(),
      ]);
      setConversations(conversationsResult);
      setProducts(productsResult);
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(phone: string) {
    setSelectedPhone(phone);
    setIsLoadingThread(true);
    setSendError(null);
    try {
      const items = await getConversation(phone);
      setMessages(items);
    } finally {
      setIsLoadingThread(false);
    }
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!selectedPhone || !replyText.trim()) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendMessage(selectedPhone, replyText.trim());
      setReplyText("");
      const items = await getConversation(selectedPhone);
      setMessages(items);
      await refreshConversations();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "No se pudo enviar el mensaje.";
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateOrder(input: OrderInput) {
    if (!orderingLog) return;
    await createOrderFromLog(orderingLog.id, { customerName: input.customerName, notes: input.notes, items: input.items });
    setOrderingLog(null);
    if (selectedPhone) {
      const items = await getConversation(selectedPhone);
      setMessages(items);
    }
    await refreshConversations();
  }

  const selectedConversation = conversations.find((conversation) => conversation.phone === selectedPhone);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-96px)]">
      <div className="mb-6">
        <h2 className="text-display-lg-mobile md:text-display-lg text-primary uppercase">WhatsApp</h2>
        <p className="font-body-md text-on-surface-variant mt-2 max-w-2xl">
          Mensajes entrantes sincronizados con la Cloud API de Meta. Revisa la conversacion y convierte un mensaje en
          pedido.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div
          className={`lg:col-span-4 bg-surface border border-outline-variant flex-col min-h-0 ${
            selectedPhone ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h3 className="font-label-sm uppercase text-on-surface-variant">Conversaciones</h3>
            <button onClick={refreshConversations} className="text-on-surface-variant hover:text-primary" title="Actualizar">
              <span className="material-symbols-outlined text-[20px]">sync</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingList && <p className="p-5 font-label-sm uppercase text-on-surface-variant">Cargando...</p>}

            {!isLoadingList && conversations.length === 0 && (
              <div className="p-5">
                <p className="font-label-sm uppercase text-on-surface-variant">Sin mensajes todavia.</p>
                <p className="font-label-sm text-on-surface-variant/70 uppercase mt-2">
                  Aparecerán aquí cuando conectes el webhook de WhatsApp Cloud API con tus credenciales reales.
                </p>
              </div>
            )}

            {!isLoadingList &&
              conversations.map((conversation) => (
                <div
                  key={conversation.phone}
                  onClick={() => openConversation(conversation.phone)}
                  className={`p-5 border-b border-outline-variant cursor-pointer transition-colors ${
                    selectedPhone === conversation.phone
                      ? "bg-surface-container-high border-l-2 border-l-primary"
                      : "hover:bg-surface-container"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <h4 className="font-body-md font-semibold text-on-surface truncate">{conversation.phone}</h4>
                    <span className="text-xs text-on-surface-variant whitespace-nowrap">
                      {new Date(conversation.lastMessage.createdAt).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="font-body-md text-on-surface-variant truncate mb-2">{conversation.lastMessage.body}</p>
                  {conversation.unprocessedCount > 0 && (
                    <span className="px-2 py-1 border border-primary text-primary text-[10px] uppercase tracking-widest">
                      {conversation.unprocessedCount} sin procesar
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>

        <div
          className={`lg:col-span-8 bg-surface border border-outline-variant flex-col min-h-0 ${
            selectedPhone ? "flex" : "hidden lg:flex"
          }`}
        >
          {!selectedPhone && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-label-sm uppercase text-on-surface-variant">Selecciona una conversacion</p>
            </div>
          )}

          {selectedPhone && (
            <>
              <div className="p-4 md:p-6 border-b border-outline-variant bg-surface-container-low flex items-center gap-4">
                <button onClick={() => setSelectedPhone(null)} className="lg:hidden text-on-surface-variant">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="w-10 h-10 rounded-full bg-surface-bright border border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <div>
                  <h3 className="font-body-lg text-on-surface">{selectedPhone}</h3>
                  {selectedConversation && (
                    <p className="text-xs text-on-surface-variant">{selectedConversation.messageCount} mensajes</p>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-4 bg-background">
                {isLoadingThread && <p className="font-label-sm uppercase text-on-surface-variant">Cargando...</p>}

                {!isLoadingThread &&
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col gap-2 max-w-[85%] md:max-w-[70%] ${
                        message.direction === "OUTBOUND" ? "self-end items-end" : "self-start items-start"
                      }`}
                    >
                      <div
                        className={`p-4 rounded-lg border ${
                          message.direction === "OUTBOUND"
                            ? "bg-primary-container text-on-primary-container border-primary rounded-br-none"
                            : "bg-surface-container border-outline-variant rounded-tl-none"
                        }`}
                      >
                        <p className="font-body-md whitespace-pre-wrap">{message.body}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-on-surface-variant">
                          {new Date(message.createdAt).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {message.direction === "INBOUND" && !message.orderId && canReply && (
                          <button
                            onClick={() => setOrderingLog(message)}
                            className="text-[11px] uppercase tracking-widest text-primary hover:text-primary-fixed flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                            Crear pedido
                          </button>
                        )}
                        {message.orderId && (
                          <span className="text-[11px] uppercase tracking-widest text-on-surface-variant/70">
                            Pedido creado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {sendError && <p className="text-error font-label-sm uppercase px-4 md:px-6 pb-2">{sendError}</p>}

              {canReply && (
                <form onSubmit={handleSend} className="p-4 border-t border-outline-variant bg-surface-container-low flex gap-4 items-end">
                  <div className="flex-1 bg-surface border border-outline-variant focus-within:border-primary transition-colors flex items-center px-4 py-2 min-h-[48px]">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 font-body-md p-0"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="w-12 h-12 flex-shrink-0 bg-primary text-on-primary flex items-center justify-center hover:bg-primary-fixed transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {orderingLog && (
        <OrderFormModal
          order={null}
          products={products}
          title="Crear pedido desde WhatsApp"
          defaultCustomerPhone={orderingLog.fromNumber}
          lockCustomerPhone
          onClose={() => setOrderingLog(null)}
          onSubmit={handleCreateOrder}
        />
      )}
    </div>
  );
}
