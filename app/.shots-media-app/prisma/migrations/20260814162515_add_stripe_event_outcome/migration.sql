-- CreateEnum
CREATE TYPE "StripeEventOutcome" AS ENUM ('booked', 'noPlace', 'workshopGone');

-- AlterTable
ALTER TABLE "StripeEvent" ADD COLUMN     "outcome" "StripeEventOutcome";
