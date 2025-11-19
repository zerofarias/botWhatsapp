-- Drop foreign key and unique constraint to allow multiple orders per conversacion
ALTER TABLE `orders`
  DROP FOREIGN KEY `orders_conversation_id_fkey`;

ALTER TABLE `orders`
  DROP INDEX `orders_conversation_id_key`;

-- Extend order schema with structured fields for the ORDER node
ALTER TABLE `orders`
  ADD COLUMN `concept` VARCHAR(191) NULL AFTER `items_json`,
  ADD COLUMN `request_details` TEXT NULL AFTER `concept`,
  ADD COLUMN `customer_data` TEXT NULL AFTER `request_details`,
  ADD COLUMN `payment_method` VARCHAR(191) NULL AFTER `customer_data`,
  ADD COLUMN `confirmation_message` TEXT NULL AFTER `payment_method`,
  ADD COLUMN `confirmation_sent_at` DATETIME(3) NULL AFTER `confirmation_message`;

CREATE INDEX `idx_orders_conversation_id` ON `orders`(`conversation_id`);

ALTER TABLE `orders`
  ADD CONSTRAINT `orders_conversation_id_fkey`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
