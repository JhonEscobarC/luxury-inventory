-- CreateEnum
CREATE TYPE "FormaPago" AS ENUM ('CONTADO', 'CREDITO');

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categorias_name_key" ON "categorias"("name");

-- AlterTable: nuevas columnas (nullable, sin FK todavia)
ALTER TABLE "orders" ADD COLUMN "formaPago" "FormaPago";
ALTER TABLE "products" ADD COLUMN "categoriaId" TEXT;
ALTER TABLE "order_items" ADD COLUMN "categoriaId" TEXT;

-- Data migration: crear una categoria por cada valor distinto ya usado en products.category,
-- mas algunos ejemplos adicionales (categoria "provisional" hasta que se defina la lista final).
INSERT INTO "categorias" (id, name, "updatedAt")
SELECT gen_random_uuid(), t.name, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT category AS name FROM "products" WHERE category IS NOT NULL
  UNION
  SELECT unnest(ARRAY['Estructural', 'Acabados', 'Electrico', 'Plomeria', 'Ferreteria', 'Herramientas']) AS name
) t
ON CONFLICT (name) DO NOTHING;

-- Reasignar cada producto a su categoria (por nombre) y luego eliminar la columna de texto libre.
UPDATE "products" p SET "categoriaId" = c.id FROM "categorias" c WHERE c.name = p.category;

DROP INDEX IF EXISTS "products_category_idx";
ALTER TABLE "products" DROP COLUMN "category";

-- Ejemplos: asignar categoria a materiales de pedidos ya existentes con nombres reconocibles.
UPDATE "order_items" SET "categoriaId" = (SELECT id FROM "categorias" WHERE name = 'Estructural')
WHERE description IN (
  'Bloque de concreto', 'Cemento gris 50kg', 'Varilla 3/8',
  'Cemento Gris Tipo I', 'Varilla de Refuerzo 3/8 pulg', 'Bloque de Concreto 15cm', 'Arena de Pena'
);
UPDATE "order_items" SET "categoriaId" = (SELECT id FROM "categorias" WHERE name = 'Acabados')
WHERE description IN ('Pintura exterior 20L', 'Ceramica para pisos', 'Pintura Blanca Interior');

-- Indices y llaves foraneas
CREATE INDEX "products_categoriaId_idx" ON "products"("categoriaId");
ALTER TABLE "products" ADD CONSTRAINT "products_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
