-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "reel_id" TEXT,
ALTER COLUMN "post_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "reels" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "media_object_id" TEXT NOT NULL,
    "poster_media_object_id" TEXT,
    "caption" TEXT,
    "audio_title" TEXT,
    "location_tag" TEXT,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "bookmarks_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "shares_count" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_watch_sessions" (
    "id" TEXT NOT NULL,
    "reel_id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "watched_ms" INTEGER NOT NULL DEFAULT 0,
    "max_progress_ms" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "completion_ratio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "is_qualified_view" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "replay_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_watch_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reels_author_id_status_created_at_id_idx" ON "reels"("author_id", "status", "created_at", "id");

-- CreateIndex
CREATE INDEX "reels_status_visibility_created_at_id_idx" ON "reels"("status", "visibility", "created_at", "id");

-- CreateIndex
CREATE INDEX "reels_status_created_at_id_idx" ON "reels"("status", "created_at", "id");

-- CreateIndex
CREATE INDEX "reels_created_at_id_idx" ON "reels"("created_at", "id");

-- CreateIndex
CREATE INDEX "reel_likes_reel_id_idx" ON "reel_likes"("reel_id");

-- CreateIndex
CREATE INDEX "reel_likes_user_id_idx" ON "reel_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reel_likes_user_id_reel_id_key" ON "reel_likes"("user_id", "reel_id");

-- CreateIndex
CREATE INDEX "reel_bookmarks_user_id_created_at_idx" ON "reel_bookmarks"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "reel_bookmarks_reel_id_idx" ON "reel_bookmarks"("reel_id");

-- CreateIndex
CREATE UNIQUE INDEX "reel_bookmarks_user_id_reel_id_key" ON "reel_bookmarks"("user_id", "reel_id");

-- CreateIndex
CREATE INDEX "reel_watch_sessions_reel_id_viewer_id_idx" ON "reel_watch_sessions"("reel_id", "viewer_id");

-- CreateIndex
CREATE INDEX "reel_watch_sessions_reel_id_is_qualified_view_idx" ON "reel_watch_sessions"("reel_id", "is_qualified_view");

-- CreateIndex
CREATE INDEX "reel_watch_sessions_reel_id_is_completed_idx" ON "reel_watch_sessions"("reel_id", "is_completed");

-- CreateIndex
CREATE INDEX "reel_watch_sessions_viewer_id_created_at_idx" ON "reel_watch_sessions"("viewer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reel_watch_sessions_viewer_id_session_id_key" ON "reel_watch_sessions"("viewer_id", "session_id");

-- CreateIndex
CREATE INDEX "comments_reel_id_parent_id_created_at_id_idx" ON "comments"("reel_id", "parent_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_media_object_id_fkey" FOREIGN KEY ("media_object_id") REFERENCES "media_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_poster_media_object_id_fkey" FOREIGN KEY ("poster_media_object_id") REFERENCES "media_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_bookmarks" ADD CONSTRAINT "reel_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_bookmarks" ADD CONSTRAINT "reel_bookmarks_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_watch_sessions" ADD CONSTRAINT "reel_watch_sessions_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_watch_sessions" ADD CONSTRAINT "reel_watch_sessions_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
