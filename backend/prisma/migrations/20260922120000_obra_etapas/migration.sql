-- CreateTable
CREATE TABLE "obra_etapas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "obraId" TEXT NOT NULL,

    CONSTRAINT "obra_etapas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "obra_etapas_obraId_idx" ON "obra_etapas"("obraId");

ALTER TABLE "obra_etapas" ADD CONSTRAINT "obra_etapas_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: cada obra existente recibe las 10 etapas por defecto, en orden.
INSERT INTO "obra_etapas" (id, name, "order", "isCustom", "updatedAt", "obraId")
SELECT gen_random_uuid(), d.name, d.ord, false, CURRENT_TIMESTAMP, o.id
FROM "obras" o
CROSS JOIN (VALUES
  ('Trabajos preliminares', 1),
  ('Movimiento de tierras y cimentacion', 2),
  ('Estructura', 3),
  ('Mamposteria y paredes', 4),
  ('Cubierta y techo', 5),
  ('Instalaciones electricas', 6),
  ('Instalaciones hidraulicas y sanitarias', 7),
  ('Pisos y revestimientos', 8),
  ('Carpinteria y puertas', 9),
  ('Pintura y acabados', 10)
) AS d(name, ord);

-- AlterTable: contratista_etapas gana un link opcional a la etapa de obra.
ALTER TABLE "contratista_etapas" ADD COLUMN "obraEtapaId" TEXT;
ALTER TABLE "contratista_etapas" ADD CONSTRAINT "contratista_etapas_obraEtapaId_fkey" FOREIGN KEY ("obraEtapaId") REFERENCES "obra_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: order_items gana un link obligatorio a la etapa de obra. Se agrega nullable,
-- se rellena con la primera etapa (orden 1) de la obra de cada pedido existente, y luego se
-- vuelve NOT NULL.
ALTER TABLE "order_items" ADD COLUMN "obraEtapaId" TEXT;

UPDATE "order_items" oi
SET "obraEtapaId" = (
  SELECT oe.id FROM "obra_etapas" oe
  JOIN "orders" o ON o."obraId" = oe."obraId"
  WHERE o.id = oi."orderId" AND oe."order" = 1
  LIMIT 1
);

ALTER TABLE "order_items" ALTER COLUMN "obraEtapaId" SET NOT NULL;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_obraEtapaId_fkey" FOREIGN KEY ("obraEtapaId") REFERENCES "obra_etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "order_items_obraEtapaId_idx" ON "order_items"("obraEtapaId");
CREATE INDEX "contratista_etapas_obraEtapaId_idx" ON "contratista_etapas"("obraEtapaId");
