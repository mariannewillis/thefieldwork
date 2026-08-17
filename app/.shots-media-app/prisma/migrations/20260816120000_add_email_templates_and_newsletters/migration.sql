-- What the site sends: the wording she owns, and the letter she writes.
--
-- HAND-FINISHED. The DDL below is Prisma's; the seeding under it is not, and
-- the reasoning for what goes in belongs beside the statements that put it
-- there.
--
-- NOTHING HERE IS DESTRUCTIVE. Five new tables and four new enums. Not one
-- existing table is altered and not one existing row is read, let alone
-- written. Booking 25, ServiceRequests 3, 4 and 55, workshops
-- `the-long-attention` and `lorem-ipsum`, course `ifr-course`, services
-- `1-hour-restructing` and `david-morgan`, and every credentialVersion come
-- out of this migration exactly as they went in.
--
-- ONE MIGRATION FOR BOTH PASSES. The email-templates screen is built now and
-- the newsletter screens next; laying the whole surface down at once means the
-- second pass never has to alter a table the first pass's screen is live
-- against. `prisma/schema.prisma` carries the reasoning per model.

-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('draft', 'sent');

-- CreateEnum
CREATE TYPE "NewsletterBlockKind" AS ENUM ('heading', 'paragraph', 'image', 'offerings', 'button');

-- CreateEnum
CREATE TYPE "AttachmentDelivery" AS ENUM ('attached', 'linked');

-- CreateEnum
CREATE TYPE "NewsletterSendOutcome" AS ENUM ('pending', 'delivered', 'failed');

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT,
    "opening" TEXT,
    "signOff" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT NOT NULL,
    "mastheadLabel" TEXT NOT NULL DEFAULT 'The monthly letter',
    "status" "NewsletterStatus" NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "duplicatedFromId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterBlock" (
    "id" SERIAL NOT NULL,
    "newsletterId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "NewsletterBlockKind" NOT NULL,
    "text" TEXT,
    "imageBasename" TEXT,
    "caption" TEXT,
    "alt" TEXT,
    "href" TEXT,
    "count" INTEGER,

    CONSTRAINT "NewsletterBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterAttachment" (
    "id" SERIAL NOT NULL,
    "newsletterId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "storedAs" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "delivery" "AttachmentDelivery" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSend" (
    "id" SERIAL NOT NULL,
    "newsletterId" INTEGER NOT NULL,
    "subscriberId" INTEGER,
    "email" TEXT NOT NULL,
    "outcome" "NewsletterSendOutcome" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_unsubscribeToken_key" ON "Subscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "Subscriber_confirmedAt_unsubscribedAt_idx" ON "Subscriber"("confirmedAt", "unsubscribedAt");

-- CreateIndex
CREATE INDEX "Newsletter_status_sentAt_idx" ON "Newsletter"("status", "sentAt");

-- CreateIndex
CREATE INDEX "NewsletterBlock_newsletterId_idx" ON "NewsletterBlock"("newsletterId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterBlock_newsletterId_position_key" ON "NewsletterBlock"("newsletterId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterAttachment_storedAs_key" ON "NewsletterAttachment"("storedAs");

-- CreateIndex
CREATE INDEX "NewsletterAttachment_newsletterId_idx" ON "NewsletterAttachment"("newsletterId");

-- CreateIndex
CREATE INDEX "NewsletterSend_newsletterId_outcome_idx" ON "NewsletterSend"("newsletterId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSend_newsletterId_subscriberId_key" ON "NewsletterSend"("newsletterId", "subscriberId");

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_duplicatedFromId_fkey" FOREIGN KEY ("duplicatedFromId") REFERENCES "Newsletter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterBlock" ADD CONSTRAINT "NewsletterBlock_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterAttachment" ADD CONSTRAINT "NewsletterAttachment_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSend" ADD CONSTRAINT "NewsletterSend_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSend" ADD CONSTRAINT "NewsletterSend_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── the nine messages she may reword ─────────────────────────────────────────
--
-- One row each, WITH EVERY SLOT NULL. Null means "as the app writes it", so
-- these nine rows change nothing about what anybody receives: the screen exists
-- from the first deploy, and until she saves something the app's own wording —
-- which knows a workshop from a course from a paid session, and picks the true
-- sentence for each — is what goes out.
--
-- The wording the SCREEN opens showing lives in src/lib/email/wording.ts beside
-- each template's placeholders. Copying it into this file as a default would
-- put the same nine sentences in two places, and the day one of them changed
-- the other would be quietly wrong.
--
-- The keys are the nine in EMAIL_TEMPLATE_KEYS, in the order the screen lists
-- them. ON CONFLICT DO NOTHING so re-running this against a database that has
-- them is a no-op rather than an error.
INSERT INTO "EmailTemplate" ("key", "updatedAt") VALUES
  ('bookingConfirmation',    CURRENT_TIMESTAMP),
  ('balancePaid',            CURRENT_TIMESTAMP),
  ('cancellation',           CURRENT_TIMESTAMP),
  ('refundIssued',           CURRENT_TIMESTAMP),
  ('cannotHonour',           CURRENT_TIMESTAMP),
  ('requestAcknowledgement', CURRENT_TIMESTAMP),
  ('sessionApproved',        CURRENT_TIMESTAMP),
  ('sessionDeclined',        CURRENT_TIMESTAMP),
  ('passwordReset',          CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ── two subscribers, so sending can be tested against real inboxes ───────────
--
-- The developer's own addresses, confirmed, so the first newsletter send has
-- somewhere true to go. Marianne's own address is deliberately NOT here: her
-- mailbox is the client's, the send loop is not written yet, and seeding a live
-- recipient into a table a future test will iterate is how a client receives a
-- draft.
--
-- The unsubscribe token is two UUIDs with the hyphens taken out — 64 hex
-- characters from `gen_random_uuid()`, which is in core Postgres and needs no
-- extension. Every token minted by the app afterwards comes from
-- `randomBytes(32)` as every other bearer token in this app does; these two
-- only have to be unguessable and unique, and they are.
INSERT INTO "Subscriber" ("email", "name", "confirmedAt", "unsubscribeToken") VALUES
  (
    'nagrom.1990@gmail.com',
    'David',
    CURRENT_TIMESTAMP,
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  (
    'david.morgan@gotribe.org',
    'David Morgan',
    CURRENT_TIMESTAMP,
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  )
ON CONFLICT ("email") DO NOTHING;
