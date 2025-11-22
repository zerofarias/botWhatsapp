ALTER TABLE `contact_reminders`
  ADD COLUMN `repeat_until` DATETIME(3) NULL AFTER `repeat_interval_days`;
