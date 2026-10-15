ALTER TABLE "movie_collections" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "movie_collections_shareToken_key" ON "movie_collections"("shareToken");
