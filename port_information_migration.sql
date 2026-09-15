-- PORTGO: Admin-managed Port Guidelines & Emergency Hotlines
-- Safe to run on an existing database. No existing passenger, trip, ship, or schedule data is changed.

CREATE TABLE IF NOT EXISTS `port_guidelines` (
  `id` VARCHAR(191) NOT NULL,
  `section` VARCHAR(191) NOT NULL,
  `text` TEXT NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `port_guidelines_section_active_sortOrder_idx` (`section`, `active`, `sortOrder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `emergency_hotlines` (
  `id` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `number` VARCHAR(191) NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `emergency_hotlines_active_sortOrder_idx` (`active`, `sortOrder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
