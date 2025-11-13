import db from '../models/index.js';
import { Sequelize } from 'sequelize';

const { sequelize } = db;

async function addSoldColumn() {
  try {
    console.log('🔧 Adding sold and sold_at columns to container_contents table...\n');

    // Check if columns exist
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'container_contents' AND column_name IN ('sold', 'sold_at');
    `);

    const existingColumns = results.map((r) => r.column_name);

    if (!existingColumns.includes('sold')) {
      await sequelize.query(`
        ALTER TABLE container_contents 
        ADD COLUMN sold BOOLEAN DEFAULT false NOT NULL;
      `);
      console.log('   ✓ Added sold column');
    } else {
      console.log('   ⊙ sold column already exists');
    }

    if (!existingColumns.includes('sold_at')) {
      await sequelize.query(`
        ALTER TABLE container_contents 
        ADD COLUMN sold_at DATE;
      `);
      console.log('   ✓ Added sold_at column');
    } else {
      console.log('   ⊙ sold_at column already exists');
    }

    // Create index if it doesn't exist
    const [indexResults] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'container_contents' AND indexname = 'container_contents_sold_idx';
    `);

    if (indexResults.length === 0) {
      await sequelize.query(`
        CREATE INDEX container_contents_sold_idx ON container_contents (sold);
      `);
      console.log('   ✓ Created index on sold column');
    } else {
      console.log('   ⊙ Index already exists');
    }

    console.log('\n✅ Container contents table updated successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the function
addSoldColumn()
  .then(() => {
    console.log('\n✨ Script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

