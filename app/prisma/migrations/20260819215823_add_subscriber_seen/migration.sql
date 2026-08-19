-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "seenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Subscriber_seenAt_idx" ON "Subscriber"("seenAt");

-- EVERY SUBSCRIBER SHE ALREADY HAS, SHE HAS SEEN.
--
-- The same line the bookings and requests columns drew when they landed: a
-- list that opens with forty dots on it teaches her to ignore the dot before
-- she has used it once. Everything up to here is seen; everything after is
-- genuinely new.
UPDATE "Subscriber" SET "seenAt" = now() WHERE "seenAt" IS NULL;
