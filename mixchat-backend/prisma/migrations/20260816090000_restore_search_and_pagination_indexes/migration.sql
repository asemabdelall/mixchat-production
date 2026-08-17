-- Phase 16 production index hardening.
--
-- These indexes use CONCURRENTLY so reads and writes can continue while they
-- are built on a production-sized table. PostgreSQL does not allow concurrent
-- index creation inside a transaction; deploy this migration as a standalone
-- Prisma migration and do not wrap it in an external transaction.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_username_trgm_idx"
  ON "users" USING gin ("username" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_display_name_trgm_idx"
  ON "users" USING gin ("display_name" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_bio_trgm_idx"
  ON "users" USING gin ("bio" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_content_trgm_idx"
  ON "posts" USING gin ("content" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_location_tag_trgm_idx"
  ON "posts" USING gin ("location_tag" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "follows_follower_id_created_at_id_idx"
  ON "follows" ("follower_id", "created_at" DESC, "id" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "follows_following_id_created_at_id_idx"
  ON "follows" ("following_id", "created_at" DESC, "id" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_status_likes_count_created_at_id_idx"
  ON "posts" ("status", "likes_count" DESC, "created_at" DESC, "id" DESC);
