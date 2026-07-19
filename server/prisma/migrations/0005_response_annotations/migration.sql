-- CreateTable
CREATE TABLE "response_annotations" (
    "id" UUID NOT NULL,
    "response_id" UUID NOT NULL,
    "field_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "response_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "response_annotations_response_id_idx" ON "response_annotations"("response_id");

-- CreateIndex
CREATE UNIQUE INDEX "response_annotations_response_id_field_id_kind_key" ON "response_annotations"("response_id", "field_id", "kind");

-- AddForeignKey
ALTER TABLE "response_annotations" ADD CONSTRAINT "response_annotations_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
