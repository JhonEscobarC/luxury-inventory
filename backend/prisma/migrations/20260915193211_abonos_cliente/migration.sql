-- Precio de venta objetivo por obra (null = la obra no esta en venta / sin definir).
ALTER TABLE "obras" ADD COLUMN "precioVenta" DECIMAL(14,2);

-- CreateTable: pagos del comprador de una obra hacia su precio de venta.
CREATE TABLE "abonos_cliente" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "abonos_cliente_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "abonos_cliente" ADD CONSTRAINT "abonos_cliente_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "abonos_cliente" ADD CONSTRAINT "abonos_cliente_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "abonos_cliente_obraId_idx" ON "abonos_cliente"("obraId");

-- AlterEnum
ALTER TYPE "HistorialTipo" ADD VALUE 'ABONO_CLIENTE_REGISTRADO';

-- AlterTable
ALTER TABLE "historial_eventos" ADD COLUMN "abonoClienteId" TEXT;
