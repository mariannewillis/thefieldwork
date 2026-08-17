-- Admin accounts gain an email address, and password-reset tokens arrive.
--
-- HAND-WRITTEN, NOT GENERATED. Prisma's automatic diff for this change drops
-- "AdminCredential" and creates "AdminUser" — which would delete the live
-- account, including the password Marianne has already set on production.
-- This renames the table instead, so every existing row survives untouched.

-- 1. The table becomes AdminUser, carrying its rows with it.
ALTER TABLE "AdminCredential" RENAME TO "AdminUser";
ALTER TABLE "AdminUser" RENAME CONSTRAINT "AdminCredential_pkey" TO "AdminUser_pkey";
ALTER INDEX "AdminCredential_username_key" RENAME TO "AdminUser_username_key";

-- 2. Email is NULLABLE on purpose. An account with no address cannot be reset
--    by email, which is safer than inventing a plausible address that nobody
--    controls. Existing rows get NULL and set theirs in Settings.
ALTER TABLE "AdminUser" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- 3. The id was pinned to a literal 1 when only one account could exist.
--    Give it a real sequence, started past whatever rows are already here so
--    the next insert cannot collide with the existing account.
CREATE SEQUENCE "AdminUser_id_seq" OWNED BY "AdminUser"."id";
SELECT setval('"AdminUser_id_seq"', COALESCE((SELECT MAX("id") FROM "AdminUser"), 1), true);
ALTER TABLE "AdminUser" ALTER COLUMN "id" SET DEFAULT nextval('"AdminUser_id_seq"');

-- 4. Reset tokens. Only the HASH is stored — a leaked dump of this table
--    cannot be used to reset anything, because the token itself only ever
--    existed inside the email.
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AdminUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
