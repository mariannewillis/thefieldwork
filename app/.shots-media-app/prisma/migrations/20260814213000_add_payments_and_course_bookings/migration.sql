-- Payments become rows, and a Booking learns to serve a course.
--
-- HAND-WRITTEN, because the middle of it is a data migration and the end of it
-- is a CHECK constraint Prisma cannot express. The order below is the whole
-- correctness of the thing: every Booking that already exists gets its Payment
-- row BEFORE the columns that row is made from are dropped.
--
-- Nothing here is destructive to a fact. `amountPence` is renamed rather than
-- replaced; the session, the payment intent, the currency and the refund move
-- to `Payment` and are read back out of it. Booking 25 — a real place, really
-- paid for — comes out of this as one booking and one payment of kind `full`,
-- which is what it always was.

-- ── what a payment was for ───────────────────────────────────────────────────
CREATE TYPE "PaymentKind" AS ENUM ('deposit', 'balance', 'full');

-- ── three more things a webhook can have done ────────────────────────────────
ALTER TYPE "StripeEventOutcome" ADD VALUE 'courseGone';
ALTER TYPE "StripeEventOutcome" ADD VALUE 'settled';
ALTER TYPE "StripeEventOutcome" ADD VALUE 'balanceUnwanted';

-- ── money that actually arrived ──────────────────────────────────────────────
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "refundId" TEXT,
    "refundedPence" INTEGER,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");
CREATE UNIQUE INDEX "Payment_bookingId_kind_key" ON "Payment"("bookingId", "kind");
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── when the balance is due, per course ──────────────────────────────────────
ALTER TABLE "Course" ADD COLUMN "balanceDueAt" DATE;

-- ── a Booking that can point at either kind ──────────────────────────────────
ALTER TABLE "Booking" ALTER COLUMN "workshopId" DROP NOT NULL;
ALTER TABLE "Booking" ADD COLUMN "courseId" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "balanceDueAt" DATE;
ALTER TABLE "Booking" ADD COLUMN "balanceTokenHash" TEXT;

-- Renamed, not replaced. It always held the whole cost of the booking; on a
-- course bought with a deposit that is no longer the same figure as the money
-- received, and the old name would have read as a lie on every such row.
ALTER TABLE "Booking" RENAME COLUMN "amountPence" TO "totalPence";

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Booking_balanceTokenHash_key" ON "Booking"("balanceTokenHash");
CREATE INDEX "Booking_courseId_status_idx" ON "Booking"("courseId", "status");

-- ── every booking there has ever been becomes one payment of kind `full` ─────
--
-- THE POINT OF DOING IT HERE rather than in the reading code: after this
-- migration there is no such thing as a booking from before payments were rows.
-- Nothing downstream has to carry a branch for one, and nothing can forget to.
--
-- Every existing row is a workshop booking paid at once, which is exactly what
-- `full` means. `paidAt` is the moment the money landed and is copied straight
-- across; `createdAt` follows it rather than being stamped now, so the payment
-- is not recorded as having arrived on the day of this deploy.
INSERT INTO "Payment" (
  "bookingId", "kind", "amountPence", "currency",
  "stripeSessionId", "stripePaymentIntentId", "paidAt",
  "refundId", "refundedPence", "refundedAt", "createdAt", "updatedAt"
)
SELECT
  "id", 'full', "totalPence", "currency",
  "stripeSessionId", "stripePaymentIntentId", "paidAt",
  "refundId", "refundedPence", "refundedAt", "paidAt", now()
FROM "Booking";

-- ── and the columns it was made from go ──────────────────────────────────────
DROP INDEX "Booking_stripeSessionId_key";
ALTER TABLE "Booking" DROP COLUMN "stripeSessionId";
ALTER TABLE "Booking" DROP COLUMN "stripePaymentIntentId";
ALTER TABLE "Booking" DROP COLUMN "currency";
ALTER TABLE "Booking" DROP COLUMN "refundId";
ALTER TABLE "Booking" DROP COLUMN "refundedPence";
ALTER TABLE "Booking" DROP COLUMN "refundedAt";

-- ── a booking is for exactly one offering ────────────────────────────────────
--
-- Hand-written, because Prisma has no way to say it. Without this there is a
-- row pointing at a workshop AND a course — two answers to "what did they buy?"
-- — and a row pointing at neither, which is money against nothing at all. Same
-- reasoning as `Service_location_branch`: a rule only the application keeps is
-- a rule one careless write away from being kept by nobody.
--
-- Written as a count rather than as a pair of AND/OR branches so that adding
-- services later is one more column in the sum and not a rewritten expression.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_one_offering" CHECK (
  (CASE WHEN "workshopId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "courseId"   IS NULL THEN 0 ELSE 1 END) = 1
);
