-- PAYING IN FULL SURVIVES A DEPOSIT. Correcting the backfill one migration back.
--
-- 20260821180000 turned OFF `payInFull` on every course that had a deposit,
-- reasoning that such a course showed one button yesterday and so was not
-- offering the whole price. That reasoning was right about yesterday and wrong
-- about tomorrow, and the difference was visible on the operator's own
-- `ifr-course`: its balance day is already behind us, so the deposit is no
-- longer a live offer — and with `payInFull` off, the course was left offering
-- nothing but a plan. Yesterday that same course quietly fell back to taking
-- the whole price.
--
-- Under the three ticks, full price is the FALLBACK as well as an option, and
-- an expired arrangement must fall back to it rather than through it. Ticked
-- back on everywhere; she can untick any course she does not want it on.

UPDATE "Course" SET "payInFull" = true WHERE "payInFull" = false;
