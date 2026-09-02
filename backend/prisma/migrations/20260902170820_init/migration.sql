-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BODEGA', 'VENTAS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'DESPACHADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('MANUAL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VENTAS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "supplier" TEXT,
    "minStock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "source" "OrderSource" NOT NULL DEFAULT 'MANUAL',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "waMessageId" TEXT,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "direction" "WhatsAppDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "rawPayload" JSONB,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_logs_waMessageId_key" ON "whatsapp_message_logs"("waMessageId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
