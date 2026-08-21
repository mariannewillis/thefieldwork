-- THREE WAYS TO PAY, TICKED PER COURSE (operator, 2026-08-21).
--
-- Written by hand rather than by `prisma migrate dev`, which is interactive and
-- will not run non-interactively against a database with rows in it.
--
-- THE BACKFILL IS THE POINT OF THIS FILE. Adding the columns with their
-- defaults would silently un-offer every arrangement Marianne has already set
-- up: a course sold on a deposit since June would come back tomorrow as
-- full-price-only, and the difference would be found out by a client. So the
-- ticks are set from what each course ALREADY DOES.

ALTER TABLE "Course"
  ADD COLUMN "payInFull"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "depositOffered"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "planOffered"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "planInterestBps" INTEGER NOT NULL DEFAULT 0;

-- A course that was taking a deposit was OFFERING a deposit, and its buyers
-- were not being offered the whole price — the panel showed one button. So the
-- tick goes on the deposit and OFF the full price, which is exactly what that
-- course did yesterday.
UPDATE "Course"
   SET "depositOffered" = true,
       "payInFull"      = false
 WHERE "depositGBP" IS NOT NULL
   AND "depositGBP" > 0
   AND "depositGBP" < "priceGBP"
   AND "balanceDueAt" IS NOT NULL;

-- And a course already set to more than one payment was on a plan. `instalments`
-- counted the deposit as its first part under the old arithmetic; it counts an
-- equal share now, which changes what a FUTURE booking is put on and nothing
-- about a plan already written down. Existing Instalment rows are the
-- agreement they were made under and are not touched.
UPDATE "Course"
   SET "planOffered" = true
 WHERE "instalments" > 1;
