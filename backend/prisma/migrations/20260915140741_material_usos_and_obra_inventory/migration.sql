-- El inventario pasa a manejarse por obra: los productos existentes (sin obraId)
-- quedan como "stock general", visible para ADMIN/CONTABILIDAD; los productos que
-- entren desde ahora via un pedido de una obra quedan ligados exclusivamente a ella.

-- AlterTable: nueva columna nullable (sin dato existente que reasignar)
ALTER TABLE "products" ADD COLUMN "obraId" TEXT;
ALTER TABLE "products" ADD CONSTRAINT "products_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "products_obraId_idx" ON "products"("obraId");

-- CreateTable: registro de uso de materiales por parte de residentes de obra
CREATE TABLE "material_usos" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "material_usos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "material_usos" ADD CONSTRAINT "material_usos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_usos" ADD CONSTRAINT "material_usos_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_usos" ADD CONSTRAINT "material_usos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "material_usos_obraId_idx" ON "material_usos"("obraId");
CREATE INDEX "material_usos_productId_idx" ON "material_usos"("productId");

-- AlterEnum: nuevo tipo de evento de historial
ALTER TYPE "HistorialTipo" ADD VALUE 'MATERIAL_USADO';
