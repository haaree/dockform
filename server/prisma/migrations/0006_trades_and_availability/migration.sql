-- AlterTable
ALTER TABLE "users" ADD COLUMN "availability_status" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN "last_assigned_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "form_fields" ADD COLUMN "is_trade_selector" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "responses" ADD COLUMN "auto_assigned_user_id" UUID;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_auto_assigned_user_id_fkey" FOREIGN KEY ("auto_assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_trades" (
    "user_id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,

    CONSTRAINT "user_trades_pkey" PRIMARY KEY ("user_id","trade_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trades_company_id_name_key" ON "trades"("company_id", "name");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trades" ADD CONSTRAINT "user_trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_trades" ADD CONSTRAINT "user_trades_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
