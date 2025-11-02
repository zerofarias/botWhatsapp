/*
  Warnings:

  - You are about to alter the column `type` on the `flows` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(4))` to `VarChar(32)`.

*/
-- DropForeignKey
ALTER TABLE `conversations` DROP FOREIGN KEY `conversations_bot_id_fkey`;

-- DropForeignKey
ALTER TABLE `flows` DROP FOREIGN KEY `flows_bot_id_fkey`;

-- AlterTable
ALTER TABLE `flows` MODIFY `type` VARCHAR(32) NULL;

-- AlterTable
ALTER TABLE `nodes` MODIFY `type` ENUM('START', 'TEXT', 'CONDITIONAL', 'DELAY', 'REDIRECT_BOT', 'REDIRECT_AGENT', 'AI', 'SET_VARIABLE', 'END', 'SCHEDULE') NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE `flow_classic` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `flow_id` INTEGER NOT NULL,
    `parent_id` INTEGER NULL,
    `type` VARCHAR(20) NOT NULL,
    `label` VARCHAR(255) NULL,
    `value` TEXT NULL,
    `seconds` INTEGER NULL,
    `trigger_keyword` VARCHAR(100) NULL,
    `next_step_id` INTEGER NULL,
    `order_in_parent` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `flows` ADD CONSTRAINT `flows_bot_id_fkey` FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
