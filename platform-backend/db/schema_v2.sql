-- -----------------------------------------------------------------------------
-- WPPConnect Platform - Extended Schema (v2)
-- -----------------------------------------------------------------------------
-- Este script crea/actualiza la estructura necesaria para:
--   * Flujos jerárquicos configurables
--   * Roles y áreas de atención con asignaciones múltiples
--   * Conversaciones con operadores y estado del bot
--   * Registro de mensajes por conversación
--   * Autenticación basada en sesiones (tabla `sessions`)
--   * Integración con WPPConnect (tabla `bot_sessions`)
-- -----------------------------------------------------------------------------
-- Ejecuta este archivo con tu cliente MySQL/MariaDB preferido, por ejemplo:
--   mysql -u user -p < db/schema_v2.sql
-- -----------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `wppconnect_platform`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `wppconnect_platform`;

-- --------------------------------------------------------------------------
-- Tabla: areas
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `areas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_areas_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla: users
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) DEFAULT NULL,
  `password_hash` CHAR(64) NOT NULL,
  `role` ENUM('admin','supervisor','operator','support','sales') NOT NULL DEFAULT 'operator',
  `default_area_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME(3) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_users_username` (`username`),
  UNIQUE KEY `ux_users_email` (`email`),
  CONSTRAINT `fk_users_default_area`
    FOREIGN KEY (`default_area_id`) REFERENCES `areas` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla pivote: user_areas (usuarios asignados a múltiples áreas)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_areas` (
  `user_id` INT NOT NULL,
  `area_id` INT NOT NULL,
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`user_id`, `area_id`),
  CONSTRAINT `fk_user_areas_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_areas_area`
    FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla: bot_sessions (estado de la conexión WPPConnect)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bot_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `owner_user_id` INT NOT NULL,
  `status` ENUM('connected','connecting','disconnected','error') NOT NULL DEFAULT 'disconnected',
  `session_name` VARCHAR(120) NOT NULL DEFAULT 'default',
  `connected_at` DATETIME(3) DEFAULT NULL,
  `last_qr` LONGTEXT,
  `headless` TINYINT(1) NOT NULL DEFAULT 1,
  `paused` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_bot_sessions_owner` (`owner_user_id`, `session_name`),
  CONSTRAINT `fk_bot_sessions_owner`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla: flows (constructor visual de menús)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `flows` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `trigger` VARCHAR(120) DEFAULT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('message','menu','action','redirect','end') NOT NULL DEFAULT 'message',
  `parent_id` INT DEFAULT NULL,
  `area_id` INT DEFAULT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  `metadata` JSON DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_flows_parent` (`parent_id`),
  KEY `idx_flows_area` (`area_id`),
  KEY `idx_flows_trigger` (`trigger`),
  CONSTRAINT `fk_flows_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `flows` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_flows_area`
    FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_flows_creator`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla: conversations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_phone` VARCHAR(32) NOT NULL,
  `contact_name` VARCHAR(191) DEFAULT NULL,
  `area_id` INT DEFAULT NULL,
  `assigned_to` INT DEFAULT NULL,
  `status` ENUM('pending','active','paused','closed') NOT NULL DEFAULT 'pending',
  `bot_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_activity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_bot_message_at` DATETIME(3) DEFAULT NULL,
  `closed_at` DATETIME(3) DEFAULT NULL,
  `closed_reason` VARCHAR(255) DEFAULT NULL,
  `closed_by` INT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_conversations_user_phone` (`user_phone`),
  KEY `idx_conversations_area` (`area_id`),
  KEY `idx_conversations_assigned_to` (`assigned_to`),
  KEY `idx_conversations_last_activity` (`last_activity`),
  CONSTRAINT `fk_conversations_area`
    FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_conversations_assigned_user`
    FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_conversations_closed_by`
    FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla: messages (registro de mensajes por conversación)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT NOT NULL,
  `sender_type` ENUM('contact','bot','operator') NOT NULL,
  `sender_id` INT DEFAULT NULL,
  `content` TEXT NOT NULL,
  `media_type` VARCHAR(50) DEFAULT NULL,
  `media_url` VARCHAR(255) DEFAULT NULL,
  `is_delivered` TINYINT(1) NOT NULL DEFAULT 1,
  `external_id` VARCHAR(191) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation` (`conversation_id`),
  KEY `idx_messages_sender` (`sender_type`, `sender_id`),
  UNIQUE KEY `ux_messages_external_id` (`external_id`),
  CONSTRAINT `fk_messages_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_sender_user`
    FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla: conversation_events (historial de cambios de estado)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversation_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `conversation_id` BIGINT NOT NULL,
  `event_type` ENUM('assignment','status_change','bot_toggle','note') NOT NULL,
  `payload` JSON DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_conversation_events_conversation` (`conversation_id`),
  CONSTRAINT `fk_conversation_events_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_conversation_events_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Tabla: sessions (almacenamiento para express-session)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `sid` VARCHAR(255) NOT NULL,
  `expires` DATETIME DEFAULT NULL,
  `data` MEDIUMTEXT,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Vistas auxiliares opcionales
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW `vw_active_conversations` AS
  SELECT
    c.`id`,
    c.`user_phone`,
    c.`area_id`,
    a.`name` AS `area_name`,
    c.`assigned_to`,
    u.`name` AS `assigned_operator`,
    c.`status`,
    c.`bot_active`,
    c.`last_activity`
  FROM `conversations` c
    LEFT JOIN `areas` a ON c.`area_id` = a.`id`
    LEFT JOIN `users` u ON c.`assigned_to` = u.`id`
  WHERE c.`status` IN ('pending', 'active', 'paused');

-- --------------------------------------------------------------------------
-- Usuario administrador por defecto (contraseña: Admin123!)
-- --------------------------------------------------------------------------
INSERT INTO `users` (`name`, `username`, `email`, `password_hash`, `role`)
VALUES (
  'Administrador',
  'admin',
  'admin@example.com',
  '$2a$10$wHv4bJSy9FHn5Vf3L7hIHeV60WTxH/xn5XxhxL7sRKqzZo4PMBVz',
  'admin'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `role` = VALUES(`role`);
