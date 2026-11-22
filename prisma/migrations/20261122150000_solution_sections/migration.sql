-- Solutions get a middle level: Category -> Section (accordion bar) -> Bundle.
-- Existing bundles are kept: each category that has bundles gets one default "Bundles" section.

-- CreateTable
CREATE TABLE "SolutionSection" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionSectionTranslation" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SolutionSectionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolutionSection_categoryId_isActive_sortOrder_idx" ON "SolutionSection"("categoryId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionSectionTranslation_sectionId_lang_key" ON "SolutionSectionTranslation"("sectionId", "lang");

-- AddForeignKey
ALTER TABLE "SolutionSection" ADD CONSTRAINT "SolutionSection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SolutionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionSectionTranslation" ADD CONSTRAINT "SolutionSectionTranslation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SolutionSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one default section per category that already has bundles
ALTER TABLE "SolutionBundle" ADD COLUMN "sectionId" INTEGER;

INSERT INTO "SolutionSection" ("categoryId", "isActive", "sortOrder", "updatedAt")
SELECT DISTINCT b."categoryId", true, 0, CURRENT_TIMESTAMP FROM "SolutionBundle" b;

INSERT INTO "SolutionSectionTranslation" ("sectionId", "lang", "title")
SELECT s."id", 'EN', 'Bundles' FROM "SolutionSection" s;

UPDATE "SolutionBundle" b
SET "sectionId" = (SELECT s."id" FROM "SolutionSection" s WHERE s."categoryId" = b."categoryId" ORDER BY s."id" LIMIT 1);

-- Bundle now belongs to a section instead of a category
ALTER TABLE "SolutionBundle" ALTER COLUMN "sectionId" SET NOT NULL;

ALTER TABLE "SolutionBundle" DROP CONSTRAINT "SolutionBundle_categoryId_fkey";
DROP INDEX "SolutionBundle_categoryId_slug_key";
DROP INDEX "SolutionBundle_categoryId_isActive_sortOrder_idx";
ALTER TABLE "SolutionBundle" DROP COLUMN "categoryId";

-- CreateIndex
CREATE UNIQUE INDEX "SolutionBundle_sectionId_slug_key" ON "SolutionBundle"("sectionId", "slug");

-- CreateIndex
CREATE INDEX "SolutionBundle_sectionId_isActive_sortOrder_idx" ON "SolutionBundle"("sectionId", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "SolutionBundle" ADD CONSTRAINT "SolutionBundle_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SolutionSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
