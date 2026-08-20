-- CreateEnum
CREATE TYPE "OfferingMessageBlockKind" AS ENUM ('heading', 'paragraph', 'image', 'button');

-- CreateTable
CREATE TABLE "OfferingMessage" (
    "id" SERIAL NOT NULL,
    "workshopId" INTEGER,
    "courseId" INTEGER,
    "serviceId" INTEGER,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferingMessageBlock" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "OfferingMessageBlockKind" NOT NULL,
    "text" TEXT,
    "imageBasename" TEXT,
    "caption" TEXT,
    "alt" TEXT,
    "href" TEXT,

    CONSTRAINT "OfferingMessageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferingMessageSend" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "attendeeKey" TEXT NOT NULL,
    "outcome" "NewsletterSendOutcome" NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "OfferingMessageSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfferingMessage_workshopId_idx" ON "OfferingMessage"("workshopId");

-- CreateIndex
CREATE INDEX "OfferingMessage_courseId_idx" ON "OfferingMessage"("courseId");

-- CreateIndex
CREATE INDEX "OfferingMessage_serviceId_idx" ON "OfferingMessage"("serviceId");

-- CreateIndex
CREATE INDEX "OfferingMessageBlock_messageId_idx" ON "OfferingMessageBlock"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferingMessageBlock_messageId_position_key" ON "OfferingMessageBlock"("messageId", "position");

-- CreateIndex
CREATE INDEX "OfferingMessageSend_messageId_outcome_idx" ON "OfferingMessageSend"("messageId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "OfferingMessageSend_messageId_email_key" ON "OfferingMessageSend"("messageId", "email");

-- AddForeignKey
ALTER TABLE "OfferingMessage" ADD CONSTRAINT "OfferingMessage_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingMessage" ADD CONSTRAINT "OfferingMessage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingMessage" ADD CONSTRAINT "OfferingMessage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingMessageBlock" ADD CONSTRAINT "OfferingMessageBlock_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OfferingMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingMessageSend" ADD CONSTRAINT "OfferingMessageSend_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OfferingMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
