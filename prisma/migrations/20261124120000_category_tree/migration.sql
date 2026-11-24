-- Self-referencing category tree (parentId = NULL means root). Existing rows stay roots.
ALTER TABLE "Category" ADD COLUMN "parentId" INTEGER;

-- Fold any rows of the short-lived "SubCategory" table into "Category" before dropping it.
-- Category.slug is globally unique (products reference it), so a colliding sub slug is prefixed with its parent slug.
INSERT INTO "Category" ("slug", "nameAZ", "nameEN", "nameRU", "imageUrl", "isActive", "order", "createdAt", "updatedAt", "parentId")
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM "Category" c WHERE c."slug" = s."slug")
          OR EXISTS (SELECT 1 FROM "SubCategory" s2 WHERE s2."slug" = s."slug" AND s2."id" < s."id")
        THEN p."slug" || '-' || s."slug"
        ELSE s."slug"
    END,
    s."nameAZ", s."nameEN", s."nameRU", s."imageUrl", s."isActive", s."order", s."createdAt", s."updatedAt", s."categoryId"
FROM "SubCategory" s
JOIN "Category" p ON p."id" = s."categoryId"
ORDER BY s."id";

DROP TABLE "SubCategory";

-- CreateIndex
CREATE INDEX "Category_parentId_order_idx" ON "Category"("parentId", "order");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
