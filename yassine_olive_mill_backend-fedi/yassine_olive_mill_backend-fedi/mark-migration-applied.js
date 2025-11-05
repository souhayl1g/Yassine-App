import db from './models/index.js';

const { sequelize } = db;

async function markMigrationApplied() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    try {
      // Check if migration is already marked
      const [results] = await sequelize.query(
        "SELECT name FROM \"SequelizeMeta\" WHERE name = '20251105000008-add-sold-flag-to-container-contents.js';",
        { type: sequelize.QueryTypes.SELECT }
      );

      if (results.length === 0) {
        // Mark migration as applied
        await sequelize.query(
          "INSERT INTO \"SequelizeMeta\" (name) VALUES ('20251105000008-add-sold-flag-to-container-contents.js');"
        );
        console.log('✅ Migration marked as applied in SequelizeMeta');
      } else {
        console.log('✓ Migration already marked as applied');
      }
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('⚠ SequelizeMeta table does not exist - this is OK if using sync() instead of migrations');
      } else {
        throw error;
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

markMigrationApplied();

