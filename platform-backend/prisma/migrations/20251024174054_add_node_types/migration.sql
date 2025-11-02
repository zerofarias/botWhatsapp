/*
  Warnings:

  - Added the required column `bot_id` to the `flows` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `conversations` ADD COLUMN `bot_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `flows` ADD COLUMN `bot_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `nodes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `flow_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('START', 'TEXT', 'CONDITIONAL', 'DELAY', 'REDIRECT_BOT', 'REDIRECT_AGENT', 'AI', 'SET_VARIABLE', 'END') NOT NULL DEFAULT 'TEXT',
    `content` VARCHAR(191) NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `condition` VARCHAR(191) NULL,
    `trueNodeId` INTEGER NULL,
    `falseNodeId` INTEGER NULL,
    `seconds` INTEGER NULL,
    `targetBotId` INTEGER NULL,
    `agentId` INTEGER NULL,
    `prompt` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `expectedType` VARCHAR(191) NULL,
    `variable` VARCHAR(191) NULL,
    `value` JSON NULL,
    `welcomeMessage` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `initial_flow_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_bots_is_default`(`is_default`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_conversations_bot` ON `conversations`(`bot_id`);

-- CreateIndex
CREATE INDEX `idx_flows_bot` ON `flows`(`bot_id`);

-- AddForeignKey
ALTER TABLE `nodes` ADD CONSTRAINT `nodes_flow_id_fkey` FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flows` ADD CONSTRAINT `flows_bot_id_fkey` FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_bot_id_fkey` FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
