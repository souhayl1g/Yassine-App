// Force remove the ticket_payments_ticketId_fkey constraint
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

async function forceRemoveConstraint() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Get all constraints on ticket_payments table
    const [allConstraints] = await sequelize.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'ticket_payments';
    `);

    console.log('All constraints on ticket_payments table:');
    allConstraints.forEach(c => {
      console.log(`  - ${c.constraint_name} (${c.constraint_type})`);
    });

    // Try to drop the specific constraint from the error message
    const constraintName = 'ticket_payments_ticketId_fkey';
    console.log(`\nAttempting to drop constraint: ${constraintName}`);
    
    try {
      // Try with quotes
      await sequelize.query(`ALTER TABLE ticket_payments DROP CONSTRAINT IF EXISTS "${constraintName}";`);
      console.log(`✓ Dropped constraint: ${constraintName}`);
    } catch (error1) {
      try {
        // Try without quotes
        await sequelize.query(`ALTER TABLE ticket_payments DROP CONSTRAINT IF EXISTS ${constraintName};`);
        console.log(`✓ Dropped constraint: ${constraintName}`);
      } catch (error2) {
        // Try using CASCADE
        try {
          await sequelize.query(`ALTER TABLE ticket_payments DROP CONSTRAINT "${constraintName}" CASCADE;`);
          console.log(`✓ Dropped constraint: ${constraintName} (with CASCADE)`);
        } catch (error3) {
          console.log(`✗ Could not drop constraint: ${constraintName}`);
          console.log(`  Error 1: ${error1.message}`);
          console.log(`  Error 2: ${error2.message}`);
          console.log(`  Error 3: ${error3.message}`);
        }
      }
    }

    // Also try to find any constraint that references batches
    const [fkConstraints] = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'ticket_payments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'batches';
    `);

    if (fkConstraints.length > 0) {
      console.log('\nFound foreign key constraints referencing batches:');
      for (const fk of fkConstraints) {
        console.log(`  Dropping: ${fk.constraint_name}`);
        try {
          await sequelize.query(`ALTER TABLE ticket_payments DROP CONSTRAINT "${fk.constraint_name}" CASCADE;`);
          console.log(`  ✓ Dropped: ${fk.constraint_name}`);
        } catch (error) {
          console.log(`  ✗ Failed to drop ${fk.constraint_name}: ${error.message}`);
        }
      }
    } else {
      console.log('\n✓ No foreign key constraints found that reference batches table');
    }

    console.log('\n✓ Constraint removal process completed!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

forceRemoveConstraint();

