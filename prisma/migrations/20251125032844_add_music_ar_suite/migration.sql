-- First, check if music tables already exist, if not create them
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'music_tracks') THEN
        -- CreateTable
        CREATE TABLE "music_tracks" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "artistName" TEXT NOT NULL,
            "trackTitle" TEXT NOT NULL,
            "fileName" TEXT NOT NULL,
            "fileSize" INTEGER NOT NULL,
            "fileType" TEXT NOT NULL,
            "blobUrl" TEXT NOT NULL,
            "duration" DOUBLE PRECISION,
            "status" TEXT NOT NULL DEFAULT 'uploaded',
            "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "analyzedAt" TIMESTAMP(3),

            CONSTRAINT "music_tracks_pkey" PRIMARY KEY ("id")
        );

        -- CreateTable
        CREATE TABLE "music_analyses" (
            "id" TEXT NOT NULL,
            "trackId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "bpm" DOUBLE PRECISION,
            "key" TEXT,
            "mode" TEXT,
            "energy" DOUBLE PRECISION,
            "danceability" DOUBLE PRECISION,
            "valence" DOUBLE PRECISION,
            "loudness" DOUBLE PRECISION,
            "acousticness" DOUBLE PRECISION,
            "instrumentalness" DOUBLE PRECISION,
            "speechiness" DOUBLE PRECISION,
            "primaryGenre" TEXT,
            "subGenres" TEXT[],
            "styleDescriptors" TEXT[],
            "hasVocals" BOOLEAN NOT NULL DEFAULT true,
            "vocalQuality" DOUBLE PRECISION,
            "vocalRange" TEXT,
            "lyricsTranscript" TEXT,
            "productionScore" DOUBLE PRECISION,
            "mixQuality" DOUBLE PRECISION,
            "masteringQuality" DOUBLE PRECISION,
            "hitScore" DOUBLE PRECISION,
            "marketPotential" TEXT,
            "targetAudience" TEXT[],
            "similarArtists" TEXT[],
            "marketPosition" TEXT,
            "strengths" TEXT[],
            "weaknesses" TEXT[],
            "recommendations" TEXT[],
            "analysisModel" TEXT NOT NULL DEFAULT 'holly-v1',
            "confidence" DOUBLE PRECISION,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "music_analyses_pkey" PRIMARY KEY ("id")
        );

        -- CreateTable
        CREATE TABLE "trend_reports" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "genre" TEXT,
            "period" TEXT NOT NULL,
            "reportDate" TIMESTAMP(3) NOT NULL,
            "trendingGenres" TEXT[],
            "trendingSounds" TEXT[],
            "trendingArtists" TEXT[],
            "emergingSubgenres" TEXT[],
            "marketInsights" TEXT[],
            "opportunityAreas" TEXT[],
            "predictions" TEXT[],
            "spotifyData" JSONB,
            "billboardData" JSONB,
            "socialMediaData" JSONB,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "trend_reports_pkey" PRIMARY KEY ("id")
        );

        -- CreateIndex
        CREATE INDEX "music_tracks_userId_idx" ON "music_tracks"("userId");
        CREATE INDEX "music_tracks_status_idx" ON "music_tracks"("status");
        CREATE INDEX "music_tracks_uploadedAt_idx" ON "music_tracks"("uploadedAt");

        -- CreateIndex
        CREATE INDEX "music_analyses_trackId_idx" ON "music_analyses"("trackId");
        CREATE INDEX "music_analyses_userId_idx" ON "music_analyses"("userId");
        CREATE INDEX "music_analyses_hitScore_idx" ON "music_analyses"("hitScore");
        CREATE INDEX "music_analyses_primaryGenre_idx" ON "music_analyses"("primaryGenre");

        -- CreateIndex
        CREATE INDEX "trend_reports_userId_idx" ON "trend_reports"("userId");
        CREATE INDEX "trend_reports_genre_idx" ON "trend_reports"("genre");
        CREATE INDEX "trend_reports_reportDate_idx" ON "trend_reports"("reportDate");

        -- AddForeignKey (only if users table exists)
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
            ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "music_analyses" ADD CONSTRAINT "music_analyses_trackId_fkey" 
            FOREIGN KEY ("trackId") REFERENCES "music_tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "music_analyses" ADD CONSTRAINT "music_analyses_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "trend_reports" ADD CONSTRAINT "trend_reports_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
