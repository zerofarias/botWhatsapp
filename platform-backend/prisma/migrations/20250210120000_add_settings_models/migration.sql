-- CreateTable: system_settings
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/Buenos_Aires',
    `language` VARCHAR(191) NOT NULL DEFAULT 'es',
    `date_format` VARCHAR(191) NOT NULL DEFAULT 'DD/MM/YYYY',
    `auto_close_minutes` INTEGER NOT NULL DEFAULT 30,
    `notifications_email` BOOLEAN NOT NULL DEFAULT TRUE,
    `notifications_web` BOOLEAN NOT NULL DEFAULT TRUE,
    `notifications_push` BOOLEAN NOT NULL DEFAULT FALSE,
    `quiet_hours` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: settings_audit
CREATE TABLE `settings_audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `changes` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `settings_audit_user_id_fkey`(`user_id`),
    CONSTRAINT `settings_audit_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
