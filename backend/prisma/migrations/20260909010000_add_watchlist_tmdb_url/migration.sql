ALTER TABLE "movie_items" ADD COLUMN "watchlist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "movie_items" ADD COLUMN "tmdbUrl" TEXT;

CREATE INDEX "movie_items_userId_watchlist_idx" ON "movie_items"("userId", "watchlist");
