'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Remove the foreign key constraint completely
    try {
      // Try different possible constraint names
      const constraintNames = [
        'ticket_payments_ticketId_fkey',
        'ticket_payments_ticketId_batches_fk',
        'ticket_payments_ibfk_1'
      ];

      for (const constraintName of constraintNames) {
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE ticket_payments 
            DROP CONSTRAINT IF EXISTS "${constraintName}";
          `);
          console.log(`Dropped constraint: ${constraintName}`);
        } catch (error) {
          // Try without quotes
          try {
            await queryInterface.sequelize.query(`
              ALTER TABLE ticket_payments 
              DROP CONSTRAINT IF EXISTS ${constraintName};
            `);
            console.log(`Dropped constraint: ${constraintName}`);
          } catch (e) {
            // Constraint doesn't exist with this name, continue
          }
        }
      }

      // Also try to find and drop any foreign key constraint on ticketId
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'ticket_payments' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%ticketId%';
      `);

      for (const constraint of constraints) {
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE ticket_payments 
            DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
          `);
          console.log(`Dropped constraint: ${constraint.constraint_name}`);
        } catch (error) {
          console.log(`Could not drop constraint ${constraint.constraint_name}:`, error.message);
        }
      }

      console.log('Foreign key constraints removed from ticket_payments table');
    } catch (error) {
      console.log('Error removing constraints:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Re-add the foreign key constraint (if needed to rollback)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE ticket_payments 
        ADD CONSTRAINT ticket_payments_ticketId_fkey 
        FOREIGN KEY ("ticketId") 
        REFERENCES batches(id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE;
      `);
      console.log('Foreign key constraint re-added');
    } catch (error) {
      console.log('Error re-adding constraint:', error.message);
    }
  }
};

