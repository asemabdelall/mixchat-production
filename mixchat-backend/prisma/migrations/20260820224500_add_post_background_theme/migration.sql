-- Persist the visual theme for text-only posts so every feed and device
-- renders the same authored background.
ALTER TABLE "posts" ADD COLUMN "background_theme" TEXT;

