-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateTable
CREATE TABLE "media_objects" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "etag" TEXT,
    "uploaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_objects_object_key_key" ON "media_objects"("object_key");

-- CreateIndex
CREATE INDEX "media_objects_owner_id_idx" ON "media_objects"("owner_id");

-- CreateIndex
CREATE INDEX "media_objects_status_idx" ON "media_objects"("status");

-- CreateIndex
CREATE INDEX "media_objects_created_at_idx" ON "media_objects"("created_at");

-- CreateIndex
CREATE INDEX "media_objects_status_created_at_idx" ON "media_objects"("status", "created_at");

-- AddForeignKey
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
