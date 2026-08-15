-- A session can be approved, and an approved session can be paid for.
--
-- HAND-WRITTEN, because the end of it replaces a CHECK constraint Prisma cannot
-- express. `Booking_one_offering` was deliberately written as a SUM so that
-- services could arrive as one more term in it rather than as a rewritten
-- expression (D-23), and that is exactly what happens below.
--
-- Nothing here is destructive. Every column added is nullable; every existing
-- Booking keeps naming the workshop or the course it always named, and every
-- existing ServiceRequest stays `pending` with its new columns empty. Booking
-- 25 is not touched, and neither are the two pending requests.

-- ── two more things a webhook can have done ──────────────────────────────────
ALTER TYPE "StripeEventOutcome" ADD VALUE 'approvalGone';
ALTER TYPE "StripeEventOutcome" ADD VALUE 'duplicatePayment';

-- ── what she answered ────────────────────────────────────────────────────────
--
-- `payBy` is a TIMESTAMP and not a DATE, unlike `Booking.balanceDueAt`. The
-- window is 48 hours from the moment she pressed approve, so a DATE would give
-- somebody approved on Tuesday evening the rest of Tuesday and nothing else.
ALTER TABLE "ServiceRequest" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "ServiceRequest" ADD COLUMN "approvedPence" INTEGER;
ALTER TABLE "ServiceRequest" ADD COLUMN "agreedTime" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "payTokenHash" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "payBy" TIMESTAMP(3);
ALTER TABLE "ServiceRequest" ADD COLUMN "declinedAt" TIMESTAMP(3);
ALTER TABLE "ServiceRequest" ADD COLUMN "declineNote" TEXT;

CREATE UNIQUE INDEX "ServiceRequest_payTokenHash_key" ON "ServiceRequest"("payTokenHash");

-- ── a Booking that can point at a service ────────────────────────────────────
ALTER TABLE "Booking" ADD COLUMN "serviceId" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "serviceRequestId" INTEGER;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceRequestId_fkey"
  FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Booking_serviceRequestId_key" ON "Booking"("serviceRequestId");
CREATE INDEX "Booking_serviceId_status_idx" ON "Booking"("serviceId", "status");

-- ── a booking is still for exactly one offering ──────────────────────────────
--
-- Dropped and recreated rather than edited, because a CHECK has no ALTER. The
-- shape is unchanged: one more CASE in the same sum.
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_one_offering";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_one_offering" CHECK (
  (CASE WHEN "workshopId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "courseId"   IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "serviceId"  IS NULL THEN 0 ELSE 1 END) = 1
);

-- ── and a session booking comes from an approval ─────────────────────────────
--
-- A workshop place is bought off the page by anybody. A session is bought only
-- by the person Marianne approved, at the figure she approved, through the one
-- link she sent — so a session booking with no approval behind it would be
-- money taken for something nobody agreed to, and a booking pointing at an
-- approval but at no service would be an approval paid for twice over.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_service_from_request" CHECK (
  ("serviceId" IS NULL) = ("serviceRequestId" IS NULL)
);
