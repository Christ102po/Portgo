-- PORTGO group email verification compatibility fix.
-- Safe for existing data: only changes headContact from NOT NULL to NULL.
ALTER TABLE `family_bookings`
  MODIFY COLUMN `headContact` VARCHAR(191) NULL;
