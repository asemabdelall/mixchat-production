-- AlterTable
ALTER TABLE "auth_sessions" ADD COLUMN     "prev_refresh_token_hash" TEXT,
ADD COLUMN     "prev_rotated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "auth_sessions_prev_refresh_token_hash_idx" ON "auth_sessions"("prev_refresh_token_hash");
