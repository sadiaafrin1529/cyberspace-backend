-- CreateEnum
CREATE TYPE "CareerApplicationStatus" AS ENUM ('NEW', 'REVIEWED', 'SHORTLISTED', 'REJECTED');

-- CreateTable
CREATE TABLE "CareerPage" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "heroTitleAZ" TEXT,
    "heroTitleEN" TEXT,
    "heroTitleRU" TEXT,
    "heroDescAZ" TEXT,
    "heroDescEN" TEXT,
    "heroDescRU" TEXT,
    "heroImageUrl" TEXT,
    "heroCta1AZ" TEXT,
    "heroCta1EN" TEXT,
    "heroCta1RU" TEXT,
    "heroCta2AZ" TEXT,
    "heroCta2EN" TEXT,
    "heroCta2RU" TEXT,
    "introHeadingAZ" TEXT,
    "introHeadingEN" TEXT,
    "introHeadingRU" TEXT,
    "introBodyAZ" TEXT,
    "introBodyEN" TEXT,
    "introBodyRU" TEXT,
    "introImageUrl" TEXT,
    "missionAZ" TEXT,
    "missionEN" TEXT,
    "missionRU" TEXT,
    "visionAZ" TEXT,
    "visionEN" TEXT,
    "visionRU" TEXT,
    "cultureHeadingAZ" TEXT,
    "cultureHeadingEN" TEXT,
    "cultureHeadingRU" TEXT,
    "cultureBodyAZ" TEXT,
    "cultureBodyEN" TEXT,
    "cultureBodyRU" TEXT,
    "seoTitleAZ" TEXT,
    "seoTitleEN" TEXT,
    "seoTitleRU" TEXT,
    "seoDescAZ" TEXT,
    "seoDescEN" TEXT,
    "seoDescRU" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerBenefit" (
    "id" SERIAL NOT NULL,
    "icon" TEXT,
    "imageUrl" TEXT,
    "titleAZ" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "titleRU" TEXT NOT NULL,
    "descAZ" TEXT,
    "descEN" TEXT,
    "descRU" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerExpertise" (
    "id" SERIAL NOT NULL,
    "icon" TEXT,
    "titleAZ" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "titleRU" TEXT NOT NULL,
    "descAZ" TEXT,
    "descEN" TEXT,
    "descRU" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerExpertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerGalleryImage" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "captionAZ" TEXT,
    "captionEN" TEXT,
    "captionRU" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerOpportunity" (
    "id" SERIAL NOT NULL,
    "titleAZ" TEXT NOT NULL,
    "titleEN" TEXT NOT NULL,
    "titleRU" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT,
    "typeAZ" TEXT,
    "typeEN" TEXT,
    "typeRU" TEXT,
    "descAZ" TEXT,
    "descEN" TEXT,
    "descRU" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerApplication" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "positionApplied" TEXT NOT NULL,
    "country" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "yearsExperience" INTEGER,
    "coverLetter" TEXT,
    "resumePath" TEXT NOT NULL,
    "resumeFileName" TEXT NOT NULL,
    "status" "CareerApplicationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerBenefit_isActive_idx" ON "CareerBenefit"("isActive");

-- CreateIndex
CREATE INDEX "CareerBenefit_order_idx" ON "CareerBenefit"("order");

-- CreateIndex
CREATE INDEX "CareerExpertise_isActive_idx" ON "CareerExpertise"("isActive");

-- CreateIndex
CREATE INDEX "CareerExpertise_order_idx" ON "CareerExpertise"("order");

-- CreateIndex
CREATE INDEX "CareerGalleryImage_isActive_idx" ON "CareerGalleryImage"("isActive");

-- CreateIndex
CREATE INDEX "CareerGalleryImage_order_idx" ON "CareerGalleryImage"("order");

-- CreateIndex
CREATE INDEX "CareerOpportunity_isActive_idx" ON "CareerOpportunity"("isActive");

-- CreateIndex
CREATE INDEX "CareerOpportunity_order_idx" ON "CareerOpportunity"("order");

-- CreateIndex
CREATE INDEX "CareerApplication_status_idx" ON "CareerApplication"("status");

-- CreateIndex
CREATE INDEX "CareerApplication_createdAt_idx" ON "CareerApplication"("createdAt");

-- CreateIndex
CREATE INDEX "CareerApplication_email_idx" ON "CareerApplication"("email");
