-- CreateTable
CREATE TABLE "JobTranslation" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT,
    "requirements" TEXT NOT NULL,
    "requiredSkills" TEXT[],
    "experienceLevel" TEXT,
    "educationRequirements" TEXT,

    CONSTRAINT "JobTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobTranslation_jobId_lang_key" ON "JobTranslation"("jobId", "lang");

-- AddForeignKey
ALTER TABLE "JobTranslation" ADD CONSTRAINT "JobTranslation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing single-language jobs as the EN translation
INSERT INTO "JobTranslation" ("jobId", "lang", "title", "description", "responsibilities", "requirements", "requiredSkills", "experienceLevel", "educationRequirements")
SELECT "id", 'EN', "title", "description", "responsibilities", "requirements", "requiredSkills", "experienceLevel", "educationRequirements" FROM "Job";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "description",
DROP COLUMN "educationRequirements",
DROP COLUMN "experienceLevel",
DROP COLUMN "requiredSkills",
DROP COLUMN "requirements",
DROP COLUMN "responsibilities",
DROP COLUMN "title";
