-- Foto de prueba de recepcion de un pedido (la sube el residente al marcarlo como recibido).
CREATE TABLE "order_recepciones" (
    "id" TEXT NOT NULL,
    "foto" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "order_recepciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_recepciones_orderId_key" ON "order_recepciones"("orderId");
ALTER TABLE "order_recepciones" ADD CONSTRAINT "order_recepciones_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_recepciones" ADD CONSTRAINT "order_recepciones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
