-- CreateEnum
CREATE TYPE "PageState" AS ENUM ('draft', 'live');

-- CreateEnum
CREATE TYPE "PageSectionKind" AS ENUM ('beat', 'free');

-- CreateEnum
CREATE TYPE "PageAnchor" AS ENUM ('left', 'centre', 'right');

-- CreateEnum
CREATE TYPE "PageBlockKind" AS ENUM ('pool', 'onplate', 'picture');

-- CreateEnum
CREATE TYPE "PageItemKind" AS ENUM ('eyebrow', 'heading', 'paragraph', 'bullets', 'link', 'button');

-- CreateTable
CREATE TABLE "PageSection" (
    "id" SERIAL NOT NULL,
    "page" TEXT NOT NULL,
    "state" "PageState" NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "PageSectionKind" NOT NULL,
    "beatKey" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "imageRef" TEXT,
    "imageAlt" TEXT,

    CONSTRAINT "PageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageBlock" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "PageBlockKind" NOT NULL,
    "placement" "PageAnchor" NOT NULL DEFAULT 'left',
    "imageRef" TEXT,
    "imageAlt" TEXT,

    CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageItem" (
    "id" SERIAL NOT NULL,
    "blockId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "PageItemKind" NOT NULL,
    "text" TEXT,
    "href" TEXT,

    CONSTRAINT "PageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageText" (
    "id" SERIAL NOT NULL,
    "page" TEXT NOT NULL,
    "state" "PageState" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PageText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagePicture" (
    "id" SERIAL NOT NULL,
    "page" TEXT NOT NULL,
    "state" "PageState" NOT NULL,
    "key" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "brightness" DOUBLE PRECISION,
    "focalX" TEXT,
    "focalY" TEXT,

    CONSTRAINT "PagePicture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageSection_page_state_position_idx" ON "PageSection"("page", "state", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PageSection_page_state_beatKey_key" ON "PageSection"("page", "state", "beatKey");

-- CreateIndex
CREATE INDEX "PageBlock_sectionId_position_idx" ON "PageBlock"("sectionId", "position");

-- CreateIndex
CREATE INDEX "PageItem_blockId_position_idx" ON "PageItem"("blockId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PageText_page_state_key_key" ON "PageText"("page", "state", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PagePicture_page_state_key_key" ON "PagePicture"("page", "state", "key");

-- AddForeignKey
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PageSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageItem" ADD CONSTRAINT "PageItem_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "PageBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
