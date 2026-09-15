-- Permite asignar un proveedor distinto a cada material del pedido, en vez de uno
-- solo para todo el pedido. order_items.proveedorId queda null cuando el pedido usa
-- un unico proveedor (Order.proveedorId sigue siendo la fuente en ese caso).
ALTER TABLE "order_items" ADD COLUMN "proveedorId" TEXT;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "order_items_proveedorId_idx" ON "order_items"("proveedorId");
