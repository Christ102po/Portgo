const prisma = require('./prisma');

/**
 * Keeps older Railway/MySQL databases compatible with newer PORTGO builds.
 *
 * Earlier PORTGO databases created family_bookings.headContact as NOT NULL.
 * Email-verified group registrations intentionally have no phone number, so
 * those older databases throw a Prisma null-constraint error.  The current
 * Prisma schema correctly makes the field optional.  This startup check fixes
 * the live database automatically without deleting or recreating any records.
 */
async function ensureSchemaCompatibility() {
  try {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT IS_NULLABLE AS isNullable
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'family_bookings'
        AND COLUMN_NAME = 'headContact'
      LIMIT 1
    `);

    if (!Array.isArray(columns) || columns.length === 0) {
      console.warn('[DB] family_bookings.headContact is missing; adding it as nullable.');
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `family_bookings` ADD COLUMN `headContact` VARCHAR(191) NULL AFTER `headFullName`"
      );
      console.log('[DB] Added nullable family_bookings.headContact.');
      return;
    }

    const isNullable = String(columns[0].isNullable || '').toUpperCase();
    if (isNullable === 'NO') {
      console.warn('[DB] Updating legacy family_bookings.headContact to allow email-only group bookings.');
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `family_bookings` MODIFY COLUMN `headContact` VARCHAR(191) NULL"
      );
      console.log('[DB] family_bookings.headContact is now nullable.');
    }
  } catch (error) {
    // Do not stop the whole service if the host does not allow ALTER TABLE.
    // The family booking controller also has a backward-compatible empty-string
    // fallback so email-only group registration still works on legacy schemas.
    console.error(`[DB] Schema compatibility check warning: ${error?.message || error}`);
  }
}

module.exports = { ensureSchemaCompatibility };
