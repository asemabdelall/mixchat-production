-- CreateEnum
CREATE TYPE "LocationVisibility" AS ENUM ('FRIENDS', 'CLOSE_FRIENDS', 'NOBODY');

-- DropIndex
DROP INDEX "posts_content_trgm_idx";

-- DropIndex
DROP INDEX "posts_location_tag_trgm_idx";

-- DropIndex
DROP INDEX "users_display_name_trgm_idx";

-- DropIndex
DROP INDEX "users_username_trgm_idx";

-- CreateTable
CREATE TABLE "user_location_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_ghost_mode" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "LocationVisibility" NOT NULL DEFAULT 'FRIENDS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_location_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_location_settings_user_id_key" ON "user_location_settings"("user_id");

-- AddForeignKey
ALTER TABLE "user_location_settings" ADD CONSTRAINT "user_location_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
