-- PORTGO Email OTP fallback migration
-- Allows group registrations that use email instead of a phone number.
ALTER TABLE `family_bookings`
  MODIFY COLUMN `headContact` VARCHAR(191) NULL;
