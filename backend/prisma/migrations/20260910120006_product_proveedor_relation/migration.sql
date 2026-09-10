-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "supplier",
ADD COLUMN     "proveedorId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

