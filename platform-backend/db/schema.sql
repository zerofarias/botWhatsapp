-- -----------------------------------------------------------------------------
-- WPPConnect Platform - MySQL schema bootstrap
-- -----------------------------------------------------------------------------
-- Crea la base de datos y las tablas que Prisma espera.
-- Ejecuta este script en tu servidor MySQL (ej. con: mysql -u user -p < schema.sql)
-- -----------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `wppconnect_platform`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `wppconnect_platform`;

-- --------------------------------------------------------------------------
-- Table: User
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `User` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN','USER') NOT NULL DEFAULT 'USER',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Table: BotSession
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `BotSession` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `status` ENUM('CONNECTED','CONNECTING','DISCONNECTED','ERROR') NOT NULL DEFAULT 'DISCONNECTED',
  `connectedAt` DATETIME(3) DEFAULT NULL,
  `paused` TINYINT(1) NOT NULL DEFAULT 0,
  `displayName` VARCHAR(100) DEFAULT NULL,
  `phoneNumber` VARCHAR(32) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `lastQr` LONGTEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `BotSession_userId_key` (`userId`),
  CONSTRAINT `BotSession_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Table: Flow
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Flow` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `keyword` VARCHAR(191) NOT NULL,
  `response` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Flow_userId_idx` (`userId`),
  CONSTRAINT `Flow_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Table: Message
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Message` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `contact` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `type` ENUM('IN','OUT') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Message_userId_idx` (`userId`),
  CONSTRAINT `Message_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------------
-- Datos de ejemplo: usuario administrador por defecto
-- Contraseña: Test1234!  (hash bcrypt $2a$10$wHv4bJSy9FHn5Vf3L7hIHeV60WTxH/xn5XxhxL7sRKqzZo4PMBVz)
-- --------------------------------------------------------------------------
INSERT INTO `User` (`name`, `email`, `password`, `role`)
VALUES (
  'Test User',
  'test@example.com',
  '$2a$10$wHv4bJSy9FHn5Vf3L7hIHeV60WTxH/xn5XxhxL7sRKqzZo4PMBVz',
  'ADMIN'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `password` = VALUES(`password`),
  `role` = VALUES(`role`);
