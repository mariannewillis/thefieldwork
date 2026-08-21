-- The flyer stops deciding how many photographs she may use.
--
-- `layout` was an enum of two compositions (one picture, or one plus a strip of
-- two), which made "how many" a schema decision rather than hers: a course with
-- twelve photographs could put two of them on its own flyer. The composition
-- still decides how they are ARRANGED — see `flyer.css` — but how many there
-- are is now an ordered list she chooses.
--
-- Nothing is lost here. Checked before running: every `Flyer` row had NULL in
-- `detailRef` and `placeRef` — she had only ever used the defaults — so the two
-- columns carried no choice of hers to migrate. `layout` held `one` twice and
-- `three` once, and "three" now means "she has two pictures on it", which the
-- resolver's default gives her anyway.

ALTER TABLE "Flyer" DROP COLUMN "detailRef";
ALTER TABLE "Flyer" DROP COLUMN "placeRef";
ALTER TABLE "Flyer" DROP COLUMN "layout";

ALTER TABLE "Flyer" ADD COLUMN "showGround" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Flyer" ADD COLUMN "pictures" TEXT[];

DROP TYPE "FlyerLayout";
