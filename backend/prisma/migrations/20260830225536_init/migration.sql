-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "password" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "movie_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "spanishTitle" TEXT,
    "year" INTEGER,
    "synopsis" TEXT,
    "durationMinutes" INTEGER,
    "seasons" INTEGER,
    "totalEpisodes" INTEGER,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "personalRating" REAL,
    "imdbRating" REAL,
    "tmdbId" INTEGER,
    "imdbId" TEXT,
    "imdbUrl" TEXT,
    "filmaffinityUrl" TEXT,
    "trailerUrl" TEXT,
    "tmdbCollectionId" INTEGER,
    "tmdbCollectionName" TEXT,
    "tmdbImportedAt" DATETIME,
    "tmdbLastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "movie_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "localPath" TEXT,
    "tmdbFilePath" TEXT,
    "order" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "altText" TEXT,
    CONSTRAINT "movie_images_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_countries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "isoCode" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "movie_countries_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "tmdbPersonId" INTEGER,
    "profilePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_credits" (
    "movieId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "creditType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "characterName" TEXT,
    "tmdbCreditId" TEXT,

    PRIMARY KEY ("movieId", "personId", "creditType"),
    CONSTRAINT "movie_credits_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "movie_credits_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "tmdbGenreId" INTEGER,
    "tmdbMediaType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "genres_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_genres" (
    "movieId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("movieId", "genreId"),
    CONSTRAINT "movie_genres_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "movie_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "tmdbKeywordId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "keywords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_keywords" (
    "movieId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("movieId", "keywordId"),
    CONSTRAINT "movie_keywords_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "movie_keywords_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "tmdbProviderId" INTEGER,
    "logoPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platforms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_platforms" (
    "movieId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("movieId", "platformId"),
    CONSTRAINT "movie_platforms_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "movie_platforms_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "movie_collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movie_collection_items" (
    "collectionId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("collectionId", "movieId"),
    CONSTRAINT "movie_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "movie_collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "movie_collection_items_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movie_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "movie_items_userId_type_idx" ON "movie_items"("userId", "type");

-- CreateIndex
CREATE INDEX "movie_items_userId_favorite_idx" ON "movie_items"("userId", "favorite");

-- CreateIndex
CREATE INDEX "movie_items_userId_watched_idx" ON "movie_items"("userId", "watched");

-- CreateIndex
CREATE INDEX "movie_items_userId_year_idx" ON "movie_items"("userId", "year");

-- CreateIndex
CREATE INDEX "movie_items_userId_originalTitle_year_idx" ON "movie_items"("userId", "originalTitle", "year");

-- CreateIndex
CREATE INDEX "movie_items_userId_spanishTitle_year_idx" ON "movie_items"("userId", "spanishTitle", "year");

-- CreateIndex
CREATE INDEX "movie_items_userId_tmdbCollectionId_idx" ON "movie_items"("userId", "tmdbCollectionId");

-- CreateIndex
CREATE UNIQUE INDEX "movie_items_userId_type_tmdbId_key" ON "movie_items"("userId", "type", "tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "movie_items_userId_imdbId_key" ON "movie_items"("userId", "imdbId");

-- CreateIndex
CREATE INDEX "movie_images_movieId_isPrimary_idx" ON "movie_images"("movieId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "movie_images_movieId_order_key" ON "movie_images"("movieId", "order");

-- CreateIndex
CREATE INDEX "movie_countries_normalizedName_idx" ON "movie_countries"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "movie_countries_movieId_normalizedName_key" ON "movie_countries"("movieId", "normalizedName");

-- CreateIndex
CREATE INDEX "people_userId_normalizedName_idx" ON "people"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "people_userId_tmdbPersonId_key" ON "people"("userId", "tmdbPersonId");

-- CreateIndex
CREATE INDEX "movie_credits_movieId_creditType_order_idx" ON "movie_credits"("movieId", "creditType", "order");

-- CreateIndex
CREATE INDEX "genres_userId_tmdbGenreId_tmdbMediaType_idx" ON "genres"("userId", "tmdbGenreId", "tmdbMediaType");

-- CreateIndex
CREATE UNIQUE INDEX "genres_userId_normalizedName_key" ON "genres"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "movie_genres_genreId_idx" ON "movie_genres"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_userId_normalizedName_key" ON "keywords"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_userId_tmdbKeywordId_key" ON "keywords"("userId", "tmdbKeywordId");

-- CreateIndex
CREATE INDEX "movie_keywords_keywordId_idx" ON "movie_keywords"("keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_userId_normalizedName_key" ON "platforms"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_userId_tmdbProviderId_key" ON "platforms"("userId", "tmdbProviderId");

-- CreateIndex
CREATE INDEX "movie_platforms_platformId_idx" ON "movie_platforms"("platformId");

-- CreateIndex
CREATE INDEX "movie_platforms_movieId_isPrimary_idx" ON "movie_platforms"("movieId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "movie_collections_userId_name_key" ON "movie_collections"("userId", "name");

-- CreateIndex
CREATE INDEX "movie_collection_items_movieId_idx" ON "movie_collection_items"("movieId");
