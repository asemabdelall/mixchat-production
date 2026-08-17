-- Enable pg_trgm extension for fast trigram similarity, prefix matching, and fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes on users table for fast username and display name prefix/substring search
CREATE INDEX IF NOT EXISTS "users_username_trgm_idx" ON "users" USING gin ("username" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_display_name_trgm_idx" ON "users" USING gin ("display_name" gin_trgm_ops);

-- Trigram GIN indexes on posts table for hashtag discovery, content search, and location search
CREATE INDEX IF NOT EXISTS "posts_content_trgm_idx" ON "posts" USING gin ("content" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "posts_location_tag_trgm_idx" ON "posts" USING gin ("location_tag" gin_trgm_ops);

-- Full-text search GIN index on post content
CREATE INDEX IF NOT EXISTS "posts_content_fts_idx" ON "posts" USING gin (to_tsvector('simple', "content"));