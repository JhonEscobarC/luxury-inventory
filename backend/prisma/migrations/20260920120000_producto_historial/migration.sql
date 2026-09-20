CREATE TYPE "ProductoHistorialTipo" AS ENUM ('CREADO', 'INGRESO', 'USO', 'EDITADO');

CREATE TABLE "producto_historial" (
    "id" TEXT NOT NULL,
    "tipo" "ProductoHistorialTipo" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2),
    "cantidadResultante" DECIMAL(12,2),
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,

    CONSTRAINT "producto_historial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "producto_historial_productId_idx" ON "producto_historial"("productId");
ALTER TABLE "producto_historial" ADD CONSTRAINT "producto_historial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill de lo que ya existe: creacion de cada producto y cada uso registrado.
INSERT INTO "producto_historial" ("id", "tipo", "descripcion", "createdAt", "productId")
SELECT md5(random()::text || clock_timestamp()::text || p."id"), 'CREADO', 'Producto agregado al inventario', p."createdAt", p."id"
FROM "products" p;

INSERT INTO "producto_historial" ("id", "tipo", "descripcion", "cantidad", "userName", "createdAt", "productId")
SELECT md5(random()::text || clock_timestamp()::text || m."id"), 'USO', 'Uso: ' || m."reason", -m."quantity", u."name", m."createdAt", m."productId"
FROM "material_usos" m LEFT JOIN "users" u ON u."id" = m."userId";
