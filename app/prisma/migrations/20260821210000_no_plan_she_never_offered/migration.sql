-- A DEPOSIT IS NOT A TWO-PAYMENT PLAN. Undoing an inference two migrations back.
--
-- Caught by rehearsing this deploy against a copy of the LIVE schema carrying
-- real rows, which is the only way it could have been caught: the chain is
-- invisible on a database that already has the new columns.
--
-- WHAT WENT WRONG, in two steps that were each right on their own:
--
--   20260821140000_instalments  set `instalments = 2` on every course with a
--     deposit. Correct AT THE TIME: under that model the deposit WAS instalment
--     number one, so "2 payments" described exactly what the course already did.
--
--   20260821180000_pay_choices  then read `instalments > 1` as "this course was
--     on a plan" and ticked `planOffered`. Also reasonable — except that the
--     meaning of `instalments` had changed in the very same batch. It now counts
--     EQUAL shares, and the deposit is a separate offer.
--
-- The result on a live database: a £1,200 course with a £400 deposit comes back
-- from the redeploy advertising "£600 now, £600 in 30 days" — an arrangement
-- Marianne never agreed to, on a public page, taking real money from whoever
-- picks it. Nothing in the application would have looked wrong; the page would
-- simply have had a third option on it.
--
-- WHY UNDOING IS SAFE. Payment plans have never been deployed — the feature was
-- written today and this is its first deploy — so no course anywhere has ever
-- genuinely been put on one, and no booking can be paying by one. The guard
-- below says that in SQL rather than trusting the reasoning: a course is only
-- corrected when NO booking against it has a single Instalment row. The day she
-- deliberately sets up a two-payment plan, this migration has long since run and
-- will never run again.

UPDATE "Course"
   SET "planOffered" = false,
       "instalments" = 1
 WHERE "planOffered" = true
   AND "instalments" = 2
   AND "depositGBP" IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
       FROM "Booking" b
       JOIN "Instalment" i ON i."bookingId" = b.id
      WHERE b."courseId" = "Course".id
   );
