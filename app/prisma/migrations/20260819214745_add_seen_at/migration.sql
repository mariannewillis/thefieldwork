-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "seenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "seenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_seenAt_idx" ON "Booking"("seenAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_seenAt_idx" ON "ServiceRequest"("seenAt");
