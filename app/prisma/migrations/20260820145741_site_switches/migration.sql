-- CreateTable
CREATE TABLE "SiteSwitch" (
    "key" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSwitch_pkey" PRIMARY KEY ("key")
);
