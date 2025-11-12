-- Ensure flow.message uses utf8mb4 so emojis are preserved\nALTER TABLE lows MODIFY COLUMN message LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
