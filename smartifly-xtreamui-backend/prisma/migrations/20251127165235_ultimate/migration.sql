/*
  Warnings:

  - You are about to drop the `auditlog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `csvimporttask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `devicetoken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deviceuser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `license` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `portalalias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reseller` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticketmessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_actorId_fkey`;

-- DropForeignKey
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_licenseId_fkey`;

-- DropForeignKey
ALTER TABLE `CSVImportTask` DROP FOREIGN KEY `CSVImportTask_resellerId_fkey`;

-- DropForeignKey
ALTER TABLE `CSVImportTask` DROP FOREIGN KEY `CSVImportTask_userId_fkey`;

-- DropForeignKey
ALTER TABLE `DeviceToken` DROP FOREIGN KEY `DeviceToken_licenseId_fkey`;

-- DropForeignKey
ALTER TABLE `DeviceUser` DROP FOREIGN KEY `DeviceUser_assignedByUserId_fkey`;

-- DropForeignKey
ALTER TABLE `DeviceUser` DROP FOREIGN KEY `DeviceUser_resellerId_fkey`;

-- DropForeignKey
ALTER TABLE `DeviceUser` DROP FOREIGN KEY `DeviceUser_userId_fkey`;

-- DropForeignKey
ALTER TABLE `License` DROP FOREIGN KEY `License_assignedById_fkey`;

-- DropForeignKey
ALTER TABLE `License` DROP FOREIGN KEY `License_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `License` DROP FOREIGN KEY `License_deviceUserId_fkey`;

-- DropForeignKey
ALTER TABLE `License` DROP FOREIGN KEY `License_portalAliasId_fkey`;

-- DropForeignKey
ALTER TABLE `License` DROP FOREIGN KEY `License_resellerId_fkey`;

-- DropForeignKey
ALTER TABLE `License` DROP FOREIGN KEY `License_userId_fkey`;

-- DropForeignKey
ALTER TABLE `PortalAlias` DROP FOREIGN KEY `PortalAlias_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Ticket` DROP FOREIGN KEY `Ticket_closedBy_fkey`;

-- DropForeignKey
ALTER TABLE `Ticket` DROP FOREIGN KEY `Ticket_licenseId_fkey`;

-- DropForeignKey
ALTER TABLE `Ticket` DROP FOREIGN KEY `Ticket_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `TicketMessage` DROP FOREIGN KEY `TicketMessage_senderId_fkey`;

-- DropForeignKey
ALTER TABLE `TicketMessage` DROP FOREIGN KEY `TicketMessage_ticketId_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_resellerId_fkey`;

-- DropTable
DROP TABLE `AuditLog`;

-- DropTable
DROP TABLE `CSVImportTask`;

-- DropTable
DROP TABLE `DeviceToken`;

-- DropTable
DROP TABLE `DeviceUser`;

-- DropTable
DROP TABLE `License`;

-- DropTable
DROP TABLE `PortalAlias`;

-- DropTable
DROP TABLE `Reseller`;

-- DropTable
DROP TABLE `Session`;

-- DropTable
DROP TABLE `Ticket`;

-- DropTable
DROP TABLE `TicketMessage`;

-- DropTable
DROP TABLE `User`;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'RESELLER', 'USER') NOT NULL DEFAULT 'USER',
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationToken` VARCHAR(255) NULL,
    `resetToken` VARCHAR(255) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `suspendedAt` DATETIME(3) NULL,
    `suspensionReason` TEXT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(45) NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSecret` VARCHAR(255) NULL,
    `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `resellerId` INTEGER NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_verificationToken_key`(`verificationToken`),
    UNIQUE INDEX `users_resetToken_key`(`resetToken`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_isActive_idx`(`isActive`),
    INDEX `users_lastLoginAt_idx`(`lastLoginAt`),
    INDEX `users_resellerId_idx`(`resellerId`),
    INDEX `users_deletedAt_idx`(`deletedAt`),
    INDEX `users_emailVerified_idx`(`emailVerified`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resellers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `quota` INTEGER NOT NULL DEFAULT 0,
    `usedQuota` INTEGER NOT NULL DEFAULT 0,
    `referenceNumber` VARCHAR(20) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING_VERIFICATION', 'REJECTED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `expiresAt` DATETIME(3) NULL,
    `suspendedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `businessName` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `website` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `verificationDocs` TEXT NULL,
    `taxId` VARCHAR(50) NULL,
    `trustScore` FLOAT NULL DEFAULT 0.0,
    `totalSales` INTEGER NOT NULL DEFAULT 0,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `canLogin` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deactivatedAt` DATETIME(3) NULL,
    `apiKey` VARCHAR(64) NULL,
    `apiKeyEnabled` BOOLEAN NOT NULL DEFAULT false,
    `maxRequestsPerHour` INTEGER NOT NULL DEFAULT 1000,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `resellers_email_key`(`email`),
    UNIQUE INDEX `resellers_referenceNumber_key`(`referenceNumber`),
    UNIQUE INDEX `resellers_apiKey_key`(`apiKey`),
    INDEX `resellers_email_idx`(`email`),
    INDEX `resellers_referenceNumber_idx`(`referenceNumber`),
    INDEX `resellers_status_idx`(`status`),
    INDEX `resellers_expiresAt_idx`(`expiresAt`),
    INDEX `resellers_isActive_idx`(`isActive`),
    INDEX `resellers_isVerified_idx`(`isVerified`),
    INDEX `resellers_quota_usedQuota_idx`(`quota`, `usedQuota`),
    INDEX `resellers_deletedAt_idx`(`deletedAt`),
    INDEX `resellers_apiKey_idx`(`apiKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` VARCHAR(255) NOT NULL,
    `mac` VARCHAR(17) NULL,
    `normalizedMac` VARCHAR(12) NULL,
    `brand` VARCHAR(100) NULL,
    `model` VARCHAR(100) NULL,
    `deviceId2` VARCHAR(255) NULL,
    `serialNumber` VARCHAR(255) NULL,
    `platform` ENUM('ANDROID_TV', 'ANDROID_MOBILE', 'ANDROID_STB', 'WEBOS', 'TIZEN', 'IOS', 'TVOS', 'FIRE_TV', 'ROKU', 'BROWSER', 'UNKNOWN') NULL DEFAULT 'UNKNOWN',
    `publicIp` VARCHAR(45) NULL,
    `appVersion` VARCHAR(20) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `screenResolution` VARCHAR(50) NULL,
    `supportedCodecs` TEXT NULL,
    `osVersion` VARCHAR(50) NULL,
    `chipset` VARCHAR(100) NULL,
    `deviceFingerprint` VARCHAR(64) NULL,
    `isSuspicious` BOOLEAN NOT NULL DEFAULT false,
    `suspiciousReason` TEXT NULL,
    `flaggedAt` DATETIME(3) NULL,
    `userId` INTEGER NULL,
    `resellerId` INTEGER NULL,
    `assignedByRole` ENUM('ADMIN', 'RESELLER', 'SYSTEM') NULL,
    `assignedByUserId` INTEGER NULL,
    `assignedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `device_users_deviceFingerprint_key`(`deviceFingerprint`),
    INDEX `device_users_userId_idx`(`userId`),
    INDEX `device_users_resellerId_idx`(`resellerId`),
    INDEX `device_users_deviceId_idx`(`deviceId`),
    INDEX `device_users_mac_idx`(`mac`),
    INDEX `device_users_normalizedMac_idx`(`normalizedMac`),
    INDEX `device_users_platform_idx`(`platform`),
    INDEX `device_users_lastSeenAt_idx`(`lastSeenAt`),
    INDEX `device_users_assignedByUserId_idx`(`assignedByUserId`),
    INDEX `device_users_deviceFingerprint_idx`(`deviceFingerprint`),
    INDEX `device_users_isSuspicious_idx`(`isSuspicious`),
    INDEX `device_users_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `device_users_mac_resellerId_key`(`mac`, `resellerId`),
    UNIQUE INDEX `device_users_normalizedMac_resellerId_key`(`normalizedMac`, `resellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `portal_aliases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `alias` VARCHAR(100) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `userId` INTEGER NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastHealthCheck` DATETIME(3) NULL,
    `isHealthy` BOOLEAN NOT NULL DEFAULT true,
    `healthCheckError` TEXT NULL,
    `healthCheckCount` INTEGER NOT NULL DEFAULT 0,
    `maxConnections` INTEGER NULL DEFAULT 100,
    `timeoutSeconds` INTEGER NULL DEFAULT 30,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `portal_aliases_alias_key`(`alias`),
    INDEX `portal_aliases_userId_idx`(`userId`),
    INDEX `portal_aliases_isActive_idx`(`isActive`),
    INDEX `portal_aliases_isDefault_idx`(`isDefault`),
    INDEX `portal_aliases_deletedAt_idx`(`deletedAt`),
    INDEX `portal_aliases_isHealthy_idx`(`isHealthy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `licenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL,
    `mac` VARCHAR(17) NULL,
    `plan` ENUM('TRIAL', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME') NOT NULL DEFAULT 'TRIAL',
    `status` ENUM('ACTIVE', 'EXPIRED', 'DISABLED', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NULL,
    `disabledAt` DATETIME(3) NULL,
    `planDurationDays` INTEGER NULL,
    `maxDevices` INTEGER NOT NULL DEFAULT 1,
    `trialUsed` BOOLEAN NOT NULL DEFAULT false,
    `activatedAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdById` INTEGER NOT NULL,
    `assignedById` INTEGER NULL,
    `resellerId` INTEGER NULL,
    `deviceUserId` INTEGER NULL,
    `portalAliasId` INTEGER NULL,
    `userId` INTEGER NULL,
    `renewalCount` INTEGER NOT NULL DEFAULT 0,
    `lastRenewedAt` DATETIME(3) NULL,
    `autoRenew` BOOLEAN NOT NULL DEFAULT false,
    `autoRenewFailAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `customData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `licenses_key_key`(`key`),
    INDEX `licenses_userId_idx`(`userId`),
    INDEX `licenses_resellerId_status_idx`(`resellerId`, `status`),
    INDEX `licenses_portalAliasId_idx`(`portalAliasId`),
    INDEX `licenses_expiresAt_idx`(`expiresAt`),
    INDEX `licenses_deviceUserId_idx`(`deviceUserId`),
    INDEX `licenses_createdById_idx`(`createdById`),
    INDEX `licenses_assignedById_idx`(`assignedById`),
    INDEX `licenses_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `licenses_mac_status_idx`(`mac`, `status`),
    INDEX `licenses_deletedAt_idx`(`deletedAt`),
    INDEX `licenses_plan_idx`(`plan`),
    INDEX `licenses_autoRenew_idx`(`autoRenew`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `license_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `licenseId` INTEGER NOT NULL,
    `oldStatus` ENUM('ACTIVE', 'EXPIRED', 'DISABLED', 'BLOCKED') NULL,
    `newStatus` ENUM('ACTIVE', 'EXPIRED', 'DISABLED', 'BLOCKED') NULL,
    `oldDeviceId` INTEGER NULL,
    `newDeviceId` INTEGER NULL,
    `oldMac` VARCHAR(17) NULL,
    `newMac` VARCHAR(17) NULL,
    `oldPlan` ENUM('TRIAL', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME') NULL,
    `newPlan` ENUM('TRIAL', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME') NULL,
    `oldExpiresAt` DATETIME(3) NULL,
    `newExpiresAt` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changedBy` INTEGER NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,

    INDEX `license_history_licenseId_idx`(`licenseId`),
    INDEX `license_history_changedAt_idx`(`changedAt`),
    INDEX `license_history_changedBy_idx`(`changedBy`),
    INDEX `license_history_oldStatus_idx`(`oldStatus`),
    INDEX `license_history_newStatus_idx`(`newStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_blacklist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mac` VARCHAR(17) NULL,
    `normalizedMac` VARCHAR(12) NULL,
    `deviceFingerprint` VARCHAR(64) NULL,
    `deviceId` VARCHAR(255) NULL,
    `reason` ENUM('FRAUD', 'ABUSE', 'MULTIPLE_DEVICES', 'STOLEN_LICENSE', 'TOS_VIOLATION', 'CHARGEBACK', 'SUSPICIOUS_ACTIVITY', 'ADMIN_BAN') NULL,
    `details` TEXT NULL,
    `blockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `blockedBy` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `device_blacklist_mac_idx`(`mac`),
    INDEX `device_blacklist_normalizedMac_idx`(`normalizedMac`),
    INDEX `device_blacklist_deviceFingerprint_idx`(`deviceFingerprint`),
    INDEX `device_blacklist_deviceId_idx`(`deviceId`),
    INDEX `device_blacklist_isActive_idx`(`isActive`),
    INDEX `device_blacklist_expiresAt_idx`(`expiresAt`),
    INDEX `device_blacklist_blockedBy_idx`(`blockedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `scope` ENUM('GLOBAL', 'RESELLER', 'USER', 'PLATFORM') NOT NULL DEFAULT 'GLOBAL',
    `value` JSON NOT NULL,
    `targetId` INTEGER NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `app_config_key_idx`(`key`),
    INDEX `app_config_scope_idx`(`scope`),
    INDEX `app_config_targetId_idx`(`targetId`),
    INDEX `app_config_isActive_idx`(`isActive`),
    UNIQUE INDEX `app_config_key_scope_targetId_key`(`key`, `scope`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `refreshToken` VARCHAR(255) NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `revokedReason` TEXT NULL,
    `deviceFingerprint` VARCHAR(64) NULL,

    UNIQUE INDEX `sessions_refreshToken_key`(`refreshToken`),
    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    INDEX `sessions_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `sessions_deviceFingerprint_idx`(`deviceFingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'UNDO', 'ASSIGN', 'TRANSFER', 'RESTORE') NOT NULL,
    `entity` ENUM('USER', 'RESELLER', 'LICENSE', 'DEVICE', 'PORTAL', 'TICKET', 'SESSION', 'CONFIG') NOT NULL,
    `entityId` INTEGER NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `undoRefId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `requestId` VARCHAR(100) NULL,
    `licenseId` INTEGER NULL,

    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `audit_logs_licenseId_idx`(`licenseId`),
    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `csv_import_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resellerId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `processedCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `fileSize` INTEGER NULL,
    `totalRows` INTEGER NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `sampleErrors` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `csv_import_tasks_resellerId_idx`(`resellerId`),
    INDEX `csv_import_tasks_userId_idx`(`userId`),
    INDEX `csv_import_tasks_status_idx`(`status`),
    INDEX `csv_import_tasks_createdAt_idx`(`createdAt`),
    INDEX `csv_import_tasks_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `senderId` INTEGER NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `status` ENUM('OPEN', 'REPLIED', 'CLOSED', 'RESOLVED', 'ESCALATED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
    `category` ENUM('LICENSE_ACTIVATION', 'TECHNICAL_ISSUE', 'BILLING', 'FEATURE_REQUEST', 'FRAUD_REPORT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `isPublicTicket` BOOLEAN NOT NULL DEFAULT false,
    `deviceUserId` INTEGER NULL,
    `licenseId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,
    `closedBy` INTEGER NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` INTEGER NULL,
    `escalatedAt` DATETIME(3) NULL,
    `escalatedTo` INTEGER NULL,
    `firstResponseAt` DATETIME(3) NULL,
    `responseTimeMin` INTEGER NULL,
    `resolutionTimeMin` INTEGER NULL,

    INDEX `tickets_senderId_idx`(`senderId`),
    INDEX `tickets_deviceUserId_idx`(`deviceUserId`),
    INDEX `tickets_licenseId_idx`(`licenseId`),
    INDEX `tickets_closedBy_idx`(`closedBy`),
    INDEX `tickets_status_idx`(`status`),
    INDEX `tickets_priority_idx`(`priority`),
    INDEX `tickets_category_idx`(`category`),
    INDEX `tickets_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `attachments` JSON NULL,
    `messageType` VARCHAR(50) NULL DEFAULT 'text',

    INDEX `ticket_messages_ticketId_idx`(`ticketId`),
    INDEX `ticket_messages_senderId_idx`(`senderId`),
    INDEX `ticket_messages_isRead_idx`(`isRead`),
    INDEX `ticket_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(32) NOT NULL,
    `licenseId` INTEGER NOT NULL,
    `mac` VARCHAR(17) NOT NULL,
    `deviceId` VARCHAR(255) NOT NULL,
    `deviceId2` VARCHAR(255) NULL,
    `serialNumber` VARCHAR(255) NULL,
    `platform` ENUM('ANDROID_TV', 'ANDROID_MOBILE', 'ANDROID_STB', 'WEBOS', 'TIZEN', 'IOS', 'TVOS', 'FIRE_TV', 'ROKU', 'BROWSER', 'UNKNOWN') NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usedAt` DATETIME(3) NULL,
    `usedBy` INTEGER NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `device_tokens_token_key`(`token`),
    INDEX `device_tokens_token_idx`(`token`),
    INDEX `device_tokens_expiresAt_idx`(`expiresAt`),
    INDEX `device_tokens_licenseId_idx`(`licenseId`),
    INDEX `device_tokens_isUsed_idx`(`isUsed`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `resellers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_users` ADD CONSTRAINT `device_users_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_users` ADD CONSTRAINT `device_users_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `resellers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_users` ADD CONSTRAINT `device_users_assignedByUserId_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `portal_aliases` ADD CONSTRAINT `portal_aliases_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `resellers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_deviceUserId_fkey` FOREIGN KEY (`deviceUserId`) REFERENCES `device_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_portalAliasId_fkey` FOREIGN KEY (`portalAliasId`) REFERENCES `portal_aliases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `license_history` ADD CONSTRAINT `license_history_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `license_history` ADD CONSTRAINT `license_history_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_blacklist` ADD CONSTRAINT `device_blacklist_blockedBy_fkey` FOREIGN KEY (`blockedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `csv_import_tasks` ADD CONSTRAINT `csv_import_tasks_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `resellers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `csv_import_tasks` ADD CONSTRAINT `csv_import_tasks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_closedBy_fkey` FOREIGN KEY (`closedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_tokens` ADD CONSTRAINT `device_tokens_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `licenses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
