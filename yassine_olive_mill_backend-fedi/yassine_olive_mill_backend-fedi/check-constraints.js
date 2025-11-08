// Script to check all foreign key constraints on ticket_payments table
import { Sequelize } from 'sequelize';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, 'config', 'config.json'), 'utf8'));

const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  {
    host: config.development.host,
    dialect: config.development.dialect,
    logging: false
  }
);

async function checkConstraints() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Find all foreign key constraints on ticket_payments
    const [constraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'ticket_payments'
        AND tc.constraint_type = 'FOREIGN KEY';
    `);

    if (constraints.length > 0) {
      console.log('Found foreign key constraints on ticket_payments:');
      for (const constraint of constraints) {
        console.log(`  - ${constraint.constraint_name}`);
        console.log(`    Column: ${constraint.column_name}`);
        console.log(`    References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}\n`);
      }
    } else {
      console.log('✓ No foreign key constraints found on ticket_payments table');
    }

    // Also check batches table for constraints that might prevent deletion
    const [batchConstraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE ccu.table_name = 'batches'
        AND tc.constraint_type = 'FOREIGN KEY';
    `);

    if (batchConstraints.length > 0) {
      console.log('\nForeign key constraints that reference batches table:');
      for (const constraint of batchConstraints) {
        console.log(`  - ${constraint.constraint_name}`);
        console.log(`    Table: ${constraint.table_name}`);
        console.log(`    Column: ${constraint.column_name}\n`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkConstraints();

