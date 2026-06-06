-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'RESELLER', 'USER') NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationToken` VARCHAR(191) NULL,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `suspendedAt` DATETIME(3) NULL,
    `suspensionReason` TEXT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `resellerId` INTEGER NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_verificationToken_key`(`verificationToken`),
    UNIQUE INDEX `User_resetToken_key`(`resetToken`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_isActive_idx`(`isActive`),
    INDEX `User_lastLoginAt_idx`(`lastLoginAt`),
    INDEX `User_resellerId_idx`(`resellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reseller` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `quota` INTEGER NOT NULL DEFAULT 0,
    `usedQuota` INTEGER NOT NULL DEFAULT 0,
    `referenceNumber` VARCHAR(20) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `expiresAt` DATETIME(3) NULL,
    `suspendedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `businessName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `verificationDocs` TEXT NULL,
    `taxId` VARCHAR(191) NULL,
    `trustScore` DOUBLE NULL DEFAULT 0.0,
    `totalSales` INTEGER NOT NULL DEFAULT 0,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `canLogin` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deactivatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Reseller_email_key`(`email`),
    UNIQUE INDEX `Reseller_referenceNumber_key`(`referenceNumber`),
    INDEX `Reseller_email_idx`(`email`),
    INDEX `Reseller_referenceNumber_idx`(`referenceNumber`),
    INDEX `Reseller_status_idx`(`status`),
    INDEX `Reseller_expiresAt_idx`(`expiresAt`),
    INDEX `Reseller_isActive_idx`(`isActive`),
    INDEX `Reseller_isVerified_idx`(`isVerified`),
    INDEX `Reseller_quota_usedQuota_idx`(`quota`, `usedQuota`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeviceUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviceId` VARCHAR(255) NOT NULL,
    `mac` VARCHAR(17) NULL,
    `normalizedMac` VARCHAR(12) NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `deviceId2` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `platform` ENUM('ANDROID_TV', 'ANDROID_MOBILE', 'ANDROID_STB', 'WEBOS', 'TIZEN', 'IOS', 'TVOS', 'FIRE_TV', 'ROKU', 'BROWSER') NULL,
    `publicIp` VARCHAR(191) NULL,
    `appVersion` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `screenResolution` VARCHAR(191) NULL,
    `supportedCodecs` VARCHAR(191) NULL,
    `osVersion` VARCHAR(191) NULL,
    `chipset` VARCHAR(191) NULL,
    `deviceFingerprint` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `resellerId` INTEGER NULL,
    `assignedByRole` ENUM('ADMIN', 'RESELLER', 'SYSTEM') NULL,
    `assignedByUserId` INTEGER NULL,
    `assignedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DeviceUser_deviceFingerprint_key`(`deviceFingerprint`),
    INDEX `DeviceUser_userId_idx`(`userId`),
    INDEX `DeviceUser_resellerId_idx`(`resellerId`),
    INDEX `DeviceUser_deviceId_idx`(`deviceId`),
    INDEX `DeviceUser_mac_idx`(`mac`),
    INDEX `DeviceUser_normalizedMac_idx`(`normalizedMac`),
    INDEX `DeviceUser_platform_idx`(`platform`),
    INDEX `DeviceUser_lastSeenAt_idx`(`lastSeenAt`),
    INDEX `DeviceUser_assignedByUserId_idx`(`assignedByUserId`),
    INDEX `DeviceUser_deviceFingerprint_idx`(`deviceFingerprint`),
    UNIQUE INDEX `DeviceUser_mac_resellerId_key`(`mac`, `resellerId`),
    UNIQUE INDEX `DeviceUser_normalizedMac_resellerId_key`(`normalizedMac`, `resellerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortalAlias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `userId` INTEGER NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastHealthCheck` DATETIME(3) NULL,
    `isHealthy` BOOLEAN NOT NULL DEFAULT true,
    `healthCheckError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PortalAlias_alias_key`(`alias`),
    INDEX `PortalAlias_userId_idx`(`userId`),
    INDEX `PortalAlias_isActive_idx`(`isActive`),
    INDEX `PortalAlias_isDefault_idx`(`isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `License` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `mac` VARCHAR(17) NULL,
    `plan` ENUM('TRIAL', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME') NOT NULL DEFAULT 'TRIAL',
    `status` ENUM('ACTIVE', 'EXPIRED', 'DISABLED', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NULL,
    `disabledAt` DATETIME(3) NULL,
    `planDurationDays` INTEGER NULL,
    `maxDevices` INTEGER NOT NULL DEFAULT 1,
    `trialUsed` BOOLEAN NOT NULL DEFAULT false,
    `createdById` INTEGER NOT NULL,
    `assignedById` INTEGER NULL,
    `resellerId` INTEGER NULL,
    `deviceUserId` INTEGER NULL,
    `portalAliasId` INTEGER NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `activatedAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `License_key_key`(`key`),
    INDEX `License_userId_idx`(`userId`),
    INDEX `License_resellerId_status_idx`(`resellerId`, `status`),
    INDEX `License_portalAliasId_idx`(`portalAliasId`),
    INDEX `License_expiresAt_idx`(`expiresAt`),
    INDEX `License_deviceUserId_idx`(`deviceUserId`),
    INDEX `License_createdById_idx`(`createdById`),
    INDEX `License_assignedById_idx`(`assignedById`),
    INDEX `License_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `License_mac_status_idx`(`mac`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `revokedReason` VARCHAR(191) NULL,

    UNIQUE INDEX `Session_refreshToken_key`(`refreshToken`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    INDEX `Session_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'UNDO', 'ASSIGN') NOT NULL,
    `entity` ENUM('USER', 'RESELLER', 'LICENSE', 'DEVICE', 'PORTAL', 'TICKET', 'SESSION') NOT NULL,
    `entityId` INTEGER NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `undoRefId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `requestId` VARCHAR(191) NULL,
    `licenseId` INTEGER NULL,

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_licenseId_idx`(`licenseId`),
    INDEX `AuditLog_actorId_idx`(`actorId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CSVImportTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resellerId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'DONE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `processedCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `fileSize` INTEGER NULL,
    `totalRows` INTEGER NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CSVImportTask_resellerId_idx`(`resellerId`),
    INDEX `CSVImportTask_userId_idx`(`userId`),
    INDEX `CSVImportTask_status_idx`(`status`),
    INDEX `CSVImportTask_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `senderId` INTEGER NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'REPLIED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `category` ENUM('LICENSE_ACTIVATION', 'TECHNICAL_ISSUE', 'BILLING', 'FEATURE_REQUEST', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `isPublicTicket` BOOLEAN NOT NULL DEFAULT false,
    `deviceUserId` INTEGER NULL,
    `licenseId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,
    `closedBy` INTEGER NULL,

    INDEX `Ticket_senderId_idx`(`senderId`),
    INDEX `Ticket_deviceUserId_idx`(`deviceUserId`),
    INDEX `Ticket_licenseId_idx`(`licenseId`),
    INDEX `Ticket_closedBy_idx`(`closedBy`),
    INDEX `Ticket_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `attachments` JSON NULL,

    INDEX `TicketMessage_ticketId_idx`(`ticketId`),
    INDEX `TicketMessage_senderId_idx`(`senderId`),
    INDEX `TicketMessage_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeviceToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(32) NOT NULL,
    `licenseId` INTEGER NOT NULL,
    `mac` VARCHAR(17) NOT NULL,
    `deviceId` VARCHAR(255) NOT NULL,
    `deviceId2` VARCHAR(255) NULL,
    `serialNumber` VARCHAR(255) NULL,
    `platform` ENUM('ANDROID_TV', 'ANDROID_MOBILE', 'ANDROID_STB', 'WEBOS', 'TIZEN', 'IOS', 'TVOS', 'FIRE_TV', 'ROKU', 'BROWSER') NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DeviceToken_token_key`(`token`),
    INDEX `DeviceToken_token_idx`(`token`),
    INDEX `DeviceToken_expiresAt_idx`(`expiresAt`),
    INDEX `DeviceToken_licenseId_idx`(`licenseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `Reseller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceUser` ADD CONSTRAINT `DeviceUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceUser` ADD CONSTRAINT `DeviceUser_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `Reseller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceUser` ADD CONSTRAINT `DeviceUser_assignedByUserId_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortalAlias` ADD CONSTRAINT `PortalAlias_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `Reseller`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_deviceUserId_fkey` FOREIGN KEY (`deviceUserId`) REFERENCES `DeviceUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `License` ADD CONSTRAINT `License_portalAliasId_fkey` FOREIGN KEY (`portalAliasId`) REFERENCES `PortalAlias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `License`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CSVImportTask` ADD CONSTRAINT `CSVImportTask_resellerId_fkey` FOREIGN KEY (`resellerId`) REFERENCES `Reseller`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CSVImportTask` ADD CONSTRAINT `CSVImportTask_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `License`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_closedBy_fkey` FOREIGN KEY (`closedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMessage` ADD CONSTRAINT `TicketMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketMessage` ADD CONSTRAINT `TicketMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceToken` ADD CONSTRAINT `DeviceToken_licenseId_fkey` FOREIGN KEY (`licenseId`) REFERENCES `License`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
