-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "awb" TEXT,
ADD COLUMN     "courier" TEXT,
ADD COLUMN     "labelUrl" TEXT,
ADD COLUMN     "shipmentId" TEXT,
ADD COLUMN     "shippingStatus" TEXT NOT NULL DEFAULT 'not_shipped',
ADD COLUMN     "trackingUrl" TEXT;
