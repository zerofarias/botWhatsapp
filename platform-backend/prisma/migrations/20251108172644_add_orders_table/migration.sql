-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT NOT NULL,
    `client_phone` VARCHAR(191) NOT NULL,
    `client_name` VARCHAR(191) NULL,
    `tipo_conversacion` VARCHAR(191) NOT NULL,
    `items_json` LONGTEXT NOT NULL,
    `notas` TEXT NULL,
    `especificaciones` TEXT NULL,
    `status` ENUM('pending', 'confirmado', 'completado', 'cancelado') NOT NULL DEFAULT 'pending',
    `close_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_conversation_id_key`(`conversation_id`),
    INDEX `idx_orders_status`(`status`),
    INDEX `idx_orders_client_phone`(`client_phone`),
    INDEX `idx_orders_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
