-- EVERYTHING THAT ALREADY EXISTED, SHE HAS SEEN.
--
-- `seenAt` arrives null, which means "never opened" — and on the day it lands
-- that would mark her entire history as new. It is not: those bookings and
-- requests were answered, emailed about and worked through long before the
-- column existed, and a ledger that opens with forty dots on it teaches her to
-- ignore the dot before she has used it once.
--
-- So the line is drawn HERE. Everything up to this migration is seen;
-- everything after it is genuinely new, and the mark means what it says from
-- the first day it is shown.
UPDATE "Booking" SET "seenAt" = now() WHERE "seenAt" IS NULL;
UPDATE "ServiceRequest" SET "seenAt" = now() WHERE "seenAt" IS NULL;
