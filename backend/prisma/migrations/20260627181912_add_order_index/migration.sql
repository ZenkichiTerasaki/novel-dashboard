/*
  Warnings:

  - A unique constraint covering the columns `[scenarioId,orderIndex]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Event_scenarioId_orderIndex_key" ON "Event"("scenarioId", "orderIndex");
