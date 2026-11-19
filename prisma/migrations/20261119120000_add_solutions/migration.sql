-- CreateTable
CREATE TABLE "Solution" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "iconKey" TEXT,
    "iconUrl" TEXT,
    "imageUrl" TEXT,
    "bannerUrl" TEXT,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionTranslation" (
    "id" SERIAL NOT NULL,
    "solutionId" INTEGER NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT,
    "features" TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "SolutionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Solution_slug_key" ON "Solution"("slug");

-- CreateIndex
CREATE INDEX "Solution_isActive_idx" ON "Solution"("isActive");

-- CreateIndex
CREATE INDEX "Solution_order_idx" ON "Solution"("order");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionTranslation_solutionId_lang_key" ON "SolutionTranslation"("solutionId", "lang");

-- AddForeignKey
ALTER TABLE "SolutionTranslation" ADD CONSTRAINT "SolutionTranslation_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

