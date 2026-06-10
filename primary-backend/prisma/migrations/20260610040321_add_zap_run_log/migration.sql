-- CreateEnum
CREATE TYPE "ZapRunStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ZapRunLog" (
    "id" TEXT NOT NULL,
    "zapRunId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "actionId" TEXT NOT NULL,
    "status" "ZapRunStatus" NOT NULL,
    "error" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZapRunLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ZapRunLog" ADD CONSTRAINT "ZapRunLog_zapRunId_fkey" FOREIGN KEY ("zapRunId") REFERENCES "ZapRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
