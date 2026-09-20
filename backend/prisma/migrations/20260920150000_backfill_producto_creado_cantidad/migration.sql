-- Los registros CREADO anteriores no guardaron cantidad. Como no existen otras salidas
-- que los usos, lo agregado en total hasta hoy = stock actual + lo usado.
UPDATE "producto_historial" h
SET "cantidad" = p."quantity" + COALESCE((SELECT SUM(m."quantity") FROM "material_usos" m WHERE m."productId" = p."id"), 0),
    "descripcion" = 'Producto agregado al inventario (total agregado hasta hoy)'
FROM "products" p
WHERE h."productId" = p."id" AND h."tipo" = 'CREADO' AND h."cantidad" IS NULL;
