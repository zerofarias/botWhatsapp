-- CreateTable
CREATE TABLE `flow_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bot_id` INTEGER NOT NULL,
    `conversation_id` BIGINT NOT NULL,
    `data_type` VARCHAR(191) NOT NULL,
    `variables` LONGTEXT NOT NULL,
    `phone_number` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_flow_data_bot`(`bot_id`),
    INDEX `idx_flow_data_type`(`data_type`),
    INDEX `idx_flow_data_conversation`(`conversation_id`),
    INDEX `idx_flow_data_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
