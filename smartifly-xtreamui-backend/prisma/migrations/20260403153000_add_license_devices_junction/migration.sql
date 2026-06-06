CREATE TABLE `license_devices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `licenseId` INTEGER NOT NULL,
  `deviceId` INTEGER NOT NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `assignedById` INTEGER NOT NULL,

  UNIQUE INDEX `license_devices_licenseId_deviceId_key`(`licenseId`, `deviceId`),
  INDEX `license_devices_licenseId_idx`(`licenseId`),
  INDEX `license_devices_deviceId_idx`(`deviceId`),
  INDEX `license_devices_assignedById_idx`(`assignedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `license_devices`
  ADD CONSTRAINT `license_devices_licenseId_fkey`
  FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `license_devices`
  ADD CONSTRAINT `license_devices_deviceId_fkey`
  FOREIGN KEY (`deviceId`) REFERENCES `device_users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `license_devices`
  ADD CONSTRAINT `license_devices_assignedById_fkey`
  FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
