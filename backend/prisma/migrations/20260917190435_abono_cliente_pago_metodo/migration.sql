-- Agrega forma de pago y metodo de pago a los abonos de cliente. Nulos en los
-- registros existentes (se creaban antes de que estos campos existieran).
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA');

ALTER TABLE "abonos_cliente" ADD COLUMN "formaPago" "FormaPago";
ALTER TABLE "abonos_cliente" ADD COLUMN "metodoPago" "MetodoPago";
