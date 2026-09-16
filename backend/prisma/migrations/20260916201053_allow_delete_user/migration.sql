-- Permite eliminar un usuario sin arrastrar su historial de pedidos, usos de material
-- o abonos: esos registros conservan sus datos (Historial ya guarda el nombre como
-- texto plano), solo pierden el vinculo al usuario que los creo (queda null).

ALTER TABLE "orders" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "material_usos" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "orders" DROP CONSTRAINT "orders_createdById_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" DROP CONSTRAINT "orders_assignedById_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "abonos" DROP CONSTRAINT "abonos_createdById_fkey";
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "abonos_cliente" DROP CONSTRAINT "abonos_cliente_createdById_fkey";
ALTER TABLE "abonos_cliente" ADD CONSTRAINT "abonos_cliente_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "material_usos" DROP CONSTRAINT "material_usos_userId_fkey";
ALTER TABLE "material_usos" ADD CONSTRAINT "material_usos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
