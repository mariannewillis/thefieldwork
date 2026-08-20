-- CreateEnum
CREATE TYPE "PageItemTone" AS ENUM ('auto', 'pink', 'gold');

-- AlterTable
ALTER TABLE "PageItem" ADD COLUMN     "tone" "PageItemTone" NOT NULL DEFAULT 'auto';
