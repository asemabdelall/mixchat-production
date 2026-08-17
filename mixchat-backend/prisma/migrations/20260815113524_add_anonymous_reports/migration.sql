-- CreateTable
CREATE TABLE "anonymous_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reported_user_id" TEXT NOT NULL,
    "anonymous_session_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "message_snippets" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anonymous_reports_reported_user_id_created_at_idx" ON "anonymous_reports"("reported_user_id", "created_at");

-- CreateIndex
CREATE INDEX "anonymous_reports_anonymous_session_id_idx" ON "anonymous_reports"("anonymous_session_id");

-- AddForeignKey
ALTER TABLE "anonymous_reports" ADD CONSTRAINT "anonymous_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_reports" ADD CONSTRAINT "anonymous_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
