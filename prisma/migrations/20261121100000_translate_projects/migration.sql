-- CreateTable
CREATE TABLE "ProjectCategoryTranslation" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProjectCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTranslation" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,

    CONSTRAINT "ProjectTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCategoryTranslation_categoryId_lang_key" ON "ProjectCategoryTranslation"("categoryId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTranslation_projectId_lang_key" ON "ProjectTranslation"("projectId", "lang");

-- AddForeignKey
ALTER TABLE "ProjectCategoryTranslation" ADD CONSTRAINT "ProjectCategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProjectCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTranslation" ADD CONSTRAINT "ProjectTranslation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing single-language content becomes the English translation (English is the fallback language).
INSERT INTO "ProjectCategoryTranslation" ("categoryId", "lang", "name")
SELECT "id", 'EN', "name" FROM "ProjectCategory";

INSERT INTO "ProjectTranslation" ("projectId", "lang", "title", "shortDescription", "description")
SELECT "id", 'EN', "title", "shortDescription", "description" FROM "Project";

-- DropIndex
DROP INDEX "ProjectCategory_name_key";

-- AlterTable
ALTER TABLE "ProjectCategory" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "title",
DROP COLUMN "shortDescription",
DROP COLUMN "description";
