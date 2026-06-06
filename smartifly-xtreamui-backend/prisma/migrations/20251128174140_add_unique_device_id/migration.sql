/*
  Warnings:

  - A unique constraint covering the columns `[deviceId]` on the table `device_users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `device_users_deviceId_idx` ON `device_users`;

-- CreateIndex
CREATE UNIQUE INDEX `device_users_deviceId_key` ON `device_users`(`deviceId`);
