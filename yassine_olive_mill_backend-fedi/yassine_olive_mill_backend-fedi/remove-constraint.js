// Script to remove foreign key constraint from ticket_payments table
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
    logging: console.log
  }
);

async function removeConstraint() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // Try different possible constraint names
    const constraintNames = [
      'ticket_payments_ticketId_fkey',
      'ticket_payments_ticketId_batches_fk',
      'ticket_payments_ibfk_1'
    ];

    for (const constraintName of constraintNames) {
      try {
        await sequelize.query(`
          ALTER TABLE ticket_payments 
          DROP CONSTRAINT IF EXISTS "${constraintName}";
        `);
        console.log(`✓ Attempted to drop constraint: ${constraintName}`);
      } catch (error) {
        console.log(`  Constraint ${constraintName} might not exist: ${error.message}`);
      }
    }

    // Find and drop any foreign key constraint on ticketId
    const [constraints] = await sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'ticket_payments' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%ticketId%';
    `);

    if (constraints.length > 0) {
      console.log(`\nFound ${constraints.length} foreign key constraint(s):`);
      for (const constraint of constraints) {
        try {
          await sequelize.query(`
            ALTER TABLE ticket_payments 
            DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
          `);
          console.log(`✓ Dropped constraint: ${constraint.constraint_name}`);
        } catch (error) {
          console.log(`✗ Could not drop constraint ${constraint.constraint_name}: ${error.message}`);
        }
      }
    } else {
      console.log('\nNo foreign key constraints found on ticketId column');
    }

    console.log('\n✓ Foreign key constraint removal completed!');
    console.log('You can now delete batches even if they have associated ticket_payments.');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

removeConstraint();

