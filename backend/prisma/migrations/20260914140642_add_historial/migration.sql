-- CreateEnum
CREATE TYPE "HistorialTipo" AS ENUM ('PEDIDO_CREADO', 'PEDIDO_CONFIRMADO', 'PEDIDO_DESPACHADO', 'PEDIDO_CANCELADO', 'ASIGNACION_CREADA', 'ETAPA_COMPLETADA', 'ETAPA_PAGADA', 'ABONO_REGISTRADO');

-- CreateTable
CREATE TABLE "historial_eventos" (
    "id" TEXT NOT NULL,
    "tipo" "HistorialTipo" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userName" TEXT,
    "obraId" TEXT,
    "obraName" TEXT,
    "proveedorId" TEXT,
    "proveedorName" TEXT,
    "contratistaId" TEXT,
    "contratistaName" TEXT,
    "orderId" TEXT,
    "asignacionId" TEXT,
    "abonoId" TEXT,

    CONSTRAINT "historial_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historial_eventos_createdAt_idx" ON "historial_eventos"("createdAt");

-- CreateIndex
CREATE INDEX "historial_eventos_obraId_idx" ON "historial_eventos"("obraId");

-- CreateIndex
CREATE INDEX "historial_eventos_proveedorId_idx" ON "historial_eventos"("proveedorId");

