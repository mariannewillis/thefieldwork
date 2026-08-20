-- CreateEnum
CREATE TYPE "FlyerLayout" AS ENUM ('one', 'three');

-- CreateTable
CREATE TABLE "Flyer" (
    "id" SERIAL NOT NULL,
    "workshopId" INTEGER,
    "courseId" INTEGER,
    "serviceId" INTEGER,
    "layout" "FlyerLayout" NOT NULL DEFAULT 'one',
    "eyebrow" TEXT,
    "headline" TEXT,
    "blurb" TEXT,
    "footnote" TEXT,
    "groundRef" TEXT,
    "detailRef" TEXT,
    "placeRef" TEXT,
    "groundFocus" INTEGER NOT NULL DEFAULT 38,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flyer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Flyer_workshopId_key" ON "Flyer"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "Flyer_courseId_key" ON "Flyer"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Flyer_serviceId_key" ON "Flyer"("serviceId");

-- AddForeignKey
ALTER TABLE "Flyer" ADD CONSTRAINT "Flyer_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flyer" ADD CONSTRAINT "Flyer_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flyer" ADD CONSTRAINT "Flyer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
