-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('paid', 'cancelledRefunded', 'cancelledUnrefunded');

-- CreateEnum
CREATE TYPE "CancelReason" AS ENUM ('buyer', 'soldOut');

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "workshopId" INTEGER NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "places" INTEGER NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "BookingStatus" NOT NULL,
    "cancellationTokenHash" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" "CancelReason",
    "refundId" TEXT,
    "refundedPence" INTEGER,
    "refundedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_stripeSessionId_key" ON "Booking"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_cancellationTokenHash_key" ON "Booking"("cancellationTokenHash");

-- CreateIndex
CREATE INDEX "Booking_workshopId_status_idx" ON "Booking"("workshopId", "status");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
