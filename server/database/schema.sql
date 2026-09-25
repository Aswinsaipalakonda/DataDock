-- =========================================================================
-- DE E-LEARN PLATFORM — MYSQL DATABASE SCHEMA
-- Compatible with MySQL 8.x / MariaDB (XAMPP & Hostinger)
-- =========================================================================

CREATE DATABASE IF NOT EXISTS `de_elearn` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `de_elearn`;

-- Disable foreign key checks during creation
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Branches Table
DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
    `code` VARCHAR(20) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Semesters Table
DROP TABLE IF EXISTS `semesters`;
CREATE TABLE `semesters` (
    `number` INT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Regulations Table
DROP TABLE IF EXISTS `regulations`;
CREATE TABLE `regulations` (
    `code` VARCHAR(20) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Subjects Table (Composite PK: code, branch, regulation)
DROP TABLE IF EXISTS `subjects`;
CREATE TABLE `subjects` (
    `code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `branch` VARCHAR(20) NOT NULL,
    `semester` INT NOT NULL,
    `description` TEXT NULL,
    `regulation` VARCHAR(20) NOT NULL DEFAULT 'R23',
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`code`, `branch`, `regulation`),
    INDEX `idx_subjects_branch_sem` (`branch`, `semester`),
    INDEX `idx_subjects_regulation` (`regulation`),
    CONSTRAINT `fk_subjects_branch` FOREIGN KEY (`branch`) REFERENCES `branches`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_subjects_semester` FOREIGN KEY (`semester`) REFERENCES `semesters`(`number`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_subjects_regulation` FOREIGN KEY (`regulation`) REFERENCES `regulations`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Users Table
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(36) PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'faculty', 'student') NOT NULL DEFAULT 'student',
    `status` ENUM('active', 'deactivated') NOT NULL DEFAULT 'active',
    `branch` VARCHAR(20) NULL,
    `academic_year` INT NULL,
    `current_semester` INT NULL,
    `section` VARCHAR(50) NULL,
    `designation` VARCHAR(100) NULL,
    `phone` VARCHAR(30) NULL,
    `roll_number` VARCHAR(50) NULL,
    `first_login_pending` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_branch_sem` (`branch`, `current_semester`),
    CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch`) REFERENCES `branches`(`code`) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT `fk_users_semester` FOREIGN KEY (`current_semester`) REFERENCES `semesters`(`number`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Materials Table
DROP TABLE IF EXISTS `materials`;
CREATE TABLE `materials` (
    `id` VARCHAR(36) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `subject` VARCHAR(50) NOT NULL,
    `branch` VARCHAR(20) NOT NULL,
    `section` VARCHAR(50) NOT NULL DEFAULT 'ALL',
    `semester` INT NOT NULL,
    `regulation` VARCHAR(20) NOT NULL DEFAULT 'R23',
    `type` VARCHAR(50) NOT NULL,
    `state` ENUM('draft', 'published', 'archived', 'deleted') NOT NULL DEFAULT 'draft',
    `owner_id` VARCHAR(36) NOT NULL,
    `tags` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_materials_state` (`state`),
    INDEX `idx_materials_scope` (`branch`, `semester`, `subject`),
    INDEX `idx_materials_cohort` (`branch`, `semester`, `section`, `state`),
    INDEX `idx_materials_owner` (`owner_id`),
    CONSTRAINT `fk_materials_branch` FOREIGN KEY (`branch`) REFERENCES `branches`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_materials_semester` FOREIGN KEY (`semester`) REFERENCES `semesters`(`number`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_materials_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Material Files Table
DROP TABLE IF EXISTS `material_files`;
CREATE TABLE `material_files` (
    `id` VARCHAR(36) PRIMARY KEY,
    `material_id` VARCHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` BIGINT NOT NULL,
    `version` INT NOT NULL DEFAULT 1,
    `storage_path` VARCHAR(500) NOT NULL,
    `storage_ref` VARCHAR(500) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_files_material` (`material_id`),
    CONSTRAINT `fk_files_material` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bookmarks Table
DROP TABLE IF EXISTS `bookmarks`;
CREATE TABLE `bookmarks` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `material_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_user_material` (`user_id`, `material_id`),
    INDEX `idx_bookmarks_user` (`user_id`),
    CONSTRAINT `fk_bookmarks_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bookmarks_material` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Activity Events Table
DROP TABLE IF EXISTS `activity_events`;
CREATE TABLE `activity_events` (
    `id` VARCHAR(36) PRIMARY KEY,
    `type` VARCHAR(50) NOT NULL,
    `actor_id` VARCHAR(36) NOT NULL,
    `target_id` VARCHAR(36) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_activity_actor` (`actor_id`),
    INDEX `idx_activity_target` (`target_id`),
    CONSTRAINT `fk_activity_actor` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Audit Logs Table (Immutable)
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) PRIMARY KEY,
    `action` VARCHAR(100) NOT NULL,
    `actor_id` VARCHAR(36) NOT NULL,
    `object_id` VARCHAR(100) NOT NULL,
    `before_summary` JSON NULL,
    `after_summary` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_actor` (`actor_id`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Announcements Table
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
    `id` VARCHAR(36) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `scope_branch` VARCHAR(20) NULL,
    `scope_semester` INT NULL,
    `priority` ENUM('normal', 'important') NOT NULL DEFAULT 'normal',
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_announcements_time` (`start_time`, `end_time`),
    CONSTRAINT `fk_announcements_branch` FOREIGN KEY (`scope_branch`) REFERENCES `branches`(`code`) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT `fk_announcements_semester` FOREIGN KEY (`scope_semester`) REFERENCES `semesters`(`number`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Notifications Table
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
    `id` VARCHAR(36) PRIMARY KEY,
    `user_id` VARCHAR(36) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `payload` JSON NULL,
    `read_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_notifications_user` (`user_id`, `read_at`),
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Support Inquiries Table
DROP TABLE IF EXISTS `support_inquiries`;
CREATE TABLE `support_inquiries` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'Student',
    `subject` VARCHAR(255) NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('pending', 'in_progress', 'resolved') NOT NULL DEFAULT 'pending',
    `admin_notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` DATETIME NULL,
    `resolved_by` VARCHAR(36) NULL,
    INDEX `idx_inquiries_status` (`status`),
    INDEX `idx_inquiries_created` (`created_at`),
    CONSTRAINT `fk_inquiries_resolved_by` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Exam Schedules Table
DROP TABLE IF EXISTS `exam_schedules`;
CREATE TABLE `exam_schedules` (
    `id` VARCHAR(36) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `branch` VARCHAR(20) NOT NULL,
    `semester` INT NOT NULL,
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME NOT NULL,
    `lockout_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_exam_time` (`start_time`, `end_time`),
    CONSTRAINT `fk_exam_branch` FOREIGN KEY (`branch`) REFERENCES `branches`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_exam_semester` FOREIGN KEY (`semester`) REFERENCES `semesters`(`number`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
