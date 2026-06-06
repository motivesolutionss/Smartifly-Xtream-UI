/*
  Warnings:

  - A unique constraint covering the columns `[settingsCode]` on the table `device_tokens` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `device_tokens` ADD COLUMN `settingsCode` VARCHAR(12) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `device_tokens_settingsCode_key` ON `device_tokens`(`settingsCode`);

-- CreateIndex
CREATE INDEX `device_tokens_settingsCode_idx` ON `device_tokens`(`settingsCode`);
