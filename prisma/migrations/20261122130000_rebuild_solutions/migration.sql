-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- DropForeignKey
ALTER TABLE "SolutionTranslation" DROP CONSTRAINT "SolutionTranslation_solutionId_fkey";

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "bundleId" INTEGER,
ALTER COLUMN "productId" DROP NOT NULL;

-- DropTable
DROP TABLE "Solution";

-- DropTable
DROP TABLE "SolutionTranslation";

-- CreateTable
CREATE TABLE "SolutionCategory" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#1457d9',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnHome" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionCategoryTranslation" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instruction" TEXT,

    CONSTRAINT "SolutionCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionBundle" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "price" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'AZN',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'ONE_TIME',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionBundleTranslation" (
    "id" SERIAL NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "badge" TEXT,

    CONSTRAINT "SolutionBundleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionBundleItem" (
    "id" SERIAL NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "productId" TEXT,
    "price" DECIMAL(12,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionBundleItemTranslation" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SolutionBundleItemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionBundleFeature" (
    "id" SERIAL NOT NULL,
    "bundleId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SolutionBundleFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionBundleFeatureTranslation" (
    "id" SERIAL NOT NULL,
    "featureId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "SolutionBundleFeatureTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolutionCategory_slug_key" ON "SolutionCategory"("slug");

-- CreateIndex
CREATE INDEX "SolutionCategory_isActive_sortOrder_idx" ON "SolutionCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SolutionCategory_showOnHome_sortOrder_idx" ON "SolutionCategory"("showOnHome", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionCategoryTranslation_categoryId_lang_key" ON "SolutionCategoryTranslation"("categoryId", "lang");

-- CreateIndex
CREATE INDEX "SolutionBundle_categoryId_isActive_sortOrder_idx" ON "SolutionBundle"("categoryId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionBundle_categoryId_slug_key" ON "SolutionBundle"("categoryId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionBundleTranslation_bundleId_lang_key" ON "SolutionBundleTranslation"("bundleId", "lang");

-- CreateIndex
CREATE INDEX "SolutionBundleItem_bundleId_sortOrder_idx" ON "SolutionBundleItem"("bundleId", "sortOrder");

-- CreateIndex
CREATE INDEX "SolutionBundleItem_productId_idx" ON "SolutionBundleItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionBundleItemTranslation_itemId_lang_key" ON "SolutionBundleItemTranslation"("itemId", "lang");

-- CreateIndex
CREATE INDEX "SolutionBundleFeature_bundleId_sortOrder_idx" ON "SolutionBundleFeature"("bundleId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionBundleFeatureTranslation_featureId_lang_key" ON "SolutionBundleFeatureTranslation"("featureId", "lang");

-- CreateIndex
CREATE INDEX "Inquiry_bundleId_idx" ON "Inquiry"("bundleId");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "SolutionBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionCategoryTranslation" ADD CONSTRAINT "SolutionCategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SolutionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBundle" ADD CONSTRAINT "SolutionBundle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SolutionCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBundleTranslation" ADD CONSTRAINT "SolutionBundleTranslation_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "SolutionBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBundleItem" ADD CONSTRAINT "SolutionBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "SolutionBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBundleItem" ADD CONSTRAINT "SolutionBundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBundleItemTranslation" ADD CONSTRAINT "SolutionBundleItemTranslation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "SolutionBundleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBundleFeature" ADD CONSTRAINT "SolutionBundleFeature_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "SolutionBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionBundleFeatureTranslation" ADD CONSTRAINT "SolutionBundleFeatureTranslation_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "SolutionBundleFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

