-- CreateEnum
CREATE TYPE "PagePictureShape" AS ENUM ('natural', 'rectangle', 'square', 'circle');

-- AlterTable
ALTER TABLE "PageBlock" ADD COLUMN     "focusX" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "focusY" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "shape" "PagePictureShape" NOT NULL DEFAULT 'natural';

-- AlterTable
ALTER TABLE "PageItem" ADD COLUMN     "align" "PageAnchor";

-- AlterTable
ALTER TABLE "PageSection" ADD COLUMN     "focusY" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "tall" INTEGER NOT NULL DEFAULT 0;
