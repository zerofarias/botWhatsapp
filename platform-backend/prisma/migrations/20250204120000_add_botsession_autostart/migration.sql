-- Add auto_start flag to bot_sessions to persist auto-start preference
ALTER TABLE `bot_sessions`
  ADD COLUMN `auto_start` TINYINT(1) NOT NULL DEFAULT 0
  AFTER `paused`;
