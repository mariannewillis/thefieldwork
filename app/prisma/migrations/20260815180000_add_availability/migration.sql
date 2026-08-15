-- Marianne's diary decides what a visitor is allowed to ask for.
--
-- HAND-WRITTEN, because one column has to change its mind about being NOT NULL
-- and the reasoning for what fills it belongs beside the statement that does it.
--
-- NOTHING HERE IS DESTRUCTIVE. Every column added is nullable or has a default;
-- no row is deleted; no existing value is overwritten. Booking 25, the two
-- pending ServiceRequests, workshops `the-long-attention` and `lorem-ipsum`,
-- and course `ifr-course` with its three dates all come out exactly as they
-- went in — the two requests keep their typed sentences and get no slot,
-- because they never chose one and inventing one would put a time in her diary
-- that nobody agreed to.

-- ── what an offering takes out of the diary ──────────────────────────────────
--
-- Zero, not a guessed hour. A margin the portal invented would silently refuse
-- mornings she is free for, and she would have no way of knowing why. Zero says
-- the true thing about a workshop nobody has set a margin on: it takes the
-- hours it takes and no more. The forms ask.
ALTER TABLE "Workshop" ADD COLUMN "marginBeforeMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Workshop" ADD COLUMN "marginAfterMinutes"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Workshop" ADD COLUMN "blocksWholeDay"      BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Course" ADD COLUMN "marginBeforeMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN "marginAfterMinutes"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Course" ADD COLUMN "blocksWholeDay"      BOOLEAN NOT NULL DEFAULT false;

-- ── when she will do a service ───────────────────────────────────────────────
--
-- Monday to Friday, nine to five, no travel buffer, a day's notice. These are
-- DEFAULTS AND NOT CLAIMS, and the alternative was worse in both directions: an
-- empty day-set would leave every service on the site offering nothing the
-- moment this migration ran, and a service that offers nothing is a form nobody
-- can use. The portal's own form opens on these figures and says in as many
-- words that they are a starting point.
ALTER TABLE "Service" ADD COLUMN "availableDays"       INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5];
ALTER TABLE "Service" ADD COLUMN "availableFrom"       TEXT      NOT NULL DEFAULT '09:00';
ALTER TABLE "Service" ADD COLUMN "availableTo"         TEXT      NOT NULL DEFAULT '17:00';
ALTER TABLE "Service" ADD COLUMN "travelBufferMinutes" INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "minimumNoticeHours"  INTEGER   NOT NULL DEFAULT 24;

-- ── the slot a request holds ─────────────────────────────────────────────────
--
-- Instants, in UTC, as everything with a time on it in this database is. The
-- clocks go back on 25 October and a naive local-time store would move every
-- autumn slot by an hour on the morning it happened.
ALTER TABLE "ServiceRequest" ADD COLUMN "slotStart" TIMESTAMP(3);
ALTER TABLE "ServiceRequest" ADD COLUMN "slotEnd"   TIMESTAMP(3);

CREATE INDEX "ServiceRequest_slotStart_idx" ON "ServiceRequest"("slotStart");

-- `preferredTime` STOPS BEING REQUIRED, and this is the one statement here that
-- changes the meaning of a column that already had one.
--
-- Somebody who picks ten o'clock on Thursday from the calendar writes no
-- sentence, and filling this in with "Thursday at 10:00" would be a second copy
-- of `slotStart` in worse words — two facts to keep in step, and the one nobody
-- was looking at would be the one on the screen. So it goes null on that path
-- and stays filled on the path that still asks in words: a service with no days
-- set, or one whose next sixty days are full.
--
-- DROPPING NOT NULL LOSES NOTHING. Every row that has a sentence keeps it; the
-- operator's requests 3 and 4 are untouched and still list, still show their own
-- words, and are still approvable.
ALTER TABLE "ServiceRequest" ALTER COLUMN "preferredTime" DROP NOT NULL;

-- ── time she has taken out of her own diary ──────────────────────────────────
CREATE TABLE "PersonalBlock" (
  "id"        SERIAL       NOT NULL,
  "startsAt"  TIMESTAMP(3) NOT NULL,
  "endsAt"    TIMESTAMP(3) NOT NULL,
  "reason"    TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PersonalBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonalBlock_startsAt_idx" ON "PersonalBlock"("startsAt");

-- A block that ends before it starts is not a short block, it is a typo. The
-- form refuses it with a sentence; this refuses it whatever wrote the row,
-- because a rule only the application keeps is one careless write away from
-- being kept by nobody.
ALTER TABLE "PersonalBlock" ADD CONSTRAINT "PersonalBlock_ends_after_start"
  CHECK ("endsAt" > "startsAt");

-- ── her calendar subscription address ────────────────────────────────────────
--
-- In the clear, unlike every other token in this schema, because Outlook and
-- Google want an address she can look up and paste again months later and a
-- hash cannot produce one. What makes that acceptable is what it can do: a GET
-- that renders her diary as text, writes nothing, reaches no part of the
-- portal, and can be rotated from the Calendar screen at any time.
--
-- Null until she asks for one. A feed nobody wanted should not exist.
ALTER TABLE "AdminUser" ADD COLUMN "calendarFeedToken" TEXT;

CREATE UNIQUE INDEX "AdminUser_calendarFeedToken_key" ON "AdminUser"("calendarFeedToken");
