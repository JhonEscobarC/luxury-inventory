-- AlterTable: abonos a proveedor y cuotas de contratista ganan un metodo de pago opcional
-- (nulo en los registros existentes), necesario para poder aproximar Caja/Bancos en el
-- nuevo reporte de plan de cuentas.
ALTER TABLE "abonos" ADD COLUMN "metodoPago" "MetodoPago";
ALTER TABLE "contratista_etapas" ADD COLUMN "metodoPago" "MetodoPago";
