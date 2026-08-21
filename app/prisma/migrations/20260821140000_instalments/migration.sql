-- Payments in instalments.
--
-- A course could be bought on a deposit with one balance to follow. It can now
-- be bought on a plan of any number, and the old shape is simply the plan with
-- two parts in it — an existing course with a deposit reads as `instalments = 2`
-- and behaves exactly as it always has.
--
-- `instalments` DEFAULTS TO 1 and not to 2, because 1 is what a course with no
-- deposit is: the whole price at booking. The backfill below is what makes the
-- courses that DO have a deposit read as two.
--
-- DAYS AND NOT MONTHS for the cadence: a month is not a length, and a course
-- bought on the 31st has no 31st to be due on in four of them.

ALTER TABLE "Course" ADD COLUMN "instalments" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Course" ADD COLUMN "instalmentEveryDays" INTEGER NOT NULL DEFAULT 30;

-- A course that takes a deposit has always been a two-payment plan. Saying so
-- here means nothing about how those courses behave changes.
UPDATE "Course" SET "instalments" = 2 WHERE "depositGBP" IS NOT NULL;

CREATE TABLE "Instalment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "dueAt" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentId" INTEGER,
    "remindedAt" TIMESTAMP(3),

    CONSTRAINT "Instalment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Instalment_paymentId_key" ON "Instalment"("paymentId");
CREATE UNIQUE INDEX "Instalment_bookingId_number_key" ON "Instalment"("bookingId", "number");
CREATE INDEX "Instalment_bookingId_idx" ON "Instalment"("bookingId");
CREATE INDEX "Instalment_paidAt_dueAt_idx" ON "Instalment"("paidAt", "dueAt");

ALTER TABLE "Instalment" ADD CONSTRAINT "Instalment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Instalment" ADD CONSTRAINT "Instalment_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
