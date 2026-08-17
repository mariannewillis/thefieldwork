-- A picture behind the masthead, chosen from the media library like any other.
-- Nullable and with no default: every existing letter keeps the flat plum plate
-- it was composed and sent against, which is what makes this safe to apply to a
-- table holding sent letters.
ALTER TABLE "Newsletter" ADD COLUMN "backgroundBasename" TEXT;
