-- CreateEnum
CREATE TYPE "ServiceLocation" AS ENUM ('venue', 'travels');

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "location" "ServiceLocation" NOT NULL,
    "venueName" TEXT,
    "addressLines" TEXT,
    "postcode" TEXT,
    "gettingThere" TEXT,
    "venueId" INTEGER,
    "baseAddressLines" TEXT,
    "basePostcode" TEXT,
    "travelRadiusMiles" INTEGER,
    "travelNote" TEXT,
    "priceGBP" INTEGER NOT NULL,
    "heroImage" TEXT,
    "heroAlt" TEXT,
    "filmUrl" TEXT,
    "filmPoster" TEXT,
    "filmDuration" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceImage" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_published_idx" ON "Service"("published");

-- CreateIndex
CREATE INDEX "ServiceImage_serviceId_position_idx" ON "ServiceImage"("serviceId", "position");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one branch of Service.location is in force.
--
-- Hand-written, because Prisma has no way to say this: the enum and the two
-- sets of columns are one fact spread over ten of them, and without a
-- constraint there is a row that says `travels` and carries a venue address —
-- a service whose page would have two answers to "where is this?". The action
-- empties the branch not in force on every save; this is what makes that true
-- of rows the action did not write, which is the same reasoning that puts
-- Booking's relation on Restrict rather than trusting the application alone.
ALTER TABLE "Service" ADD CONSTRAINT "Service_location_branch" CHECK (
  (
    "location" = 'venue'
    AND "venueName" IS NOT NULL
    AND "addressLines" IS NOT NULL
    AND "postcode" IS NOT NULL
    AND "gettingThere" IS NOT NULL
    AND "baseAddressLines" IS NULL
    AND "basePostcode" IS NULL
    AND "travelRadiusMiles" IS NULL
    AND "travelNote" IS NULL
  ) OR (
    "location" = 'travels'
    AND "baseAddressLines" IS NOT NULL
    AND "basePostcode" IS NOT NULL
    AND "travelRadiusMiles" IS NOT NULL
    AND "travelNote" IS NOT NULL
    AND "venueName" IS NULL
    AND "addressLines" IS NULL
    AND "postcode" IS NULL
    AND "gettingThere" IS NULL
    AND "venueId" IS NULL
  )
);
