-- CreateTable
CREATE TABLE "SubCategory" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAZ" TEXT NOT NULL,
    "nameEN" TEXT NOT NULL,
    "nameRU" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubCategory_categoryId_isActive_order_idx" ON "SubCategory"("categoryId", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_categoryId_slug_key" ON "SubCategory"("categoryId", "slug");

-- AddForeignKey
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
