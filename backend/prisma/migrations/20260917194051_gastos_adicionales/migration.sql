-- Gastos adicionales de la empresa (transporte, tramites, etc.), opcionalmente
-- ligados a una obra, con su propio evento de historial y comprobante.
ALTER TYPE "HistorialTipo" ADD VALUE 'GASTO_ADICIONAL_REGISTRADO';

CREATE TABLE "gastos_adicionales" (
    "id" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "obraId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "gastos_adicionales_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "gastos_adicionales" ADD CONSTRAINT "gastos_adicionales_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "gastos_adicionales" ADD CONSTRAINT "gastos_adicionales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historial_eventos" ADD COLUMN "gastoAdicionalId" TEXT;
