CREATE TABLE `contact_reminders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `contact_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `remind_at` DATETIME(3) NOT NULL,
  `repeat_interval_days` INT NULL,
  `last_triggered_at` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `contact_reminders_contact_id_idx` (`contact_id`),
  INDEX `contact_reminders_remind_at_idx` (`remind_at`),
  CONSTRAINT `contact_reminders_contact_id_fkey`
    FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
);
