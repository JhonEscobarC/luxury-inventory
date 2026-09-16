-- Se elimina el concepto de "stock minimo / stock bajo": el inventario es para uso
-- interno por obra (no para venta), y si algo se agota se resuelve con un nuevo pedido,
-- sin importar cuanto quede en existencia.
ALTER TABLE "products" DROP COLUMN "minStock";
