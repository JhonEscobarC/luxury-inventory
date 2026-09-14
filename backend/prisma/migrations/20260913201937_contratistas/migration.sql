-- CreateEnum
CREATE TYPE "EtapaStatus" AS ENUM ('PENDIENTE', 'COMPLETADA', 'PAGADA');

-- CreateTable
CREATE TABLE "contratistas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "oficio" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratista_asignaciones" (
    "id" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "obraId" TEXT NOT NULL,
    "contratistaId" TEXT NOT NULL,

    CONSTRAINT "contratista_asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratista_etapas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "status" "EtapaStatus" NOT NULL DEFAULT 'PENDIENTE',
    "completedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asignacionId" TEXT NOT NULL,

    CONSTRAINT "contratista_etapas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contratista_asignaciones" ADD CONSTRAINT "contratista_asignaciones_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratista_asignaciones" ADD CONSTRAINT "contratista_asignaciones_contratistaId_fkey" FOREIGN KEY ("contratistaId") REFERENCES "contratistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratista_etapas" ADD CONSTRAINT "contratista_etapas_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "contratista_asignaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

