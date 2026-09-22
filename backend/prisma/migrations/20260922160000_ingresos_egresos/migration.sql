-- Financiero pasa a manejarse como Ingresos/Egresos. Los gastos adicionales ganan un tipo
-- (gasto general vs. pago a empleado) y se agrega el concepto de prestamos recibidos
-- (ingreso) con sus abonos de devolucion (egreso).
CREATE TYPE "GastoTipo" AS ENUM ('GENERAL', 'EMPLEADO');

ALTER TYPE "HistorialTipo" ADD VALUE 'PRESTAMO_REGISTRADO';
ALTER TYPE "HistorialTipo" ADD VALUE 'PRESTAMO_PAGO_REGISTRADO';

ALTER TABLE "gastos_adicionales" ADD COLUMN "tipo" "GastoTipo" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "gastos_adicionales" ADD COLUMN "empleadoNombre" TEXT;

CREATE TABLE "prestamos" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "lender" TEXT NOT NULL,
    "notes" TEXT,
    "metodoPago" "MetodoPago" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "prestamos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prestamo_pagos" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prestamoId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "prestamo_pagos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "prestamos" ADD CONSTRAINT "prestamos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prestamo_pagos" ADD CONSTRAINT "prestamo_pagos_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "prestamos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prestamo_pagos" ADD CONSTRAINT "prestamo_pagos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "historial_eventos" ADD COLUMN "prestamoId" TEXT;
ALTER TABLE "historial_eventos" ADD COLUMN "prestamoPagoId" TEXT;
